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

Data Console mutations currently support `internal_table` mappings backed by the Core `resources` table. Each mutation runs an authorization check against the requested row action and returns the authorization decision alongside the changed row.

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

