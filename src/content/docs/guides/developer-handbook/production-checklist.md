---
title: Production Checklist and Troubleshooting
description: Run the developer production checklist and diagnose common integration problems.
---

## Production Checklist for Developers

Before you ship an integration:

- Run `go run ./cmd/plystractl doctor` against the target database.
- Set strong `PLYSTRA_SESSION_SECRET` and `PLYSTRA_API_KEY_SECRET`.
- Do not use wildcard CORS in production.
- Keep API keys out of frontend and mobile clients.
- Create at least two human instance super admins.
- Grant operators only the domains and scopes they need.
- Use `space_admin` and `group_admin` instead of instance grants whenever possible.
- Confirm `authz.check` allow and deny cases in automated tests.
- Test cross-space denial.
- Test sibling-group denial for group admins.
- Test revoked `UserMember` denial.
- Test revoked and expired API keys.
- Keep `Data Console` disabled unless you explicitly need it.
- Keep `/metrics` disabled or protected with `METRICS_TOKEN`.
- Store `X-Request-ID` from responses in application logs.
- Store `trace_id` and `audit_log_id` when returned on authorization errors.

## Troubleshooting

| Symptom | Most likely cause | Check |
|---|---|---|
| `AUTHENTICATION_REQUIRED` on a management route | Missing or expired Bearer token/API key. | Verify `Authorization` or `X-Plystra-API-Key`. |
| `ADMIN_PERMISSION_REQUIRED` while creating API key | Caller lacks `api_keys:create` or is delegating unheld permissions. | Call `GET /api/v1/admin/me`. |
| `SCOPE_OUT_OF_BOUNDS` | Role grant exists but anchor group does not cover target group. | Compare group paths and `scope_anchor_group_id`. |
| API key authz check fails because actor is missing | API key cannot infer actor. | Send full nested `actor`. |
| Bearer authz check uses wrong Member | Session active actor is not the intended Member. | Call `GET /api/v1/actor/context` then `POST /api/v1/actor/switch-member`. |
| User API returned no password hash | Correct behavior. | `password_hash` is never exposed in API responses. |
| Data routes return 404 | Data Console is disabled. | Set `DATA_CONSOLE_ENABLED=true` only if you need it. |
| Metrics returns 404 | Metrics are disabled. | Set `METRICS_ENABLED=true` and protect with token. |

## Related Pages

- [HTTP API](/guides/http-api/)
- [SDKs](/guides/sdks/)
- [Identity and Scope](/concepts/identity-and-scope/)
- [Resource Registry](/reference/resource-registry/)
