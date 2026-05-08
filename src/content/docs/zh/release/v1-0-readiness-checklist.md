---
title: v1.0 发布检查清单
description: 发布 Plystra Core v1.0 前需要通过的检查。
---

发布前至少完成以下检查：

- `go test ./...` 通过。
- `go run .\cmd\plystractl migrate verify` 通过。
- `go run .\cmd\plystractl ent check` 通过。
- `go run .\cmd\plystractl doctor` 通过。
- `go run .\cmd\explain-demo` 输出四个预期案例。
- 非公开 API 需要 `PLYSTRA_ADMIN_TOKEN`。
- User API 不返回 `password_hash`。
- Data Console 默认关闭。
- Metrics 默认关闭。
- 生产环境禁止默认 secret 和 wildcard CORS。
- 文档站中英文入口可构建。
