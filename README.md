# Plystra Docs

Documentation site for Plystra Core v1.0.

The default language is English at `/`. Simplified Chinese is available under `/zh/`.

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
