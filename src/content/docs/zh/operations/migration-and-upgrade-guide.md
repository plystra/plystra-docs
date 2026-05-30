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

## Backend OS Alpha 模板初始化

Backend OS Alpha 提供可审计的模板初始化命令。它会从官方 template manifest 创建本地应用目录，并写入启动、检查、备份和升级所需的操作文件。

```bash
plystractl templates list
plystractl templates describe auth-ready-saas
plystractl templates create --template auth-ready-saas --name "Acme SaaS" --out ./acme-saas
```

生成目录包含：

| 文件 | 用途 |
|---|---|
| `README.md` | 生成应用的启动和运维命令。 |
| `.env.example` | 面向生产的环境变量模板，只包含不可直接用于生产的 placeholder secrets。 |
| `docker-compose.yml` | 所选模板需要的 Core、PostgreSQL 和官方 plugin sidecar 服务。 |
| `plystra/template-installation.json` | Template manifest、deployment profile、preview、required plugins 和 capability requirements。 |
| `plystra/install-explanation.md` | 人类可读的安装说明、默认值、operator actions 和限制。 |

该命令刻意保持透明，不会生成真实 secrets，不会自动创建第一个 instance super admin，不会自动执行 migrations，也不代表公开 marketplace 已经存在。先审阅生成文件，把 `.env.example` 复制为 `.env`，设置强 secrets，再启动并验证：

```bash
docker compose --env-file .env up -d postgres
docker compose --env-file .env run --rm plystra-core plystractl migrate up
docker compose --env-file .env run --rm plystra-core plystractl migrate verify
docker compose --env-file .env run --rm plystra-core plystractl doctor
docker compose --env-file .env up -d
```

如果模板需要 Complete Auth，启用公开认证流之前必须在 `plugin_auth_settings` 中配置插件数据库设置。生产邮件发送必须使用独立 email capability provider。
