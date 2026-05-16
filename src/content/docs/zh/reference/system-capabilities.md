---
title: System Capabilities
description: Plystra 可信启动时系统能力模块的生产边界。
---

Plystra `1.0.0-rc104` 的运行入口保留在 `plystra/plystra` 仓库，并在启动时加载官方可信 system capability sidecar。

System capabilities 是有特权的运行时模块，不是普通业务插件。它们构成治理层，后续业务插件必须受它们约束。

| Capability | ID | 职责 |
|---|---|---|
| Audit | `audit.explainable` | 审计写入、审计查询、decision trace 存储和隐私快照规则。 |
| Identity | `identity.business` | User、Space、Member、UserMember、Group 和 actor context resolution。 |
| Resource Registry | `resource.registry` | Resource type、action、resource binding 和 lookup context。 |
| Authorization | `authorization.resource` | `authz/check`、`authz/explain`、deny code、scope 计算和 decision trace。 |
| Admin | `admin.control_plane` | AdminGrant、管理 API 保护、bootstrap handoff 和 admin audit event。 |

## 信任边界

当前 system capability 模型刻意保持很窄。

`1.0.0-rc104` 允许：

- 独立仓库和独立版本
- 独立 `capability.yaml` manifest
- 独立 Atlas-style migration bundle
- 由 `plystra/plystra` 启动的本地 sidecar 进程
- 仅启动时加载
- manifest 校验、依赖排序、lockfile pinning 和 binary checksum 验证
- Kernel 通过 `github.com/plystra/contracts` 调用 capability

`1.0.0-rc104` 不支持：

- 运行时热卸载或替换 required system capability
- 第三方 system capability
- system capability 远程 marketplace 安装
- business plugin 替换 identity、authorization、audit、resource registry 或 admin control
- Go `plugin` ABI 加载
- WASM 或 container marketplace 方式运行核心治理模块

## 仓库契约

`github.com/plystra/contracts` 拥有共享 capability 类型、lifecycle payload、route/service registration、lockfile 结构和领域 contract 类型。

System capability 仓库依赖 `contracts`；它们不能 import `plystra/plystra` 的实现代码。主运行时仓库依赖 `contracts`，并通过 manifest 和 pinned local binary 启动 capability。

`system-authz` 是授权实现仓库。公开 capability ID 仍然是 `authorization.resource`。

## 启动流程

`plystra/plystra` 启动时会：

1. 读取 `capabilities/system-capabilities.yaml` 或 `PLYSTRA_SYSTEM_CAPABILITIES_CONFIG`。
2. 读取或创建 `capabilities/plystra.lock` 或 `PLYSTRA_LOCKFILE`。
3. 解析并校验每个 `capability.yaml`。
4. 用 lockfile checksum 校验每个 binary。
5. 按 required system order 解析依赖图。
6. 执行每个 capability 的 migration bundle，并把 checksum 写入 `kernel_capability_migrations`。
7. 启动每个 sidecar 进程。
8. 调用 health、describe、prepare、start lifecycle endpoint。
9. 注册 service 和 route。
10. 只有所有 required capability ready 后，`/api/v1/ready` 才返回 ready。

Required capability 启动失败时，运行时必须保持 unready。

## 本地构建

在主运行时仓库中构建官方 sidecar：

Linux 和 macOS：

```bash
cd ~/src/plystra/plystra
./scripts/build-capabilities.sh
```

Windows PowerShell：

```powershell
cd C:\Users\i\Documents\GitHub\plystra\plystra
.\scripts\build-capabilities.ps1
```

脚本会把 manifest 和 migration 复制到 `plystra/capabilities/`，从五个 `system-*` 仓库构建本地 binary，并删除旧 lockfile，让下次启动重新 pin 最新 checksum。

## 配置

默认配置文件：

```yaml
system_capabilities:
  - id: audit.explainable
    source: local
    binary: ./system-audit/system-audit
    manifest: ./system-audit/capability.yaml
    required: true
  - id: identity.business
    source: local
    binary: ./system-identity/system-identity
    manifest: ./system-identity/capability.yaml
    required: true
  - id: resource.registry
    source: local
    binary: ./system-resource-registry/system-resource-registry
    manifest: ./system-resource-registry/capability.yaml
    required: true
  - id: authorization.resource
    source: local
    binary: ./system-authz/system-authz
    manifest: ./system-authz/capability.yaml
    required: true
  - id: admin.control_plane
    source: local
    binary: ./system-admin/system-admin
    manifest: ./system-admin/capability.yaml
    required: true
```

Linux 和 macOS 会解析无扩展名 binary。Windows 下运行时也会自动解析 `.exe` binary。

可以用 `PLYSTRA_SYSTEM_CAPABILITIES_CONFIG` 指定配置路径，用 `PLYSTRA_LOCKFILE` 指定 lockfile 路径。

## Manifest 要求

每个官方 system capability manifest 必须声明：

- 官方 required capability ID
- `kind: system_capability`
- 语义化版本，当前为 `1.0.0-rc104`
- process runtime、HTTP protocol 和 address
- kernel compatibility
- required capability 依赖
- services、routes、migrations 和 migration namespace
- `privileged: true`
- `required: true`
- `stability: experimental`

每个 capability 只能拥有自己的 migration namespace：

| Capability | Namespace |
|---|---|
| `audit.explainable` | `sys_audit` |
| `identity.business` | `sys_identity` |
| `resource.registry` | `sys_resource` |
| `authorization.resource` | `sys_authz` |
| `admin.control_plane` | `sys_admin` |

## 运行时检查

用 readiness 和 capability inspection 检查运行时：

```bash
curl -s http://localhost:8080/api/v1/ready
curl -s -H "X-Plystra-API-Key: $PLYSTRA_API_KEY" \
  http://localhost:8080/api/v1/capabilities
```

`/api/v1/ready` 包含 `system_capabilities`。`/api/v1/capabilities` 受管理权限边界保护。

## 生产检查

- 从将要部署的准确源码 revision 构建 sidecar。
- 随部署 artifact 保留 `plystra.lock`。
- 不要手工编辑 lockfile checksum。
- 生产流量启动前执行 `plystractl migrate verify`。
- Smoke test health、ready、version、`authz/check` allow、`authz/check` deny 和受保护的 `/api/v1/capabilities`。
- 把 capability binary 当作可信部署 artifact，用和主运行时相同的发布控制进行分发。
