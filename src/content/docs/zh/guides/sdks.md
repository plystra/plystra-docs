---
title: SDK
description: 使用 TypeScript、Python 和 Go 接入 Plystra Phase 1 API。
---

Plystra SDK 封装 Kernel Phase 1 HTTP envelope 和 Context Mode 授权流程。

SDK 应该放在可信服务端代码中使用。不要把 Plystra API key 放进浏览器或移动端。

## 支持的 Kernel surface

- health、ready、version
- system capabilities
- resource type registry
- `authz.check` / `authz.explain`
- audit log list/detail

## TypeScript

```ts
import { PlystraClient } from "@plystra/sdk";

const plystra = new PlystraClient({
  baseUrl: "https://plystra.internal",
  apiKey: process.env.PLYSTRA_API_KEY,
});

const decision = await plystra.authz.check({
  actor: {
    user_id: "user_external_alice",
    member_id: "member_finance_reviewer",
    binding_id: "binding_external_alice_finance",
    space_id: "space_acme",
  },
  resource: {
    type: "invoice",
    external_id: "invoice_001",
    space_id: "space_acme",
    group_path: "finance.apac",
    owner_member_id: "member_invoice_creator",
  },
  grants: [{
    role_key: "finance_approver",
    resource: "invoice",
    action: "approve",
    scope: "group_tree",
    space_id: "space_acme",
    scope_anchor_group_path: "finance",
  }],
  action: "approve",
  explain: true,
});
```

## Python

```python
from plystra import Plystra

with Plystra("https://plystra.internal", api_key="ply_kernel_secret") as plystra:
    decision = plystra.authz.check(
        actor={
            "user_id": "user_external_alice",
            "member_id": "member_finance_reviewer",
            "binding_id": "binding_external_alice_finance",
            "space_id": "space_acme",
        },
        resource={
            "type": "invoice",
            "external_id": "invoice_001",
            "space_id": "space_acme",
            "group_path": "finance.apac",
            "owner_member_id": "member_invoice_creator",
        },
        grants=[{
            "role_key": "finance_approver",
            "resource": "invoice",
            "action": "approve",
            "scope": "group_tree",
            "space_id": "space_acme",
            "scope_anchor_group_path": "finance",
        }],
        action="approve",
        explain=True,
    )
```

## Go

```go
client := plystra.NewClient(
	"https://plystra.internal",
	plystra.WithAPIKey(os.Getenv("PLYSTRA_API_KEY")),
)

decision, err := client.Authz.Check(ctx, plystra.AuthzCheckInput{
	Actor: &plystra.ActorContext{
		UserID:    "user_external_alice",
		MemberID:  "member_finance_reviewer",
		BindingID: "binding_external_alice_finance",
		SpaceID:   "space_acme",
	},
	Resource: &plystra.AuthzResourceContext{
		Type:          "invoice",
		ExternalID:    "invoice_001",
		SpaceID:       "space_acme",
		GroupPath:     "finance.apac",
		OwnerMemberID: "member_invoice_creator",
	},
	Grants: []plystra.AuthzGrantContext{{
		RoleKey:              "finance_approver",
		Resource:             "invoice",
		Action:               "approve",
		Scope:                "group_tree",
		SpaceID:              "space_acme",
		ScopeAnchorGroupPath: "finance",
	}},
	Action:  "approve",
	Explain: true,
})
```

Inline context 是可信服务端输入。请从已认证 session 和数据库状态构造这些字段，不要直接使用浏览器提交的 JSON。
