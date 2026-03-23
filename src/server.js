const express = require("express");
const cors = require("cors");
const crypto = require("crypto");

const { createSseParser } = require("./sse");
const { config } = require("./config");
const {
    unixNow,
    makeChatCompletionId,
    makeChunk,
    makeNonStreamCompletion,
    buildModelsResponse
} = require("./openai");

const app = express();
const PORT = config.port;
const UPSTREAM_BASE_URL = config.upstreamBaseUrl;
const UPSTREAM_CHAT_PATH = config.upstreamChatPath;
const UPSTREAM_TIMEOUT_MS = config.upstreamTimeoutMs;
const LOG_REQUEST_BODY = config.logRequestBody;
const modelList = config.modelList;

app.use(cors());
app.use(express.json({ limit: "2mb" }));

function getTraceId() {
    return crypto.randomUUID();
}

function getBearerToken(req) {
    const raw = req.headers.authorization || "";
    if (!raw || !raw.startsWith("Bearer ")) {
        return "";
    }
    return raw.slice("Bearer ".length).trim();
}

function openAiError(res, status, type, message, traceId) {
    return res.status(status).json({
        error: {
            message,
            type,
            param: null,
            code: type,
            trace_id: traceId
        }
    });
}

function normalizeMessagesToText(messages) {
    if (!Array.isArray(messages)) {
        return "";
    }

    return messages
        .map((m) => {
            const role = typeof m?.role === "string" ? m.role : "user";
            let content = "";
            if (typeof m?.content === "string") {
                content = m.content;
            } else if (Array.isArray(m?.content)) {
                content = m.content
                    .map((part) => {
                        if (typeof part === "string") {
                            return part;
                        }
                        if (part && typeof part.text === "string") {
                            return part.text;
                        }
                        return "";
                    })
                    .filter(Boolean)
                    .join("\n");
            }
            return `[${role}] ${content}`.trim();
        })
        .filter(Boolean)
        .join("\n");
}

function toUpstreamBody(body) {
    return {
        text: normalizeMessagesToText(body.messages),
        files: Array.isArray(body.files) ? body.files : [],
        online: Number.isFinite(body.online) ? body.online : 0,
        thinking: typeof body.thinking === "string" ? body.thinking : "minimal",
        sessionId: config.upstreamSessionId
    };
}

function writeSse(res, dataObj) {
    res.write(`data: ${JSON.stringify(dataObj)}\n\n`);
}

async function forwardToUpstream({ token, upstreamBody, traceId }) {
    if (!UPSTREAM_BASE_URL) {
        const error = new Error("Missing UPSTREAM_BASE_URL in environment.");
        error.name = "ConfigError";
        throw error;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);
    try {
        const url = new URL(UPSTREAM_CHAT_PATH, UPSTREAM_BASE_URL).toString();
        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Accept: "*/*",
                "jm-token": token,
                "x-trace-id": traceId
            },
            body: JSON.stringify(upstreamBody),
            signal: controller.signal
        });

        return response;
    } finally {
        clearTimeout(timeout);
    }
}

app.get("/healthz", (_req, res) => {
    res.json({ ok: true, service: "xipuai-proxy" });
});

app.get("/v1/models", (_req, res) => {
    res.json(buildModelsResponse(modelList));
});

app.post("/v1/chat/completions", async (req, res) => {
    const traceId = getTraceId();
    const token = getBearerToken(req);

    if (!token) {
        return openAiError(res, 401, "invalid_api_key", "Missing or invalid Authorization Bearer token", traceId);
    }

    const model = typeof req.body?.model === "string" ? req.body.model : modelList[0] || "unknown-model";
    const stream = Boolean(req.body?.stream);
    const upstreamBody = toUpstreamBody(req.body || {});

    console.log(JSON.stringify({
        traceId,
        route: "/v1/chat/completions",
        model,
        stream,
        upstreamPath: UPSTREAM_CHAT_PATH,
        body: LOG_REQUEST_BODY ? upstreamBody : undefined
    }));

    try {
        const upstreamRes = await forwardToUpstream({ token, upstreamBody, traceId });

        if (!upstreamRes.ok) {
            const text = await upstreamRes.text();
            return openAiError(
                res,
                upstreamRes.status,
                "upstream_error",
                `Upstream returned ${upstreamRes.status}: ${text.slice(0, 300)}`,
                traceId
            );
        }

        if (!upstreamRes.body) {
            return openAiError(res, 502, "bad_gateway", "Upstream response has no body", traceId);
        }

        const id = makeChatCompletionId();
        const created = unixNow();
        let fullText = "";
        let meta = null;

        const reader = upstreamRes.body.getReader();
        const decoder = new TextDecoder();

        if (stream) {
            res.status(200);
            res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
            res.setHeader("Cache-Control", "no-cache, no-transform");
            res.setHeader("Connection", "keep-alive");

            writeSse(res, makeChunk({ id, created, model, role: "assistant", content: "", finishReason: null }));
        }

        const parser = createSseParser((data) => {
            if (!data || data === "[DONE]") {
                return;
            }

            let parsed;
            try {
                parsed = JSON.parse(data);
            } catch {
                return;
            }

            if (parsed && parsed.type === "string") {
                const piece = typeof parsed.data === "string" ? parsed.data : "";
                if (piece) {
                    fullText += piece;
                    if (stream) {
                        writeSse(res, makeChunk({ id, created, model, content: piece, finishReason: null }));
                    }
                }
                return;
            }

            if (parsed && parsed.type === "object" && parsed.data && typeof parsed.data === "object") {
                meta = parsed.data;
            }
        });

        while (true) {
            const { value, done } = await reader.read();
            if (done) {
                break;
            }
            parser.push(decoder.decode(value, { stream: true }));
        }
        parser.flush();

        if (stream) {
            writeSse(res, makeChunk({ id, created, model, finishReason: "stop" }));
            res.write("data: [DONE]\n\n");
            res.end();
            return;
        }

        const completion = makeNonStreamCompletion({
            id,
            created,
            model,
            content: fullText,
            promptTokens: meta?.promptTokens,
            completionTokens: meta?.completionTokens
        });

        res.json(completion);
    } catch (err) {
        if (err && err.name === "AbortError") {
            return openAiError(res, 504, "timeout", "Upstream request timed out", traceId);
        }

        return openAiError(
            res,
            500,
            "internal_error",
            err && err.message ? err.message : "Unexpected internal error",
            traceId
        );
    }
});

app.use((req, res) => {
    res.status(404).json({
        error: {
            message: `Route not found: ${req.method} ${req.path}`,
            type: "not_found_error",
            param: null,
            code: "not_found"
        }
    });
});

app.listen(PORT, () => {
    console.log(`xipuai-proxy listening on :${PORT}`);
});
