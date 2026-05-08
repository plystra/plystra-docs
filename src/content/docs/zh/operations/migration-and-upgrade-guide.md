---
title: 迁移与升级指南
description: 自托管 Plystra Core 的数据库迁移、升级和回滚原则。
---

生产环境升级前先备份 PostgreSQL，然后执行版本化迁移。

## 标准流程

```powershell
go run .\cmd\plystractl migrate up
go run .\cmd\plystractl migrate verify
go run .\cmd\plystractl ent check
go run .\cmd\plystractl doctor
go test ./...
```

## 原则

- 不在生产环境使用 Ent auto migration。
- 迁移文件必须可审计、可重复执行、可验证。
- schema drift 必须在发布前解决。
- audit log 是追加式数据，不能通过普通更新或删除修改。
- 回滚优先使用数据库备份和向前修复迁移。
