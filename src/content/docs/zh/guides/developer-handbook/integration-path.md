---
title: 可复制接入流程
description: 用具体 HTTP 调用创建完整的 invoice approval 授权配置。
---

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
