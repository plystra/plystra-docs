---
title: 开发者手册
description: 面向生产接入的 Plystra Core v1.0 开发者完整指南，包含可直接复制的请求、对象建模、权限、SDK 和排错细节。
---

这份手册是开发者接入 Plystra Core v1.0 的主路径。它假设你的应用已经有发票、工单、订单、文档、案件、项目等业务对象，现在需要把“谁可以对哪个对象做什么”交给 Plystra Core 判断。

本文按照当前 `1.0.0-dev13` 的真实代码和接口编写。你不需要猜哪些字段必填、哪个凭证该放哪里、哪个 deny code 代表什么。

## Plystra 负责什么

Plystra Core 回答你的后端一个问题：

```text
这个 User，是否可以通过这个 Space 内的这个 Member，对这个资源执行这个 action？
```

Plystra 不是你的业务数据库，也不是完整 SaaS 平台。它是身份与授权控制面，负责存储：

| 概念 | Plystra 中的对象 | 作用 |
|---|---|---|
| `User` | 登录账号和审计主体。 | 记录真实是谁发起了操作。 |
| `Space` | 租户、工作区、组织、环境或账号边界。 | 防止跨租户越权。 |
| `Member` | Space 内的业务身份。 | 多个 User 可以通过同一个 Member 行动，一个 User 也可以绑定多个 Member。 |
| `UserMember` | User 到 Member 的绑定。 | 被撤销、过期或 inactive 时，即使 Role 匹配也会 deny。 |
| `Group` | Space 内的层级作用域。 | 用于 `finance` 覆盖 `finance.apac` 这类 group tree 授权。 |
| `Permission` | resource、action、scope 规则。 | 例如 `invoice.approve` + `group_tree`。 |
| `Role` | Space 内的权限集合。 | 通过 `MemberRole` 授给 Member。 |
| `MemberRole` | Member 的 Role 授权，可带 Group anchor。 | 定义 Role 在哪里生效。 |
| `ResourceType` 和 `ResourceMapping` | Resource Registry。 | 告诉引擎资源如何暴露 `space_id`、`group_id`、owner、status。 |
| `Resource` | Core 内置的资源镜像表。 | 让外部业务对象能以稳定 id 被授权检查。 |
| `AdminGrant` | 人类管理员能力。 | 用同一套 User/session 体系保护 Core 管理 API。 |
| `ApiKey` | 机器凭证，带显式权限和 scope。 | 用于服务到服务调用。 |
| `AuditLog` | 追加式决策和 mutation trace。 | 事后解释 allow/deny。 |

## 推荐生产架构

默认使用下面的架构：

```text
浏览器或客户端
  -> 你的前端或网关完成用户认证
  -> 你的后端拿到自己的应用 session
  -> 你的后端调用 Plystra：
       用户驱动的管理操作使用 user access token
       服务到服务的授权检查使用 scoped API key
  -> 只有 Plystra 返回 allow 时，你的后端才执行真正业务动作
```

不要把 API key 放进浏览器或移动端。API key 是服务端机器密钥。

不要信任浏览器直接传来的 actor tuple。应该由可信后端根据自己的 session 或 Plystra access token 解析 `User`、`Member`、`UserMember` 和 `Space`。

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

本地 demo seed 会让 Alice 成为 instance super admin。全新生产实例需要按下一节 bootstrap。

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

## 选择正确凭证

每条调用链只选择一种凭证模式。

| 场景 | 凭证 | 存放位置 | 要点 |
|---|---|---|---|
| 用户驱动的 Core 管理后台 | `/api/v1/auth/login` 返回的 Bearer access token | 加密的服务端 session 或后端 token store。 | 该 User 必须有 active `AdminGrant`。 |
| 业务后端做授权检查 | scoped API key | Secret manager、环境注入、workload secret。 | 必须包含 `authz:check`；API key 调用必须传 `actor`。 |
| 后端自动化管理任务 | scoped API key | Secret manager。 | 只给必要 permission key 和 scope。 |
| 一次性 bootstrap 或本地 demo | 密码登录 | 仅限本地开发。 | SDK 保留密码登录能力，但不建议常规后端路径反复使用密码。 |
| 浏览器或移动端直连 | 不使用 API key | 不要在客户端保存 API key。 | 客户端应该请求你的后端，由后端调用 Plystra。 |

## 授权请求契约

规范 HTTP 请求：

```json
{
  "actor": {
    "user_id": "user_alice",
    "member_id": "member_finance_reviewer",
    "user_member_id": "um_alice_finance_reviewer",
    "space_id": "space_acme"
  },
  "resource_type": "invoice",
  "resource_id": "invoice_001",
  "action": "approve"
}
```

字段要求：

| 字段 | 何时必填 | 含义 |
|---|---|---|
| `actor.user_id` | API key 调用必填；Bearer session 可省略。 | 真实登录或审计 User。 |
| `actor.member_id` | API key 调用必填；Bearer session 可省略。 | Space 内实际行动的业务身份。 |
| `actor.user_member_id` | API key 调用必填；Bearer session 可省略。 | 证明 User 可以通过 Member 行动的 active binding。 |
| `actor.space_id` | API key 调用必填；Bearer session 可省略。 | 租户边界。 |
| `resource_type` | 必填，除非使用 `resource.type`。 | 已注册的资源类型 key。 |
| `resource_id` | 必填，除非使用 `resource.id`。 | Core resource id。 |
| `action` | 必填。 | 资源类型下注册的 action key。 |

Bearer session 调用可以省略 `actor`，Core 会使用登录或 `POST /api/v1/actor/switch-member` 选中的 session active actor。

API key 调用必须传 `actor`，因为机器 key 不能代表具体人类身份。

HTTP authz 请求不能在 body 中传 `request_id`、`ip`、`user_agent`。这些 canonical 值由 middleware 和 HTTP request 派生。

## 决策语义

只有以下条件全部成立，Core 才会 allow：

1. `User` 存在且 active。
2. `Space` 存在且 active。
3. `Member` 存在、active，并属于同一个 Space。
4. `UserMember` 存在、active，属于同一个 User、Member、Space，并且没有过期或撤销。
5. 资源类型和 action 已注册且 active。
6. 目标资源存在且 active。
7. 目标资源和 actor 属于同一个 Space。
8. 至少一个 active role grant 给该 Member 匹配的 Permission。
9. Permission scope 覆盖目标资源。

常见 deny code：

| Code | 常见原因 | 修复方向 |
|---|---|---|
| `ACTOR_NOT_FOUND` | actor id 解析失败。 | 检查 User、Member、UserMember、Space id。 |
| `USER_INACTIVE` | User 被 disabled 或 deleted。 | 恢复 User 或换 User。 |
| `USER_MEMBER_REVOKED` | Binding 被撤销、disabled 或过期。 | 创建或恢复 active UserMember。 |
| `SPACE_MISMATCH` | actor 和资源在不同 Space。 | 不要跨租户授权。 |
| `RESOURCE_NOT_FOUND` | resource row 缺失或 inactive。 | 创建或恢复资源。 |
| `NO_MATCHING_PERMISSION` | 没有 active Role/Permission candidate 匹配 resource 和 action。 | 创建 Permission 并授予 Role。 |
| `SCOPE_OUT_OF_BOUNDS` | Role 存在，但 anchor group 不覆盖目标 group。 | 调整资源 group、调整 anchor，或创建更合适的 grant。 |
| `GLOBAL_SCOPE_DISABLED` | v1.0 禁用 `global` scope。 | 使用 `space`、`group_tree` 或 `self`。 |

## Scope 规则

| Permission scope | 覆盖范围 | 要求 |
|---|---|---|
| `space` | actor Space 内任意目标资源。 | actor 和资源必须同 `space_id`。 |
| `group_tree` | 目标 group 等于 anchor group，或是其子孙。 | `MemberRole.scope_anchor_group_id` 和目标 `group_id`。 |
| `self` | 目标资源 owner 等于 actor Member。 | Resource mapping 必须暴露 `owner_member_id`。 |
| `global` | v1.0 禁用。 | 生产不要使用。 |

`group_tree` 使用安全路径规则：

```text
target_path = anchor_path OR target_path starts with anchor_path + "."
```

所以 `finance` 覆盖 `finance.apac`，但不覆盖 `financeops`。

## 可复制接入流程

下面创建一个最小 `invoice.approve` 授权模型。先准备变量：

```bash
export PLYSTRA_URL=http://localhost:8080
export PLYSTRA_TOKEN=<alice-or-super-admin-access-token>
```

### 1. 管理员登录

```bash
curl -s -X POST "$PLYSTRA_URL/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"alice@example.com","password":"plystra-demo"}'
```

把返回的 `data.access_token` 放到 `PLYSTRA_TOKEN`。

### 2. 注册 ResourceType

```bash
curl -s -X POST "$PLYSTRA_URL/api/v1/resource-types" \
  -H "Authorization: Bearer $PLYSTRA_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "rt_invoice",
    "key": "invoice",
    "display_name": "Invoice",
    "description": "Invoices mirrored from the billing system",
    "source": "core"
  }'
```

### 3. 注册 Action

```bash
curl -s -X POST "$PLYSTRA_URL/api/v1/resource-types/invoice/actions" \
  -H "Authorization: Bearer $PLYSTRA_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "ra_invoice_approve",
    "key": "approve",
    "display_name": "Approve invoice",
    "risk_level": "high",
    "audit_default": true
  }'
```

### 4. 注册 Mapping

如果使用 Core 内置 `resources` 表镜像业务对象：

```bash
curl -s -X POST "$PLYSTRA_URL/api/v1/resource-types/invoice/mapping" \
  -H "Authorization: Bearer $PLYSTRA_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "rm_invoice",
    "storage_kind": "internal_table",
    "table_name": "resources",
    "id_field": "id",
    "space_field": "space_id",
    "group_field": "group_id",
    "owner_member_field": "owner_member_id",
    "visibility_field": "visibility",
    "metadata_field": "metadata",
    "status": "active"
  }'
```

### 5. 创建 Space

```bash
curl -s -X POST "$PLYSTRA_URL/api/v1/spaces" \
  -H "Authorization: Bearer $PLYSTRA_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "space_acme",
    "name": "Acme",
    "slug": "acme",
    "type": "customer",
    "status": "active"
  }'
```

### 6. 创建 Group

```bash
curl -s -X POST "$PLYSTRA_URL/api/v1/spaces/space_acme/groups" \
  -H "Authorization: Bearer $PLYSTRA_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "group_finance",
    "name": "Finance",
    "path": "finance"
  }'

curl -s -X POST "$PLYSTRA_URL/api/v1/spaces/space_acme/groups" \
  -H "Authorization: Bearer $PLYSTRA_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "group_finance_apac",
    "parent_group_id": "group_finance",
    "name": "APAC",
    "path": "finance.apac"
  }'
```

### 7. 创建 User、Member、UserMember

创建 User：

```bash
curl -s -X POST "$PLYSTRA_URL/api/v1/users" \
  -H "Authorization: Bearer $PLYSTRA_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "user_alice",
    "email": "alice@example.com",
    "password": "plystra-demo",
    "status": "active"
  }'
```

创建 Space 内 Member：

```bash
curl -s -X POST "$PLYSTRA_URL/api/v1/spaces/space_acme/members" \
  -H "Authorization: Bearer $PLYSTRA_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "member_finance_reviewer",
    "display_name": "Finance Reviewer",
    "member_type": "human",
    "status": "active"
  }'
```

绑定 User 和 Member：

```bash
curl -s -X POST "$PLYSTRA_URL/api/v1/spaces/space_acme/user-members" \
  -H "Authorization: Bearer $PLYSTRA_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "um_alice_finance_reviewer",
    "user_id": "user_alice",
    "member_id": "member_finance_reviewer",
    "relation_type": "login",
    "is_primary": true,
    "status": "active"
  }'
```

### 8. 创建 Permission、Role、授权

创建 Permission：

```bash
curl -s -X POST "$PLYSTRA_URL/api/v1/permissions" \
  -H "Authorization: Bearer $PLYSTRA_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "perm_invoice_approve_group_tree",
    "resource": "invoice",
    "action": "approve",
    "scope": "group_tree",
    "description": "Approve invoices within a group subtree"
  }'
```

创建 Role：

```bash
curl -s -X POST "$PLYSTRA_URL/api/v1/spaces/space_acme/roles" \
  -H "Authorization: Bearer $PLYSTRA_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "role_finance_approver",
    "key": "finance_approver",
    "name": "Finance Approver"
  }'
```

把 Permission 绑定到 Role：

```bash
curl -s -X POST "$PLYSTRA_URL/api/v1/role-permissions" \
  -H "Authorization: Bearer $PLYSTRA_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "rp_finance_approver_invoice_approve",
    "role_id": "role_finance_approver",
    "permission_id": "perm_invoice_approve_group_tree"
  }'
```

把 Role 授给 Member，并锚定在 `group_finance`：

```bash
curl -s -X POST "$PLYSTRA_URL/api/v1/spaces/space_acme/member-role-grants" \
  -H "Authorization: Bearer $PLYSTRA_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "mr_finance_reviewer_approver",
    "member_id": "member_finance_reviewer",
    "role_id": "role_finance_approver",
    "scope_anchor_group_id": "group_finance",
    "status": "active"
  }'
```

### 9. 登记目标资源

```bash
curl -s -X POST "$PLYSTRA_URL/api/v1/resources" \
  -H "Authorization: Bearer $PLYSTRA_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "invoice_001",
    "space_id": "space_acme",
    "resource_type": "invoice",
    "external_id": "billing-system-invoice-001",
    "group_id": "group_finance_apac",
    "owner_member_id": "member_finance_reviewer",
    "display_name": "Invoice 001",
    "visibility": "private",
    "status": "active"
  }'
```

### 10. 调用授权检查

使用 API key：

```bash
curl -s -X POST "$PLYSTRA_URL/api/v1/authz/check" \
  -H "X-Plystra-API-Key: $PLYSTRA_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "actor": {
      "user_id": "user_alice",
      "member_id": "member_finance_reviewer",
      "user_member_id": "um_alice_finance_reviewer",
      "space_id": "space_acme"
    },
    "resource_type": "invoice",
    "resource_id": "invoice_001",
    "action": "approve"
  }'
```

使用 Bearer access token 和 session active actor：

```bash
curl -s -X POST "$PLYSTRA_URL/api/v1/authz/check" \
  -H "Authorization: Bearer $PLYSTRA_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "resource_type": "invoice",
    "resource_id": "invoice_001",
    "action": "approve"
  }'
```

allow 响应中 `data.decision` 为 `allow`。合法请求被 deny 时依然是一个成功的授权决策，`decision = deny`，并带 `deny_code`。

## 安全创建 API Key

调用方只有在目标 scope 上拥有 `api_keys:create` 时，才能创建 API key。调用方只能给新 API key 委派自己在同一目标 scope 已经拥有的 permission key。

创建 Space 级 billing service key：

```bash
curl -s -X POST "$PLYSTRA_URL/api/v1/api-keys" \
  -H "Authorization: Bearer $PLYSTRA_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "ak_billing_service_prod",
    "name": "billing-service-prod",
    "level": "space",
    "space_id": "space_acme",
    "permission_keys": ["authz:check", "resources:read"],
    "expires_at": "2026-12-31T23:59:59Z"
  }'
```

响应中的 `data.api_key` 只返回一次，必须立刻放入 secret manager。

生产规则：

- 使用最窄级别：能用 `group` 就不用 `space`，能用 `space` 就不用 `instance`。
- 只授予必要 permission key。
- 生产 service key 必须设置过期时间。
- 轮换时先创建新 key，部署并确认流量正常，再 revoke 旧 key。
- 不要用 API key 创建 human admin grant。Core 会拒绝 API key 创建或撤销 AdminGrant。

## AdminGrant

AdminGrant 保护 Core 管理 API。它本身不等于业务资源权限。

| Level | Scope | 能否创建 instance admin | 常见用途 |
|---|---|---|---|
| `instance_super_admin` | 整个实例 | 可以 | bootstrap、owner、break-glass。 |
| `instance_admin` | 整个实例，但受 permission key 限制 | 不可以，除非同时是 super。 | 特定管理域的平台运维。 |
| `space_admin` | 单个 Space | 不可以 | 租户管理员。 |
| `group_admin` | 单个 Group 子树 | 不可以 | 部门或目录管理员。 |

创建一个只能在某 Space 读 users 的管理员：

```bash
curl -s -X POST "$PLYSTRA_URL/api/v1/admin/grants" \
  -H "Authorization: Bearer $PLYSTRA_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "user_ops",
    "level": "space_admin",
    "space_id": "space_acme",
    "permission_key": "users:read"
  }'
```

只有 user session 可以创建或撤销 AdminGrant。API key 即使拥有 `admin_grants:manage`，也不能创建或撤销 human admin grant。

Core 会阻止撤销最后一个 active instance super admin grant。

## Permission Key 规则

Permission key 是小写 `domain:action` 字符串。

合法示例：

```text
users:read
users:manage
api_keys:create
admin_grants:manage
resources:read
resources:manage
authz:check
```

匹配规则：

| Grant key | 覆盖范围 |
|---|---|
| `*` | 所有权限，只适合可信人类 instance grant。 |
| `domain:*` | domain 下所有 action。 |
| `domain:manage` | domain 下所有 action，包括 `domain:read`。 |
| 精确 key | 只覆盖该 key。 |

非法示例：

```text
*:read
Users:read
users
users:
users:read/write
users:read:extra
```

## SDK 接入模式

### TypeScript API Key

```ts
import { PlystraClient } from "@plystra/sdk";

const plystra = new PlystraClient({
  baseUrl: process.env.PLYSTRA_URL!,
  apiKey: process.env.PLYSTRA_API_KEY!,
});

const decision = await plystra.authz.check({
  actor: {
    user_id: "user_alice",
    member_id: "member_finance_reviewer",
    user_member_id: "um_alice_finance_reviewer",
    space_id: "space_acme",
  },
  resource_type: "invoice",
  resource_id: "invoice_001",
  action: "approve",
});

if (decision.decision !== "allow") {
  throw new Error(`Plystra denied: ${decision.deny_code}`);
}
```

### Python 使用 access token

```python
from plystra import Plystra

with Plystra("https://plystra.internal", access_token=session["plystra_access_token"]) as plystra:
    decision = plystra.authz.check(
        resource_type="invoice",
        resource_id="invoice_001",
        action="approve",
    )
    if decision["decision"] != "allow":
        raise PermissionError(decision.get("deny_code"))
```

### Python Async 使用 API key

```python
from plystra import AsyncPlystra

async with AsyncPlystra("https://plystra.internal", api_key=api_key) as plystra:
    decision = await plystra.authz.check(
        actor={
            "user_id": "user_alice",
            "member_id": "member_finance_reviewer",
            "user_member_id": "um_alice_finance_reviewer",
            "space_id": "space_acme",
        },
        resource_type="invoice",
        resource_id="invoice_001",
        action="approve",
    )
```

### Go 自定义 HTTP client

```go
client := plystra.NewClient(
	"https://plystra.internal",
	plystra.WithAPIKey(os.Getenv("PLYSTRA_API_KEY")),
	plystra.WithHTTPClient(&http.Client{Timeout: 5 * time.Second}),
)
```

## 错误处理

Core 使用结构化错误 envelope：

```json
{
  "error": {
    "code": "ADMIN_PERMISSION_REQUIRED",
    "message": "The current user does not have the required admin permission.",
    "details": {
      "permission": "api_keys:create"
    },
    "request_id": "req_..."
  },
  "request_id": "req_..."
}
```

应用处理建议：

| HTTP status | 常见 code | 建议 |
|---|---|---|
| `400` | `VALIDATION_FAILED` | 视为开发或配置错误，记录 details。 |
| `401` | `AUTHENTICATION_REQUIRED`、`SESSION_EXPIRED` | refresh session 或要求重新登录。 |
| `403` | `ADMIN_PERMISSION_REQUIRED` | 不要自动重试，展示权限不足。 |
| `404` | `*_NOT_FOUND`、`FEATURE_DISABLED` | 检查 id 或 feature flag。 |
| `409` | `*_CREATE_FAILED`、`LAST_SUPER_ADMIN` | 修复冲突状态或保留最后 super admin。 |
| `500` | `INTERNAL_ERROR` | 只有幂等操作才考虑重试，并告警。 |

对 `authz.check` 来说，`decision = deny` 不是传输错误，而是成功的授权决策。你的业务 API 通常应把它转换成 `403`。

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
- [Admin Auth 与安全边界](/zh/reference/admin-auth-and-security/)
- [自托管部署](/zh/guides/self-hosting/)
