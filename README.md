# Survey App

A small Google Forms clone: build a survey, share a link, see the answers come in live.

Demo: https://survey-app-ponb.onrender.com (account `demo@example.com` / `demo-password`).
The demo runs on a free Render instance, so the first load after a while can take about a minute.

## Features

- Sign up / sign in with server-side sessions (httpOnly cookie)
- Survey builder with single choice, multiple choice, text and scale questions,
  drag and drop reordering and autosave
- Draft / open / closed status, share link with a QR code, optional deadline
- Public answer page, no account needed, one response per browser
- Results with charts, paginated text answers, live updates (SSE) and CSV export
- Light, dark and system theme

## Stack

- Frontend: React 19, Vite, React Router, TanStack Query, Tailwind CSS, dnd-kit
- Backend: Node.js 24, Express 5, Prisma 7, PostgreSQL
- Shared: TypeScript + Zod schemas used by both the frontend and the API
- Tests: Vitest, Supertest, Testing Library, Playwright
- Tooling: npm workspaces, Biome, GitHub Actions, Render

## Project structure

```
apps/
  api/        Express API (prisma/ has the schema, migrations and seed)
  web/        React app
packages/
  shared/     zod schemas, API types, survey status and answer validation
e2e/          Playwright tests (run against the production build)
```

In development Vite proxies `/api` to the API on port 3000. In production the API also serves
the built frontend, so it's one service on one origin.

## Design notes

- Validation lives in `packages/shared`. The builder and the answer form use it for instant
  feedback, the API runs the same schemas again.
- Sessions instead of JWT: the cookie holds a random token and the database only stores its
  hash, so logging out actually ends the session on the server.
- Each selected option is its own `Answer` row, so results are a `GROUP BY` in Postgres.
- The builder sends the whole survey on every save (`PUT /api/surveys/:id`). Saves are queued on
  the client and the row is locked with `SELECT ... FOR UPDATE`, so autosave and publish can't
  overlap.
- `createApp(deps)` takes the database and config as arguments, which keeps the API easy to test.
- Live results use Server-Sent Events with an in-memory event bus. That's fine for one instance;
  more than one would need Redis or Postgres `LISTEN/NOTIFY`.
- `apps/api/src/lib/contract.ts` breaks the typecheck if the Prisma enums and the shared enums
  get out of sync.

Security: scrypt password hashing, SameSite cookies plus a custom header check against CSRF,
rate limiting on auth and on submitting answers, Helmet/CSP, every owner query scoped by
`ownerId` (other people's surveys are a 404), CSV injection escaping in exports.

## Running locally

You need Node.js 24 and a Postgres database (Docker, [Neon](https://neon.tech), or
`npx prisma dev` if you don't have Docker).

```bash
npm install
cp apps/api/.env.example apps/api/.env
npm run db:up        # Postgres in Docker; or put another DATABASE_URL into apps/api/.env
npm run db:deploy    # apply migrations
npm run db:seed      # optional demo data
npm run dev          # http://localhost:5173
```

With `npx prisma dev` (run it in `apps/api`, `npx prisma dev ls` shows the URL): it only handles
one connection at a time, so set `DATABASE_POOL_MAX=1` in `.env` and don't run the seed while
`npm run dev` is running. If it stops responding, `npx prisma dev stop <name>` and start it again.

## Tests

```bash
npm test                  # unit tests
npm run test:integration  # API against a real database (TEST_DATABASE_URL, gets wiped)
npm run test:e2e          # Playwright, needs `npm run build` first
npm run typecheck
npm run lint
```

CI runs all of it on every push with Postgres as a service container.

## API

Everything is under `/api`. Non-GET requests need an `X-Requested-With: fetch` header.
Errors look like `{ "error": { "code": "...", "message": "...", "fields": { ... } } }`.

| Method           | Path                                            | Description                          |
| ---------------- | ----------------------------------------------- | ------------------------------------ |
| GET              | `/health`                                       | API and database status              |
| POST             | `/auth/register`, `/auth/login`, `/auth/logout` | Account and session                  |
| GET              | `/auth/me`                                      | Current user                         |
| GET, POST        | `/surveys`                                      | List my surveys / create a draft     |
| GET, PUT, DELETE | `/surveys/:id`                                  | Get / replace (drafts only) / delete |
| POST             | `/surveys/:id/status`                           | `{ "status": "OPEN" }` or `"CLOSED"` |
| GET              | `/surveys/:id/results`                          | Aggregated results                   |
| GET              | `/surveys/:id/results/stream`                   | SSE, fires on every new response     |
| GET              | `/surveys/:id/questions/:questionId/answers`    | Text answers, `?cursor=&limit=`      |
| GET              | `/surveys/:id/export.csv`                       | All responses as CSV                 |
| GET              | `/public/surveys/:slug`                         | Survey for respondents               |
| POST             | `/public/surveys/:slug/responses`               | Submit answers                       |

## Deploy

`render.yaml` sets up a single free web service on Render. The database is a free Neon project
(Render's free Postgres is deleted after 30 days).

1. Neon: create a project, click Connect, switch off connection pooling and copy the connection
   string. Remove `&channel_binding=require` from the end if it's there.
2. Render: New > Blueprint, pick this repo and paste the Neon string as `DATABASE_URL`.
   Every push to `main` redeploys.
3. Demo data, once, from your machine:
   `$env:DATABASE_URL="<neon url>"; npm run db:seed; Remove-Item Env:DATABASE_URL` (PowerShell)

## Ideas

- Conditional questions (skip logic)
- Survey templates
- OpenAPI docs generated from the zod schemas
- Russian / English UI
