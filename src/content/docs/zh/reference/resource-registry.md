---
title: Resource Registry
description: Plystra Core 中的资源类型、动作、映射、风险元数据和授权集成。
---

Resource Registry 会把 permission 字符串变成受治理的资源元数据。

Plystra 不只把 `invoice:approve:group_tree` 当成文本，而是记录：

- `invoice` 是什么。
- `invoice` 支持哪些 actions。
- 哪些 action risk level 应出现在 trace 中。
- invoice 实例如何映射到 `space_id`、`group_id`、`owner_member_id` 和 visibility。
- allow / deny decision 是否默认审计。

## Core Tables

| Table | 用途 |
|---|---|
| `resource_types` | 注册资源类型，例如 `invoice`。 |
| `resource_actions` | 某个类型的动作，例如 `read`、`create`、`approve`、`reject`、`delete`。 |
| `resource_mappings` | resource type 到授权字段的映射。 |
| `resources` | Core-managed resource records，用于 managed-mode 授权和 Data Console preview。 |

当前稳定 mapping path 支持 Core 内部 `resources` 表：

```text
id_field = id
space_field = space_id
group_field = group_id
owner_member_field = owner_member_id
visibility_field = visibility
metadata_field = metadata
```

External table mapping 和从 registry metadata 动态生成 SQL 不是稳定生产 surface。

## Authorization Integration

授权引擎在求值 permissions 前会验证：

1. 请求的 ResourceType 已注册。
2. 请求的 action 属于该 ResourceType。
3. 存在 ResourceMapping。

未知 resource type 会拒绝：

```text
INVALID_RESOURCE_TYPE
```

未知 action 会拒绝：

```text
INVALID_RESOURCE_ACTION
```

Decision trace 会包含 `resource_registry` snapshot。Audit logs 会保留该 snapshot，所以即使 display name 或 risk level 后续变化，历史 trace 仍可读。

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

Demo migration 注册：

```text
ResourceType: invoice
Actions: read, create, approve, reject, delete
Mapping: resources table
```

`approve` 和 `reject` 是 high-risk actions。`delete` 是 critical。

## Preview Boundary

Plugin metadata 可以声明 resources 和 permissions；Data Console preview 在显式启用后可以 mutate internal-table mapped resources。这些 preview surface 不会把 Resource Registry 变成通用 dynamic database mapper 或 plugin runtime。
