---
title: 生产检查清单与排错
description: 运行开发者生产接入检查，并诊断常见集成问题。
---

## 生产接入检查清单

上线前至少确认：

- 对目标数据库运行 `go run ./cmd/plystractl doctor`。
- 设置强 `PLYSTRA_SESSION_SECRET` 和 `PLYSTRA_API_KEY_SECRET`。
- 生产环境不要使用 wildcard CORS。
- API key 不进入前端或移动端。
- 至少保留两个 human instance super admin。
- 运维用户只授予需要的 domain 和 scope。
- 优先使用 `space_admin` 和 `group_admin`，少用 instance grant。
- 自动化测试覆盖 `authz.check` allow 和 deny。
- 测试跨 Space deny。
- 测试 group admin 不能访问 sibling group。
- 测试 revoked `UserMember` deny。
- 测试 revoked 和 expired API key deny。
- 除非明确需要，否则保持 Data Console disabled。
- `/metrics` disabled 或使用 `METRICS_TOKEN` 保护。
- 把响应中的 `X-Request-ID` 或 body `request_id` 写入应用日志。
- 对授权错误保存 `trace_id` 和 `audit_log_id`。

## 排错表

| 现象 | 最可能原因 | 检查 |
|---|---|---|
| 管理路由返回 `AUTHENTICATION_REQUIRED` | Bearer token 或 API key 缺失/过期。 | 检查 `Authorization` 或 `X-Plystra-API-Key`。 |
| 创建 API key 返回 `ADMIN_PERMISSION_REQUIRED` | 缺少 `api_keys:create` 或正在委派未持有的权限。 | 调 `GET /api/v1/admin/me`。 |
| `SCOPE_OUT_OF_BOUNDS` | Role grant 存在，但 anchor group 不覆盖目标 group。 | 对比 group path 和 `scope_anchor_group_id`。 |
| API key authz check 因 actor 缺失失败 | API key 不能推断人类 actor。 | 传完整嵌套 `actor`。 |
| Bearer authz check 使用了错误 Member | session active actor 不是预期 Member。 | 调 `GET /api/v1/actor/context`，再调 `POST /api/v1/actor/switch-member`。 |
| User API 不返回 password hash | 正确行为。 | `password_hash` 永远不会在 API 响应中暴露。 |
| Data routes 返回 404 | Data Console disabled。 | 只有确实需要时才设置 `DATA_CONSOLE_ENABLED=true`。 |
| Metrics 返回 404 | Metrics disabled。 | 设置 `METRICS_ENABLED=true`，并用 token 保护。 |

## 继续阅读

- [HTTP API](/zh/guides/http-api/)
- [SDK](/zh/guides/sdks/)
- [身份与作用域](/zh/concepts/identity-and-scope/)
- [Resource Registry](/zh/reference/resource-registry/)
