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
