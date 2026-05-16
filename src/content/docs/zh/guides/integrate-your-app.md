---
title: 接入你的应用
description: 按照当前 Plystra Core v1.0 真实接口，把现有后端接入 Plystra 授权。
---

这篇文档是一条可以直接照着走的接入路径：从你的业务后端，到 Plystra 的一次可解释授权检查。

完成后，你的后端可以问 Plystra：

```text
Alice 通过 Finance Reviewer 这个业务身份，能不能审批 Finance APAC 下的 expense_report_001？
```

Plystra 会返回带审计 trace 的 `allow` 或 `deny` 决策。

## 先用 Context Mode

第一次接入时，让你的现有应用继续做事实来源：

```text
你的 users 表 -> inline actor
你的 org/tenant 表 -> inline space_id
你的 memberships 表 -> inline member_id 和 binding_id
你的 invoice 表 -> inline resource
你的 role 表 -> inline grants
```

Context Mode 不要求先把 users、organizations、memberships 或 resources 导入 Plystra。你的后端在保护业务动作的瞬间，把本次决策需要的上下文传给 Plystra。

这是安全边界。Inline actor、resource 和 grants 只能通过服务端 API key 调用。浏览器或移动端必须先请求你的后端，由你的后端从可信 session/database 状态构造 Plystra 请求。

```bash
curl -s -X POST "$PLYSTRA_URL/api/v1/authz/check" \
  -H "Content-Type: application/json" \
  -H "X-Plystra-API-Key: $PLYSTRA_API_KEY" \
  -d '{
    "actor": {
      "user_id": "user_external_alice",
      "member_id": "member_finance_reviewer",
      "binding_id": "binding_external_alice_finance",
      "space_id": "space_acme",
      "user_email": "alice@example.com"
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
    "action": "approve"
  }'
```

常见第一批 deny：

| Code | 含义 |
|---|---|
| `INLINE_CONTEXT_REQUIRES_API_KEY` | Inline context 使用了 session 或浏览器凭证。 |
| `ADMIN_PERMISSION_REQUIRED` | API key 没有 inline Space/Group 上的 `authz:check`。 |
| `NO_MATCHING_PERMISSION` | 没有 inline grant 匹配 resource/action。 |
| `SCOPE_OUT_OF_BOUNDS` | grant 存在，但目标资源不在 scope anchor 内。 |
| `CROSS_SPACE_VIOLATION` | Actor、resource、grant 或 scope anchor 的 Space 不一致。 |

Context Mode 跑通后，如果你希望 Plystra 直接保存 Spaces、Groups、Members、Resource records 和 Role grants，可以继续使用下面的托管 Core 模型。

## 接入映射

先把你的业务概念映射到 Plystra：

| 你的应用 | Plystra Core | 示例 |
|---|---|---|
| 租户、公司、工作区 | `Space` | `space_contoso` |
| 部门、项目、文件夹、组织单元 | `Group` | `finance.apac` |
| 登录账号 | `User` | `user_docs_alice` |
| 租户内真正执行业务动作的身份 | `Member` | `member_docs_finance_reviewer` |
| User 可以作为某个 Member 行动 | `UserMember` | `um_docs_alice_finance_reviewer` |
| 业务对象 | `Resource` | `expense_report_001` |
| 业务对象类型 | `ResourceType` | `expense_report` |
| 业务动作 | `ResourceAction` | `approve` |
| 权限规则 | `Permission` | `expense_report.approve.group_tree` |
| 角色授权 | `MemberRole` | Finance Reviewer 在 `finance` 下拥有 Finance Approver |

最重要的身份链路是：

```text
User -> UserMember -> Member -> Space
```

你自己的后端在保护业务接口时，需要把这组 actor tuple 传给 Plystra。

## 0. 设置客户端变量

本地开发时，先用种子数据中的 Alice super admin 登录，然后导出返回的 access token：

```bash
export PLYSTRA_URL=http://localhost:8080
export PLYSTRA_ACCESS_TOKEN=$(
  curl -s -X POST "$PLYSTRA_URL/api/v1/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"email":"alice@example.com","password":"plystra-demo"}' |
  jq -r '.data.access_token'
)
```

PowerShell：

```powershell
$env:PLYSTRA_URL = "http://localhost:8080"
$login = curl.exe -s -X POST "$env:PLYSTRA_URL/api/v1/auth/login" `
  -H "Content-Type: application/json" `
  -d '{"email":"alice@example.com","password":"plystra-demo"}' | ConvertFrom-Json
$env:PLYSTRA_ACCESS_TOKEN = $login.data.access_token
```

下面所有管理 API 都需要：

```text
Authorization: Bearer <access_token>
```

这个管理 session 只能放在服务端，不能暴露给浏览器或移动端。

本文里的创建请求适合在干净的本地开发数据库中跑一次。如果重复执行并收到 `409 Conflict`，说明记录已经存在；继续使用已有记录，或者换一组示例 ID。

## 1. 先跑通内置 demo

启动 API 服务后，先调用内置 Finance demo 的授权检查：

```bash
curl -s -X POST "$PLYSTRA_URL/api/v1/authz/check" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $PLYSTRA_ACCESS_TOKEN" \
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

PowerShell：

```powershell
curl.exe -s -X POST "$env:PLYSTRA_URL/api/v1/authz/check" `
  -H "Content-Type: application/json" `
  -H "Authorization: Bearer $env:PLYSTRA_ACCESS_TOKEN" `
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

预期核心结果：

```json
{
  "data": {
    "decision": "allow",
    "deny_code": null
  }
}
```

真实响应还会包含 actor、resource、命中的 permission candidates、scope 检查和 audit 信息。

## 2. 注册你的资源类型

先注册你要保护的业务对象类型和动作。这里使用 `expense_report`，这样可以和内置 `invoice` demo 数据并存，不会撞 ID。

```bash
curl -s -X POST "$PLYSTRA_URL/api/v1/resource-types" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $PLYSTRA_ACCESS_TOKEN" \
  -d '{
    "id": "rt_expense_report",
    "key": "expense_report",
    "display_name": "Expense Report",
    "description": "Employee expense report",
    "status": "active",
    "source": "core"
  }'
```

```bash
curl -s -X POST "$PLYSTRA_URL/api/v1/resource-types/expense_report/actions" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $PLYSTRA_ACCESS_TOKEN" \
  -d '{
    "id": "ra_expense_report_approve",
    "key": "approve",
    "display_name": "Approve",
    "risk_level": "high",
    "audit_default": true
  }'
```

如果你用 Core 内置 `resources` 表镜像外部业务对象，注册 internal mapping：

```bash
curl -s -X POST "$PLYSTRA_URL/api/v1/resource-types/expense_report/mapping" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $PLYSTRA_ACCESS_TOKEN" \
  -d '{
    "id": "rm_expense_report_internal",
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

## 3. 创建 Space 和 Group

创建租户或工作区：

```bash
curl -s -X POST "$PLYSTRA_URL/api/v1/spaces" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $PLYSTRA_ACCESS_TOKEN" \
  -d '{
    "id": "space_contoso",
    "name": "Contoso",
    "slug": "contoso",
    "type": "customer",
    "status": "active"
  }'
```

创建授权用的组织树：

```bash
curl -s -X POST "$PLYSTRA_URL/api/v1/spaces/space_contoso/groups" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $PLYSTRA_ACCESS_TOKEN" \
  -d '{
    "id": "group_contoso_finance",
    "name": "Finance",
    "display_name": "Finance",
    "path": "finance",
    "status": "active"
  }'
```

```bash
curl -s -X POST "$PLYSTRA_URL/api/v1/spaces/space_contoso/groups" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $PLYSTRA_ACCESS_TOKEN" \
  -d '{
    "id": "group_contoso_finance_apac",
    "parent_group_id": "group_contoso_finance",
    "name": "Finance APAC",
    "display_name": "Finance APAC",
    "path": "finance.apac",
    "status": "active"
  }'
```

`group_tree` scope 的判断规则是：目标 group path 等于 anchor path，或者以 `anchor_path + "."` 开头。所以 `finance.apac` 属于 `finance` 树内。

## 4. 创建 actor 身份链

创建登录身份：

```bash
curl -s -X POST "$PLYSTRA_URL/api/v1/users" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $PLYSTRA_ACCESS_TOKEN" \
  -d '{
    "id": "user_docs_alice",
    "email": "alice@example.com",
    "status": "active"
  }'
```

创建 Space 内的业务身份：

```bash
curl -s -X POST "$PLYSTRA_URL/api/v1/spaces/space_contoso/members" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $PLYSTRA_ACCESS_TOKEN" \
  -d '{
    "id": "member_docs_finance_reviewer",
    "display_name": "Finance Reviewer",
    "member_type": "human",
    "status": "active"
  }'
```

把 User 连接到 Member：

```bash
curl -s -X POST "$PLYSTRA_URL/api/v1/spaces/space_contoso/user-members" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $PLYSTRA_ACCESS_TOKEN" \
  -d '{
    "id": "um_docs_alice_finance_reviewer",
    "user_id": "user_docs_alice",
    "member_id": "member_docs_finance_reviewer",
    "relation_type": "login",
    "is_primary": true,
    "status": "active"
  }'
```

如果你的应用已经自己负责登录，通常只需要创建 Plystra `User` 做审计追踪，然后由可信后端把 actor tuple 传给 Plystra。只有当你希望使用 Plystra Core session 时，才需要接 `/auth/login`。

## 5. 创建 Role、Permission 和授权关系

创建一个 group tree 级别的 expense report approve 权限：

```bash
curl -s -X POST "$PLYSTRA_URL/api/v1/permissions" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $PLYSTRA_ACCESS_TOKEN" \
  -d '{
    "id": "perm_expense_report_approve_group_tree",
    "resource": "expense_report",
    "action": "approve",
    "scope": "group_tree",
    "description": "Approve expense reports inside the assigned group tree",
    "status": "active"
  }'
```

创建 Space 内的角色：

```bash
curl -s -X POST "$PLYSTRA_URL/api/v1/spaces/space_contoso/roles" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $PLYSTRA_ACCESS_TOKEN" \
  -d '{
    "id": "role_contoso_finance_approver",
    "key": "finance_approver",
    "name": "Finance Approver",
    "description": "Can approve expense reports in the assigned Finance tree",
    "status": "active"
  }'
```

把权限挂到角色上：

```bash
curl -s -X POST "$PLYSTRA_URL/api/v1/role-permissions" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $PLYSTRA_ACCESS_TOKEN" \
  -d '{
    "id": "rp_contoso_finance_approver_expense_report_approve",
    "role_id": "role_contoso_finance_approver",
    "permission_id": "perm_expense_report_approve_group_tree",
    "audit_space_id": "space_contoso"
  }'
```

把角色授予 Member，并把 scope anchor 放在 Finance group：

```bash
curl -s -X POST "$PLYSTRA_URL/api/v1/spaces/space_contoso/member-roles" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $PLYSTRA_ACCESS_TOKEN" \
  -d '{
    "id": "mr_docs_finance_reviewer_approver_finance",
    "member_id": "member_docs_finance_reviewer",
    "role_id": "role_contoso_finance_approver",
    "scope_anchor_group_id": "group_contoso_finance",
    "status": "active"
  }'
```

## 6. 登记资源实例

把你要保护的业务对象镜像到 Plystra：

```bash
curl -s -X POST "$PLYSTRA_URL/api/v1/spaces/space_contoso/resources" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $PLYSTRA_ACCESS_TOKEN" \
  -d '{
    "id": "expense_report_001",
    "resource_type": "expense_report",
    "external_id": "er-001",
    "display_name": "Expense Report 001",
    "group_id": "group_contoso_finance_apac",
    "owner_member_id": "member_docs_finance_reviewer",
    "visibility": "private",
    "status": "active",
    "metadata": {
      "amount": 1200,
      "currency": "USD"
    }
  }'
```

## 7. 保护你的业务接口

在你的应用真正执行业务动作之前，先调用 Plystra。

Node/Express 示例：

```ts
async function requirePlystraAllow(input: {
  userId: string;
  memberId: string;
  userMemberId: string;
  spaceId: string;
  resourceType: string;
  resourceId: string;
  action: string;
}) {
  const response = await fetch(`${process.env.PLYSTRA_URL}/api/v1/authz/check`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.PLYSTRA_ACCESS_TOKEN!}`,
    },
    body: JSON.stringify({
      actor: {
        user_id: input.userId,
        member_id: input.memberId,
        user_member_id: input.userMemberId,
        space_id: input.spaceId,
      },
      resource_type: input.resourceType,
      resource_id: input.resourceId,
      action: input.action,
    }),
  });

  if (!response.ok) {
    throw new Error(`Plystra authz call failed: ${response.status}`);
  }

  const envelope = await response.json();
  const decision = envelope.data;
  if (decision.decision !== "allow") {
    const denyCode = decision.deny_code ?? "DENIED";
    const error = new Error(`Forbidden by Plystra: ${denyCode}`);
    (error as any).status = 403;
    (error as any).denyCode = denyCode;
    throw error;
  }

  return decision;
}

app.post("/expense-reports/:id/approve", async (req, res) => {
  await requirePlystraAllow({
    userId: req.user.id,
    memberId: req.user.activeMemberId,
    userMemberId: req.user.activeUserMemberId,
    spaceId: req.user.activeSpaceId,
    resourceType: "expense_report",
    resourceId: req.params.id,
    action: "approve",
  });

  await approveExpenseReport(req.params.id);
  res.status(204).end();
});
```

Go 侧可以使用这样的请求/响应结构：

```go
type AuthzRequest struct {
	Actor struct {
		UserID       string `json:"user_id"`
		MemberID     string `json:"member_id"`
		UserMemberID string `json:"user_member_id"`
		SpaceID      string `json:"space_id"`
	} `json:"actor"`
	ResourceType string `json:"resource_type"`
	ResourceID   string `json:"resource_id"`
	Action       string `json:"action"`
}

type AuthzEnvelope struct {
	Data struct {
		Decision string  `json:"decision"`
		DenyCode *string `json:"deny_code"`
	} `json:"data"`
}
```

向 `/api/v1/authz/check` 发送请求，要求 `Decision == "allow"`，其他情况在你的业务 API 中转成 `403`。

## 8. 测一个拒绝场景

创建一个 Legal group，或者检查一个不在 `group_contoso_finance` 树下的 expense report。相同 actor 应该得到：

```json
{
  "data": {
    "decision": "deny",
    "deny_code": "SCOPE_OUT_OF_BOUNDS"
  }
}
```

常见 deny code：

| Code | 含义 |
|---|---|
| `USER_MEMBER_REVOKED` | `UserMember` 绑定不是 active。 |
| `USER_MEMBER_EXPIRED` | 绑定已过期。 |
| `CROSS_SPACE_VIOLATION` | actor、目标资源、grant 或 scope anchor 不在同一个 Space。 |
| `NO_MATCHING_PERMISSION` | 没有 active role permission 命中 resource/action。 |
| `SCOPE_OUT_OF_BOUNDS` | 有匹配权限，但 scope 覆盖不到目标。 |
| `GLOBAL_SCOPE_DISABLED` | `global` scope 在 v1.0 中保留但禁用。 |
| `INVALID_RESOURCE_TYPE` | Resource Registry 中没有该资源类型。 |
| `INVALID_RESOURCE_ACTION` | Resource Registry 中没有该动作。 |

## 9. 查看审计记录

审计开启时，每次 `authz/check` 和 `authz/explain` 都会写入决策 trace：

```bash
curl -s "$PLYSTRA_URL/api/v1/spaces/space_contoso/audit-logs?resource_type=expense_report&resource_id=expense_report_001" \
  -H "Authorization: Bearer $PLYSTRA_ACCESS_TOKEN"
```

AuditLog 保存 actor user、member、user-member binding、action、resource、decision、deny code、request ID、服务端解析出的 IP/User-Agent，以及 trace JSON。

## 生产接入规则

- 管理 access token 只能放在服务端。浏览器客户端应调用你的后端，而不是直接调用 Plystra 管理 API。
- 即使登录由你的应用负责，也建议创建 Plystra `User`，这样审计 trace 能还原真实账号。
- 用户选择业务身份后，在你的 session 中保存 active `member_id`、`user_member_id` 和 `space_id`。
- 在受保护业务 mutation 前调用 `/api/v1/authz/check`。
- 把 deny 当作正常业务结果处理，并把 `deny_code` 写入你的应用日志。
- 除非明确需要，否则保持 `DATA_CONSOLE_ENABLED=false` 和 `METRICS_ENABLED=false`。
- 生产环境必须配置强密钥、非 wildcard CORS origins、public URL 和真实 PostgreSQL 密码。

## 下一步可以扩展什么

这条路径跑通后，可以继续加你的业务权限：

| 需求 | Plystra 对象 |
|---|---|
| 页面只读访问 | action 为 `read` 的 `permission` |
| 用户自己的记录 | `self` scope 和 `owner_member_id` |
| 部门内访问 | `group` scope 和 `group_id` |
| 部门及子部门访问 | `group_tree` scope 和 `scope_anchor_group_id` |
| 租户内操作员 | `space` scope |

完整 endpoint 分组和响应 envelope 见 [HTTP API](/zh/guides/http-api/)。
