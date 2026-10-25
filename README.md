# AutoHub - Car Dealership Inventory System

A full-stack TDD kata: a JWT-secured inventory API (Express + Prisma + PostgreSQL) and a React single-page app where customers browse and buy vehicles and admins manage stock. Built test-first (Red -> Green -> Refactor), backend first.

> **Status in one paragraph (read this first).** 280 automated tests pass (190 backend, 90 frontend) with 99.1% backend and 98.5% frontend statement coverage, measured in the AI sandbox against a real PostgreSQL 16. **Not verified there:** Docker Compose, the Prisma CLI migrate commands (their engine could not be downloaded, so the migration SQL is hand-written), Windows/PowerShell, and any visual/browser rendering (no screenshots exist). Details: [docs/TEST_REPORT.md](docs/TEST_REPORT.md).

## Contents
1. [Features](#features) - 2. [Tech stack](#tech-stack) - 3. [Architecture](#architecture) - 4. [Directory tree](#directory-tree) - 5. [Windows prerequisites](#windows-prerequisites) - 6. [Setup (PowerShell)](#setup-windows-powershell) - 7. [Environment variables](#environment-configuration) - 8. [API reference](#api-reference) - 9. [Auth and authorization](#authentication-and-authorization) - 10. [Tests and coverage](#running-tests-and-coverage) - 11. [TDD workflow and commits](#tdd-workflow-and-commit-history) - 12. [Screenshots](#screenshots) - 13. [Troubleshooting](#troubleshooting) - 14. [Security](#security-considerations) - 15. [My AI Usage](#my-ai-usage) - 16. [Future improvements](#future-improvements)

Other documents: [PROMPTS.md](PROMPTS.md) - [docs/TEST_REPORT.md](docs/TEST_REPORT.md) - [docs/CHECKLIST.md](docs/CHECKLIST.md)

## Features

**Customers:** register/login (automatic login after signup), browse in-stock vehicles with summary cards, search by make/model, filter by category and price range, sort, paginate, view details, add 1..N units to a **cart** with the Purchase button (disabled and showing 0 when sold out or when every available unit is already in the cart), review the cart, press **Pay bill**, and complete a **demo payment** page that performs the real stock-decreasing purchase. Clear messages when stock changed under you.

**Admins:** everything customers can do plus add, edit, delete (with confirmation) and restock vehicles, and see sold-out vehicles. Admin screens are hidden from customers **and** guarded by an admin route **and** enforced by the API.

**Cart and payment (demo):** Purchase adds to a per-user cart (kept in `localStorage`, nothing reserved on the server). Stock only goes down when you pay; paying calls `POST /api/vehicles/:id/purchase` once per cart line. There is no real payment provider: card details are validated in the browser and never sent or stored. If a car sold out meanwhile, the bought items are removed from the cart and the failed one stays with an explanation.

**Platform:** layered API, Zod validation everywhere, uniform JSON response/error shapes, atomic stock updates (no overselling, DB `CHECK (quantity >= 0)` as a last line of defence), purchase audit rows, rate-limited auth, Helmet headers, env-based CORS, 100 kB body limit, `/api/health`.

## Tech stack

| Area | Technology |
|---|---|
| Monorepo | npm workspaces: `backend`, `frontend`, `docs` |
| Backend | Node.js, TypeScript (strict), Express 4, Prisma 6.19 (`engineType = "client"` + `@prisma/adapter-pg`), Zod, jsonwebtoken, bcryptjs, helmet, cors, express-rate-limit, morgan |
| Database | PostgreSQL 16 (Docker volume `autohub_pgdata`), `Decimal(12,2)` prices, indexes on make/model/category/price |
| Frontend | React 19 + TypeScript, Vite 5, Tailwind CSS **3.4.17 (pinned)**, React Router 6, Axios, Lucide React, React Hook Form + Zod |
| Tests | Vitest 3, Supertest, React Testing Library, jsdom, `@vitest/coverage-v8` |

## Architecture

```
HTTP -> routes -> controllers (thin: parse + call + respond)
                    -> services (business rules, throw AppError subclasses)
                        -> repositories (the ONLY code that talks to Prisma)
```

- **Dependency injection:** `src/app.ts` is the composition root; services receive repository *interfaces* (`UserRepository`, `VehicleRepository`, `InventoryRepository`) through constructors, so unit tests pass plain mocks.
- **Errors:** services throw `AppError` subclasses (`ValidationError`, `UnauthorizedError`, `ForbiddenError`, `NotFoundError`, `ConflictError`). One error middleware maps those, `ZodError`, Prisma error codes (`P2002`->409, `P2025`->404, `P2003`->409) and body-parser errors to the response shape; unknown errors become a generic 500 in production.
- **Response shapes:** success `{ "success": true, "data": ..., "meta"?: {page,limit,total,totalPages} }`; failure `{ "success": false, "error": { "code", "message", "details"? } }`.
- **Atomic purchase:** one SQL statement `UPDATE "Vehicle" SET quantity = quantity - n WHERE id = ? AND quantity >= n` (Prisma `updateMany` with `decrement`) inside a transaction; 0 rows updated means "not found" or "insufficient stock" (a follow-up read only chooses the error message). There is no read-then-write.
- **Data model:** `User`, `Vehicle`, `Purchase` (see `backend/prisma/schema.prisma`). Deleting a vehicle keeps its purchase rows (`vehicleId` becomes null; `vehicleName` snapshot remains).
- **Frontend:** `AuthContext` (token + user), `ToastContext`, `ProtectedRoute`/`AdminRoute` layout routes, an Axios layer that attaches the Bearer token and logs the user out on a 401.

## Directory tree

```text
car-dealership-inventory/
├── backend/
│   ├── prisma/
│   │   ├── migrations/
│   │   │   ├── 20261024000000_init/
│   │   │   │   └── migration.sql
│   │   │   └── migration_lock.toml
│   │   ├── schema.prisma
│   │   ├── seed.ts
│   │   └── seedData.ts
│   ├── src/
│   │   ├── config/
│   │   │   └── env.ts
│   │   ├── db/
│   │   │   └── prisma.ts
│   │   ├── domain/
│   │   │   ├── inventory.ts
│   │   │   ├── types.ts
│   │   │   └── vehicle.ts
│   │   ├── errors/
│   │   │   └── AppError.ts
│   │   ├── middleware/
│   │   │   ├── authenticate.ts
│   │   │   ├── errorHandler.ts
│   │   │   ├── notFound.ts
│   │   │   └── requireRole.ts
│   │   ├── modules/
│   │   │   ├── auth/
│   │   │   │   ├── auth.controller.ts
│   │   │   │   ├── auth.routes.ts
│   │   │   │   ├── auth.schemas.ts
│   │   │   │   ├── auth.service.ts
│   │   │   │   └── user.repository.ts
│   │   │   ├── inventory/
│   │   │   │   ├── inventory.controller.ts
│   │   │   │   ├── inventory.repository.ts
│   │   │   │   ├── inventory.routes.ts
│   │   │   │   ├── inventory.schemas.ts
│   │   │   │   └── inventory.service.ts
│   │   │   └── vehicles/
│   │   │       ├── vehicle.controller.ts
│   │   │       ├── vehicle.repository.ts
│   │   │       ├── vehicle.routes.ts
│   │   │       ├── vehicle.schemas.ts
│   │   │       └── vehicle.service.ts
│   │   ├── types/
│   │   │   └── express.d.ts
│   │   ├── utils/
│   │   │   ├── asyncHandler.ts
│   │   │   ├── password.hasher.ts
│   │   │   ├── response.ts
│   │   │   └── token.service.ts
│   │   ├── app.ts
│   │   └── server.ts
│   ├── tests/
│   │   ├── helpers/
│   │   │   ├── dbSafety.ts
│   │   │   ├── migrate.ts
│   │   │   └── testContext.ts
│   │   ├── integration/
│   │   │   ├── app.test.ts
│   │   │   ├── auth.test.ts
│   │   │   ├── inventory.test.ts
│   │   │   └── vehicles.test.ts
│   │   ├── setup/
│   │   │   ├── env.ts
│   │   │   └── globalSetup.ts
│   │   └── unit/
│   │       ├── authMiddleware.test.ts
│   │       ├── authService.test.ts
│   │       ├── config.test.ts
│   │       ├── errorHandler.test.ts
│   │       ├── inventoryService.test.ts
│   │       ├── tokenService.test.ts
│   │       ├── vehicleSchemas.test.ts
│   │       └── vehicleService.test.ts
│   ├── .env.example
│   ├── package.json
│   ├── tsconfig.build.json
│   ├── tsconfig.json
│   └── vitest.config.ts
├── docker/
│   └── postgres-init/
│       └── 01-create-test-db.sql
├── docs/
│   ├── screenshots/
│   │   ├── .gitkeep
│   │   └── README.md
│   ├── test-evidence/
│   │   ├── coverage-run-root.txt
│   │   └── tdd-run-summaries.txt
│   ├── CHECKLIST.md
│   ├── TEST_REPORT.md
│   └── package.json
├── frontend/
│   ├── public/
│   │   ├── favicon.svg
│   │   └── placeholder-car.svg
│   ├── src/
│   │   ├── api/
│   │   │   ├── client.ts
│   │   │   └── endpoints.ts
│   │   ├── components/
│   │   │   ├── AppLayout.tsx
│   │   │   ├── ConfirmDialog.tsx
│   │   │   ├── FormField.tsx
│   │   │   ├── Header.tsx
│   │   │   ├── Modal.tsx
│   │   │   ├── Pagination.tsx
│   │   │   ├── ProtectedRoute.tsx
│   │   │   ├── SearchFilters.tsx
│   │   │   ├── StateMessages.tsx
│   │   │   ├── StatsCards.tsx
│   │   │   ├── VehicleCard.tsx
│   │   │   ├── VehicleCardSkeleton.tsx
│   │   │   ├── VehicleDetailsModal.tsx
│   │   │   └── VehicleImage.tsx
│   │   ├── context/
│   │   │   ├── AuthContext.tsx
│   │   │   └── ToastContext.tsx
│   │   ├── lib/
│   │   │   ├── filters.ts
│   │   │   ├── format.ts
│   │   │   └── schemas.ts
│   │   ├── pages/
│   │   │   ├── AdminPage.tsx
│   │   │   ├── AuthLayout.tsx
│   │   │   ├── DashboardPage.tsx
│   │   │   ├── LoginPage.tsx
│   │   │   ├── NotFoundPage.tsx
│   │   │   ├── RegisterPage.tsx
│   │   │   └── VehicleFormPage.tsx
│   │   ├── App.tsx
│   │   ├── index.css
│   │   ├── main.tsx
│   │   ├── types.ts
│   │   └── vite-env.d.ts
│   ├── tests/
│   │   ├── admin.test.tsx
│   │   ├── api-layer.test.ts
│   │   ├── auth-forms.test.tsx
│   │   ├── dashboard.test.tsx
│   │   ├── fixtures.ts
│   │   ├── header.test.tsx
│   │   ├── routes.test.tsx
│   │   ├── setup.ts
│   │   ├── utils.tsx
│   │   └── vehicle-card.test.tsx
│   ├── .env.example
│   ├── index.html
│   ├── package.json
│   ├── postcss.config.js
│   ├── tailwind.config.js
│   ├── tsconfig.json
│   └── vite.config.ts
├── .env.example
├── .gitattributes
├── .gitignore
├── PROMPTS.md
├── docker-compose.yml
└── package.json
```

(`package-lock.json` is also committed at the root. `node_modules`, `.env`, `dist`, `coverage` are never committed or zipped.)

## Windows prerequisites

1. **Node.js LTS** (v20 or newer) - https://nodejs.org - verify: `node -v`, `npm -v`
2. **Git for Windows** - https://git-scm.com - verify: `git --version`
3. **Docker Desktop** (WSL 2 backend) - https://www.docker.com/products/docker-desktop - **start it** and wait for "Engine running". Verify: `docker --version`
4. **VS Code** - https://code.visualstudio.com
5. Free TCP ports **5432** (Postgres), **4000** (API), **5173** (web). Stop any local PostgreSQL service that already uses 5432.

## Setup (Windows PowerShell)

Extract `car-dealership-inventory.zip` (right-click -> Extract All), then:

**1. Open the project in VS Code** - run in any folder:
```powershell
cd C:\path\to\car-dealership-inventory
code .
```
Then open the VS Code terminal (**Terminal -> New Terminal**, choose *PowerShell*). All commands below start in that repo-root folder unless stated otherwise.

**2. Install dependencies** - directory: repo root
```powershell
npm install
```
This also runs `prisma generate` (needs internet access to npm only).

**3. Create the env files** - directory: repo root
```powershell
Copy-Item backend\.env.example backend\.env
Copy-Item frontend\.env.example frontend\.env
```
The defaults match `docker-compose.yml`, so nothing needs editing for local development. Change `JWT_SECRET`, `ADMIN_EMAIL` and `ADMIN_PASSWORD` if you like (see [Environment configuration](#environment-configuration)).

**4. Start PostgreSQL in Docker** - directory: repo root (Docker Desktop must be running)
```powershell
npm run db:up
docker compose ps
```
Wait until the `db` service shows `healthy`. First start creates **two** databases: `autohub` (development) and `autohub_test` (tests) via `docker/postgres-init/01-create-test-db.sql`. Data lives in the named volume `autohub_pgdata` and survives `npm run db:down`.

**5. Apply the database migrations** - directory: repo root
```powershell
npm run db:migrate
```
(runs `prisma migrate deploy`, which applies `backend/prisma/migrations/20261024000000_init`). Optional drift check: `cd backend; npx prisma migrate status; cd ..`

**6. Seed sample data and the admin account** - directory: repo root
```powershell
npm run db:seed
```
Creates the admin from `ADMIN_EMAIL` / `ADMIN_PASSWORD` (bcrypt-hashed) and 12 sample vehicles. Safe to run again (vehicles are only inserted into an empty table).

**7. Run backend + frontend together** - directory: repo root
```powershell
npm run dev
```
or separately in two terminals: `npm run dev:backend` and `npm run dev:frontend`.

**8. Open the app**

| What | URL |
|---|---|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:4000/api |
| Health check | http://localhost:4000/api/health |

**9. Log in as the admin** - email `admin@autohub.local`, password `ChangeMe123!` (development defaults from `backend\.env.example`; the real values are whatever `ADMIN_EMAIL`/`ADMIN_PASSWORD` were when you ran `npm run db:seed`). Changing those variables later and re-running `npm run db:seed` resets that admin's password. Anyone who registers through the UI is always a **Customer**.

**Stop everything:** `Ctrl+C` in the dev terminal, then `npm run db:down` (data is kept; add `-v` via `docker compose down -v` to wipe it).

### Root scripts

| Script | What it does |
|---|---|
| `npm run dev` | API + web together (concurrently) |
| `npm run dev:backend` / `dev:frontend` | one side only (`tsx watch` / Vite) |
| `npm test` | backend then frontend tests |
| `npm run test:coverage` | same, with coverage tables (+ HTML in `*/coverage/`) |
| `npm run test:ci` | tests + coverage + JUnit XML reports (used by Jenkins) |
| `npm run db:up` / `db:down` | start / stop the Docker PostgreSQL |
| `npm run db:migrate` | `prisma migrate deploy` |
| `npm run db:seed` | seed admin + 12 vehicles |
| `npm run build` | compile backend (`dist/`) and build frontend (`dist/`) |
| `npm run typecheck` | `tsc --noEmit` for both |

Creating *new* migrations while developing: `cd backend; npm run db:migrate:dev -- --name your_change`.

## Environment configuration

Real `.env` files are git-ignored. Only `*.env.example` are committed (root = master reference, `backend/`, `frontend/`).

| Variable | Where | Meaning / default |
|---|---|---|
| `DATABASE_URL` | backend | `postgresql://autohub:autohub_dev_password@localhost:5432/autohub` (matches compose) |
| `TEST_DATABASE_URL` | backend | `.../autohub_test`. **Database name must end in `_test`** and differ from `DATABASE_URL`, otherwise the test suite refuses to start |
| `JWT_SECRET` | backend | >= 32 chars (the dev placeholder is rejected when `NODE_ENV=production`) |
| `JWT_EXPIRES_IN` | backend | e.g. `15m`, `1h` (default), `7d` |
| `PORT` | backend | `4000` |
| `CLIENT_URL` | backend | allowed CORS origin(s), comma-separated; `http://localhost:5173` |
| `BCRYPT_ROUNDS` | backend | `10` (tests use 4) |
| `AUTH_RATE_LIMIT_MAX` | backend | login/register attempts per 15 min per IP (default 50 in the example) |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | backend (seed only) | dev defaults `admin@autohub.local` / `ChangeMe123!`; must satisfy the password policy |
| `VITE_API_BASE_URL` | frontend | `http://localhost:4000/api` |
| `POSTGRES_USER/PASSWORD/DB` | root `.env` for compose (optional) | defaults `autohub` / `autohub_dev_password` / `autohub` |

If you change the Postgres credentials, change them in `docker-compose.yml` defaults (or root `.env`), `DATABASE_URL` **and** `TEST_DATABASE_URL`.

## API reference

Base URL `http://localhost:4000/api`. Send `Authorization: Bearer <token>` on everything except health/register/login.

| Method | Path | Who | Success | Notes |
|---|---|---|---|---|
| GET | `/health` | public | 200 | `{status, database, uptimeSeconds}`; 503 if DB down |
| POST | `/auth/register` | public | 201 | `{name,email,password}`; role ignored (always CUSTOMER); 409 duplicate; rate-limited |
| POST | `/auth/login` | public | 200 | generic 401 for bad email *or* password; rate-limited |
| GET | `/auth/me` | any user | 200 | current user (used to restore a session) |
| GET | `/vehicles` | any user | 200 | `page, limit(<=100), sortBy, sortOrder, availability` |
| GET | `/vehicles/search` | any user | 200 | list params + `make, model, category` (case-insensitive partial), `minPrice, maxPrice, year` |
| GET | `/vehicles/stats` | any user | 200 | totals + per-category counts |
| GET | `/vehicles/:id` | any user | 200 | 400 bad UUID, 404 missing |
| POST | `/vehicles` | ADMIN | 201 | full vehicle body |
| PUT | `/vehicles/:id` | ADMIN | 200 | full body (replace); 404 missing |
| DELETE | `/vehicles/:id` | ADMIN | 204 | 404 missing |
| POST | `/vehicles/:id/purchase` | any user | 201 | `{quantity?}` default 1; 409 `INSUFFICIENT_STOCK`; 404 |
| POST | `/vehicles/:id/restock` | ADMIN | 200 | `{quantity}` positive integer; 404 |

**Query parameters.** `sortBy` = `createdAt | price | make | model | category | year | quantity` (default `createdAt`), `sortOrder` = `asc | desc` (default `desc`), `limit` default 12. **`availability`** = `in_stock` (**default**: only stock > 0) `| out_of_stock | all`. Unknown or malformed parameters (e.g. `minPrice=abc`, `minPrice > maxPrice`, `limit=1000`) return 400. Money has at most 2 decimals; `imageUrl` must be http(s).

**Examples (PowerShell, using `Invoke-RestMethod`).** *These PowerShell snippets were written for Windows but not executed on Windows; the equivalent calls were run with `curl` on Linux (see the Test Report).*

```powershell
# Register (a "role" in the body would be ignored by the server)
$body = @{ name = 'Ann'; email = 'ann@example.com'; password = 'Str0ngPassw0rd' } | ConvertTo-Json
Invoke-RestMethod -Method Post -Uri http://localhost:4000/api/auth/register -ContentType 'application/json' -Body $body
```
```json
{ "success": true,
  "data": { "user": { "id": "…", "name": "Ann", "email": "ann@example.com", "role": "CUSTOMER", "createdAt": "…" },
            "token": "eyJhbGciOi…" } }
```
```powershell
# Login as the seeded admin, keep the token, then search
$creds = @{ email = 'admin@autohub.local'; password = 'ChangeMe123!' } | ConvertTo-Json
$login = Invoke-RestMethod -Method Post -Uri http://localhost:4000/api/auth/login -ContentType 'application/json' -Body $creds
$headers = @{ Authorization = "Bearer $($login.data.token)" }
Invoke-RestMethod -Uri 'http://localhost:4000/api/vehicles/search?make=toy&sortBy=price&sortOrder=asc' -Headers $headers
```
```json
{ "success": true,
  "data": [ { "id": "…", "make": "Toyota", "model": "Camry", "category": "Sedan", "price": 28995, "quantity": 6, "year": 2024, "description": "…", "imageUrl": null, "createdAt": "…", "updatedAt": "…" } ],
  "meta": { "page": 1, "limit": 12, "total": 2, "totalPages": 1 } }
```
```powershell
# Purchase 2 units (replace <VEHICLE_ID> with an id from the search result)
Invoke-RestMethod -Method Post -Uri http://localhost:4000/api/vehicles/<VEHICLE_ID>/purchase -Headers $headers -ContentType 'application/json' -Body '{"quantity":2}'
```
```json
{ "success": true,
  "data": { "vehicle": { "id": "…", "make": "Toyota", "model": "Camry", "quantity": 4, "…": "…" },
            "purchase": { "id": "…", "vehicleName": "Toyota Camry", "quantity": 2, "unitPrice": 28995, "totalPrice": 57990, "…": "…" },
            "message": "Purchase confirmed: 2 x Toyota Camry" } }
```
Insufficient stock (HTTP 409) and validation (HTTP 400) look like:
```json
{ "success": false, "error": { "code": "INSUFFICIENT_STOCK", "message": "Only 1 unit(s) available", "details": { "available": 1, "requested": 5 } } }
{ "success": false, "error": { "code": "VALIDATION_ERROR", "message": "Validation failed", "details": [ { "field": "password", "message": "Password must contain a digit" } ] } }
```
Status codes used: 200, 201, 204, 400, 401 (`UNAUTHORIZED`, `INVALID_TOKEN`, `TOKEN_EXPIRED`, `INVALID_CREDENTIALS`), 403, 404, 409, 413, 429, 500, 503.

## Authentication and authorization

1. `POST /auth/login` (or `/register`) verifies the password with bcrypt and returns an HS256 JWT containing only the user id (`sub`) and `role`, expiring after `JWT_EXPIRES_IN`.
2. The SPA keeps the token in `AuthContext` state and `localStorage` and sends it as `Authorization: Bearer`.
3. Backend `authenticate` verifies signature (algorithm pinned) and expiry and puts `{id, role}` on `req.user`; `requireRole('ADMIN')` guards admin routes. **The server decides - hiding buttons or routes in React is only convenience.** Tests prove a customer gets 403 on create/update/delete/restock regardless of the UI.
4. Passwords: 8-72 characters with upper-case, lower-case and a digit. Registration lowercases emails, rejects duplicates (409) and hard-codes `role = CUSTOMER`.
5. Login failures return the same 401 body for unknown email and wrong password, and a hash comparison still runs for unknown emails so timing does not reveal which accounts exist.

## Running tests and coverage

Tests need PostgreSQL running (`npm run db:up`) and `backend\.env` (for `TEST_DATABASE_URL`). The backend test run **drops and recreates the `public` schema of `TEST_DATABASE_URL` only after verifying its name ends in `_test` and that the live connection is a `*_test` database**; otherwise it aborts.

```powershell
npm test                       # repo root: backend then frontend
npm run test:coverage          # with coverage tables; HTML reports in backend\coverage and frontend\coverage
npm run test -w backend        # backend only
npm run test -w frontend       # frontend only
npm run typecheck
npm run build
```
Backend thresholds (>= 80% for `src/modules/**/*.service.ts` and `src/middleware/**`) are enforced in `backend/vitest.config.ts`. Latest measured numbers and exclusions: [docs/TEST_REPORT.md](docs/TEST_REPORT.md).

## TDD workflow and commit history

Each area was built as **Red -> Green -> Refactor**:

1. **Red:** write tests for the behaviour, run them, watch them fail (the failing run is recorded in the commit message).
2. **Green:** write the minimum code, run again until green.
3. **Refactor:** tidy with tests green. *Honest note:* real refactors were small and folded into the green commits (e.g. the LIKE-wildcard escape); there is no separate `refactor:` commit.

Run `git log --oneline` to see it. Commits use Conventional Commits (`chore`, `test`, `feat`, `docs`); failing-test (`test:`) commits come before the matching `feat:` commit. Every AI-assisted commit ends with the required trailer (preceded by two blank lines):

```text
Co-authored-by: Claude <AI@users.noreply.github.com>
```
All commits so far were made by the AI inside its sandbox with the **placeholder identity** `Your Name <you@example.com>`. Replace it for your own commits:
```powershell
git config user.name "Your Real Name"
git config user.email "your-real@email"
```
This repository has **no remote and nothing was pushed anywhere**; `git remote -v` prints nothing. The commit bodies say what the AI generated and do not claim manual review.

## Continuous integration (Jenkins)

A declarative `Jenkinsfile` is included. It starts a throwaway `postgres:16-alpine` container on a random free port (database `autohub_test`), sets `TEST_DATABASE_URL`, then runs `npm ci`, `npm run typecheck`, `npm run test:ci` (tests + coverage + JUnit XML in `backend/reports/` and `frontend/reports/`) and `npm run build`, and always removes the container afterwards.

- Needs a Linux agent with Docker and a NodeJS tool named `node22` (Node >= 20) under *Manage Jenkins -> Tools*.
- `npm run test:ci` **was run and verified** in the AI sandbox (190 + 65 tests passed, valid JUnit XML written). **The Jenkinsfile itself has never been run on a Jenkins server**, so expect to adjust tool names, Docker networking (if Jenkins itself runs in a container) or Windows agents (`sh` -> `bat`).

## Screenshots

**None were captured** - the AI sandbox had no browser, so no honest screenshot could be produced. See [docs/screenshots/README.md](docs/screenshots/README.md) for what to capture after running the app yourself.

## Troubleshooting

| Symptom | Fix |
|---|---|
| `docker : The term 'docker' is not recognized` / `Cannot connect to the Docker daemon` | Install and **start** Docker Desktop, reopen the terminal |
| `port is already allocated` / `ECONNREFUSED 127.0.0.1:5432` | Another PostgreSQL uses 5432 (stop that service) or Docker's DB is not up: `docker compose ps`, `npm run db:up` |
| Tests abort: *"TEST_DATABASE_URL is not set"* | `Copy-Item backend\.env.example backend\.env` |
| Tests abort: *"must end with _test"* | Your `TEST_DATABASE_URL` points at a non-test database - fix it (this is the safety guard working) |
| `database "autohub_test" does not exist` | The init script only runs on a **fresh** volume. Create it once: `docker compose exec db psql -U autohub -d autohub -c "CREATE DATABASE autohub_test;"` |
| `P1001: Can't reach database server` on migrate/seed | DB not running, or `DATABASE_URL` differs from compose credentials |
| `prisma migrate` reports drift / failed migration | The initial migration SQL was hand-written (see Test Report). Safest reset for local dev: `docker compose down -v`, `npm run db:up`, `npm run db:migrate`. If `prisma migrate dev` wants to generate a diff, send that diff to your instructor/AI to reconcile - do not ignore it |
| `Environment variable not found: DATABASE_URL` | Missing `backend\.env` |
| `Invalid environment configuration -> JWT_SECRET...` | Secret shorter than 32 chars |
| Login works but every page says "Cannot reach the server" | Backend not running, or `VITE_API_BASE_URL` wrong; CORS requires the browser origin to be listed in `CLIENT_URL` |
| `@prisma/client did not initialize yet` | `npm run db:generate -w backend` |
| `Execution of scripts is disabled` (PowerShell) | `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` |
| `429 Too many attempts` while testing login by hand | Wait 15 minutes or raise `AUTH_RATE_LIMIT_MAX` and restart |

## Security considerations

- **Secrets:** only via environment variables; `.env` files are git-ignored; `.env.example` holds clearly labelled development-only placeholders. The API refuses to start in production with the placeholder `JWT_SECRET`. **Change `ADMIN_PASSWORD` and `JWT_SECRET` for anything other than your own laptop.**
- **JWT in `localStorage` (required by this brief) - trade-offs:**
  - *Downside:* any JavaScript running on the page can read `localStorage`, so one XSS bug (or a malicious npm dependency) can steal the token and impersonate the user until it expires; it is also not cleared by closing the tab.
  - *Upside:* it is not sent automatically by the browser, so classic CSRF does not apply to the API.
  - *Mitigations here:* React escapes output by default (no `dangerouslySetInnerHTML`), image URLs are limited to http(s), Helmet sets security headers, tokens expire (default 1h), and the client discards the token on any 401.
  - *Alternative (not used, per the brief):* an `httpOnly; Secure; SameSite` cookie hides the token from JavaScript but then needs CSRF protection; a short-lived access token plus rotating refresh cookie is the usual production design.
- **Stateless tokens:** role and identity come from the signed token. A deleted user or a demoted admin keeps their old token's rights until it expires (default 1h); `/auth/me` does check the database. For instant revocation you would add a token version or deny-list.
- **Passwords:** bcryptjs (cost 10 by default), 72-byte limit enforced by policy, never returned by the API.
- **Brute force:** `express-rate-limit` on login and register (per IP). Behind a reverse proxy you must configure `trust proxy` correctly or all users share one IP.
- **Input:** every body/query/param is Zod-validated; unknown query parameters are rejected; search escapes `%`/`_` so users cannot inject LIKE wildcards; Prisma parameterises SQL; 100 kB body limit.
- **Information leaks:** generic credential errors; production 500s never include stack traces or SQL.
- **Database integrity:** atomic conditional stock update plus DB `CHECK (quantity >= 0)`.
- **Dependencies:** `npm audit` reports issues in dev-time tooling (Prisma CLI chain); review before deploying. Not penetration-tested.

## My AI Usage

*(Factual notes about how the AI was used. I did not write any claims here about work I (the student) did by hand.)*

- **Tool used:** Claude (Anthropic), via the claude.ai chat with a code-execution sandbox. Prompts are recorded in [PROMPTS.md](PROMPTS.md).
- **What Claude was used for:**
  - *Scaffolding:* monorepo layout, Docker Compose, Prisma schema and migration, Vite/Tailwind/Vitest configuration, env files.
  - *Generating tests and boilerplate:* all unit and integration tests (written before the code they test), repositories/services/controllers/routes, React components, forms and pages, seed data, documentation.
  - *Debugging:* diagnosing the stale Prisma client, the Postgres `name` type that the pg adapter cannot read, un-escaped LIKE wildcards in search (found by a test), duplicate React versions in the workspace, and a TypeScript self-reference in a test helper.
- **How the output was verified (by the AI, in its sandbox):** ran the real test suites against a real PostgreSQL 16, ran `tsc --noEmit` and the production builds, measured coverage, repeated the concurrency tests 5 times, ran the seed twice, and exercised the running servers with `curl`. Results: [docs/TEST_REPORT.md](docs/TEST_REPORT.md). **Not verified:** Docker, Prisma CLI migrations, Windows, real-browser rendering.
- **What needed correction during the build:** see the failed GREEN attempts listed in the Test Report. In addition the AI had to fix its own first commit message that mis-stated test counts (amended before delivery).
- **Benefits:** very fast scaffolding, broad test coverage, consistent layering and documentation, and a working concurrency-safe purchase implementation backed by tests.
- **Limits:** the AI could not see the UI, run Docker, or run Windows, so those parts are unverified; generated code and tests can share the same blind spots (a test written by the same author as the code can encode the same misunderstanding); the migration SQL was hand-written because a tool could not be downloaded. Everything should be reviewed by a human before being trusted.
- **How it helped TDD:** the AI wrote the tests first, ran them red and recorded the failure, then wrote the minimum code to turn them green. The red runs and fixes are in the commit history and `docs/test-evidence/tdd-run-summaries.txt`. A caveat: a few RED tests passed trivially (generic 404/401 handlers), noted in the Test Report.

### My own reflection

> **TODO (student): write this paragraph yourself before submitting.** Suggested prompts: What did you review, run or change yourself? What did the AI get wrong or oversimplify? What did you learn about TDD, concurrency and authorization? How would you use AI differently next time? *Only write what you actually did.*

_(your reflection here)_

## Future improvements

- Run `prisma migrate dev` once on a machine with internet to confirm zero drift and regenerate the migration if needed.
- Browser end-to-end tests (Playwright) and visual/accessibility audits (axe), plus real screenshots.
- Purchase history page, order status, and refunds; admin audit log.
- Refresh tokens with httpOnly cookies, token revocation, password reset and email verification.
- Image uploads to object storage instead of URLs; full-text search and an `OR` search across make/model.
- CI pipeline (GitHub Actions) running typecheck, tests and coverage against a Postgres service; Dockerfiles for the API and web app.
- Structured logging (pino) and request IDs; OpenAPI/Swagger documentation.
