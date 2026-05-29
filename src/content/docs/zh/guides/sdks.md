---
title: SDK
description: 使用 TypeScript、Python 和 Go 接入稳定 Plystra API。
---

Plystra SDK 封装稳定 HTTP envelope、native session auth、actor context、Context Mode 授权、Resource Registry 和 AuditLog 读取。

SDK 应该放在可信服务端代码中使用。不要把 Plystra API key 放进浏览器或移动端。

## Packages

| 语言 | Package | Repository | Primary client |
|---|---|---|---|
| TypeScript/JavaScript | `@plystra/sdk` | `plystra/js-sdk` | `PlystraClient` |
| Python | `plystra` | `plystra/python-sdk` | `Plystra`, `AsyncPlystra` |
| Go | `github.com/plystra/go-plystra` | `plystra/go-plystra` | `plystra.Client` |

## 支持的 Core surface

- health、ready、version
- native `auth.register`、`auth.login`、`auth.refresh`、`auth.logout`
- `actor.context` 和 `actor.switchMember`
- system capabilities
- resource type registry
- `authz.check` / `authz.explain`
- audit log list/detail

`apiKey` 会为服务端到服务端路由发送 `X-Plystra-API-Key`。`accessToken` 会为 actor/session 路由发送 `Authorization: Bearer`。Auth register/login/refresh/logout 会刻意跳过已配置凭证。

## TypeScript

```ts
import { PlystraClient } from "@plystra/sdk";

const plystra = new PlystraClient({
  baseUrl: "https://plystra.internal",
  apiKey: process.env.PLYSTRA_API_KEY,
});

const session = await plystra.auth.login({
  email: "alice@example.com",
  password: "plystra-demo",
});

plystra.setAccessToken(session.access_token);
const actor = await plystra.actor.context();

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
    session = plystra.auth.login(
        email="alice@example.com",
        password="plystra-demo",
    )
    plystra.set_access_token(session["access_token"])
    actor = plystra.actor.context()

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

session, err := client.Auth.Login(ctx, plystra.AuthLoginInput{
	Email:    "alice@example.com",
	Password: "plystra-demo",
})
if err != nil {
	return err
}
client.SetAccessToken(session["access_token"].(string))

actor, err := client.Actor.Context(ctx)

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

## Request IDs

每个 SDK 都可以给 scoped client 附加应用 request id。

```ts
const scoped = plystra.withRequestId("req_01HY...");
await scoped.authz.explain(contextModeRequest);
```

## 错误处理

SDK 会解包 JSON envelope，并暴露结构化 API error，包括 status、code、request id、trace id 和 audit log id。
