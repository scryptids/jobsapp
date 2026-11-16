# Jobsapp

React Router (framework mode, SSR) app backed by SQLite. In production it runs as a
single container (nginx + this server + Litestream) on AWS; see [`../infra`](../infra)
and the operations docs.

## Development

```sh
npm install
npm run dev        # migrates + seeds ./data/dev.db, then starts Vite
```

`DEV_AUTOLOGIN` (on by default in development) signs you in as seeded user 1. With
`DEV_AUTOLOGIN=false`, log in as `dev@example.com` / `password`.

| Command | What it does |
|---|---|
| `npm test` | Vitest; every test file gets its own migrated in-memory SQLite |
| `npm run typecheck` / `npm run lint` | Types and ESLint |
| `npm run smoke` | Raw-HTTP smoke test against a running app (`DEV_AUTOLOGIN=false`) |
| `npm run db:generate` | Generate a migration in `drizzle/` from `src/db/schema.ts` |
| `npm run db:seed` | Seed dev data (no-op when users exist) |
| `npm run build` / `npm start` | Production build (`build/server.js`, `build/ops.js`) and server |

## Data access

- `src/db/schema.ts` — Drizzle schema; migrations in `drizzle/` run automatically on startup
  (and, in production, when a task becomes the writer).
- `src/db/repository.server.ts` — all queries. Employer/position methods take the signed-in
  user's id and only touch that user's rows.
- **Migrations must be expand/contract** (add columns/tables; remove only after no deployed
  version uses them), because during a blue/green deploy or rollback the previous version
  runs against the new schema.

## Production runtime

`server/index.ts` serves the app on loopback for nginx and, with `WRITER_COORDINATION=s3`,
runs the writer coordinator (`src/ops/writer.server.ts`): exactly one task holds the writer
lease and replicates to S3 with Litestream; other tasks serve read-only. `src/ops/cli.ts`
(`build/ops.js`) is the operator CLI used by the runbooks (status, verify, restore, export,
maintenance).

| Env var | Meaning |
|---|---|
| `COOKIE_SECRETS` | Comma-separated cookie secrets, newest first |
| `DATABASE_PATH` | SQLite file (standalone mode only) |
| `WRITER_COORDINATION` | `s3` to enable the coordinator |
| `REPLICA_BUCKET`, `REPLICA_PREFIX` | Where control docs and replicas live |
| `S3_ENDPOINT` | S3-compatible endpoint (local MinIO only) |
| `DATA_DIR` | Writable dir for database files (default `/data`) |
| `LITESTREAM_HEARTBEAT_URL` | Litestream heartbeat target (set in the image) |
