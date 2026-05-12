---
title: SDK
description: 使用 TypeScript、JavaScript、Python、Go 和插件工具接入 Plystra Core v1.0。
---

Plystra SDK 封装了 v1.0 HTTP API envelope、Bearer session、管理员授权、授权检查和常用 Core 管理端点。

SDK 应该放在可信服务端代码中使用。不要把管理 access token 放进浏览器或移动端。

生产环境的标准接入流程：

1. 在 Core 中创建或 bootstrap 一个 instance super admin。
2. 由前端或网关完成用户登录，并把 Plystra access token 存入服务端加密 session。
3. 服务到服务调用使用 scoped API key，不要在请求路径里反复使用用户密码。
4. 管理 API 可以使用拥有管理员授权的用户 session，也可以使用拥有显式 permission key 的 API key。
5. 在业务服务执行受保护动作前调用 `authz.check`。

SDK 仍保留账号密码登录能力，适合管理工具和 bootstrap 流程；常规后端检查应使用 access token 或 API key。

对于 `authz.check`，API key 客户端必须传入嵌套 `actor`。access token 客户端可以省略，Core 会使用 token 的 active actor。

## API keys

API key 是机器凭证，支持 `instance`、`space`、`group` 三层 scope，并携带显式 permission key，例如 `authz:check`、`resources:read`、`api_keys:create`。

创建 API key 的凭证必须在目标 scope 上拥有 `api_keys:create`：

```ts
const created = await plystra.apiKeys.create({
  name: "billing-service-prod",
  level: "space",
  space_id: "space_acme",
  permission_keys: ["authz:check", "resources:read"],
  expires_at: "2026-12-31T23:59:59Z",
});

// 只返回一次，之后请放入 secret manager。
await secrets.put("PLYSTRA_API_KEY", created.api_key);
```

用户驱动的操作使用短期 access token；后端服务使用 API key。不要把 API key 放进浏览器或移动端。

## 包名

| 语言 | 包名 | 仓库 | 主客户端 |
|---|---|---|---|
| TypeScript/JavaScript | `@plystra/sdk` | `plystra/js-sdk` | `PlystraClient` |
| Python | `plystra` | `plystra/python-sdk` | `Plystra`, `AsyncPlystra` |
| Go | `github.com/plystra/go-plystra` | `plystra/go-plystra` | `plystra.Client` |
| 插件作者 | `@plystra/plugin-sdk` | `plystra/plystra-plugin-sdk` | `validateManifestForCore` |

所有管理模块都需要 Bearer session，并且该 session 对应的用户必须拥有有效管理员授权。

## TypeScript 和 JavaScript

安装：

```bash
npm install @plystra/sdk
```

登录并执行授权检查：

```ts
import { PlystraClient } from "@plystra/sdk";

const plystra = new PlystraClient({
  baseUrl: "http://localhost:8080",
  accessToken: session.plystraAccessToken,
  onTokenChange: async (tokens) => {
    await saveEncryptedSession(tokens);
  },
});
```

服务端进程使用 API key：

```ts
const plystra = new PlystraClient({
  baseUrl: "https://plystra.internal",
  apiKey: process.env.PLYSTRA_API_KEY,
});
```

账号密码登录仍可用于管理工具：

```ts
const plystra = new PlystraClient({
  baseUrl: "http://localhost:8080",
  onTokenChange: async (tokens) => {
    await saveEncryptedSession(tokens);
  },
});

await plystra.auth.login({
  email: "alice@example.com",
  password: "plystra-demo",
});

await plystra.auth.refresh();

const decision = await plystra.authz.check({
  actor: {
    user_id: "user_alice",
    space_id: "space_acme",
    member_id: "member_finance_reviewer",
    user_member_id: "um_alice_finance_reviewer",
  },
  resource_type: "invoice",
  resource_id: "invoice_001",
  action: "approve",
});

if (decision.decision !== "allow") {
  throw new Error(`Denied: ${decision.deny_code}`);
}
```

创建管理员授权：

```ts
await plystra.admin.createGrant({
  user_id: "user_ops",
  level: "space_admin",
  space_id: "space_acme",
  permission_key: "users:read",
});
```

常用模块：

```ts
await plystra.actor.context();
await plystra.admin.me();
await plystra.users.list({ limit: 50 });
await plystra.spaces.groups("space_acme");
await plystra.resources.get("invoice", "invoice_001");
await plystra.audit.list({ space_id: "space_acme" });
await plystra.plugins.validateManifest(manifest);
```

下一次服务端请求中恢复 token：

```ts
const session = await loadEncryptedSession();

const plystra = new PlystraClient({
  baseUrl: "https://plystra.internal",
  accessToken: session.accessToken,
  refreshToken: session.refreshToken,
  onTokenChange: saveEncryptedSession,
});
```

错误处理：

```ts
import { PlystraApiError } from "@plystra/sdk";

try {
  await plystra.users.get("missing_user");
} catch (error) {
  if (error instanceof PlystraApiError) {
    console.error(error.status, error.code, error.requestId);
  }
}
```

## Python

安装：

```bash
pip install plystra
```

Python 包支持 Python 3.10 及以上版本。

同步客户端：

```python
from plystra import Plystra

with Plystra("http://localhost:8080") as plystra:
    plystra.auth.login("alice@example.com", "plystra-demo")
    persist_session(plystra.tokens())

    plystra.auth.refresh()
    persist_session(plystra.tokens())

    decision = plystra.authz.check(
        actor={
            "user_id": "user_alice",
            "space_id": "space_acme",
            "member_id": "member_finance_reviewer",
            "user_member_id": "um_alice_finance_reviewer",
        },
        resource_type="invoice",
        resource_id="invoice_001",
        action="approve",
    )

    print(decision["decision"])
```

生产后端使用 API key：

```python
import os
from plystra import Plystra

with Plystra("https://plystra.internal", api_key=os.environ["PLYSTRA_API_KEY"]) as plystra:
    decision = plystra.authz.check(
        actor={
            "user_id": "user_alice",
            "space_id": "space_acme",
            "member_id": "member_finance_reviewer",
            "user_member_id": "um_alice_finance_reviewer",
        },
        resource_type="invoice",
        resource_id="invoice_001",
        action="approve",
    )
```

生产后端使用前端或网关传回来的 access token：

```python
from plystra import Plystra

with Plystra("https://plystra.internal", access_token=session["plystra_access_token"]) as plystra:
    decision = plystra.authz.check(
        resource_type="invoice",
        resource_id="invoice_001",
        action="approve",
    )
```

异步客户端：

```python
import asyncio
from plystra import AsyncPlystra


async def main() -> None:
    async with AsyncPlystra("http://localhost:8080") as plystra:
        await plystra.auth.login("alice@example.com", "plystra-demo")
        await save_session(plystra.tokens())
        await plystra.auth.refresh()
        await save_session(plystra.tokens())

        decision = await plystra.authz.check(
            actor={
                "user_id": "user_alice",
                "space_id": "space_acme",
                "member_id": "member_finance_reviewer",
                "user_member_id": "um_alice_finance_reviewer",
            },
            resource_type="invoice",
            resource_id="invoice_001",
            action="approve",
        )
        print(decision["decision"])


asyncio.run(main())
```

需要自定义代理、重试、测试 mock 或 transport 时，可以传入自己的 `httpx` client：

```python
import httpx
from plystra import Plystra

transport = httpx.HTTPTransport(retries=2)
http = httpx.Client(transport=transport, timeout=5.0)

with Plystra("https://plystra.internal", client=http) as plystra:
    plystra.set_tokens(
        access_token="server-side-access-token",
        refresh_token="server-side-refresh-token",
    )
    print(plystra.admin.me())
```

错误处理：

```python
from plystra import Plystra, PlystraAPIError

try:
    with Plystra("http://localhost:8080") as plystra:
        plystra.users.get("missing_user")
except PlystraAPIError as exc:
    print(exc.status_code, exc.code, exc.request_id)
```

## Go

安装：

```bash
go get github.com/plystra/go-plystra
```

使用客户端：

```go
package main

import (
	"context"
	"fmt"
	"log"

	plystra "github.com/plystra/go-plystra"
)

func main() {
	ctx := context.Background()
	client := plystra.NewClient("http://localhost:8080")

	if _, err := client.Auth.Login(ctx, "alice@example.com", "plystra-demo"); err != nil {
		log.Fatal(err)
	}
	accessToken, refreshToken := client.Tokens()
	saveSession(accessToken, refreshToken)

	if _, err := client.Auth.Refresh(ctx, ""); err != nil {
		log.Fatal(err)
	}
	accessToken, refreshToken = client.Tokens()
	saveSession(accessToken, refreshToken)

	decision, err := client.Authz.Check(ctx, plystra.AuthzCheckInput{
		Actor: &plystra.ActorContext{
			UserID:       "user_alice",
			SpaceID:      "space_acme",
			MemberID:     "member_finance_reviewer",
			UserMemberID: "um_alice_finance_reviewer",
		},
		ResourceType: "invoice",
		ResourceID:   "invoice_001",
		Action:       "approve",
	})
	if err != nil {
		log.Fatal(err)
	}

	fmt.Println(decision["decision"])
}
```

服务端进程使用 API key：

```go
client := plystra.NewClient(
	"https://plystra.internal",
	plystra.WithAPIKey(os.Getenv("PLYSTRA_API_KEY")),
)

decision, err := client.Authz.Check(ctx, plystra.AuthzCheckInput{
	Actor: &plystra.ActorContext{
		UserID:       "user_alice",
		SpaceID:      "space_acme",
		MemberID:     "member_finance_reviewer",
		UserMemberID: "um_alice_finance_reviewer",
	},
	ResourceType: "invoice",
	ResourceID:   "invoice_001",
	Action:       "approve",
})
```

复用服务端 access token：

```go
client := plystra.NewClient(
	"https://plystra.internal",
	plystra.WithAccessToken(os.Getenv("PLYSTRA_ACCESS_TOKEN")),
	plystra.WithRefreshToken(os.Getenv("PLYSTRA_REFRESH_TOKEN")),
)

me, err := client.Admin.Me(ctx)
```

错误处理：

```go
var apiErr *plystra.APIError
if errors.As(err, &apiErr) {
	log.Printf("plystra error: status=%d code=%s request_id=%s", apiErr.StatusCode, apiErr.Code, apiErr.RequestID)
}
```

## 生产凭证模式

三种 SDK 都支持同一套凭证模型。

| 模式 | TypeScript | Python | Go |
|---|---|---|---|
| 已有 user access token | `new PlystraClient({ baseUrl, accessToken })` | `Plystra(base_url, access_token=token)` | `plystra.NewClient(baseURL, plystra.WithAccessToken(token))` |
| 已有 refresh token | `refreshToken` option，然后 `auth.refresh()` | `refresh_token=`，然后 `auth.refresh()` | `WithRefreshToken(token)`，然后 `Auth.Refresh(ctx, "")` |
| 服务端 API key | `new PlystraClient({ baseUrl, apiKey })` | `Plystra(base_url, api_key=key)` | `plystra.NewClient(baseURL, plystra.WithAPIKey(key))` |
| 密码登录 | `auth.login({ email, password })` | `auth.login(email, password)` | `Auth.Login(ctx, email, password)` |
| 自定义 HTTP transport | `fetchImpl`、`timeoutMs`、`defaultHeaders` | 传入 `httpx.Client` 或 `httpx.AsyncClient` | `WithHTTPClient`、`WithHeader`、`WithUserAgent` |

推荐生产拆分：

- 前端或网关完成登录，并把 token 放进你自己的安全 session 流程。
- 后端在执行用户驱动的 Core 管理操作时，从安全 session 中读取 access token。
- 后端服务在做服务到服务授权检查和自动化时使用 API key。
- 密码登录保留给管理工具和 bootstrap 流程，不建议常规授权检查反复使用密码。

## SDK 中的 Authz Check 规则

SDK 不会隐藏 Core 的授权请求契约：

```text
API key client -> 必须传 actor
access-token client -> 可以省略 actor，使用 session active actor
```

使用 API key：

```ts
await plystra.authz.check({
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
```

使用 access token：

```ts
await plystra.authz.check({
  resource_type: "invoice",
  resource_id: "invoice_001",
  action: "approve",
});
```

如果 access token 的 active Member 不对：

```ts
await plystra.actor.context();
await plystra.actor.switchMember({
  member_id: "member_finance_reviewer",
  user_member_id: "um_alice_finance_reviewer",
});
```

## SDK 模块表

三个 SDK 暴露相同 Core 模块，只是命名风格不同。

| Core area | TypeScript | Python sync/async | Go |
|---|---|---|---|
| System | `system.version()`、`health()`、`ready()` | `system.version()`、`health()`、`ready()` | `System.Version`、`Health`、`Ready` |
| Auth | `auth.login()`、`refresh()`、`logout()` | `auth.login()`、`refresh()`、`logout()` | `Auth.Login`、`Refresh`、`Logout` |
| Actor | `actor.context()`、`switchMember()` | `actor.context()`、`switch_member()` | `Actor.Context`、`SwitchMember` |
| Admin grants | `admin.me()`、`listGrants()`、`createGrant()`、`revokeGrant()` | `admin.me()`、`list_grants()`、`create_grant()`、`revoke_grant()` | `Admin.Me`、`ListGrants`、`CreateGrant`、`RevokeGrant` |
| API keys | `apiKeys.list()`、`create()`、`get()`、`revoke()` | `api_keys.list()`、`create()`、`get()`、`revoke()` | `APIKeys.List`、`Create`、`Get`、`Revoke` |
| Authorization | `authz.check()`、`explain()` | `authz.check()`、`explain()` | `Authz.Check`、`Explain` |
| Audit | `audit.list()`、`get()` | `audit.list()`、`get()` | `Audit.List`、`Get` |
| Users | `users.list()`、`create()`、`get()`、`update()`、`disable()`、`restore()` | 同名 snake_case 模块方法 | `Users.List`、`Create`、`Get`、`Update`、`Disable`、`Restore` |
| Spaces | `spaces.list()`、`create()`、`get()`、`update()`、`groups()`、`members()`、`resources()` | 同名 snake_case 模块方法 | `Spaces.List`、`Create`、`Get`、`Update`、`Groups`、`Members`、`Resources` |
| Groups | `groups.create()`、`get()`、`getInSpace()`、`update()`、`disable()` | `groups.create()`、`get()`、`get_in_space()`、`update()`、`disable()` | `Groups.Create`、`Get`、`GetInSpace`、`Update`、`Disable` |
| Members | `members.create()`、`get()`、`update()`、`disable()` | 同名 snake_case 模块方法 | `Members.Create`、`Get`、`Update`、`Disable` |
| UserMembers | `userMembers.create()`、`get()`、`update()`、`revoke()` | `user_members.create()`、`get()`、`update()`、`revoke()` | `UserMembers.Create`、`Get`、`Update`、`Revoke` |
| Roles | `roles.create()`、`get()`、`update()`、`disable()` | 同名 snake_case 模块方法 | `Roles.Create`、`Get`、`Update`、`Disable` |
| Member roles | `memberRoles.list()`、`create()`、`get()`、`revoke()` | `member_roles.list()`、`create()`、`get()`、`revoke()` | `MemberRoles.List`、`Create`、`Get`、`Revoke` |
| Permissions | `permissions.list()`、`create()`、`get()`、`update()`、`disable()` | 同名 snake_case 模块方法 | `Permissions.List`、`Create`、`Get`、`Update`、`Disable` |
| Role permissions | `rolePermissions.list()`、`create()`、`get()`、`revoke()` | `role_permissions.list()`、`create()`、`get()`、`revoke()` | `RolePermissions.List`、`Create`、`Get`、`Revoke` |
| Resource registry | `resourceTypes.list()`、`upsert()`、`actions()`、`upsertAction()`、`mapping()`、`upsertMapping()` | `resource_types.*` snake_case 方法 | `ResourceTypes.*` |
| Resources | `resources.list()`、`create()`、`get()`、`update()`、`archive()` | `resources.*` snake_case 方法 | `Resources.*` |
| Data Console | `data.tables()`、`listRows()`、`getRow()`、`createRow()`、`updateRow()`、`deleteRow()` | `data.*` snake_case 方法 | `Data.*` |
| Plugins | `plugins.list()`、`get()`、`install()`、`validateManifest()`、lifecycle 和 metadata helper | `plugins.*` snake_case 方法 | `Plugins.*` |
| Templates | `templates.list()`、`get()`、`previewInstall()`、`install()` | `templates.*` snake_case 方法 | `Templates.*` |

Data Console 默认在 Core 中关闭，需要 `DATA_CONSOLE_ENABLED=true`。Metrics 返回 Prometheus text，不作为普通 JSON SDK 模块封装。

## 错误处理契约

所有 SDK 都会解开 Core JSON envelope，并抛出或返回 typed API error。

| 语言 | Error type | 关键字段 |
|---|---|---|
| TypeScript | `PlystraApiError`、`PlystraAuthError`、`PlystraAuthorizationError`、`PlystraValidationError`、`PlystraNetworkError`、`PlystraTimeoutError` | `status`、`code`、`details`、`requestId`、`traceId`、`auditLogId` |
| Python | `PlystraAPIError`、`PlystraAuthError`、`PlystraAuthorizationError`、`PlystraValidationError`、`PlystraNetworkError`、`PlystraTimeoutError` | `status_code`、`code`、`details`、`request_id`、`trace_id`、`audit_log_id` |
| Go | `*plystra.APIError` | `StatusCode`、`Code`、`Message`、`Details`、`RequestID`、`TraceID`、`AuditLogID` |

`authz.check` 的 deny 是成功响应，不是 SDK 异常。读取 `decision` 和 `deny_code` 后，在你的业务 API 中转换成 `403`。

## Release 兼容性

v1.0 SDK 面向 Core v1 HTTP envelope 和当前管理 API。`1.0.0-dev*` 阶段建议 Core 和 SDK 同步升级。升级 Core 后，同一发布窗口升级 SDK，并至少跑通：

```text
system.version
auth.login / refresh
admin.me
api_keys.create / revoke
authz.check allow
authz.check deny
audit.list
```

## Plugin SDK

安装：

```bash
npm install -D @plystra/plugin-sdk
```

创建并校验插件 manifest：

```bash
npx plystra-plugin init webhooks
npx plystra-plugin validate ./webhooks/plugin.json
```

在 JavaScript 中校验：

```js
import { validateManifestForCore } from "@plystra/plugin-sdk";

const errors = validateManifestForCore(manifest, "1.0.0");
if (errors.length > 0) {
  throw new Error(errors.join("\n"));
}
```

插件校验器与 Plystra Core v1.0 manifest 校验保持一致：reverse-DNS 插件 id、语义化版本格式、`requires_core`、manifest/API version `1.0`、重复 resource/action、permission 引用、audit event key、admin menu path，以及禁用的 `global` scope。

## 管理员授权模型

SDK 管理接口使用和 HTTP API 一致的管理员授权模型：

| Level | 范围 | 用途 |
|---|---|---|
| `instance_super_admin` | 整个实例 | Bootstrap、分配 instance admin。 |
| `instance_admin` | 整个实例 | 按 permission key 执行实例级操作。 |
| `space_admin` | 单个 Space | Space 内用户、组、角色、资源、审计日志。 |
| `group_admin` | 单个 Group 子树 | Group 范围内资源和子组。 |

Permission key 使用 `domain:action`。`domain:*` 覆盖该 domain 的所有动作，`domain:manage` 也覆盖 `domain:read`。

常用 permission key：

```text
instance:read
admin_grants:read
admin_grants:manage
authz:check
audit:read
users:read
users:manage
spaces:read
spaces:manage
groups:read
groups:manage
members:read
members:manage
user_members:read
user_members:manage
roles:read
roles:manage
permissions:read
permissions:manage
registry:read
registry:manage
resources:read
resources:manage
data:read
data:manage
plugins:read
plugins:manage
templates:read
templates:manage
metrics:read
api_keys:read
api_keys:create
api_keys:revoke
api_keys:manage
```
