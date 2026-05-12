---
title: SDK 接入与错误处理
description: 使用 JavaScript、Python、Go SDK，并正确处理 Plystra 错误。
---

## SDK 接入模式

### TypeScript API Key

```ts
import { PlystraClient } from "@plystra/sdk";

const plystra = new PlystraClient({
  baseUrl: process.env.PLYSTRA_URL!,
  apiKey: process.env.PLYSTRA_API_KEY!,
});

const decision = await plystra.authz.check({
  actor: {
    user_id: "user_alice",
    member_id: "member_finance_reviewer",
    user_member_id: "um_alice_finance_reviewer",
    space_id: "space_acme",
  },
  resource_type: "invoice",
  resource_id: "invoice_001",
  action: "approve",
});

if (decision.decision !== "allow") {
  throw new Error(`Plystra denied: ${decision.deny_code}`);
}
```

### Python 使用 access token

```python
from plystra import Plystra

with Plystra("https://plystra.internal", access_token=session["plystra_access_token"]) as plystra:
    decision = plystra.authz.check(
        resource_type="invoice",
        resource_id="invoice_001",
        action="approve",
    )
    if decision["decision"] != "allow":
        raise PermissionError(decision.get("deny_code"))
```

### Python Async 使用 API key

```python
from plystra import AsyncPlystra

async with AsyncPlystra("https://plystra.internal", api_key=api_key) as plystra:
    decision = await plystra.authz.check(
        actor={
            "user_id": "user_alice",
            "member_id": "member_finance_reviewer",
            "user_member_id": "um_alice_finance_reviewer",
            "space_id": "space_acme",
        },
        resource_type="invoice",
        resource_id="invoice_001",
        action="approve",
    )
```

### Go 自定义 HTTP client

```go
client := plystra.NewClient(
	"https://plystra.internal",
	plystra.WithAPIKey(os.Getenv("PLYSTRA_API_KEY")),
	plystra.WithHTTPClient(&http.Client{Timeout: 5 * time.Second}),
)
```

## 错误处理

Core 使用结构化错误 envelope：

```json
{
  "error": {
    "code": "ADMIN_PERMISSION_REQUIRED",
    "message": "The current user does not have the required admin permission.",
    "details": {
      "permission": "api_keys:create"
    },
    "request_id": "req_..."
  },
  "request_id": "req_..."
}
```

应用处理建议：

| HTTP status | 常见 code | 建议 |
|---|---|---|
| `400` | `VALIDATION_FAILED` | 视为开发或配置错误，记录 details。 |
| `401` | `AUTHENTICATION_REQUIRED`、`SESSION_EXPIRED` | refresh session 或要求重新登录。 |
| `403` | `ADMIN_PERMISSION_REQUIRED` | 不要自动重试，展示权限不足。 |
| `404` | `*_NOT_FOUND`、`FEATURE_DISABLED` | 检查 id 或 feature flag。 |
| `409` | `*_CREATE_FAILED`、`LAST_SUPER_ADMIN` | 修复冲突状态或保留最后 super admin。 |
| `500` | `INTERNAL_ERROR` | 只有幂等操作才考虑重试，并告警。 |

对 `authz.check` 来说，`decision = deny` 不是传输错误，而是成功的授权决策。你的业务 API 通常应把它转换成 `403`。
