---
title: Model and Architecture
description: Understand the Plystra object model and recommended production architecture before you integrate.
---

## What Plystra Does

Plystra Core answers one question for your backend:

```text
Can this User, acting through this Member inside this Space, perform this action on this resource?
```

Plystra is not a replacement for your application database or your existing user interface. It is the identity and authorization control plane that stores:

| Concept | Stored in Plystra | Why it matters |
|---|---|---|
| `User` | Login account and audit subject. | Shows which real person or account initiated the action. |
| `Space` | Tenant, workspace, organization, environment, or account boundary. | Prevents cross-tenant authorization. |
| `Member` | Business identity inside a Space. | Multiple Users can act through one Member, and one User can have several Member bindings. |
| `UserMember` | Binding from User to Member. | Revoked, expired, or inactive bindings deny even when roles match. |
| `Group` | Hierarchical scope inside a Space. | Used for group-tree permissions such as `finance` covering `finance.apac`. |
| `Permission` | Resource, action, and scope rule. | Example: `invoice.approve` with `group_tree` scope. |
| `Role` | Named permission bundle in a Space. | Assigned to Members through `MemberRole`. |
| `MemberRole` | Role grant for a Member, optionally anchored to a Group. | Defines where the Role applies. |
| `ResourceType` and `ResourceMapping` | Resource registry. | Tells the engine how a resource exposes `space_id`, `group_id`, owner, and status. |
| `Resource` | Core-managed resource mirror. | Lets you protect external business objects through a stable resource row. |
| `AdminGrant` | Human admin capability. | Protects Core management APIs using the same User/session model. |
| `ApiKey` | Machine credential with explicit permissions and scope. | Used for service-to-service calls. |
| `AuditLog` | Append-only decision and mutation trace. | Explains allow and deny decisions later. |

## The Minimum Production Architecture

Use this architecture unless you have a specific reason to do something else:

```text
Browser or app
  -> your frontend or gateway authenticates the user
  -> your backend receives your own application session
  -> your backend calls Plystra using either:
       a user access token for user-driven admin actions, or
       a scoped API key for service-to-service authorization checks
  -> your backend only performs the business action when Plystra returns allow
```

Do not put an API key in browser or mobile code. API keys are server-side machine secrets.

Do not trust the browser to send the actor tuple directly to Plystra. Your trusted backend should resolve the `User`, `Member`, `UserMember`, and `Space` from its own session or from a Plystra access token.
