---
title: System Capabilities
description: Plystra 内置可信系统能力模块的生产边界。
---

Plystra `1.0.0-rc121` 把运行入口和官方 system capabilities 都保留在 `plystra/plystra` 仓库中。Kernel 在进程启动时把它们作为内置特权模块加载。

System capabilities 不是业务插件。它们是治理层，后续业务插件必须经过它们约束。

| Capability | ID | 职责 |
|---|---|---|
| Audit | `audit.explainable` | 审计写入、审计查询、decision trace 存储和隐私快照规则。 |
| Identity | `identity.business` | User、Space、Member、UserMember、Group 和 actor context resolution。 |
| Resource Registry | `resource.registry` | Resource type、action、resource binding 和 lookup context。 |
| Authorization | `authorization.resource` | `authz/check`、`authz/explain`、deny code、scope 计算和 decision trace。 |
| Admin | `admin.control_plane` | AdminGrant、管理 API 保护、bootstrap handoff 和 admin audit event。 |

## 信任边界

当前模型刻意保持很窄。

`1.0.0-rc121` 允许：

- `internal/system/*` 下的内置模块
- `internal/kernel/contracts` 下的稳定 kernel contract
- 通过 manifest 声明 service、route、lifecycle hook 和 migration ownership
- 仅启动时加载
- 依赖排序和 readiness checks
- kernel 拥有 service registry、route registry、event substrate 和 migration registry

`1.0.0-rc121` 不支持：

- 运行时热卸载或替换 required system capability
- 第三方 system capability
- system capability 远程 marketplace 安装
- business plugin 替换 identity、authorization、audit、resource registry 或 admin control
- Go `plugin` ABI 加载
- sidecar 或外部进程方式加载 system capability

## 仓库契约

`plystra/plystra` 是主发行仓库，包含完整 runtime：

```text
internal/kernel/
  app.go
  config/
  lifecycle/
  registry/
  contracts/
  migrations/
  events/
  bootstrap/

internal/system/
  audit/
  identity/
  resource_registry/
  authz/
  admin/
```

Kernel 代码依赖 contract interface 和 registry metadata。Kernel 不拥有 identity、resource registry、authorization、audit 或 admin control 的业务语义；capability package 实现这些语义，并通过 kernel lifecycle 注册。

## 启动流程

`plystrad` 启动时会：

1. 读取配置，并打开 Ent-backed PostgreSQL 连接。
2. 初始化最小 kernel event substrate。
3. 发现内置 system capability manifest。
4. 校验 capability ID、version、required flag、privilege 和依赖。
5. 解析依赖图。
6. 注册 capability migration ownership metadata。
7. 在 service registry 中注册 system services。
8. 注册 API route metadata。
9. 启动 capability lifecycle hook。
10. 只有 required capabilities 全部健康后，`/api/v1/ready` 才进入 ready。

Required capability 启动失败时，runtime 必须保持 unready。

## Migrations

数据库访问通过 Ent，生产 schema 变更通过 `plystra/migrations/` 下的 versioned Atlas-style SQL migration 承载。

每个 system capability 在代码中拥有自己的 migration namespace，kernel 负责校验并执行发行 migration set：

| Capability | Namespace |
|---|---|
| `audit.explainable` | `sys_audit` |
| `identity.business` | `sys_identity` |
| `resource.registry` | `sys_resource` |
| `authorization.resource` | `sys_authz` |
| `admin.control_plane` | `sys_admin` |

生产升级不要使用 Ent auto migration。

## Manifest 要求

每个内置 system capability manifest 必须声明：

- 官方 required capability ID
- `kind: system_capability`
- 语义化版本，当前为 `1.0.0-rc121`
- required capability 依赖
- services、routes、events 和 migration ownership
- `privileged: true`
- `required: true`
- `stability: experimental`

## 运行时检查

用 readiness 和 capability inspection 检查 runtime：

```bash
curl -s http://localhost:8080/api/v1/ready
curl -s -H "X-Plystra-API-Key: $PLYSTRA_API_KEY" \
  http://localhost:8080/api/v1/capabilities
```

`/api/v1/ready` 包含 `system_capabilities`。`/api/v1/capabilities` 受管理权限边界保护。

## 生产检查

- 从将要部署的准确源码 revision 构建主 runtime。
- 生产流量启动前执行 `plystractl migrate verify`。
- 部署验证中执行 `plystractl ent check` 和 `plystractl doctor`。
- Smoke test health、ready、version、`authz/check` allow、`authz/check` deny 和受保护的 `/api/v1/capabilities`。
- 把 system capability 代码视为特权发行代码，用和 kernel 变更相同的控制审查。
