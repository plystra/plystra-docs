---
title: Developer Handbook
description: A complete, copy-pasteable developer guide for integrating Plystra Core v1.0 into a production application.
---

This handbook is the main developer path for Plystra Core v1.0. It assumes you are adding Plystra to an application that already has business objects such as invoices, tickets, orders, documents, cases, or projects.

Use this page when you need to know exactly which records to create, which credential to use, which endpoint to call, and which authorization decision to trust. The examples use the current Core API and SDK behavior in `1.0.0-dev13`.

## What Plystra Does

Plystra Core answers one question for your backend:

```text
Can this User, acting through this Member inside this Space, perform this action on this resource?
```

Plystra is not a replacement for your application database or your existing user interface. It is the identity and authorization control plane that stores:

| Concept | Stored in Plystra | Why it matters |
|---|---|---|
| `User` | Login account and audit subject. | Shows which real person or account initiated the action. |
| `Space` | Tenant, workspace, organization, environment, or account boundary. | Prevents cross-tenant authorization. |
| `Member` | Business identity inside a Space. | Multiple Users can act through one Member, and one User can have several Member bindings. |
| `UserMember` | Binding from User to Member. | Revoked, expired, or inactive bindings deny even when roles match. |
| `Group` | Hierarchical scope inside a Space. | Used for group-tree permissions such as `finance` covering `finance.apac`. |
| `Permission` | Resource, action, and scope rule. | Example: `invoice.approve` with `group_tree` scope. |
| `Role` | Named permission bundle in a Space. | Assigned to Members through `MemberRole`. |
| `MemberRole` | Role grant for a Member, optionally anchored to a Group. | Defines where the Role applies. |
| `ResourceType` and `ResourceMapping` | Resource registry. | Tells the engine how a resource exposes `space_id`, `group_id`, owner, and status. |
| `Resource` | Core-managed resource mirror. | Lets you protect external business objects through a stable resource row. |
| `AdminGrant` | Human admin capability. | Protects Core management APIs using the same User/session model. |
| `ApiKey` | Machine credential with explicit permissions and scope. | Used for service-to-service calls. |
| `AuditLog` | Append-only decision and mutation trace. | Explains allow and deny decisions later. |

## The Minimum Production Architecture

Use this architecture unless you have a specific reason to do something else:

```text
Browser or app
  -> your frontend or gateway authenticates the user
  -> your backend receives your own application session
  -> your backend calls Plystra using either:
       a user access token for user-driven admin actions, or
       a scoped API key for service-to-service authorization checks
  -> your backend only performs the business action when Plystra returns allow
```

Do not put an API key in browser or mobile code. API keys are server-side machine secrets.

Do not trust the browser to send the actor tuple directly to Plystra. Your trusted backend should resolve the `User`, `Member`, `UserMember`, and `Space` from its own session or from a Plystra access token.

## Run Core Locally

From the Core repository:

```bash
cp .env.example .env
docker compose up -d
go run ./cmd/plystractl doctor
```

Expected doctor output:

```text
environment: development
configuration: ok
database: ok
migrations: current
schema: ok
service readiness: ok
```

Local demo credentials:

```text
alice@example.com / plystra-demo
bob@example.com / plystra-demo
```

The demo seed makes Alice an instance super admin for local development. In a clean production-like instance, use the bootstrap command described below.

## Bootstrap the First Instance Super Admin

Plystra does not use an admin token. Management APIs are protected by user sessions and scoped admin grants.

The first admin is a normal `User` with one `AdminGrant`:

```text
level = instance_super_admin
permission_key = *
```

If no active instance super admin exists, bootstrap one with:

```bash
go run ./cmd/plystractl admin bootstrap-super-admin --user-id <existing_user_id>
```

Optional flags:

```bash
go run ./cmd/plystractl admin bootstrap-super-admin \
  --user-id user_ops_owner \
  --member-id member_ops_owner \
  --grant-id ag_user_ops_owner_instance_super_admin
```

The command refuses to run if an active `instance_super_admin` grant already exists. After that point, use the AdminGrant API to create, narrow, and revoke admin access.

## Choose the Right Credential

Pick exactly one credential pattern per call path.

| Use case | Credential | Where to store it | Notes |
|---|---|---|---|
| User-driven Core admin UI | Bearer access token from `/api/v1/auth/login` | Encrypted server-side session or secure backend token store. | The User must have an active `AdminGrant`. |
| Backend authorization checks for application traffic | Scoped API key | Secret manager, environment injection, or workload identity secret. | Must include `authz:check`; API key calls must provide `actor`. |
| Backend management automation | Scoped API key | Secret manager. | Grant only the required permission keys and scope. |
| One-off bootstrap or local demo | Password login | Local dev only. | SDKs retain password login, but it should not be the routine backend pattern. |
| Browser/mobile direct use | None for API keys | Never store API keys client-side. | Browser clients should talk to your backend, not directly to management APIs. |

## The Authorization Contract

The canonical HTTP request is:

```json
{
  "actor": {
    "user_id": "user_alice",
    "member_id": "member_finance_reviewer",
    "user_member_id": "um_alice_finance_reviewer",
    "space_id": "space_acme"
  },
  "resource_type": "invoice",
  "resource_id": "invoice_001",
  "action": "approve"
}
```

Required fields:

| Field | Required when | Meaning |
|---|---|---|
| `actor.user_id` | Always for API key calls. Optional for Bearer session calls. | Real login/audit user. |
| `actor.member_id` | Always for API key calls. Optional for Bearer session calls. | Business actor in the Space. |
| `actor.user_member_id` | Always for API key calls. Optional for Bearer session calls. | Active binding proving the User may act as the Member. |
| `actor.space_id` | Always for API key calls. Optional for Bearer session calls. | Tenant boundary. |
| `resource_type` | Always, unless you use `resource.type`. | Registered resource type key. |
| `resource_id` | Always, unless you use `resource.id`. | Core resource id. |
| `action` | Always. | Action key registered under the resource type. |

Bearer session calls may omit `actor`; Core uses the session's active actor chosen during login or by `POST /api/v1/actor/switch-member`.

API key calls must include `actor`; Core cannot infer a human actor from a machine key.

HTTP authz requests must not include body `request_id`, `ip`, or `user_agent`. Core derives the canonical request id, IP, and user agent from middleware and the HTTP request.

## Decision Semantics

Core allows a request only when all of these are true:

1. The `User` exists and is active.
2. The `Space` exists and is active.
3. The `Member` exists, is active, and belongs to the same Space.
4. The `UserMember` exists, is active, belongs to the same User, Member, and Space, and is not expired or revoked.
5. The resource type and action are registered and active.
6. The target resource exists and is active.
7. The target resource belongs to the same Space as the actor.
8. At least one active role grant gives the Member the requested permission.
9. The permission scope covers the target resource.

The important deny codes for application developers are:

| Code | Typical cause | What to fix |
|---|---|---|
| `ACTOR_NOT_FOUND` | Actor ids do not resolve. | Check User, Member, UserMember, and Space ids. |
| `USER_INACTIVE` | User is disabled or deleted. | Restore or use another User. |
| `USER_MEMBER_REVOKED` | Binding was revoked, disabled, or expired. | Create or restore an active UserMember binding. |
| `SPACE_MISMATCH` | Actor and target resource are in different Spaces. | Do not cross tenant boundaries. |
| `RESOURCE_NOT_FOUND` | Resource row is missing or inactive. | Register or restore the resource. |
| `NO_MATCHING_PERMISSION` | No active Role/Permission candidate matches resource and action. | Grant a Role with the required Permission. |
| `SCOPE_OUT_OF_BOUNDS` | Role exists but its scope anchor does not cover the target. | Move the resource, adjust group anchor, or add a narrower grant. |
| `GLOBAL_SCOPE_DISABLED` | `global` scope is disabled in v1.0. | Use `space`, `group_tree`, or `self`. |

## Scope Rules

| Permission scope | Covers | Requires |
|---|---|---|
| `space` | Any target resource in the actor Space. | Actor and resource must share `space_id`. |
| `group_tree` | Target group equals anchor group or is a descendant. | `MemberRole.scope_anchor_group_id` and target `group_id`. |
| `self` | Target resource owner equals actor Member. | Resource mapping must expose `owner_member_id`. |
| `global` | Disabled in v1.0. | Do not use for production permissions. |

For `group_tree`, the rule is exact path match or safe dot-prefix:

```text
target_path = anchor_path OR target_path starts with anchor_path + "."
```

That means `finance` covers `finance.apac`, but does not cover `financeops`.

## Copy-Paste Integration Path

The following path creates a minimal `invoice.approve` authorization setup. It assumes:

```bash
export PLYSTRA_URL=http://localhost:8080
export PLYSTRA_TOKEN=<alice-or-super-admin-access-token>
```

### 1. Log In as an Admin

```bash
curl -s -X POST "$PLYSTRA_URL/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"alice@example.com","password":"plystra-demo"}'
```

Store the returned `data.access_token` in `PLYSTRA_TOKEN`.

### 2. Register the Resource Type

```bash
curl -s -X POST "$PLYSTRA_URL/api/v1/resource-types" \
  -H "Authorization: Bearer $PLYSTRA_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "rt_invoice",
    "key": "invoice",
    "display_name": "Invoice",
    "description": "Invoices mirrored from the billing system",
    "source": "core"
  }'
```

### 3. Register the Action

```bash
curl -s -X POST "$PLYSTRA_URL/api/v1/resource-types/invoice/actions" \
  -H "Authorization: Bearer $PLYSTRA_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "ra_invoice_approve",
    "key": "approve",
    "display_name": "Approve invoice",
    "risk_level": "high",
    "audit_default": true
  }'
```

### 4. Register the Mapping

For Core-managed resources, use the internal `resources` table mapping:

```bash
curl -s -X POST "$PLYSTRA_URL/api/v1/resource-types/invoice/mapping" \
  -H "Authorization: Bearer $PLYSTRA_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "rm_invoice",
    "storage_kind": "internal_table",
    "table_name": "resources",
    "id_field": "id",
    "space_field": "space_id",
    "group_field": "group_id",
    "owner_member_field": "owner_member_id",
    "visibility_field": "visibility",
    "metadata_field": "metadata",
    "status": "active"
  }'
```

### 5. Create the Space

```bash
curl -s -X POST "$PLYSTRA_URL/api/v1/spaces" \
  -H "Authorization: Bearer $PLYSTRA_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "space_acme",
    "name": "Acme",
    "slug": "acme",
    "type": "customer",
    "status": "active"
  }'
```

### 6. Create Groups

```bash
curl -s -X POST "$PLYSTRA_URL/api/v1/spaces/space_acme/groups" \
  -H "Authorization: Bearer $PLYSTRA_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "group_finance",
    "name": "Finance",
    "path": "finance"
  }'

curl -s -X POST "$PLYSTRA_URL/api/v1/spaces/space_acme/groups" \
  -H "Authorization: Bearer $PLYSTRA_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "group_finance_apac",
    "parent_group_id": "group_finance",
    "name": "APAC",
    "path": "finance.apac"
  }'
```

### 7. Create User, Member, and UserMember

Create a User:

```bash
curl -s -X POST "$PLYSTRA_URL/api/v1/users" \
  -H "Authorization: Bearer $PLYSTRA_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "user_alice",
    "email": "alice@example.com",
    "password": "plystra-demo",
    "status": "active"
  }'
```

Create a Member in the Space:

```bash
curl -s -X POST "$PLYSTRA_URL/api/v1/spaces/space_acme/members" \
  -H "Authorization: Bearer $PLYSTRA_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "member_finance_reviewer",
    "display_name": "Finance Reviewer",
    "member_type": "human",
    "status": "active"
  }'
```

Bind the User to the Member:

```bash
curl -s -X POST "$PLYSTRA_URL/api/v1/spaces/space_acme/user-members" \
  -H "Authorization: Bearer $PLYSTRA_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "um_alice_finance_reviewer",
    "user_id": "user_alice",
    "member_id": "member_finance_reviewer",
    "relation_type": "login",
    "is_primary": true,
    "status": "active"
  }'
```

### 8. Create Permission, Role, and Grants

Create a Permission:

```bash
curl -s -X POST "$PLYSTRA_URL/api/v1/permissions" \
  -H "Authorization: Bearer $PLYSTRA_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "perm_invoice_approve_group_tree",
    "resource": "invoice",
    "action": "approve",
    "scope": "group_tree",
    "description": "Approve invoices within a group subtree"
  }'
```

Create a Role:

```bash
curl -s -X POST "$PLYSTRA_URL/api/v1/spaces/space_acme/roles" \
  -H "Authorization: Bearer $PLYSTRA_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "role_finance_approver",
    "key": "finance_approver",
    "name": "Finance Approver"
  }'
```

Attach the Permission to the Role:

```bash
curl -s -X POST "$PLYSTRA_URL/api/v1/role-permissions" \
  -H "Authorization: Bearer $PLYSTRA_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "rp_finance_approver_invoice_approve",
    "role_id": "role_finance_approver",
    "permission_id": "perm_invoice_approve_group_tree"
  }'
```

Grant the Role to the Member, anchored at `group_finance`:

```bash
curl -s -X POST "$PLYSTRA_URL/api/v1/spaces/space_acme/member-role-grants" \
  -H "Authorization: Bearer $PLYSTRA_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "mr_finance_reviewer_approver",
    "member_id": "member_finance_reviewer",
    "role_id": "role_finance_approver",
    "scope_anchor_group_id": "group_finance",
    "status": "active"
  }'
```

### 9. Register the Target Resource

```bash
curl -s -X POST "$PLYSTRA_URL/api/v1/resources" \
  -H "Authorization: Bearer $PLYSTRA_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "invoice_001",
    "space_id": "space_acme",
    "resource_type": "invoice",
    "external_id": "billing-system-invoice-001",
    "group_id": "group_finance_apac",
    "owner_member_id": "member_finance_reviewer",
    "display_name": "Invoice 001",
    "visibility": "private",
    "status": "active"
  }'
```

### 10. Check Authorization

Using an API key:

```bash
curl -s -X POST "$PLYSTRA_URL/api/v1/authz/check" \
  -H "X-Plystra-API-Key: $PLYSTRA_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "actor": {
      "user_id": "user_alice",
      "member_id": "member_finance_reviewer",
      "user_member_id": "um_alice_finance_reviewer",
      "space_id": "space_acme"
    },
    "resource_type": "invoice",
    "resource_id": "invoice_001",
    "action": "approve"
  }'
```

Using a Bearer access token and the session active actor:

```bash
curl -s -X POST "$PLYSTRA_URL/api/v1/authz/check" \
  -H "Authorization: Bearer $PLYSTRA_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "resource_type": "invoice",
    "resource_id": "invoice_001",
    "action": "approve"
  }'
```

An allow response has `data.decision` equal to `allow`. A deny response still returns a decision object when the request is valid, with `decision = deny` and a `deny_code`.

## Creating API Keys Safely

A caller can create an API key only when it has `api_keys:create` for the target scope. The caller can only delegate permission keys it already holds for that same target scope.

Create a Space-scoped API key for a billing service:

```bash
curl -s -X POST "$PLYSTRA_URL/api/v1/api-keys" \
  -H "Authorization: Bearer $PLYSTRA_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "ak_billing_service_prod",
    "name": "billing-service-prod",
    "level": "space",
    "space_id": "space_acme",
    "permission_keys": ["authz:check", "resources:read"],
    "expires_at": "2026-12-31T23:59:59Z"
  }'
```

The response returns `data.api_key` exactly once. Store it in your secret manager immediately.

Production rules:

- Use the narrowest level: prefer `group` over `space`, and `space` over `instance`.
- Grant only required permission keys.
- Set an expiration for service keys.
- Rotate keys by creating a new key, deploying it, verifying traffic, then revoking the old key.
- Never use API keys to create human admin grants. Core rejects AdminGrant create/revoke through API key credentials.

## Admin Grants

Admin grants protect Core management APIs. They do not grant business resource permissions by themselves.

| Level | Scope | Can create instance admins? | Typical use |
|---|---|---|---|
| `instance_super_admin` | Whole instance | Yes | Owner bootstrap and break-glass operations. |
| `instance_admin` | Whole instance, permission-key limited | No, unless also super. | Platform operator for specific domains. |
| `space_admin` | One Space | No | Tenant admin. |
| `group_admin` | One Group subtree | No | Department or folder admin. |

Create a Space admin that can read users in one Space:

```bash
curl -s -X POST "$PLYSTRA_URL/api/v1/admin/grants" \
  -H "Authorization: Bearer $PLYSTRA_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "user_ops",
    "level": "space_admin",
    "space_id": "space_acme",
    "permission_key": "users:read"
  }'
```

Only a user session can create or revoke AdminGrants. API keys cannot create or revoke human admin grants, even when they hold `admin_grants:manage`.

Core prevents revoking the last active instance super admin grant.

## Permission Key Rules

Permission keys are lowercase `domain:action` strings.

Valid examples:

```text
users:read
users:manage
api_keys:create
admin_grants:manage
resources:read
resources:manage
authz:check
```

Special matching rules:

| Grant key | Covers |
|---|---|
| `*` | Everything, but only meaningful for trusted human instance grants. |
| `domain:*` | All actions in that domain. |
| `domain:manage` | All actions in that domain, including `domain:read`. |
| Exact key | Only that key. |

Invalid examples:

```text
*:read
Users:read
users
users:
users:read/write
users:read:extra
```

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

## Production Checklist for Developers

Before you ship an integration:

- Run `go run ./cmd/plystractl doctor` against the target database.
- Set strong `PLYSTRA_SESSION_SECRET` and `PLYSTRA_API_KEY_SECRET`.
- Do not use wildcard CORS in production.
- Keep API keys out of frontend and mobile clients.
- Create at least two human instance super admins.
- Grant operators only the domains and scopes they need.
- Use `space_admin` and `group_admin` instead of instance grants whenever possible.
- Confirm `authz.check` allow and deny cases in automated tests.
- Test cross-space denial.
- Test sibling-group denial for group admins.
- Test revoked `UserMember` denial.
- Test revoked and expired API keys.
- Keep `Data Console` disabled unless you explicitly need it.
- Keep `/metrics` disabled or protected with `METRICS_TOKEN`.
- Store `X-Request-ID` from responses in application logs.
- Store `trace_id` and `audit_log_id` when returned on authorization errors.

## Troubleshooting

| Symptom | Most likely cause | Check |
|---|---|---|
| `AUTHENTICATION_REQUIRED` on a management route | Missing or expired Bearer token/API key. | Verify `Authorization` or `X-Plystra-API-Key`. |
| `ADMIN_PERMISSION_REQUIRED` while creating API key | Caller lacks `api_keys:create` or is delegating unheld permissions. | Call `GET /api/v1/admin/me`. |
| `SCOPE_OUT_OF_BOUNDS` | Role grant exists but anchor group does not cover target group. | Compare group paths and `scope_anchor_group_id`. |
| API key authz check fails because actor is missing | API key cannot infer actor. | Send full nested `actor`. |
| Bearer authz check uses wrong Member | Session active actor is not the intended Member. | Call `GET /api/v1/actor/context` then `POST /api/v1/actor/switch-member`. |
| User API returned no password hash | Correct behavior. | `password_hash` is never exposed in API responses. |
| Data routes return 404 | Data Console is disabled. | Set `DATA_CONSOLE_ENABLED=true` only if you need it. |
| Metrics returns 404 | Metrics are disabled. | Set `METRICS_ENABLED=true` and protect with token. |

## Related Pages

- [HTTP API](/guides/http-api/)
- [SDKs](/guides/sdks/)
- [Identity and Scope](/concepts/identity-and-scope/)
- [Resource Registry](/reference/resource-registry/)
- [Admin Auth and Security](/reference/admin-auth-and-security/)
- [Self-hosting](/guides/self-hosting/)
