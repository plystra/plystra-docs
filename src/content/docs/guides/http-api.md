---
title: HTTP API
description: Current v1.0 HTTP API behavior, authentication, response envelopes, protected route groups, and extension boundaries.
---

Plystra Core exposes the `/api/v1` HTTP API. The generated OpenAPI files are published with this docs site:

```text
/openapi/plystra.v1.0.0.yaml
/openapi/plystra.v1.0.0.json
```

Those files are generated from the current Go API contract with `swaggest/openapi-go`. They include request bodies, response envelopes, security schemes, endpoint tags, and route groups.

If you want to connect an existing application rather than browse every endpoint, start with [Integrate Your App](/guides/integrate-your-app/). This page is the operational API guide.

## Response Envelope

Single-object success response:

```json
{
  "data": {},
  "request_id": "req_..."
}
```

List response:

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

Error response:

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

The API accepts `X-Request-ID`. If omitted, middleware generates a request ID.

## Authentication Layers

| Layer | Applies to | Mechanism |
|---|---|---|
| Public operations | health, ready, version | No token. |
| Session auth | login, refresh, logout, actor context, switch-member | Opaque bearer tokens; stored as HMAC hashes. |
| Admin grant protection | Non-public Core API | `Authorization: Bearer <access_token>` for a User with an active AdminGrant. |
| API key protection | Server-to-server Core API | `X-Plystra-API-Key: <api_key>` or `Authorization: Bearer ply_ak_...`; key carries scope and permission keys. |
| Metrics token | `/metrics` when enabled | `METRICS_TOKEN` / `PLYSTRA_METRICS_TOKEN`, or a Bearer session with `metrics:read`. |

Protected routes return `AUTHENTICATION_REQUIRED` without valid credentials. Valid credentials without the required permission return `ADMIN_PERMISSION_REQUIRED`.

## Public Routes

| Method | Path |
|---|---|
| `GET` | `/api/v1/health` |
| `GET` | `/api/v1/ready` |
| `GET` | `/api/v1/version` |

`/metrics` is routed publicly so the handler can return `FEATURE_DISABLED` or validate a metrics token. Metrics are disabled by default.

## Session Routes

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/v1/auth/register` | Protected native registration. Disabled by default. |
| `POST` | `/api/v1/auth/login` | Accepts `email` and `password`; returns access and refresh tokens. |
| `POST` | `/api/v1/auth/refresh` | Accepts `refresh_token`; rotates access and refresh tokens. |
| `POST` | `/api/v1/auth/logout` | Revokes by bearer access token or body refresh token. |
| `GET` | `/api/v1/actor/context` | Requires an access token. Returns the active actor and available members. |
| `POST` | `/api/v1/actor/switch-member` | Requires an access token. Switches the active Member/UserMember binding. |

Core intentionally keeps the authentication surface minimal: protected registration, password login, session refresh/logout, and actor context. Email verification code and magic-link sign-in live in the independent Complete Auth plugin repository. When that plugin sends email, it depends on the independent email contracts repository and a provider plugin such as SMTP or Cloudflare Email Sending.

Ordinary Core registration creates a User, default Member, default UserMember, session, and Space admin grant inside the single Simple Mode default Space `space_default`. It does not create an instance super admin. Public user-only Core registration is narrower and creates only a User.

Local demo credentials:

```text
alice@example.com / plystra-demo
bob@example.com / plystra-demo
```

## Complete Auth Plugin Routes

These routes belong to the independent Complete Auth plugin, not Core:

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/v1/auth/email-code` | Creates a short-lived email verification-code challenge and sends it through the configured email provider. |
| `POST` | `/api/v1/auth/email-code/verify` | Verifies a six-digit code, consumes the challenge, and marks User email metadata as verified when bound to an active User. |
| `POST` | `/api/v1/auth/magic-link` | Creates a short-lived magic-link challenge and sends it through the configured email provider. |
| `POST` | `/api/v1/auth/magic-link/consume` | Consumes a magic-link token and creates a Core-compatible session for the active User. |

Plugin challenges are single-use. The plugin stores only HMAC hashes of delivered codes and tokens. Send and verification attempts are rate-limited by normalized email and source IP. Production must use an external email capability endpoint; development log mode is rejected in production. Magic-link `redirect_url` values must use HTTPS and match the plugin allowlist.

Complete Auth non-sensitive runtime settings are stored in `plugin_auth_settings`, including public registration, delivery mode, capability URL, sender address, redirect allowlist, TTLs, rate limits, max body size, and trusted proxy CIDRs. Secrets remain environment variables or secret-manager values.

## Authorization Routes

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/v1/authz/check` | Runs a decision and writes audit. |
| `POST` | `/api/v1/authz/explain` | Runs the same decision path with full explain output. |

Example managed-mode request:

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

HTTP authz ignores body-provided canonical request metadata such as `request_id`, `ip`, and `user_agent`. Core derives those values from the request and middleware.

API key calls must include the nested `actor`. Bearer session calls may omit `actor`; Core then uses the session active actor.

## Core Management Route Groups

All groups below require either `Authorization: Bearer <access_token>` with an active AdminGrant, or `X-Plystra-API-Key: <api_key>` with matching permission keys.

| Group | Routes |
|---|---|
| Admin grants | `GET /api/v1/admin/me`, `GET/POST /api/v1/admin/grants`, `GET /api/v1/admin/grants/{id}`, `POST /api/v1/admin/grants/{id}/revoke` |
| API keys | `GET/POST /api/v1/api-keys`, `GET /api/v1/api-keys/{id}`, `POST /api/v1/api-keys/{id}/revoke` |
| Overview | `GET /api/v1/console/overview` |
| AuditLog | `GET /api/v1/audit/logs`, `GET /api/v1/audit/logs/{id}`, and Space-scoped variants |
| Resource Registry | `GET/POST /api/v1/resource-types`, resource type detail, actions, and mapping routes |
| Users | `GET/POST /api/v1/users`, detail, update, disable, and restore |
| Spaces | `GET/POST /api/v1/spaces`, detail, update, disable, and restore |
| Space nested objects | `/api/v1/spaces/{space_id}/groups`, `/members`, `/user-members`, `/roles`, `/member-roles`, `/resources`, `/audit-logs` |
| Direct details | `GET /api/v1/groups/{id}`, `GET /api/v1/members/{id}`, `GET /api/v1/user-members/{id}`, `GET /api/v1/roles/{id}` |
| Permissions | `GET/POST /api/v1/permissions`, detail/update/disable, and `role-permissions` binding routes |
| Resources | `GET/POST /api/v1/resources`, `GET /api/v1/resources/{resource_type}/{resource_id}` |
| Plugin metadata preview | manifest validation, metadata install, lifecycle flags, settings, resources, permissions, audit events, and admin menus |
| Template metadata preview | catalog, detail, preview-install, and install metadata routes |

The full path list is in [Core API Reference](/reference/core-api/). The route permission matrix and anti-escalation rules are in [Admin Auth and Security](/reference/admin-auth-and-security/).

Creating an API key returns plaintext `api_key` once. Core stores only an HMAC hash.

## Data Console Preview

Data Console is not a stable Core blocking surface and is disabled by default:

```text
DATA_CONSOLE_ENABLED=false
```

When explicitly enabled and protected by Bearer session/API key permissions:

| Method | Path |
|---|---|
| `GET` | `/api/v1/data/tables` |
| `GET/POST` | `/api/v1/data/rows/{resource_type}` |
| `GET/PATCH/DELETE` | `/api/v1/data/rows/{resource_type}/{resource_id}` |

Current mutations support the Core `resources` table through `internal_table` resource mappings. Mutations run authorization checks and return the changed row plus authorization decision.

## Metrics

Metrics are disabled by default:

```text
METRICS_ENABLED=false
```

When enabled, `/metrics` returns Prometheus text and requires a metrics token or a Bearer session with `metrics:read`.

## Preview Boundary

Plugin and template HTTP routes in Core are preview metadata surfaces. They do not mean that stable hot-loaded plugin runtime, third-party marketplace, cloud hosting, or a complete capability certification system are implemented. Backend OS Alpha uses `plystractl templates create` as the inspectable scaffold path; HTTP template routes remain manifest, preview, and admin metadata APIs.
