---
title: Backend OS Alpha Templates
description: Inspectable template scaffolds, current template catalog, generated files, and production boundaries.
---

Backend OS Alpha is an alpha validation path, not a cloud marketplace. It proves that one small-to-medium application can be scaffolded, inspected, started, backed up, and upgraded with Core plus official plugins.

Use the CLI scaffold path for the alpha experience:

```bash
cd plystra/plystra
go run ./cmd/plystractl templates list
go run ./cmd/plystractl templates describe auth-ready-saas
go run ./cmd/plystractl templates create --template auth-ready-saas --name "Acme SaaS" --out ./acme-saas
```

## Template Catalog

| Template | Purpose | Required plugins | Required capabilities |
|---|---|---|---|
| `blank` | Minimal production-alpha Core baseline. | none | none |
| `internal-admin` | Internal operations backend with API key governance and webhook metadata requirements. | `plystra.api_keys`, `plystra.webhooks` | `api_key.credential` standard |
| `community-lite` | Small community backend with moderation-oriented groups, roles, and permissions. | `plystra.moderation` | none |
| `auth-ready-saas` | Small SaaS backend pairing Core with Complete Auth and transactional email. | `plystra.auth_complete` | `email.transactional` standard |

## Generated Files

`templates create` writes an inspectable application directory:

| File | Purpose |
|---|---|
| `README.md` | Operator instructions for the generated app. |
| `.env.example` | Production-oriented configuration template with placeholder secrets only. |
| `docker-compose.yml` | Core, PostgreSQL, and selected official plugin sidecars. |
| `plystra/template-installation.json` | Template manifest, deployment profile, preview, required plugins, and capability requirements. |
| `plystra/install-explanation.md` | Human-readable explanation of what the template declares and what must be reviewed. |

The generator never writes real secrets, never applies migrations automatically, and never creates the first instance super admin.

## Deployment Profile

The current alpha profile assumes:

- one Plystra Core container.
- official plugin sidecars when selected by a template.
- external PostgreSQL 16+ for production alpha.
- versioned migrations before startup.
- non-sensitive mutable plugin settings stored in database tables.
- secrets and process bootstrap values provided through environment variables or a secret manager.
- health checks through `/api/v1/health`, `/api/v1/ready`, and plugin `/health` routes.
- backups through PostgreSQL dump plus runtime config/secret-manager export.

## Production Checklist

Before treating a generated template as production-ready:

1. Review every generated file.
2. Replace all placeholder secrets.
3. Configure production `SERVER_PUBLIC_URL` and explicit CORS origins.
4. Apply and verify Core migrations.
5. Apply selected plugin migrations.
6. Bootstrap the first instance super admin explicitly.
7. Configure required capability providers.
8. Run `plystractl doctor`.
9. Smoke test health, ready, login, API key creation, `authz/check`, audit logs, and selected plugin health routes.
10. Test backup and restore in staging.

## Auth Ready SaaS Notes

`auth-ready-saas` requires the Complete Auth plugin and `email.transactional`.

For production email:

```text
plugin_auth_settings.email_delivery_mode = capability
plugin_auth_settings.email_capability_url = https://...
plugin_auth_settings.email_from_address = no-reply@example.com
```

Then run either the SMTP provider or the Cloudflare Email Sending provider as an independent service implementing `POST /contract/v1/email/send`.

## Alpha Boundaries

Backend OS Alpha does not include:

- cloud hosting.
- template marketplace.
- third-party plugin trust model.
- advanced plugin sandboxing.
- automatic rollback for plugin upgrades.
- hidden production secrets in generated files.

The point of Alpha is inspectability: developers can see exactly what the scaffold requires before running it.
