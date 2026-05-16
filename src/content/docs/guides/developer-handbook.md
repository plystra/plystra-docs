---
title: Developer Handbook
description: A practical entry point for integrating Plystra Core v1.0 into a production application.
---

This handbook is split into short, task-focused pages. Start here when you are adding Plystra to an application that already has business objects such as invoices, tickets, orders, documents, cases, or projects.

The examples use the current Core API and SDK behavior in `1.0.0-rc104`. Use the pages below in order for a complete integration path, or jump directly to the area you are implementing.

## Read in Order

1. [Model and Architecture](/guides/developer-handbook/model-and-architecture/) explains what Core stores and where Plystra sits in your production stack.
2. [Local Setup and Super Admin Bootstrap](/guides/developer-handbook/local-bootstrap/) gets Core running and creates the first `instance_super_admin`.
3. [Authorization Model](/guides/developer-handbook/authorization-model/) defines the authz request contract, decision semantics, deny codes, and scope behavior.
4. [Copy-Paste Integration Path](/guides/developer-handbook/integration-path/) walks through a complete `invoice.approve` setup with concrete HTTP calls.
5. [API Keys and Admin Grants](/guides/developer-handbook/api-keys-and-admin-grants/) covers machine credentials and human control-plane permissions.
6. [SDK Integration and Error Handling](/guides/developer-handbook/sdk-and-errors/) shows the JavaScript, Python, and Go SDK patterns.
7. [Production Checklist and Troubleshooting](/guides/developer-handbook/production-checklist/) gives the final checks and common failure modes.

## What You Will Build

By the end of the handbook you will have:

- a registered resource type and action
- a Space with Groups
- a User, Member, and UserMember binding
- a Role and Permission grant with a safe scope anchor
- a protected resource
- an `authz.check` call that returns explainable allow/deny decisions
- a production credential strategy using either user sessions or scoped API keys

## Credential Rule of Thumb

Use a Bearer access token for user-driven Core admin operations. Use a scoped API key for service-to-service checks and automation. Never put API keys in browser or mobile clients.

## Related Pages

- [Quickstart](/getting-started/)
- [Integrate Your App](/guides/integrate-your-app/)
- [SDKs](/guides/sdks/)
- [Admin Auth and Security](/reference/admin-auth-and-security/)
- [Core API Reference](/reference/core-api/)
