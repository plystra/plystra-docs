---
title: OpenAPI
description: 生成的 Plystra Core OpenAPI artifacts、下载链接、重新生成命令和 contract 边界。
---

Plystra Core 为当前 HTTP contract 发布生成的 OpenAPI artifacts。

## 下载

- [OpenAPI JSON](/openapi/plystra.v1.0.0.json)
- [OpenAPI YAML](/openapi/plystra.v1.0.0.yaml)

这些文件描述 Core `/api/v1` surface：public health/version routes、session auth、actor context、admin grants、API keys、authorization、identity and scope entities、Resource Registry、resources、audit logs、preview plugin/template metadata、Data Console preview 和 metrics。

Complete Auth plugin 与 email provider contract endpoints 不属于 Core OpenAPI。它们位于各自独立 repo。

## 重新生成

在 `plystra/plystra` 中执行：

```bash
make openapi
```

命令使用 `cmd/plystra-openapi` 下的 Go generator，并写入：

```text
openapi/plystra.v1.0.0.json
openapi/plystra.v1.0.0.yaml
```

Generator 基于 `github.com/swaggest/openapi-go/openapi3`；不要手动编辑生成文件。

## Security Schemes

| Scheme | Header | 含义 |
|---|---|---|
| `BearerAuth` | `Authorization: Bearer <access_token>` | login 或 refresh 返回的 opaque Core access token。 |
| `ApiKeyAuth` | `X-Plystra-API-Key: <api_key>` | Scoped server API key。 |
| `MetricsTokenAuth` | `X-Plystra-Metrics-Token: <token>` | 配置 metrics token 后使用的专用 token。 |

OpenAPI 会把大多数管理路由标成同时支持 `BearerAuth` 和 `ApiKeyAuth`，因为 Core 会在 principal 拥有所需权限时接受任一种凭证。Handler 仍然会执行 route-specific scope 和防提权检查。

## Contract Rules

- 成功响应包装为 `{ "data": ..., "request_id": "..." }`。
- 列表响应包含 `pagination`。
- 错误响应包装为 `{ "error": ..., "request_id": "..." }`。
- API key 创建时明文 key 只返回一次。
- Authz 错误可能包含 `deny_code`、`trace_id` 和 `audit_log_id`。
- Preview plugin/template/Data Console endpoints 会出现在 OpenAPI，因为它们是已实现路由；但成熟度低于 stable Core authorization 和 identity surfaces。

理解路由时先看 [HTTP API](/zh/guides/http-api/)，再看 [Core API 参考](/zh/reference/core-api/) 的完整 path list。
