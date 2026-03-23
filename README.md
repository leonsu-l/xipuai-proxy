# xipuai-proxy

OpenAI API compatible proxy for an upstream service that returns Server-Sent Events (SSE) chunks like:

```
data: {"id":"...","type":"string","data":"你好","code":0}
...
data: [DONE]
```

## Supported APIs

- `GET /v1/models`
- `POST /v1/chat/completions` (stream and non-stream)

## Auth mapping

- Input: `Authorization: Bearer <token>`
- Upstream: `jm-token: <token>`

## SessionId config

- `sessionId` is no longer read from request body.
- You must set `UPSTREAM_SESSION_ID` in `.env`.
- If `UPSTREAM_SESSION_ID` is missing or invalid, service startup will fail.

## Upstream header masquerade

- Proxy forwards request to upstream with browser-like key headers.
- Rule: client headers first, then env defaults.
- Sensitive values are not printed in logs (only presence flags are logged).

### Sensitive headers

- `jm-token`: mapped from `Authorization: Bearer <token>`.
- `Cookie`: forwarded from client request cookie first; fallback to `UPSTREAM_COOKIES`.

### Env defaults for key headers

- `UPSTREAM_ACCEPT` (default: `application/json, text/plain, */*`)
- `UPSTREAM_ACCEPT_ENCODING` (default: `gzip, deflate, br, zstd`)
- `UPSTREAM_ACCEPT_LANGUAGE` (default: `zh-CN,zh;q=0.9`)
- `UPSTREAM_CACHE_CONTROL` (default: `no-cache`)
- `UPSTREAM_PRAGMA` (default: `no-cache`)
- `UPSTREAM_DNT` (default: `1`)
- `UPSTREAM_PRIORITY` (default: `u=1, i`)
- `UPSTREAM_REFERER` (default: `https://xipuai.xjtlu.edu.cn/v3/chat`)
- `UPSTREAM_SEC_CH_UA`
- `UPSTREAM_SEC_CH_UA_MOBILE` (default: `?0`)
- `UPSTREAM_SEC_CH_UA_PLATFORM` (default: `"Windows"`)
- `UPSTREAM_SEC_FETCH_DEST` (default: `empty`)
- `UPSTREAM_SEC_FETCH_MODE` (default: `cors`)
- `UPSTREAM_SEC_FETCH_SITE` (default: `same-origin`)
- `UPSTREAM_USER_AGENT`

Note:

- HTTP/2 pseudo headers such as `:authority`, `:method`, `:path`, `:scheme` are controlled by the HTTP client and are not manually set in fetch headers.

## Quick start

1. Install dependencies:

```bash
npm install
```

2. Configure env:

```bash
cp .env.example .env
```

3. Start server:

```bash
npm start
```

## Example request

```bash
curl http://localhost:8787/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-jm-token" \
  -d '{
    "model": "DeepSeek-V3.1-W8A8",
    "stream": true,
    "messages": [
      {"role": "system", "content": "You are helpful"},
      {"role": "user", "content": "你是谁"}
    ]
  }'
```

## Notes

- If upstream always streams, non-stream mode is still supported by aggregating chunks.
- `tools` and function calling are intentionally not implemented in this first version.
