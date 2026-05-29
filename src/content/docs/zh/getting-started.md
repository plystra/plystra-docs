---
title: 快速开始
description: 本地运行 Plystra、测试 native auth，并用 Context Mode 保护一个动作。
---

Plystra 从 `plystra/plystra` runtime 开始。你可以先测试 native auth，并保护一个现有后端动作；第一次授权检查前，不需要把所有用户、组织、角色或业务资源迁移到 Plystra。

## 前置要求

- Docker Desktop，或 Go 加 PostgreSQL 16+
- 本地开发之外必须配置强 session secret 和 API key secret
- 一个用于 Context Mode 调用的服务端 API key

## 使用 Docker 启动

```bash
cd plystra/plystra
docker compose up -d --build postgres
docker compose run --rm plystra-core plystractl migrate up
docker compose run --rm plystra-core plystractl migrate verify
docker compose up -d plystra-core
```

Core 暴露：

```bash
curl -s http://localhost:8080/api/v1/health
curl -s http://localhost:8080/api/v1/ready
curl -s http://localhost:8080/api/v1/version
```

仅本地 demo 环境，显式把 Alice bootstrap 为 instance super admin：

```bash
docker compose run --rm plystra-core plystractl admin bootstrap-super-admin \
  --user-id user_alice \
  --member-id member_finance_reviewer \
  --grant-id ag_alice_local_demo_instance_super_admin \
  --if-exists ok
```

Migrations 永远不会在生产中自动创建 super admin。

## 从源码启动

Linux 和 macOS：

```bash
cd ~/src/plystra/plystra
export DATABASE_URL="postgres://plystra:plystra@localhost:5432/plystra?sslmode=disable"
go run ./cmd/plystractl migrate up
go run ./cmd/plystractl migrate verify
go run ./cmd/plystrad
```

Windows PowerShell：

```powershell
cd C:\Users\i\Documents\GitHub\plystra\plystra
$env:DATABASE_URL = "postgres://plystra:plystra@localhost:5432/plystra?sslmode=disable"
go run .\cmd\plystractl migrate up
go run .\cmd\plystractl migrate verify
go run .\cmd\plystrad
```

公开健康检查：

```bash
curl -s http://localhost:8080/api/v1/health
curl -s http://localhost:8080/api/v1/ready
curl -s http://localhost:8080/api/v1/version
```

服务端到服务端的受保护接口需要 `X-Plystra-API-Key`。User/admin 路由使用登录 session flow。

## Native Auth Smoke Test

显式 bootstrap 后，用本地 demo 用户登录：

```bash
curl -s -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"alice@example.com","password":"plystra-demo"}'
```

响应包含 `access_token`、`refresh_token`、`actor` 和 `available_members`。

注册默认关闭。测试或开发环境可以开启 token-protected 普通注册：

```text
PLYSTRA_AUTH_REGISTRATION_ENABLED=true
PLYSTRA_AUTH_REGISTRATION_TOKEN=<32+ character token>
```

普通注册会在单个 Simple Mode 默认 Space `space_default` 内创建 User、default Member、default UserMember、session 和 Space admin grant。它不会创建 instance super admin。

## 创建 API Key

用 admin session 创建服务端 API key：

```bash
curl -s -X POST http://localhost:8080/api/v1/api-keys \
  -H "Authorization: Bearer $PLYSTRA_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "invoice-service-dev",
    "level": "instance",
    "permission_keys": ["authz:check"]
  }'
```

返回的 `api_key` 只显示一次，必须安全保存。

## 保护一个动作

Context Mode 允许你的现有后端传入可信的 actor、resource 和 grants。

```bash
curl -s -X POST http://localhost:8080/api/v1/authz/check \
  -H "Content-Type: application/json" \
  -H "X-Plystra-API-Key: $PLYSTRA_API_KEY" \
  -d '{
    "actor": {
      "user_id": "user_external_alice",
      "member_id": "member_finance_reviewer",
      "binding_id": "binding_external_alice_finance",
      "space_id": "space_acme"
    },
    "resource": {
      "type": "invoice",
      "external_id": "invoice_001",
      "space_id": "space_acme",
      "group_path": "finance.apac",
      "owner_member_id": "member_invoice_creator"
    },
    "grants": [{
      "role_key": "finance_approver",
      "resource": "invoice",
      "action": "approve",
      "scope": "group_tree",
      "space_id": "space_acme",
      "scope_anchor_group_path": "finance"
    }],
    "action": "approve",
    "explain": true
  }'
```

响应包含 `decision`、`deny_code`、`reason`、`trace_id`、匹配候选和 audit metadata。Inline context 必须使用 API key，因为它是可信服务端输入。

## 信任边界

Inline context 是可信服务端输入。请从已认证 session 和数据库状态构造这些字段，不要直接转发浏览器传来的 actor、grants 或资源归属字段。

## 检查

```bash
curl -s -H "Authorization: Bearer $PLYSTRA_ACCESS_TOKEN" http://localhost:8080/api/v1/capabilities
curl -s -H "X-Plystra-API-Key: $PLYSTRA_API_KEY" http://localhost:8080/api/v1/resource-types
curl -s -H "Authorization: Bearer $PLYSTRA_ACCESS_TOKEN" http://localhost:8080/api/v1/audit/logs
```
