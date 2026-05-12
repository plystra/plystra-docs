---
title: HTTP API
description: Current v1.0 HTTP API behavior, authentication, response envelopes, protected routes, and endpoint groups.
---

Plystra Core exposes a `/api/v1` HTTP API. The OpenAPI artifacts live in the Core repository:

```text
openapi/plystra.v1.0.0.yaml
openapi/plystra.v1.0.0.json
```

The artifacts are generated from the current Go API contract with `swaggest/openapi-go`. They include request bodies, response envelopes, security schemes, endpoint tags, and grouped API sections.

If you want to connect an application rather than browse every endpoint, start with [Integrate Your App](/guides/integrate-your-app/). It gives the full object setup and backend guard flow first, then this page can be used as a reference.

## Response Envelope

Successful single-object responses:

```json
{
  "data": {},
  "request_id": "req_..."
}
```

List responses include pagination:

```json
{
  "data": [],
  "pagination": {
    "limit": 50,
    "cursor": null,
    "has_more": false
  },
  "request_id": "req_..."
}
```

Errors:

```json
{
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "Request body is invalid JSON.",
    "details": null,
    "request_id": "req_..."
  },
  "request_id": "req_..."
}
```

`X-Request-ID` is accepted. If omitted, middleware generates a request ID.

## Authentication Layers

| Layer | Applies to | How it works |
|---|---|---|
| Public operational routes | health, ready, version | No token required. |
| Session auth | login, refresh, logout, actor context, switch-member | Uses login credentials and opaque bearer tokens stored as HMAC hashes. |
| Admin grant protection | non-public Core APIs | Requires `Authorization: Bearer <access_token>` for a user with an active admin grant. |
| API key protection | non-public Core APIs for services | Use `X-Plystra-API-Key: <api_key>` or `Authorization: Bearer ply_ak_...`. API keys are scoped and permission-key based. |
| Metrics token | `/metrics` when enabled | Requires `METRICS_TOKEN` / `PLYSTRA_METRICS_TOKEN`, or a Bearer session with `metrics:read`. |

If a protected route is called without a valid session or API key, Core returns `AUTHENTICATION_REQUIRED`. If the credential lacks the needed permission, Core returns `ADMIN_PERMISSION_REQUIRED`.

## Public Routes

| Method | Path |
|---|---|
| `GET` | `/api/v1/health` |
| `GET` | `/api/v1/ready` |
| `GET` | `/api/v1/version` |

`/metrics` is routed publicly so the metrics handler can return `FEATURE_DISABLED` or validate a metrics token. It is disabled by default.

## Session Routes

| Method | Path | Notes |
|---|---|---|
| `POST` | `/api/v1/auth/register` | Protected registration endpoint. Disabled by default and requires registration tokens when enabled. |
| `POST` | `/api/v1/auth/login` | Accepts `email` and `password`; returns access and refresh tokens. |
| `POST` | `/api/v1/auth/refresh` | Accepts `refresh_token`; rotates both access and refresh tokens. |
| `POST` | `/api/v1/auth/logout` | Revokes by bearer access token or body refresh token. |
| `GET` | `/api/v1/actor/context` | Requires access token. Returns active actor and available members. |
| `POST` | `/api/v1/actor/switch-member` | Requires access token. Switches active Member/UserMember binding. |

Login failures are rate-limited by normalized email and source IP. Passwords are stored and verified with Argon2id. Changing a User password revokes existing sessions for that User.

Demo credentials seeded for local development:

```text
alice@example.com / plystra-demo
bob@example.com / plystra-demo
```

## Authorization Routes

| Method | Path | Notes |
|---|---|---|
| `POST` | `/api/v1/authz/check` | Runs a decision and writes audit. |
| `POST` | `/api/v1/authz/explain` | Same check with explain enabled. |

Example:

```bash
curl -X POST http://localhost:8080/api/v1/authz/check \
  -H "Content-Type: application/json" \
  -H "X-Plystra-API-Key: $PLYSTRA_API_KEY" \
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

HTTP authz does not accept body `request_id`, `ip`, or `user_agent`; canonical values are server-derived.

API key calls must send the nested `actor`. Bearer session calls may omit `actor`, in which case Core uses the session's active actor.

## Core Management Routes

All routes in this section require either `Authorization: Bearer <access_token>` with an active admin grant or `X-Plystra-API-Key: <api_key>` with matching API key permissions. `instance_super_admin` allows everything for user sessions. `instance_admin` is permission-key scoped, `space_admin` is limited to one Space, and `group_admin` is limited to one Group subtree. API keys use `instance`, `space`, and `group` scopes.

For the full route permission matrix and anti-escalation rules, see [Admin Auth and Security](/reference/admin-auth-and-security/). That page is the source of truth for who can create API keys, who can create AdminGrants, and how instance, Space, and Group scopes are enforced.

| Group | Routes |
|---|---|
| Admin grants | `GET /api/v1/admin/me`, `GET/POST /api/v1/admin/grants`, `GET /api/v1/admin/grants/{id}`, `POST /api/v1/admin/grants/{id}/revoke` |
| API keys | `GET/POST /api/v1/api-keys`, `GET /api/v1/api-keys/{id}`, `POST /api/v1/api-keys/{id}/revoke` |
| Overview | `GET /api/v1/console/overview` |
| AuditLog | `GET /api/v1/audit/logs`, `GET /api/v1/audit/logs/{id}` |
| Resource Registry | `GET/POST /api/v1/resource-types`, `GET /api/v1/resource-types/{key}`, `GET/POST /api/v1/resource-types/{key}/actions`, `GET/POST/PATCH/PUT /api/v1/resource-types/{key}/mapping` |
| Users | `GET/POST /api/v1/users`, `GET/PATCH /api/v1/users/{id}`, `POST /api/v1/users/{id}/disable`, `POST /api/v1/users/{id}/restore` |
| Spaces | `GET/POST /api/v1/spaces`, `GET/PATCH /api/v1/spaces/{id}`, `POST /api/v1/spaces/{id}/disable`, `POST /api/v1/spaces/{id}/restore` |
| Nested Space objects | `/api/v1/spaces/{space_id}/groups`, `/members`, `/user-members`, `/roles`, `/member-roles`, `/member-role-grants`, `/resources`, `/audit-logs` |
| Direct details | `GET /api/v1/groups/{id}`, `GET /api/v1/members/{id}`, `GET /api/v1/user-members/{id}`, `GET /api/v1/roles/{id}` |
| Permissions | `GET/POST /api/v1/permissions`, `GET/PATCH /api/v1/permissions/{id}`, `POST /api/v1/permissions/{id}/disable` |
| Role permissions | `GET/POST /api/v1/role-permissions`, `GET/DELETE /api/v1/role-permissions/{id}` |
| Resources | `GET/POST /api/v1/resources`, `GET /api/v1/resources/{resource_type}/{resource_id}` |
| Plugins | `POST /api/v1/plugins/validate-manifest`, `POST /api/v1/plugins/install`, `GET /api/v1/plugins`, `GET /api/v1/plugins/{key}`, lifecycle and metadata subroutes |
| Templates | `GET /api/v1/templates`, `GET /api/v1/templates/{id}`, `POST /api/v1/templates/{id}/preview-install`, `POST /api/v1/templates/{id}/install` |

User responses are sanitized and do not return `password_hash`.

API key creation returns plaintext `api_key` once. Store it in a secret manager. Core stores only HMAC hashes. The required permission to create keys is `api_keys:create`; use `api_keys:read`, `api_keys:revoke`, or `api_keys:manage` for read/revoke/administration. A caller can only place permission keys on a new API key if the caller already holds those permissions for the target scope.

## Data Console Preview Routes

Data Console is not a v1.0 blocking surface and is disabled by default:

```text
DATA_CONSOLE_ENABLED=false
```

When enabled and admin-protected:

| Method | Path |
|---|---|
| `GET` | `/api/v1/data/tables` |
| `GET/POST` | `/api/v1/data/rows/{resource_type}` |
| `GET/PATCH/DELETE` | `/api/v1/data/rows/{resource_type}/{resource_id}` |

Mutations currently support `internal_table` mappings backed by the Core `resources` table. Mutations run authorization checks and return both the changed row and the authorization decision.

## Metrics

Metrics are disabled by default:

```text
METRICS_ENABLED=false
```

When enabled, `/metrics` returns Prometheus text and requires a metrics token or a Bearer session with `metrics:read`.
