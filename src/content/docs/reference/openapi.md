---
title: OpenAPI
description: Generated Plystra Core OpenAPI artifacts, download links, regeneration command, and contract boundaries.
---

Plystra Core publishes generated OpenAPI artifacts for the current HTTP contract.

## Downloads

- [OpenAPI JSON](/openapi/plystra.v0.0.1.json)
- [OpenAPI YAML](/openapi/plystra.v0.0.1.yaml)

The files describe the Core `/api/v1` surface: public health/version routes, session auth, actor context, admin grants, API keys, authorization, identity and scope entities, Resource Registry, resources, audit logs, preview plugin/template metadata, Data Console preview, and metrics.

Complete Auth plugin and email provider contract endpoints are not part of Core OpenAPI. They live in their independent repositories.

## Regenerate

From `plystra/plystra`:

```bash
make openapi
```

The command uses the Go generator under `cmd/plystra-openapi` and writes:

```text
openapi/plystra.v0.0.1.json
openapi/plystra.v0.0.1.yaml
```

The generator is based on `github.com/swaggest/openapi-go/openapi3`; do not hand-edit the generated files.

## Security Schemes

| Scheme | Header | Meaning |
|---|---|---|
| `BearerAuth` | `Authorization: Bearer <access_token>` | Opaque Core access token from login or refresh. |
| `ApiKeyAuth` | `X-Plystra-API-Key: <api_key>` | Scoped server API key. |
| `MetricsTokenAuth` | `X-Plystra-Metrics-Token: <token>` | Dedicated metrics token when configured. |

The OpenAPI document marks most management routes with both `BearerAuth` and `ApiKeyAuth` because Core accepts either credential type when the principal has the required permission. The handler still enforces route-specific scope and anti-escalation checks.

## Contract Rules

- Successful responses are wrapped in `{ "data": ..., "request_id": "..." }`.
- List responses include `pagination`.
- Errors are wrapped in `{ "error": ..., "request_id": "..." }`.
- API key creation returns plaintext key material only once.
- Authz errors may include `deny_code`, `trace_id`, and `audit_log_id`.
- Preview plugin/template/Data Console endpoints appear in OpenAPI because they are implemented routes, but their maturity is lower than stable Core authorization and identity surfaces.

For route explanations, use [HTTP API](/guides/http-api/) first and then [Core API Reference](/reference/core-api/) for the complete path list.
