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

For `authz.check`, API key clients must pass the nested `actor`. Access-token clients may omit it when they want Core to use the token's active actor.

Context Mode is also available through every SDK: send inline `actor`, `resource`, and `grants` from trusted server code with an API key. Do not build those fields from browser-submitted JSON.

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

All management modules require either a Bearer session whose user has an active admin grant or a scoped API key with matching permission keys.

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

Attach an application request id to all calls made through a scoped client:

```ts
const scoped = plystra.withRequestId("req_01HY...");

const decision = await scoped.authz.check({
  resource_type: "invoice",
  resource_id: "invoice_001",
  action: "approve",
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

Attach an application request id to all calls made through a scoped client:

```python
with Plystra("https://plystra.internal", access_token=session["plystra_access_token"]) as plystra:
    scoped = plystra.with_request_id("req_01HY...")
    decision = scoped.authz.check(
        resource_type="invoice",
        resource_id="invoice_001",
        action="approve",
    )
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
		Actor: &plystra.ActorContext{
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
	Actor: &plystra.ActorContext{
		UserID:       "user_alice",
		SpaceID:      "space_acme",
		MemberID:     "member_finance_reviewer",
		UserMemberID: "um_alice_finance_reviewer",
	},
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

Attach an application request id to every SDK call using the Go context:

```go
ctx = plystra.WithRequestID(ctx, "req_01HY...")
decision, err := client.Authz.Check(ctx, plystra.AuthzCheckInput{
	ResourceType: "invoice",
	ResourceID:   "invoice_001",
	Action:       "approve",
})
```

Handle API errors:

```go
var apiErr *plystra.APIError
if errors.As(err, &apiErr) {
	log.Printf("plystra error: status=%d code=%s request_id=%s", apiErr.StatusCode, apiErr.Code, apiErr.RequestID)
}
```

## Production Credential Patterns

Use these patterns consistently across languages.

| Pattern | TypeScript | Python | Go |
|---|---|---|---|
| Existing user access token | `new PlystraClient({ baseUrl, accessToken })` | `Plystra(base_url, access_token=token)` | `plystra.NewClient(baseURL, plystra.WithAccessToken(token))` |
| Existing refresh token | `refreshToken` option, then `auth.refresh()` | `refresh_token=` option, then `auth.refresh()` | `WithRefreshToken(token)`, then `Auth.Refresh(ctx, "")` |
| Server API key | `new PlystraClient({ baseUrl, apiKey })` | `Plystra(base_url, api_key=key)` | `plystra.NewClient(baseURL, plystra.WithAPIKey(key))` |
| Password login | `auth.login({ email, password })` | `auth.login(email, password)` | `Auth.Login(ctx, email, password)` |
| Custom HTTP transport | `fetchImpl`, `timeoutMs`, `defaultHeaders` | pass `httpx.Client` or `httpx.AsyncClient` | `WithHTTPClient`, `WithHeader`, `WithUserAgent` |
| Per-request request id | `client.withRequestId(id)` or `requestEnvelope(..., { requestId })` | `client.with_request_id(id)` or `request(..., request_id=id)` | `plystra.WithRequestID(ctx, id)` |

Recommended production split:

- Frontend or gateway performs login and stores tokens in your own secure session flow.
- Backend services receive an access token from the secure session when performing user-driven Core operations.
- Backend services use API keys for service-to-service authorization checks and automation.
- Password login remains available for admin tools and bootstrap flows, but routine authorization checks should not replay passwords.

## Authz Check Rules in SDKs

The SDKs do not hide the Core authz contract:

```text
API key client -> must send actor
access-token client -> may omit actor to use the session active actor
```

With API key:

```ts
await plystra.authz.check({
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
```

With API key and Context Mode:

```ts
await plystra.authz.check({
  actor: {
    user_id: "user_external_alice",
    member_id: "member_finance_reviewer",
    binding_id: "binding_external_alice_finance",
    space_id: "space_acme",
    user_email: "alice@example.com",
  },
  resource: {
    type: "invoice",
    external_id: "invoice_001",
    space_id: "space_acme",
    group_path: "finance.apac",
    owner_member_id: "member_invoice_creator",
  },
  grants: [
    {
      role_key: "finance_approver",
      resource: "invoice",
      action: "approve",
      scope: "group_tree",
      space_id: "space_acme",
      scope_anchor_group_path: "finance",
    },
  ],
  action: "approve",
});
```

Python and Go use the same JSON field names. In Go, use `AuthzResourceContext` and `AuthzGrantContext`:

```go
decision, err := client.Authz.Check(ctx, plystra.AuthzCheckInput{
	Actor: &plystra.ActorContext{
		UserID:    "user_external_alice",
		MemberID:  "member_finance_reviewer",
		BindingID: "binding_external_alice_finance",
		SpaceID:   "space_acme",
	},
	Resource: &plystra.AuthzResourceContext{
		Type:          "invoice",
		ExternalID:    "invoice_001",
		SpaceID:       "space_acme",
		GroupPath:     "finance.apac",
		OwnerMemberID: "member_invoice_creator",
	},
	Grants: []plystra.AuthzGrantContext{{
		RoleKey:              "finance_approver",
		Resource:             "invoice",
		Action:               "approve",
		Scope:                "group_tree",
		SpaceID:              "space_acme",
		ScopeAnchorGroupPath: "finance",
	}},
	Action: "approve",
})
```

With access token:

```ts
await plystra.authz.check({
  resource_type: "invoice",
  resource_id: "invoice_001",
  action: "approve",
});
```

If the access token has the wrong active Member, call:

```ts
await plystra.actor.context();
await plystra.actor.switchMember({
  member_id: "member_finance_reviewer",
  user_member_id: "um_alice_finance_reviewer",
});
```

## SDK Module Map

The three SDKs expose the same Core modules with language-specific naming.

| Core area | TypeScript | Python sync/async | Go |
|---|---|---|---|
| System | `system.version()`, `health()`, `ready()` | `system.version()`, `health()`, `ready()` | `System.Version`, `Health`, `Ready` |
| Auth | `auth.login()`, `refresh()`, `logout()` | `auth.login()`, `refresh()`, `logout()` | `Auth.Login`, `Refresh`, `Logout` |
| Actor | `actor.context()`, `switchMember()` | `actor.context()`, `switch_member()` | `Actor.Context`, `SwitchMember` |
| Admin grants | `admin.me()`, `listGrants()`, `getGrant()`, `createGrant()`, `revokeGrant()` | `admin.me()`, `list_grants()`, `get_grant()`, `create_grant()`, `revoke_grant()` | `Admin.Me`, `ListGrants`, `GetGrant`, `CreateGrant`, `RevokeGrant` |
| API keys | `apiKeys.list()`, `create()`, `get()`, `revoke()` | `api_keys.list()`, `create()`, `get()`, `revoke()` | `APIKeys.List`, `Create`, `Get`, `Revoke` |
| Authorization | `authz.check()`, `explain()` | `authz.check()`, `explain()` | `Authz.Check`, `Explain` |
| Audit | `audit.list()`, `get()` | `audit.list()`, `get()` | `Audit.List`, `Get` |
| Users | `users.list()`, `create()`, `get()`, `update()`, `disable()`, `restore()` | same snake_case module methods | `Users.List`, `Create`, `Get`, `Update`, `Disable`, `Restore` |
| Spaces | `spaces.list()`, `create()`, `get()`, `update()`, `disable()`, `restore()`, relation helpers | same snake_case module methods | `Spaces.List`, `Create`, `Get`, `Update`, `Disable`, `Restore`, relation helpers |
| Groups | `groups.create()`, `get()`, `getInSpace()`, `update()`, `disable()` | `groups.create()`, `get()`, `get_in_space()`, `update()`, `disable()` | `Groups.Create`, `Get`, `GetInSpace`, `Update`, `Disable` |
| Members | `members.create()`, `get()`, `update()`, `disable()` | same snake_case module methods | `Members.Create`, `Get`, `Update`, `Disable` |
| UserMembers | `userMembers.create()`, `get()`, `update()`, `revoke()` | `user_members.create()`, `get()`, `update()`, `revoke()` | `UserMembers.Create`, `Get`, `Update`, `Revoke` |
| Roles | `roles.create()`, `get()`, `update()`, `disable()` | same snake_case module methods | `Roles.Create`, `Get`, `Update`, `Disable` |
| Member roles | `memberRoles.list()`, `create()`, `get()`, `revoke()` | `member_roles.list()`, `create()`, `get()`, `revoke()` | `MemberRoles.List`, `Create`, `Get`, `Revoke` |
| Permissions | `permissions.list()`, `create()`, `get()`, `update()`, `disable()` | same snake_case module methods | `Permissions.List`, `Create`, `Get`, `Update`, `Disable` |
| Role permissions | `rolePermissions.list()`, `create()`, `get()`, `revoke()` | `role_permissions.list()`, `create()`, `get()`, `revoke()` | `RolePermissions.List`, `Create`, `Get`, `Revoke` |
| Resource registry | `resourceTypes.list()`, `upsert()`, `actions()`, `upsertAction()`, `mapping()`, `upsertMapping()` | `resource_types.*` snake_case methods | `ResourceTypes.*` |
| Resources | `resources.list()`, `create()`, `get()`, `update()`, `archive()` | `resources.*` snake_case methods | `Resources.*` |
| Data Console preview | `data.tables()`, `listRows()`, `getRow()`, `createRow()`, `updateRow()`, `deleteRow()` | `data.*` snake_case methods | `Data.*` |
| Plugin metadata preview | `plugins.list()`, `get()`, `install()`, `validateManifest()`, lifecycle, resources, permissions, audit events, admin menu, settings | `plugins.*` snake_case methods | `Plugins.*` |
| Template metadata preview | `templates.list()`, `get()`, `previewInstall()`, `install()` | `templates.*` snake_case methods | `Templates.*` |

Data Console calls require `DATA_CONSOLE_ENABLED=true` and are disabled by default in Core. Plugin and template modules wrap preview metadata APIs; they do not imply a stable plugin runtime, third-party marketplace, or template ecosystem. Metrics are not wrapped as normal JSON SDK methods because `/metrics` returns Prometheus text.

## Error Handling Contract

All SDKs unwrap the Core JSON envelope and raise or return typed API errors.

| Language | Error type | Important fields |
|---|---|---|
| TypeScript | `PlystraApiError`, `PlystraAuthError`, `PlystraAuthorizationError`, `PlystraValidationError`, `PlystraNetworkError`, `PlystraTimeoutError` | `status`, `code`, `details`, `requestId`, `traceId`, `auditLogId` |
| Python | `PlystraAPIError`, `PlystraAuthError`, `PlystraAuthorizationError`, `PlystraValidationError`, `PlystraNetworkError`, `PlystraTimeoutError` | `status_code`, `code`, `details`, `request_id`, `trace_id`, `audit_log_id` |
| Go | `*plystra.APIError` | `StatusCode`, `Code`, `Message`, `Details`, `RequestID`, `TraceID`, `AuditLogID` |

Treat `authz.check` deny decisions as successful responses. Convert them to your own application `403` after reading `decision` and `deny_code`.

## Release Compatibility

The v1.0 SDKs target the Core v1 HTTP envelope and current management API. Keep SDK and Core versions aligned during the `1.0.0-rc*` phase. When you upgrade Core, upgrade SDKs in the same release window and run:

```text
system.version
auth.login / refresh
admin.me
api_keys.create / revoke
authz.check allow
authz.check deny
audit.list
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
