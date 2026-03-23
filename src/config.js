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
    upstreamCookies: String(process.env.UPSTREAM_COOKIES || "").trim(),
    upstreamHeaderDefaults: {
        accept: String(process.env.UPSTREAM_ACCEPT || "application/json, text/plain, */*").trim(),
        acceptEncoding: String(process.env.UPSTREAM_ACCEPT_ENCODING || "gzip, deflate, br, zstd").trim(),
        acceptLanguage: String(process.env.UPSTREAM_ACCEPT_LANGUAGE || "zh-CN,zh;q=0.9").trim(),
        cacheControl: String(process.env.UPSTREAM_CACHE_CONTROL || "no-cache").trim(),
        pragma: String(process.env.UPSTREAM_PRAGMA || "no-cache").trim(),
        dnt: String(process.env.UPSTREAM_DNT || "1").trim(),
        priority: String(process.env.UPSTREAM_PRIORITY || "u=1, i").trim(),
        referer: String(process.env.UPSTREAM_REFERER || "https://xipuai.xjtlu.edu.cn/v3/chat").trim(),
        secChUa: String(process.env.UPSTREAM_SEC_CH_UA || "\"Chromium\";v=\"146\", \"Not-A.Brand\";v=\"24\", \"Google Chrome\";v=\"146\"").trim(),
        secChUaMobile: String(process.env.UPSTREAM_SEC_CH_UA_MOBILE || "?0").trim(),
        secChUaPlatform: String(process.env.UPSTREAM_SEC_CH_UA_PLATFORM || "\"Windows\"").trim(),
        secFetchDest: String(process.env.UPSTREAM_SEC_FETCH_DEST || "empty").trim(),
        secFetchMode: String(process.env.UPSTREAM_SEC_FETCH_MODE || "cors").trim(),
        secFetchSite: String(process.env.UPSTREAM_SEC_FETCH_SITE || "same-origin").trim(),
        userAgent: String(process.env.UPSTREAM_USER_AGENT || "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36").trim()
    },
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
