# Plystra Docs

Documentation site for the Plystra Kernel and Phase 1 Context Mode API.

The default language is English at `/`. Simplified Chinese is available under `/zh/`.

## Reader Path

The docs are organized for integration first:

1. `Getting Started`: run Kernel locally and verify Context Mode.
2. `Integrate Your App`: create the required Plystra records and protect a real backend endpoint with `/api/v1/authz/check`.
3. `HTTP API`: check route groups, authentication layers, envelopes, and feature flags.
4. `Reference`: configuration, database/migration rules, and release readiness.

## Source of Truth

Write documentation against the current business logic in the sibling `../plystra` repository:

- HTTP routes and middleware: `../plystra/internal/api`
- Authz semantics: `../plystra/internal/authz`
- Ent schema: `../plystra/ent/schema`
- Migrations: `../plystra/migrations`
- Release docs: `../plystra/docs/release`

## Commands

Run commands from this directory:

| Command                   | Action                                           |
| :------------------------ | :----------------------------------------------- |
| `npm install`             | Installs dependencies                            |
| `npm run dev`             | Starts local dev server at `localhost:4321`      |
| `npm run build`           | Build your production site to `./dist/`          |
| `npm run preview`         | Preview your build locally, before deploying     |
| `npm run astro ...`       | Run CLI commands like `astro add`, `astro check` |
