---
title: Ent 数据库管理
description: Plystra Core 如何使用 Ent schema、迁移和 guardrail 管理数据库。
---

Plystra Core v1.0 使用 Ent 管理业务实体 schema。HTTP API、auth/session、audit、Resource Registry、plugin/template 等业务路径应通过 Ent 访问数据库，不直接写 raw SQL。

## 原则

- 业务表由 `ent/schema` 表达。
- 数据访问优先使用 Ent query/mutation API。
- 生产环境不要启用 Ent auto migration。
- 版本化迁移通过 Atlas-backed `plystractl migrate up` 执行，并由 `migrations/atlas.sum` 校验完整性。
- `schema_migrations` 属于迁移控制面，不是业务实体。

## 常用检查

```powershell
go generate ./ent
go test ./...
go run .\cmd\plystractl migrate verify
go run .\cmd\plystractl ent check
go run .\cmd\plystractl doctor
```

如果 Ent schema 与迁移发生漂移，先修迁移和 schema，再发布。

生产环境升级顺序：

```powershell
go run .\cmd\plystractl migrate up
go run .\cmd\plystractl migrate verify
go run .\cmd\plystractl ent check
go run .\cmd\plystractl doctor
```
