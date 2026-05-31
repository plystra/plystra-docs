---
title: Resource Registry
description: Resource types, actions, mappings, risk metadata, and authorization integration in Plystra Core.
---

Resource Registry turns permission strings into governed resource metadata.

Instead of treating `invoice:approve:group_tree` as only text, Plystra records:

- what `invoice` is.
- which actions belong to `invoice`.
- which action risk level should appear in traces.
- how invoice instances map to `space_id`, `group_id`, `owner_member_id`, and visibility.
- whether allow and deny decisions should be audited by default.

## Core Tables

| Table | Purpose |
|---|---|
| `resource_types` | Registered resource kinds such as `invoice`. |
| `resource_actions` | Actions for a type, such as `read`, `create`, `approve`, `reject`, and `delete`. |
| `resource_mappings` | Mapping from resource type to authorization fields. |
| `resources` | Core-managed resource records used by managed-mode authorization and Data Console preview. |

The current stable mapping path supports Core's internal `resources` table:

```text
id_field = id
space_field = space_id
group_field = group_id
owner_member_field = owner_member_id
visibility_field = visibility
metadata_field = metadata
```

External table mapping and dynamic SQL from registry metadata are not a stable production surface.

## Authorization Integration

Before evaluating permissions, the authorization engine validates that:

1. the requested ResourceType is registered.
2. the requested action exists for that ResourceType.
3. a ResourceMapping exists.

Unknown resource types deny with:

```text
INVALID_RESOURCE_TYPE
```

Unknown actions deny with:

```text
INVALID_RESOURCE_ACTION
```

The decision trace includes a `resource_registry` snapshot. Audit logs keep this snapshot, so historical traces remain readable even if the display name or risk level changes later.

## API Routes

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

## Invoice Demo Registry

The demo migration registers:

```text
ResourceType: invoice
Actions: read, create, approve, reject, delete
Mapping: resources table
```

`approve` and `reject` are high-risk actions. `delete` is critical.

## Preview Boundary

Plugin metadata can declare resources and permissions, and Data Console preview can mutate internal-table mapped resources when explicitly enabled. Those preview surfaces do not turn Resource Registry into a general dynamic database mapper or plugin runtime.
