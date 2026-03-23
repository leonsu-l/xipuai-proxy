const dotenv = require("dotenv");

dotenv.config();

function parseRequiredSessionId(raw) {
    const text = String(raw || "").trim();
    if (!text) {
        throw new Error("Missing UPSTREAM_SESSION_ID in environment.");
    }

    const value = Number(text);
    if (!Number.isInteger(value) || value <= 0) {
        throw new Error("UPSTREAM_SESSION_ID must be a positive integer.");
    }

    return value;
}

const config = {
    port: Number(process.env.PORT || 8787),
    upstreamBaseUrl: (process.env.UPSTREAM_BASE_URL || "").trim(),
    upstreamChatPath: process.env.UPSTREAM_CHAT_PATH || "/endpoint/common",
    upstreamTimeoutMs: Number(process.env.UPSTREAM_TIMEOUT_MS || 120000),
    logRequestBody: String(process.env.LOG_REQUEST_BODY || "false").toLowerCase() === "true",
    modelList: String(process.env.OPENAI_MODELS || "DeepSeek-V3.1-W8A8")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    upstreamSessionId: parseRequiredSessionId(process.env.UPSTREAM_SESSION_ID)
};

module.exports = {
    config
};
