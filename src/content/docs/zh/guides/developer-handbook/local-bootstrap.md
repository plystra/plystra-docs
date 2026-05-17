---
title: 本地启动与超级管理员 Bootstrap
description: 本地运行 Plystra Core，并在没有 admin token 的情况下创建第一个 instance super admin。
---

## 本地启动 Core

在 Core 仓库中执行：

```bash
cp .env.example .env
docker compose up -d
go run ./cmd/plystractl doctor
```

期望输出：

```text
environment: development
configuration: ok
database: ok
migrations: current
schema: ok
service readiness: ok
```

本地 demo 账号：

```text
alice@example.com / plystra-demo
bob@example.com / plystra-demo
```

运行 `make seed-demo` 会让 Alice 成为本地开发用 instance super admin。全新生产实例需要按下一节 bootstrap。

## 创建第一个 Instance Super Admin

Plystra 不使用 admin token。管理 API 由用户 session 和 scoped admin grant 保护。

第一个管理员是普通 `User` 加一个 `AdminGrant`：

```text
level = instance_super_admin
permission_key = *
```

如果系统中还没有 active instance super admin，执行：

```bash
go run ./cmd/plystractl admin bootstrap-super-admin --user-id <existing_user_id>
```

可选指定 member 和 grant id：

```bash
go run ./cmd/plystractl admin bootstrap-super-admin \
  --user-id user_ops_owner \
  --member-id member_ops_owner \
  --grant-id ag_user_ops_owner_instance_super_admin
```

如果已经存在 active `instance_super_admin` grant，命令会拒绝执行。之后只能用 AdminGrant API 创建、收窄或撤销管理员权限。
