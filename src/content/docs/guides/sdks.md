---
title: SDKs
description: Use the Plystra Phase 1 API from TypeScript, Python, and Go.
---

Plystra SDKs wrap the Kernel Phase 1 HTTP envelope and Context Mode authorization flow.

Use SDKs from trusted server-side code. Do not put the Plystra API key in browser or mobile clients.

## Packages

| Language | Package | Repository | Primary client |
|---|---|---|---|
| TypeScript/JavaScript | `@plystra/sdk` | `plystra/js-sdk` | `PlystraClient` |
| Python | `plystra` | `plystra/python-sdk` | `Plystra`, `AsyncPlystra` |
| Go | `github.com/plystra/go-plystra` | `plystra/go-plystra` | `plystra.Client` |

## Supported Kernel Surfaces

- health, readiness, and version
- system capabilities
- resource type registry
- `authz.check` and `authz.explain`
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

## Request IDs

Every SDK can attach an application request id to all calls made through a scoped client.

```ts
const scoped = plystra.withRequestId("req_01HY...");
await scoped.authz.explain(contextModeRequest);
```

## Error Handling

SDKs unwrap the JSON envelope and expose structured API errors with status, code, request id, trace id, and audit log id when present.
