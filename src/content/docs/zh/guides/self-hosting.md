---
title: 自托管部署
description: 使用 Docker Compose、PostgreSQL、内置可信 system capabilities、migrations、readiness checks 和生产安全配置运行 Plystra Core。
---

Plystra v1.0 面向 PostgreSQL 自托管。推荐生产形态：

```text
reverse proxy / load balancer
    -> plystra-core
        -> PostgreSQL
        -> built-in trusted system capabilities
```

以仓库内的 `Dockerfile`、`docker-compose.yml`、migrations 和 `plystractl` 检查作为 baseline。

## Compose baseline

```bash
cp .env.example .env
docker compose up -d
```

重要 Compose 变量：

| 变量 | 默认值 | 用途 |
|---|---|---|
| `SERVER_PORT` | `8080` | Core 对外端口。 |
| `DOCKER_DATABASE_URL` | Compose PostgreSQL URL | 容器内连接数据库使用。 |
| `CORS_ALLOWED_ORIGINS` | localhost 列表 | 显式浏览器 origins。生产模式会拒绝 wildcard CORS。 |
| `PLYSTRA_SESSION_SECRET` | 开发 placeholder | 用于 HMAC opaque session token 的 secret。 |
| `PLYSTRA_API_KEY_SECRET` | 开发 placeholder | 用于 HMAC API key 的 secret。生产要求独立强 secret。 |
| `HTTP_READ_HEADER_TIMEOUT` | `5s` | 防止慢速 header 读取。 |
| `HTTP_READ_TIMEOUT` | `30s` | 请求读取超时。 |
| `HTTP_WRITE_TIMEOUT` | `60s` | 响应写入超时。 |
| `HTTP_IDLE_TIMEOUT` | `120s` | keep-alive idle timeout。 |
| `DATA_CONSOLE_ENABLED` | `false` | 默认关闭 preview data routes。 |
| `METRICS_ENABLED` | `false` | 默认关闭 `/metrics`。 |

本地开发的 `.env.example` 使用显式 localhost CORS 值。

## System Capabilities

官方 system capabilities 会编译进 `plystrad` binary，并由 kernel 在启动时加载：

- `audit.explainable`
- `identity.business`
- `resource.registry`
- `authorization.resource`
- `admin.control_plane`

它们通过 `internal/kernel/contracts` 注册 services、routes、migration ownership metadata 和 lifecycle health。不要把这个机制用于第三方 runtime install、hot unload、marketplace 替换 authz/audit/identity、sidecar loading 或 Go ABI plugin。

## 迁移流程

启动可信 API 前必须应用迁移：

```bash
go run entgo.io/ent/cmd/ent generate ./ent/schema
go run ./cmd/plystractl migrate up
go run ./cmd/plystractl migrate verify
go run ./cmd/plystractl ent check
go run ./cmd/plystractl doctor
```

生产升级必须使用版本化 migrations。不要把 Ent auto migration 当成生产升级机制。

Runtime database access 使用 Ent。生产 schema 变更通过 `plystra/migrations/` 下的 versioned Atlas-style SQL 文件表示，并记录在 `schema_migrations`。System capability migration ownership 通过 kernel 注册，但 release migration 仍通过同一套 Atlas-style migration flow 执行。

## 启动 Core

```bash
go run ./cmd/plystrad
```

或使用 Compose：

```bash
docker compose up -d plystra-core
```

Core 暴露：

```text
GET /api/v1/health
GET /api/v1/ready
GET /api/v1/version
```

readiness endpoint 会检查数据库连接、预期 migration/schema 状态和 required system capability readiness。

## 生产必填配置

当 `SERVER_MODE=production` 时，启动前会验证：

| 配置 | 生产规则 |
|---|---|
| `DATABASE_URL` 或 `PLYSTRA_DATABASE_URL` | 必填；不能使用默认 `plystra:plystra` 凭据。 |
| `PLYSTRA_SESSION_SECRET` | 至少 32 字符，不能是默认 placeholder。 |
| `PLYSTRA_API_KEY_SECRET` | 至少 32 字符，不能是默认 placeholder，且必须与 session secret 不同。 |
| `CORS_ALLOWED_ORIGINS` | 必填；不能包含 `*`。 |
| `SERVER_PUBLIC_URL` 或 `PLYSTRA_SERVER_PUBLIC_URL` | 必填；不能指向 localhost。 |

当前 runtime 使用 opaque bearer token，存储 HMAC token hash，不签发 JWT claims。

## 第一个 Instance Super Admin

Core 管理 API 使用和业务授权一致的 User/session 体系。第一个管理员是一个 `AdminGrant`：

```text
level = instance_super_admin
permission_key = *
```

Migrations 不会自动创建该 grant。迁移完成后、服务暴露前执行：

```bash
go run ./cmd/plystractl admin bootstrap-super-admin --user-id <existing_user_id>
```

如果系统里已经存在 active instance super admin，这个命令会拒绝执行。完成 bootstrap 后，用该用户登录，再通过 `/api/v1/admin/grants` 创建更多管理员。

## 反向代理与客户端 IP

只有配置 `TRUSTED_PROXIES` 时，Plystra 才信任 forwarded IP headers。否则 request IP metadata 来自 `RemoteAddr`。

只为你自己控制的反向代理配置它：

```text
TRUSTED_PROXIES=127.0.0.1,10.0.0.0/8
```

## 审计配置

生产环境建议保持：

```text
AUDIT_WRITE_MODE=always
TRACE_VERSION=1.0
```

授权决策和 Core management mutations 都会写入 audit trace。AuditLog 是 append-only，需要纳入备份和保留策略。

## 备份与升级 checklist

升级前：

1. 阅读 release notes。
2. 运行 `plystractl doctor`。
3. 备份 PostgreSQL。
4. 必要时停止或静默写流量。
5. 应用 migrations。
6. 运行 `migrate verify`、`ent check`、`doctor`。
7. Smoke test health、ready、version、`authz/check`、`authz/explain`、Resource Registry、AuditLog 查询和 `/api/v1/capabilities`。

最低备份命令：

```bash
pg_dump "$DATABASE_URL" > plystra-backup.sql
```

生产部署应把备份保存在服务器外，并在 staging 做恢复验证。
