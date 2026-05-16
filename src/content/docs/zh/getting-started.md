---
title: 快速开始
description: 本地运行 Plystra Kernel，并用 Context Mode 保护一个动作。
---

Plystra Phase 1 从 Kernel runtime 开始。第一次授权检查前，你不需要把用户、组织、角色或业务资源迁移到 Plystra。

## 前置要求

- Go
- PostgreSQL
- 一个本地开发用的服务端 API key

## 启动 Kernel

```powershell
cd kernel
$env:DATABASE_URL = "postgres://plystra:plystra@localhost:5432/plystra?sslmode=disable"
$env:PLYSTRA_API_KEY = "ply_kernel_secret"
go run .\cmd\plystrad migrate
go run .\cmd\plystrad migrate status
go run .\cmd\plystrad serve
```

公开健康检查：

```bash
curl -s http://localhost:8080/api/v1/health
curl -s http://localhost:8080/api/v1/ready
curl -s http://localhost:8080/api/v1/version
```

非公开接口需要 `X-Plystra-API-Key`。

## 保护一个动作

Context Mode 允许你的现有后端传入可信的 actor、resource 和 grants。

```bash
curl -s -X POST http://localhost:8080/api/v1/authz/check \
  -H "Content-Type: application/json" \
  -H "X-Plystra-API-Key: ply_kernel_secret" \
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

响应包含 `allow`、`decision`、`deny_code`、`reason`、`trace_id` 和 `audit_log_id`。

## 信任边界

Inline context 是可信服务端输入。请从已认证 session 和数据库状态构造这些字段，不要直接转发浏览器传来的 actor、grants 或资源归属字段。
