---
title: HTTP API
description: Current v1.0 HTTP API behavior, authentication, response envelopes, protected routes, and endpoint groups.
---

Plystra Core exposes a `/api/v1` HTTP API. The OpenAPI artifacts live in the Core repository:

```text
openapi/plystra.v1.0.0.yaml
openapi/plystra.v1.0.0.json
```

If you want to connect an application rather than browse every endpoint, start with [Integrate Your App](/guides/integrate-your-app/). It gives the full object setup and backend guard flow first, then this page can be used as a reference.

## Response Envelope

Successful single-object responses:

```json
{
  "data": {},
  "meta": {
    "request_id": "req_..."
  },
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
  "meta": {
    "request_id": "req_..."
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
  "meta": {
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
| Admin bootstrap protection | non-public Core APIs | Requires `X-Plystra-Admin-Token`, `X-Admin-Token`, or `Authorization: Bearer <admin-token>`. |
| Metrics token | `/metrics` when enabled | Requires `METRICS_TOKEN` / `PLYSTRA_METRICS_TOKEN`, or admin token fallback. |

If a protected route is called with no configured admin token, Core returns `ADMIN_TOKEN_NOT_CONFIGURED`. If a token is configured but missing or invalid, Core returns `ADMIN_TOKEN_REQUIRED`.

## Public Routes

| Method | Path |
|---|---|
| `GET` | `/api/v1/health` |
| `GET` | `/api/v1/ready` |
| `GET` | `/api/v1/version` |
| `GET` | `/api/v1/system/health` |
| `GET` | `/api/v1/system/ready` |
| `GET` | `/api/v1/system/version` |
| `GET` | `/system/health` |
| `GET` | `/system/ready` |
| `GET` | `/system/version` |

`/metrics` is routed publicly so the metrics handler can return `FEATURE_DISABLED` or validate a metrics token. It is disabled by default.

## Session Routes

| Method | Path | Notes |
|---|---|---|
| `POST` | `/api/v1/auth/login` | Accepts `email` and `password`; returns access and refresh tokens. |
| `POST` | `/api/v1/auth/refresh` | Accepts `refresh_token`; rotates the access token. |
| `POST` | `/api/v1/auth/logout` | Revokes by bearer access token or body refresh token. |
| `GET` | `/api/v1/actor/context` | Requires access token. Returns active actor and available members. |
| `POST` | `/api/v1/actor/switch-member` | Requires access token. Switches active Member/UserMember binding. |

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
  -H "X-Plystra-Admin-Token: $PLYSTRA_ADMIN_TOKEN" \
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

HTTP authz ignores client-supplied body `request_id`, `ip`, and `user_agent`; canonical values are server-derived.

## Core Management Routes

All routes in this section require the admin token.

| Group | Routes |
|---|---|
| Overview | `GET /api/v1/console/overview` |
| AuditLog | `GET /api/v1/audit-logs`, `GET /api/v1/audit-logs/{id}`, legacy `/api/v1/audit/logs` aliases |
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

When enabled, `/metrics` returns Prometheus text and requires a metrics token or admin token.
