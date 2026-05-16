---
title: Core API Reference
description: Migrated from the Core repository and updated for the current v1.0 codebase.
---

# Core API

Plystra Core exposes the v1.0 `/api/v1` HTTP API.

All successful responses use:

```json
{
  "data": {},
  "request_id": "req_..."
}
```

List responses also include:

```json
{
  "pagination": {
    "limit": 50,
    "cursor": null,
    "has_more": false
  }
}
```

Errors use:

```json
{
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "The request body is invalid.",
    "details": [],
    "request_id": "req_..."
  }
}
```

## Implemented Endpoint Groups

- `/api/v1/health`
- `/api/v1/ready`
- `/api/v1/version`
- `/api/v1/auth`
- `/api/v1/actor`
- `/api/v1/console/overview`
- `/api/v1/authz`
- `/api/v1/audit/logs`
- `/api/v1/spaces`
- `/api/v1/groups`
- `/api/v1/members`
- `/api/v1/user-members`
- `/api/v1/roles`
- `/api/v1/permissions`
- `/api/v1/resources`
- `/api/v1/data`
- `/api/v1/resource-types`
- `/api/v1/plugins`
- `/api/v1/templates`

`/api/v1/plugins`, `/api/v1/templates`, and `/api/v1/data` are preview metadata or feature-flagged surfaces in the current Core API. They do not represent a stable plugin runtime, third-party marketplace, Data Console production surface, or template ecosystem.

## Recent v1.0-oriented additions

- `POST /api/v1/auth/login`
- `POST /api/v1/auth/logout`
- `POST /api/v1/auth/refresh`
- `GET /api/v1/actor/context`
- `POST /api/v1/actor/switch-member`
- `GET /api/v1/templates`
- `GET /api/v1/templates/{template_id}`
- `POST /api/v1/templates/{template_id}/preview-install`
- `POST /api/v1/templates/{template_id}/install`
- `POST /api/v1/plugins/install`
- `POST /api/v1/plugins/{plugin_id}/enable`
- `POST /api/v1/plugins/{plugin_id}/disable`
- `POST /api/v1/plugins/{plugin_id}/uninstall`
- `GET/PATCH /api/v1/plugins/{plugin_id}/settings`
- `GET /api/v1/data/tables`
- `GET /api/v1/data/rows/{resource_type}`
- `POST /api/v1/data/rows/{resource_type}`
- `PATCH /api/v1/data/rows/{resource_type}/{resource_id}`
- `DELETE /api/v1/data/rows/{resource_type}/{resource_id}`

Data Console mutations currently support `internal_table` mappings backed by the Core `resources` table when `DATA_CONSOLE_ENABLED=true`. Each mutation runs an authorization check against the requested row action and returns the authorization decision alongside the changed row.

## Authorization Context Mode

`POST /api/v1/authz/check` and `POST /api/v1/authz/explain` support two integration modes.

Managed mode loads actor, target resource, and permission grants from Plystra Core tables:

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

Context Mode lets a trusted backend pass actor, resource, and optional grants inline:

```json
{
  "actor": {
    "user_id": "user_external_alice",
    "member_id": "member_finance_reviewer",
    "binding_id": "binding_external_alice_finance",
    "space_id": "space_acme",
    "user_email": "alice@example.com"
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
  "action": "approve"
}
```

Inline context is API-key-only. Session callers receive `INLINE_CONTEXT_REQUIRES_API_KEY`. Scoped API keys are evaluated against the inline actor/resource Space or resolved Group before the authorization engine runs.

The response always includes `allow`, `decision`, `deny_code`, `reason`, `trace_id`, `audit_log_id`, and `audit`. `/authz/explain` returns the full decision trace.

Current deny codes include:

| Code | Meaning |
|---|---|
| `ACTOR_USER_INACTIVE` | Inline or loaded User is not active. |
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

Demo users are seeded for local development:

```text
alice@example.com / plystra-demo
bob@example.com / plystra-demo
```

OpenAPI artifacts are generated from the current Go API contract with `swaggest/openapi-go` and live in the Core repository:

```text
openapi/plystra.v1.0.0.json
openapi/plystra.v1.0.0.yaml
```

They include request bodies, response envelopes, security schemes, endpoint tags, and grouped API sections. Regenerate them from Core with:

```bash
make openapi
```

Response envelopes use one canonical top-level `request_id`; Core does not return a legacy `meta.request_id`.

