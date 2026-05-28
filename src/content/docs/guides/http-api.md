---
title: HTTP API
description: Kernel Phase 1 HTTP API behavior, authentication, response envelopes, and Context Mode routes.
---

Plystra exposes a small `/api/v1` HTTP API for Phase 1.

## Response Envelope

Successful responses:

```json
{
  "data": {},
  "request_id": "req_..."
}
```

Errors:

```json
{
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "Request body is invalid.",
    "request_id": "req_..."
  },
  "request_id": "req_..."
}
```

`X-Request-ID` is accepted. If omitted, Kernel generates a request ID.

## Authentication

| Layer | Applies to | How it works |
|---|---|---|
| Public operational routes | health, ready, version | No token required. |
| Scoped server API key | capabilities, resource registry, authz, audit | Send `X-Plystra-API-Key`. |

Missing or invalid credentials return `AUTHENTICATION_REQUIRED` with HTTP 401.

An authenticated key without the required permission returns `ADMIN_PERMISSION_REQUIRED` with HTTP 403.

## Public Routes

| Method | Path |
|---|---|
| `GET` | `/api/v1/health` |
| `GET` | `/api/v1/ready` |
| `GET` | `/api/v1/version` |
| `POST` | `/api/v1/auth/register` |
| `POST` | `/api/v1/auth/login` |
| `POST` | `/api/v1/auth/refresh` |
| `POST` | `/api/v1/auth/logout` |

## Session Routes

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/v1/auth/register` | Protected registration endpoint. Disabled by default. |
| `POST` | `/api/v1/auth/login` | Password login. Returns access and refresh tokens. |
| `POST` | `/api/v1/auth/refresh` | Rotates the access and refresh tokens. |
| `POST` | `/api/v1/auth/logout` | Revokes a bearer access token or body refresh token. |

Core intentionally keeps the auth surface minimal: protected registration, password login, session refresh/logout, and actor context. Email verification codes, magic-link sign-in, and other expanded auth flows live in the independent Complete Auth plugin repository. When that plugin enables email delivery, it depends on the independent email contracts repository and a provider plugin such as SMTP or Cloudflare Email Sending.

The Complete Auth plugin exposes its own public routes:

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/v1/auth/email-code` | Creates a short-lived email verification-code challenge and sends it through the configured email provider. |
| `POST` | `/api/v1/auth/email-code/verify` | Verifies a six-digit code, consumes the challenge, and marks the User email as verified in plugin-owned metadata when the challenge is bound to an active User. |
| `POST` | `/api/v1/auth/magic-link` | Creates a short-lived magic-link challenge and sends it through the configured email provider. |
| `POST` | `/api/v1/auth/magic-link/consume` | Consumes a magic-link token and creates a Core-compatible session for the active User. |

Plugin challenges are single-use. The plugin stores only HMAC hashes of delivered codes and tokens. Send and verification attempts are rate-limited by normalized email and source IP. Production must use an external email capability endpoint; development log mode is rejected in production. Magic-link `redirect_url` values must use HTTPS and match the plugin allowlist.

## Protected Routes

| Method | Path | Permission |
|---|---|---|
| `GET` | `/api/v1/capabilities` | `capabilities:read` |
| `GET` | `/api/v1/resource-types` | `resource_registry:read` |
| `POST` | `/api/v1/authz/check` | `authz:check` |
| `POST` | `/api/v1/authz/explain` | `authz:explain` |
| `GET` | `/api/v1/audit/logs` | `audit:read` |
| `GET` | `/api/v1/audit/logs/{id}` | `audit:read` |

## Context Mode

Context Mode protects one action in an existing backend without user, organization, role, or resource migration.

```bash
curl -X POST http://localhost:8080/api/v1/authz/check \
  -H "Content-Type: application/json" \
  -H "X-Plystra-API-Key: $PLYSTRA_API_KEY" \
  -d '{
    "actor": {
      "user_id": "user_external_alice",
      "member_id": "member_finance_reviewer",
      "binding_id": "binding_external_alice_finance",
      "space_id": "space_acme"
    },
    "resource": {
      "type": "invoice",
      "external_id": "invoice_001",
      "space_id": "space_acme",
      "group_path": "finance.apac",
      "owner_member_id": "member_invoice_creator"
    },
    "grants": [{
      "role_key": "finance_approver",
      "resource": "invoice",
      "action": "approve",
      "scope": "group_tree",
      "space_id": "space_acme",
      "scope_anchor_group_path": "finance"
    }],
    "action": "approve",
    "explain": true
  }'
```

Inline context is trusted server-side input. Build actor, resource, and grant fields from your authenticated session and database state. Never forward those fields directly from browser input.

## Decision Response

The response includes:

- `allow`
- `decision`
- `deny_code`
- `reason`
- `trace_id`
- `audit_log_id`
- `matched_candidates`
- `trace`

Current deny codes include:

| Code | Meaning |
|---|---|
| `ACTOR_USER_INACTIVE` | Inline User is not active. |
| `ACTOR_MEMBER_INACTIVE` | Member is not active. |
| `USER_MEMBER_REVOKED` | UserMember or compatible binding is not active. |
| `USER_MEMBER_EXPIRED` | Binding expiration is in the past. |
| `SPACE_INACTIVE` | Actor Space is not active. |
| `CROSS_SPACE_VIOLATION` | Actor, target, grant, or scope anchor Space does not match. |
| `NO_MATCHING_PERMISSION` | No grant matched resource/action. |
| `SCOPE_ANCHOR_MISSING` | Group or group_tree grant has no anchor. |
| `TARGET_GROUP_MISSING` | Group-scoped decision has no target group. |
| `SCOPE_OUT_OF_BOUNDS` | Matching grant does not cover the target. |
| `GLOBAL_SCOPE_DISABLED` | Global scope is reserved and disabled. |
| `INVALID_RESOURCE_TYPE` | Resource type is not registered. |
| `INVALID_RESOURCE_ACTION` | Action is not registered for the resource type. |
