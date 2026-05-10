---
title: SDKs
description: Use Plystra Core v1.0 from TypeScript, JavaScript, Python, Go, and plugin tooling.
---

Plystra SDKs wrap the v1.0 HTTP API envelope, Bearer sessions, admin grants, authorization checks, and common Core management endpoints.

Use SDKs from trusted server-side code. Do not put a management access token in browser or mobile clients.

The normal production flow is:

1. Create or bootstrap an instance super admin in Core.
2. Let your frontend or gateway perform user login and store the Plystra access token in your encrypted server-side session.
3. For service-to-service traffic, create a scoped API key instead of replaying a user password.
4. Call management APIs with either a user session that has an active admin grant or an API key with explicit permission keys.
5. Call `authz.check` from your application service before performing protected business actions.

Password login remains available in SDKs for admin tools and bootstrap flows, but routine backend checks should use an access token or API key.

## API keys

API keys are machine credentials. They are scoped at `instance`, `space`, or `group` level and carry explicit permission keys such as `authz:check`, `resources:read`, or `api_keys:create`.

Create API keys only from a credential that has `api_keys:create` for the target scope:

```ts
const created = await plystra.apiKeys.create({
  name: "billing-service-prod",
  level: "space",
  space_id: "space_acme",
  permission_keys: ["authz:check", "resources:read"],
  expires_at: "2026-12-31T23:59:59Z",
});

// Store this once in your secret manager. It is not returned again.
await secrets.put("PLYSTRA_API_KEY", created.api_key);
```

Use a short-lived user access token for user-driven operations and an API key for backend services. Do not put API keys in browser or mobile clients.

## Packages

| Language | Package | Repository | Primary client |
|---|---|---|---|
| TypeScript/JavaScript | `@plystra/sdk` | `plystra/js-sdk` | `PlystraClient` |
| Python | `plystra` | `plystra/python-sdk` | `Plystra`, `AsyncPlystra` |
| Go | `github.com/plystra/go-plystra` | `plystra/go-plystra` | `plystra.Client` |
| Plugin authors | `@plystra/plugin-sdk` | `plystra/plystra-plugin-sdk` | `validateManifestForCore` |

All management modules require a Bearer session whose user has an active admin grant.

## TypeScript and JavaScript

Install:

```bash
npm install @plystra/sdk
```

Log in and call an authorization check:

```ts
import { PlystraClient } from "@plystra/sdk";

const plystra = new PlystraClient({
  baseUrl: "http://localhost:8080",
  accessToken: session.plystraAccessToken,
  onTokenChange: async (tokens) => {
    await saveEncryptedSession(tokens);
  },
});
```

Use an API key from a server process:

```ts
const plystra = new PlystraClient({
  baseUrl: "https://plystra.internal",
  apiKey: process.env.PLYSTRA_API_KEY,
});
```

Password login is available for admin tools:

```ts
const plystra = new PlystraClient({
  baseUrl: "http://localhost:8080",
  onTokenChange: async (tokens) => {
    await saveEncryptedSession(tokens);
  },
});

await plystra.auth.login({
  email: "alice@example.com",
  password: "plystra-demo",
});

await plystra.auth.refresh();

const decision = await plystra.authz.check({
  actor: {
    user_id: "user_alice",
    space_id: "space_acme",
    member_id: "member_finance_reviewer",
    user_member_id: "um_alice_finance_reviewer",
  },
  resource_type: "invoice",
  resource_id: "invoice_001",
  action: "approve",
});

if (decision.decision !== "allow") {
  throw new Error(`Denied: ${decision.deny_code}`);
}
```

Create an admin grant:

```ts
await plystra.admin.createGrant({
  user_id: "user_ops",
  level: "space_admin",
  space_id: "space_acme",
  permission_key: "users:read",
});
```

Common modules:

```ts
await plystra.actor.context();
await plystra.admin.me();
await plystra.users.list({ limit: 50 });
await plystra.spaces.groups("space_acme");
await plystra.resources.get("invoice", "invoice_001");
await plystra.audit.list({ space_id: "space_acme" });
await plystra.plugins.validateManifest(manifest);
```

Restore tokens for the next server request:

```ts
const session = await loadEncryptedSession();

const plystra = new PlystraClient({
  baseUrl: "https://plystra.internal",
  accessToken: session.accessToken,
  refreshToken: session.refreshToken,
  onTokenChange: saveEncryptedSession,
});
```

Handle API errors:

```ts
import { PlystraApiError } from "@plystra/sdk";

try {
  await plystra.users.get("missing_user");
} catch (error) {
  if (error instanceof PlystraApiError) {
    console.error(error.status, error.code, error.requestId);
  }
}
```

## Python

Install:

```bash
pip install plystra
```

The Python package supports Python 3.10 and newer.

Synchronous client:

```python
from plystra import Plystra

with Plystra("http://localhost:8080") as plystra:
    plystra.auth.login("alice@example.com", "plystra-demo")
    persist_session(plystra.tokens())

    plystra.auth.refresh()
    persist_session(plystra.tokens())

    decision = plystra.authz.check(
        actor={
            "user_id": "user_alice",
            "space_id": "space_acme",
            "member_id": "member_finance_reviewer",
            "user_member_id": "um_alice_finance_reviewer",
        },
        resource_type="invoice",
        resource_id="invoice_001",
        action="approve",
    )

    print(decision["decision"])
```

Production backend usage with an API key:

```python
import os
from plystra import Plystra

with Plystra("https://plystra.internal", api_key=os.environ["PLYSTRA_API_KEY"]) as plystra:
    decision = plystra.authz.check(
        actor_user_id="user_alice",
        actor_member_id="member_finance_reviewer",
        actor_user_member_id="um_alice_finance_reviewer",
        space_id="space_acme",
        resource_type="invoice",
        resource_id="invoice_001",
        action="approve",
    )
```

Production backend usage with an access token received from your frontend or gateway:

```python
from plystra import Plystra

with Plystra("https://plystra.internal", access_token=session["plystra_access_token"]) as plystra:
    decision = plystra.authz.check(
        resource_type="invoice",
        resource_id="invoice_001",
        action="approve",
    )
```

Async client:

```python
import asyncio
from plystra import AsyncPlystra


async def main() -> None:
    async with AsyncPlystra("http://localhost:8080") as plystra:
        await plystra.auth.login("alice@example.com", "plystra-demo")
        await save_session(plystra.tokens())
        await plystra.auth.refresh()
        await save_session(plystra.tokens())

        decision = await plystra.authz.check(
            actor={
                "user_id": "user_alice",
                "space_id": "space_acme",
                "member_id": "member_finance_reviewer",
                "user_member_id": "um_alice_finance_reviewer",
            },
            resource_type="invoice",
            resource_id="invoice_001",
            action="approve",
        )
        print(decision["decision"])


asyncio.run(main())
```

Use your own `httpx` client when you need custom transport, proxies, retries, or test mocks:

```python
import httpx
from plystra import Plystra

transport = httpx.HTTPTransport(retries=2)
http = httpx.Client(transport=transport, timeout=5.0)

with Plystra("https://plystra.internal", client=http) as plystra:
    plystra.set_tokens(
        access_token="server-side-access-token",
        refresh_token="server-side-refresh-token",
    )
    print(plystra.admin.me())
```

Handle API errors:

```python
from plystra import Plystra, PlystraAPIError

try:
    with Plystra("http://localhost:8080") as plystra:
        plystra.users.get("missing_user")
except PlystraAPIError as exc:
    print(exc.status_code, exc.code, exc.request_id)
```

## Go

Install:

```bash
go get github.com/plystra/go-plystra
```

Use the client:

```go
package main

import (
	"context"
	"fmt"
	"log"

	plystra "github.com/plystra/go-plystra"
)

func main() {
	ctx := context.Background()
client := plystra.NewClient("http://localhost:8080")

if _, err := client.Auth.Login(ctx, "alice@example.com", "plystra-demo"); err != nil {
	log.Fatal(err)
}
accessToken, refreshToken := client.Tokens()
saveSession(accessToken, refreshToken)

if _, err := client.Auth.Refresh(ctx, ""); err != nil {
	log.Fatal(err)
}
accessToken, refreshToken = client.Tokens()
saveSession(accessToken, refreshToken)

decision, err := client.Authz.Check(ctx, plystra.AuthzCheckInput{
		Actor: plystra.ActorContext{
			UserID:       "user_alice",
			SpaceID:      "space_acme",
			MemberID:     "member_finance_reviewer",
			UserMemberID: "um_alice_finance_reviewer",
		},
		ResourceType: "invoice",
		ResourceID:   "invoice_001",
		Action:       "approve",
	})
	if err != nil {
		log.Fatal(err)
	}

	fmt.Println(decision["decision"])
}
```

Use an API key from a service:

```go
client := plystra.NewClient(
	"https://plystra.internal",
	plystra.WithAPIKey(os.Getenv("PLYSTRA_API_KEY")),
)

decision, err := client.Authz.Check(ctx, plystra.AuthzCheckInput{
	ResourceType: "invoice",
	ResourceID:   "invoice_001",
	Action:       "approve",
})
```

Reuse a server-side access token:

```go
client := plystra.NewClient(
	"https://plystra.internal",
	plystra.WithAccessToken(os.Getenv("PLYSTRA_ACCESS_TOKEN")),
	plystra.WithRefreshToken(os.Getenv("PLYSTRA_REFRESH_TOKEN")),
)

me, err := client.Admin.Me(ctx)
```

Handle API errors:

```go
var apiErr *plystra.APIError
if errors.As(err, &apiErr) {
	log.Printf("plystra error: status=%d code=%s request_id=%s", apiErr.StatusCode, apiErr.Code, apiErr.RequestID)
}
```

## Plugin SDK

Install:

```bash
npm install -D @plystra/plugin-sdk
```

Create and validate a plugin manifest:

```bash
npx plystra-plugin init webhooks
npx plystra-plugin validate ./webhooks/plugin.json
```

Validate a manifest from JavaScript:

```js
import { validateManifestForCore } from "@plystra/plugin-sdk";

const errors = validateManifestForCore(manifest, "1.0.0");
if (errors.length > 0) {
  throw new Error(errors.join("\n"));
}
```

The plugin validator mirrors Plystra Core v1.0 manifest checks: reverse-DNS plugin id, semantic version shape, `requires_core`, manifest/API version `1.0`, duplicate resources/actions, permission references, audit event keys, admin menu paths, and disabled `global` scopes.

## Admin Grant Model

SDK management calls use the same admin grant model as the HTTP API:

| Level | Scope | Use for |
|---|---|---|
| `instance_super_admin` | Whole instance | Bootstrap and assigning instance admins. |
| `instance_admin` | Whole instance | Instance-wide operations for a permission key. |
| `space_admin` | One Space | Space-scoped users, groups, roles, resources, audit logs. |
| `group_admin` | One Group subtree | Group-scoped resources and child groups. |

Permission keys use `domain:action`. `domain:*` covers all actions for a domain, and `domain:manage` also covers `domain:read`.

Common permission keys:

```text
instance:read
admin_grants:read
admin_grants:manage
authz:check
audit:read
users:read
users:manage
spaces:read
spaces:manage
groups:read
groups:manage
members:read
members:manage
user_members:read
user_members:manage
roles:read
roles:manage
permissions:read
permissions:manage
registry:read
registry:manage
resources:read
resources:manage
data:read
data:manage
plugins:read
plugins:manage
templates:read
templates:manage
metrics:read
api_keys:read
api_keys:create
api_keys:revoke
api_keys:manage
```
