---
title: v1.0 RC 测试计划
description: Release candidate 的最小端到端测试路径。
---

RC 测试应覆盖 clean clone、迁移、API、authz、audit、Console 和文档站。

## 本地路径

```powershell
docker compose up -d postgres
go run .\cmd\plystractl migrate up
go run .\cmd\plystractl migrate verify
go run .\cmd\plystractl ent check
go run .\cmd\plystractl doctor
go test ./...
go run .\cmd\explain-demo
go run .\cmd\plystrad
```

## API 检查

- health / ready / version 返回正常。
- 未带 Bearer user session 的敏感 API 返回 401。
- 带 Bearer user session 后 users/spaces/resource-types/audit-logs 可读取。
- `authz/explain` 返回 allow/deny trace。
- audit log 写入 allow 与 deny。
