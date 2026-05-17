---
title: Local Setup and Super Admin Bootstrap
description: Run Plystra Core locally and create the first instance super admin without an admin token.
---

## Run Core Locally

From the Core repository:

```bash
cp .env.example .env
docker compose up -d
go run ./cmd/plystractl doctor
```

Expected doctor output:

```text
environment: development
configuration: ok
database: ok
migrations: current
schema: ok
service readiness: ok
```

Local demo credentials:

```text
alice@example.com / plystra-demo
bob@example.com / plystra-demo
```

Run `make seed-demo` to make Alice an instance super admin for local development. In a clean production-like instance, use the bootstrap command described below.

## Bootstrap the First Instance Super Admin

Plystra does not use an admin token. Management APIs are protected by user sessions and scoped admin grants.

The first admin is a normal `User` with one `AdminGrant`:

```text
level = instance_super_admin
permission_key = *
```

If no active instance super admin exists, bootstrap one with:

```bash
go run ./cmd/plystractl admin bootstrap-super-admin --user-id <existing_user_id>
```

Optional flags:

```bash
go run ./cmd/plystractl admin bootstrap-super-admin \
  --user-id user_ops_owner \
  --member-id member_ops_owner \
  --grant-id ag_user_ops_owner_instance_super_admin
```

The command refuses to run if an active `instance_super_admin` grant already exists. After that point, use the AdminGrant API to create, narrow, and revoke admin access.
