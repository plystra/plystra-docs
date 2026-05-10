---
title: 快速开始
description: 本地安装 Plystra Core，应用迁移，运行检查，并安全调用当前 v1.0 API。
---

Plystra Core v1.0 是一个自托管身份与授权服务。它把登录账号和业务空间内实际行动的身份分开：

```text
User -> UserMember -> Member -> Space
```

当前 Core 仓库包含 HTTP API 服务、PostgreSQL migrations、Ent schemas、授权引擎、Finance Reviewer demo、OpenAPI 文件和发布就绪检查。

## 前置要求

- Go，使用 Core 仓库支持的版本。
- Docker 和 Docker Compose。
- 使用 Compose 启动的 PostgreSQL，或兼容的 PostgreSQL 数据库。
- `rg` 对维护者有帮助，但运行 Core 不是必须。

## 安装

```bash
git clone https://github.com/plystra/plystra.git
cd plystra
cp .env.example .env
docker compose up -d
```

Compose baseline 会启动 PostgreSQL 和 `plystra-core`。Core 读取 `.env`，容器内使用 `DOCKER_DATABASE_URL` 连接数据库，并在 `SERVER_PORT` 暴露 API，默认端口是 `8080`。

## 应用并验证 schema

在依赖任何 API 行为前先执行迁移：

```bash
go run entgo.io/ent/cmd/ent generate ./ent/schema
go run ./cmd/plystractl migrate up
go run ./cmd/plystractl migrate verify
go run ./cmd/plystractl ent check
go run ./cmd/plystractl doctor
```

健康输出通常包含：

```text
migrations verified
ent schema is in sync
environment: development
configuration: ok
database: ok
migrations: current
schema: ok
service readiness: ok
```

开发环境下，`doctor` 会提示默认密钥风险；生产环境下，这些风险会变成启动阻断。

## 运行 demo

```bash
go run ./cmd/explain-demo
```

demo 会打印四个必需 trace：

| 场景 | 决策 | 证明内容 |
|---|---|---|
| Alice 审批 Finance APAC invoice | `allow` | `group_tree` 覆盖子组。 |
| Alice 审批 Legal EMEA invoice | `deny: SCOPE_OUT_OF_BOUNDS` | 组边界被正确执行。 |
| Bob 通过同一个 Member 审批 | `allow` | 多个 User 可以通过同一个 Member 身份行动。 |
| Alice 使用 revoked binding | `deny: USER_MEMBER_REVOKED` | `UserMember` 是有效授权桥。 |

如果 demo 输出正确，下一步直接看 [接入你的应用](/zh/guides/integrate-your-app/)。那篇会把同一套模型变成可复制的 API 请求，用于创建你自己的 Space、身份链、资源、角色和后端授权保护。

## 启动 API

```bash
go run ./cmd/plystrad
```

公开运维端点：

```bash
curl http://localhost:8080/api/v1/health
curl http://localhost:8080/api/v1/ready
curl http://localhost:8080/api/v1/version
```

`/system/*` 和 `/api/v1/system/*` 下也保留了兼容别名。

## 调用受保护 API

所有非公开 Core API 都需要某个拥有 active admin grant 的用户 Bearer access token。

本地 demo 已经给 Alice 创建了 `instance_super_admin`，并授予 `permission_key="*"`。先登录并导出 access token：

```bash
export PLYSTRA_ACCESS_TOKEN=$(
  curl -s -X POST http://localhost:8080/api/v1/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"alice@example.com","password":"plystra-demo"}' |
  jq -r '.data.access_token'
)
```

然后调用受保护路由：

```bash
curl -H "Authorization: Bearer $PLYSTRA_ACCESS_TOKEN" \
  http://localhost:8080/api/v1/audit-logs
```

非 demo 数据库可以通过 `plystractl` 创建第一个 instance super admin。这个命令只会在没有 active `instance_super_admin` grant 时成功：

```bash
go run ./cmd/plystractl admin bootstrap-super-admin --user-id <existing_user_id>
```

第一个 super admin 创建后，再通过 `/api/v1/admin/grants` 任命 instance admin、Space admin 和 Group admin。

如果你要完成一条真实业务接入路径，建议直接看 [接入你的应用](/zh/guides/integrate-your-app/)，不用自己从零拼每个 endpoint。

## 登录流程

本地 demo 种子用户：

```text
alice@example.com / plystra-demo
bob@example.com / plystra-demo
```

登录会返回 opaque access token、refresh token、当前 actor context 和可用 member bindings：

```bash
curl -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"alice@example.com","password":"plystra-demo"}'
```

使用 access token 获取 actor context：

```bash
curl -H "Authorization: Bearer $ACCESS_TOKEN" \
  http://localhost:8080/api/v1/actor/context
```

## 生产 baseline

设置 `SERVER_MODE=production` 前必须配置：

```text
DATABASE_URL
PLYSTRA_SESSION_SECRET or JWT_SECRET
CORS_ALLOWED_ORIGINS
SERVER_PUBLIC_URL
```

生产模式会拒绝默认数据库凭据、过短或默认密钥、wildcard CORS origins、以及 localhost public URL。

## 默认关闭的能力

v1.0 会默认关闭风险更高的 preview surface：

```text
DATA_CONSOLE_ENABLED=false
METRICS_ENABLED=false
```

关闭时对应路由返回 `FEATURE_DISABLED`。
