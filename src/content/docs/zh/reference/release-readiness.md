---
title: 发布就绪
description: 当前 v1.0 发布范围、已完成安全 gate 和非阻塞延后事项。
---

Plystra Core v1.0 的范围是稳定自托管 Core。

## 范围内

- 身份 trace 模型：`User -> UserMember -> Member -> Space`。
- Authorization check 和 explain。
- `self`、`group`、`group_tree`、`space` 的 scope semantics。
- `global` 保留但禁用。
- Resource Registry。
- 带 trace snapshots 的 AuditLog。
- Ent-managed schema model。
- 版本化 PostgreSQL migrations。
- Core CRUD HTTP API。
- Auth session flow。
- 非公开路由的 Bearer user session protection。
- Docker self-hosting baseline。
- OpenAPI v1.0 artifacts。
- Finance Reviewer demo。
- Migration、Ent drift、doctor 和 smoke test gates。

## v1.0 后延后

当前 release docs 将以下内容视为非阻塞：

- 完整 Console 作为必需 release surface。
- SDK repositories 作为 release blocker。
- plugin runtime execution。
- plugin marketplace。
- Data Console 作为默认生产 surface。
- cloud hosting。
- enterprise SSO。
- advanced policy language。

当前代码中存在 plugin、template、Data Console 的 preview metadata routes。敏感路由均需要拥有 active admin grant 的用户 Bearer session，Data Console 默认关闭。

## 安全 gates

当前 v1.0 行为包含：

- 非公开 API 路由需要拥有 active admin grant 的用户 Bearer session。
- AuditLog 和 console overview 被保护。
- Data Console routes 默认返回 `FEATURE_DISABLED`。
- `/metrics` 默认返回 `FEATURE_DISABLED`。
- metrics 启用后需要 metrics token 或 Bearer user session。
- 生产模式拒绝 wildcard CORS。
- 生产模式拒绝默认数据库凭据和 placeholder secrets。
- User API 响应和 mutation audit details 不暴露 `password_hash`。
- authz HTTP 请求会忽略 body 中的 IP 和 User-Agent metadata。

## 必需验证

发布前运行：

```bash
go test ./...
PLYSTRA_DATABASE_URL="postgres://plystra:plystra@localhost:5432/plystra?sslmode=disable" go test ./...
go run ./cmd/plystractl migrate verify
go run ./cmd/plystractl ent check
go run ./cmd/plystractl doctor
docker compose config --quiet
go run ./cmd/explain-demo
```

HTTP smoke tests 应覆盖：

- 公开 health、ready、version。
- 未认证访问敏感路由返回 `401`。
- Bearer user session 可以访问 AuditLog 和 Core CRUD。
- `authz/check` allow 和 deny 场景。
- `authz/explain` 包含 matched candidates 和 scope checks。
- Data Console 和 metrics 默认关闭。
- user create/detail/update/status 响应不包含 `password_hash`。

## RC 建议

上述安全 gates 通过后，版本适合进入 `v1.0.0-rc6` 验证。Stable release 还应重复 clean-clone、empty-database migration、upgrade 和 documentation checks。
