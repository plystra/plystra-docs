---
title: Core API 参考
description: Plystra Core v1.0 HTTP API 的响应 envelope、认证和主要资源。
---

Core API 统一使用 `/api/v1` 前缀。公开路由只包含健康检查、就绪检查、版本信息，以及登录/刷新这类启动必要接口。其他管理接口默认需要 Bearer user session with an active admin grant。

## 认证方式

管理接口：

```http
Authorization: Bearer <access_token>
```

会话接口：

```http
Authorization: Bearer <access_token>
```

## 响应格式

成功响应：

```json
{
  "data": {},
  "request_id": "req_..."
}
```

错误响应：

```json
{
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "..."
  },
  "request_id": "req_..."
}
```

## 常用端点

- `GET /api/v1/health`
- `GET /api/v1/ready`
- `GET /api/v1/version`
- `POST /api/v1/auth/login`
- `GET /api/v1/console/overview`
- `GET|POST /api/v1/users`
- `GET|POST /api/v1/spaces`
- `GET|POST /api/v1/resource-types`
- `GET|POST /api/v1/permissions`
- `POST /api/v1/authz/check`
- `POST /api/v1/authz/explain`
- `GET /api/v1/audit/logs`
