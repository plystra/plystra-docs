---
title: SDK Integration and Error Handling
description: Use the JavaScript, Python, and Go SDKs and handle Plystra errors correctly.
---

## SDK Integration Patterns

### TypeScript with an API Key

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

### Python with an Access Token

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

### Python Async with an API Key

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

### Go with a Custom HTTP Client

```go
client := plystra.NewClient(
	"https://plystra.internal",
	plystra.WithAPIKey(os.Getenv("PLYSTRA_API_KEY")),
	plystra.WithHTTPClient(&http.Client{Timeout: 5 * time.Second}),
)
```

## Handling Errors

Core uses structured error envelopes:

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

Application guidance:

| HTTP status | Common code | Recommended application behavior |
|---|---|---|
| `400` | `VALIDATION_FAILED` | Treat as a developer/configuration error. Log details. |
| `401` | `AUTHENTICATION_REQUIRED`, `SESSION_EXPIRED` | Refresh session or require login. |
| `403` | `ADMIN_PERMISSION_REQUIRED` | Do not retry automatically. Show insufficient permission. |
| `404` | `*_NOT_FOUND`, `FEATURE_DISABLED` | Check ids or feature flags. |
| `409` | `*_CREATE_FAILED`, `LAST_SUPER_ADMIN` | Fix conflicting state or preserve the last super admin. |
| `500` | `INTERNAL_ERROR` | Retry only when your operation is idempotent and alert operators. |

For `authz.check`, do not treat `decision = deny` as a transport error. It is a successful authorization decision and should usually become `403` in your own business API.
