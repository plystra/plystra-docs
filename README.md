# Plystra Docs

Documentation site for Plystra Core, SDK usage, OpenAPI artifacts, and the current plugin/capability boundary.

The default language is English at `/`. Simplified Chinese is available under `/zh/`.

## Reader Path

The docs are organized for integration first:

1. `Implementation Map`: see every currently implemented surface and its maturity label.
2. `Getting Started`: run Core locally and verify Context Mode.
3. `Integrate Your App`: create the required Plystra records and protect a real backend endpoint with `/api/v1/authz/check`.
4. `HTTP API`: check route groups, authentication layers, envelopes, and feature flags.
5. `Reference`: OpenAPI, configuration, database/migration rules, plugin boundaries, and release readiness.

## Source of Truth

Write documentation against the current business logic in the sibling `../plystra` repository:

- HTTP routes and middleware: `../plystra/internal/api`
- Authz semantics: `../plystra/internal/authz`
- Ent schema: `../plystra/ent/schema`
- Migrations: `../plystra/migrations`
- Generated OpenAPI artifacts: `../plystra/openapi`
- Complete Auth plugin: `../plugin-auth-complete`
- Email capability contract and providers: `../email-contracts`, `../plugin-email-smtp`, `../plugin-email-cloudflare`

## Commands

Run commands from this directory:

| Command                   | Action                                           |
| :------------------------ | :----------------------------------------------- |
| `npm install`             | Installs dependencies                            |
| `npm run dev`             | Starts local dev server at `localhost:4321`      |
| `npm run build`           | Build your production site to `./dist/`          |
| `npm run preview`         | Preview your build locally, before deploying     |
| `npm run astro ...`       | Run CLI commands like `astro add`, `astro check` |
