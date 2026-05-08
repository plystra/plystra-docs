---
title: Request ID Envelope
description: v1.0 响应 envelope 和 request_id 兼容策略。
---

Plystra 响应会同时保留顶层 `request_id` 和 `meta.request_id`，便于旧客户端和新客户端共存。

```json
{
  "data": {},
  "request_id": "req_...",
  "meta": {
    "request_id": "req_..."
  }
}
```

服务端会读取 `X-Request-ID`，如果没有提供则生成新的 request id。HTTP authz API 不信任 body 中的 `ip` 和 `user_agent`，审计上下文由服务端从请求中解析。
