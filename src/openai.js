const crypto = require("crypto");

function unixNow() {
    return Math.floor(Date.now() / 1000);
}

function makeChatCompletionId() {
    return "chatcmpl-" + crypto.randomUUID();
}

function makeChunk({ id, created, model, content, role, finishReason }) {
    const delta = {};
    if (role) {
        delta.role = role;
    }
    if (typeof content === "string") {
        delta.content = content;
    }

    return {
        id,
        object: "chat.completion.chunk",
        created,
        model,
        choices: [
            {
                index: 0,
                delta,
                finish_reason: finishReason || null
            }
        ]
    };
}

function makeNonStreamCompletion({ id, created, model, content, promptTokens, completionTokens }) {
    const p = Number.isFinite(promptTokens) ? promptTokens : 0;
    const c = Number.isFinite(completionTokens) ? completionTokens : 0;
    return {
        id,
        object: "chat.completion",
        created,
        model,
        choices: [
            {
                index: 0,
                message: {
                    role: "assistant",
                    content
                },
                finish_reason: "stop"
            }
        ],
        usage: {
            prompt_tokens: p,
            completion_tokens: c,
            total_tokens: p + c
        }
    };
}

function buildModelsResponse(modelNames) {
    return {
        object: "list",
        data: modelNames.map((name) => ({
            id: name,
            object: "model",
            created: unixNow(),
            owned_by: "xipuai-proxy"
        }))
    };
}

module.exports = {
    unixNow,
    makeChatCompletionId,
    makeChunk,
    makeNonStreamCompletion,
    buildModelsResponse
};
