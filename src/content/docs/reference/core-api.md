---
title: Core API Reference
description: Plystra Core v1.0 HTTP API envelopes, authentication schemes, endpoint groups, and generated OpenAPI artifacts.
---

Core API uses the `/api/v1` prefix and JSON envelopes. The generated OpenAPI artifacts for this docs build are:

- [OpenAPI JSON](/openapi/plystra.v1.0.0.json)
- [OpenAPI YAML](/openapi/plystra.v1.0.0.yaml)

Regenerate them from the Core repository with:

```bash
make openapi
```

The generated source of truth lives in `plystra/plystra/openapi/plystra.v1.0.0.{json,yaml}`.

## Security Schemes

| Scheme | Header | Used for |
|---|---|---|
| `BearerAuth` | `Authorization: Bearer <access_token>` | User sessions and admin/operator calls. |
| `ApiKeyAuth` | `X-Plystra-API-Key: <api_key>` | Server-to-server calls and Context Mode inline authorization. |
| `MetricsTokenAuth` | `X-Plystra-Metrics-Token: <token>` | `/metrics` when metrics token auth is configured. |

Core also accepts API keys through `Authorization: Bearer ply_ak_...` for environments where custom headers are inconvenient.

## Public System

| Method | Path |
|---|---|
| `GET` | `/api/v1/health` |
| `GET` | `/api/v1/ready` |
| `GET` | `/api/v1/version` |
| `GET` | `/metrics` |

`/metrics` is disabled unless `METRICS_ENABLED=true`. When enabled, it requires a metrics token or a principal with `metrics:read`.

## Native Session Auth

| Method | Path |
|---|---|
| `POST` | `/api/v1/auth/register` |
| `POST` | `/api/v1/auth/login` |
| `POST` | `/api/v1/auth/refresh` |
| `POST` | `/api/v1/auth/logout` |
| `GET` | `/api/v1/actor/context` |
| `POST` | `/api/v1/actor/switch-member` |

Core registration is intentionally constrained and disabled by default. Complete Auth plugin routes are documented in [Complete Auth Plugin](/reference/complete-auth-plugin/).

## Admin And API Keys

| Method | Path |
|---|---|
| `GET` | `/api/v1/admin/me` |
| `GET`, `POST` | `/api/v1/admin/grants` |
| `GET` | `/api/v1/admin/grants/{admin_grant_id}` |
| `POST` | `/api/v1/admin/grants/{admin_grant_id}/revoke` |
| `GET`, `POST` | `/api/v1/api-keys` |
| `GET` | `/api/v1/api-keys/{api_key_id}` |
| `POST` | `/api/v1/api-keys/{api_key_id}/revoke` |

The anti-escalation rules for these routes are the control-plane security boundary. See [Admin Auth and Security](/reference/admin-auth-and-security/).

## Authorization

| Method | Path |
|---|---|
| `POST` | `/api/v1/authz/check` |
| `POST` | `/api/v1/authz/explain` |

Managed-mode request:

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

Context Mode request:

```json
{
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
}
```

Inline actor, resource, and grant fields are trusted server-side input. Only API key calls may use inline context. Browser-provided actor, ownership, grants, and scope fields must not be forwarded directly.

The decision response includes `allow`, `decision`, `deny_code`, `reason`, `trace_id`, `audit_log_id`, and an `audit` snapshot.

## Identity And Scope Objects

| Object | Routes |
|---|---|
| Users | `GET/POST /api/v1/users`, `GET/PATCH /api/v1/users/{user_id}`, disable, restore |
| Spaces | `GET/POST /api/v1/spaces`, `GET/PATCH /api/v1/spaces/{space_id}`, disable, restore |
| Groups | `GET /api/v1/groups/{group_id}`, nested Space group list/create/detail/update/disable/tree |
| Members | `GET /api/v1/members/{member_id}`, nested Space member list/create/detail/update/disable |
| UserMembers | `GET /api/v1/user-members/{user_member_id}`, nested Space binding list/create/detail/update/revoke |
| Roles | `GET /api/v1/roles/{role_id}`, nested Space role list/create/detail/update/disable |
| MemberRoles | nested Space member-role list/create/detail/revoke |
| Permissions | permission list/create/detail/update/disable and role-permission list/create/detail/delete |

These resources form the canonical identity chain:

```text
User -> UserMember -> Member -> Space
```

## Resource Registry And Resources

| Method | Path |
|---|---|
| `GET`, `POST` | `/api/v1/resource-types` |
| `GET` | `/api/v1/resource-types/{resource_type}` |
| `GET`, `POST` | `/api/v1/resource-types/{resource_type}/actions` |
| `GET`, `POST`, `PATCH`, `PUT` | `/api/v1/resource-types/{resource_type}/mapping` |
| `GET`, `POST` | `/api/v1/resources` |
| `GET` | `/api/v1/resources/{resource_type}/{resource_id}` |
| `GET`, `POST` | `/api/v1/spaces/{space_id}/resources` |
| `GET`, `PATCH` | `/api/v1/spaces/{space_id}/resources/{resource_id}` |
| `POST` | `/api/v1/spaces/{space_id}/resources/{resource_id}/archive` |

Resource Registry validates resource type/action existence before authorization and records risk and audit defaults in decision traces.

## Audit

| Method | Path |
|---|---|
| `GET` | `/api/v1/audit/logs` |
| `GET` | `/api/v1/audit/logs/{audit_log_id}` |
| `GET` | `/api/v1/spaces/{space_id}/audit-logs` |
| `GET` | `/api/v1/spaces/{space_id}/audit-logs/{audit_log_id}` |

Audit logs are append-only and store trace snapshots for historical explainability.

## Preview Extension Surfaces

| Surface | Routes | Status |
|---|---|---|
| Plugin metadata | `/api/v1/plugins`, `/api/v1/plugins/install`, `/api/v1/plugins/validate-manifest`, plugin subroutes | Preview metadata and lifecycle flags; not a stable hot-loaded plugin runtime. |
| Template metadata | `/api/v1/templates`, template detail, preview-install, install | Preview manifest/admin metadata. Use `plystractl templates create` for Backend OS Alpha scaffolds. |
| Data Console | `/api/v1/data/tables`, `/api/v1/data/rows/{resource_type}`, row detail/mutation routes | Feature-flagged preview, disabled by default. |

## Deny Codes

Common authorization deny codes include:

| Code | Meaning |
|---|---|
| `ACTOR_USER_INACTIVE` | User is not active. |
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
