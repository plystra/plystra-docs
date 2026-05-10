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
        actor_user_id="user_alice",
        actor_member_id="member_finance_reviewer",
        actor_user_member_id="um_alice_finance_reviewer",
        space_id="space_acme",
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
		Actor: plystra.ActorContext{
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
