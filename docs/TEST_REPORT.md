# Test Report

All numbers below come from commands that were **actually run** in the AI sandbox (Ubuntu 24 Linux, Node v22.22.2, npm 10.9.7, PostgreSQL 16 installed with `apt` because Docker was not available). Raw output excerpts are kept in `docs/test-evidence/` (plain .txt copies of the real terminal output; ANSI colours stripped).

## Environment used for the real runs

| Item | Value |
|---|---|
| Database | PostgreSQL 16 (apt package, **not** Docker), database `autohub_test` for tests, `autohub` for dev/seed/smoke checks |
| Node / npm | v22.22.2 / 10.9.7 |
| Vitest | 3.2.7 (backend and frontend) |
| Frontend env | jsdom + React 19 + React Testing Library |


## Commands and results (run from the repo root)

| Command | Result |
|---|---|
| `npm run typecheck` | Passed (backend `tsc --noEmit`, frontend `tsc --noEmit`), no errors |
| `npm run build` | Passed (backend `tsc`, frontend `tsc --noEmit && vite build`; JS bundle 439.77 kB, 135.98 kB gzip) |
| `npm test` | **Backend: 12 files, 190 tests passed. Frontend: 9 files, 90 tests passed.** 0 failed, 0 skipped |
| `npm run test:coverage` | Same pass counts; coverage below; configured thresholds passed |

Tests discovered / passed / failed / skipped: **280 / 280 / 0 / 0** (190 backend + 90 frontend).

### Backend (`backend/`) - per file

| File | Tests | Kind |
|---|---|---|
| tests/integration/vehicles.test.ts | 54 | Supertest + real PostgreSQL |
| tests/integration/inventory.test.ts | 27 | Supertest + real PostgreSQL (incl. concurrency) |
| tests/integration/auth.test.ts | 20 | Supertest + real PostgreSQL |
| tests/integration/app.test.ts | 6 | Supertest + real PostgreSQL (health, 404, headers, CORS, body limit) |
| tests/unit/vehicleSchemas.test.ts | 29 | unit |
| tests/unit/inventoryService.test.ts | 12 | unit, mocked repository |
| tests/unit/authService.test.ts | 9 | unit, mocked repository/hasher |
| tests/unit/vehicleService.test.ts | 9 | unit, mocked repository |
| tests/unit/authMiddleware.test.ts | 8 | unit |
| tests/unit/errorHandler.test.ts | 7 | unit |
| tests/unit/config.test.ts | 5 | unit |
| tests/unit/tokenService.test.ts | 4 | unit |

### Frontend (`frontend/`) - per file

| File | Tests |
|---|---|
| tests/dashboard.test.tsx | 17 |
| tests/auth-forms.test.tsx | 11 |
| tests/vehicle-card.test.tsx | 11 |
| tests/admin.test.tsx | 10 |
| tests/payment.test.tsx | 10 |
| tests/routes.test.tsx | 10 |
| tests/cart.test.tsx | 9 |
| tests/api-layer.test.ts (real axios layer, fake adapter) | 9 |
| tests/header.test.tsx | 3 |

Page-level frontend tests **mock the API module** (`vi.mock('../src/api/endpoints')`), so they verify UI behaviour, not the real HTTP integration. `api-layer.test.ts` covers the real axios code (headers, response unwrapping, 401 handling) with a fake network adapter.

## Coverage (real output: `docs/test-evidence/coverage-run-root.txt`)

| Package | Statements | Branches | Functions | Lines |
|---|---|---|---|---|
| Backend (all of `src/`) | 99.1% | 95.33% | 100% | 99.1% |
| Frontend (all of `src/`) | 98.5% | 90.64% | 91.45% | 98.5% |

Required target (>= 80% for backend services and middleware) is enforced in `backend/vitest.config.ts` via per-glob thresholds, and **passed**: `src/modules/**/*.service.ts` and `src/middleware/**` were each 100% in the report.

**Exclusions (and why):**
- `backend/src/server.ts` - only wires `listen()` and signal handlers; I exercised it manually with `curl` instead of unit tests.
- `backend/src/domain/inventory.ts`, `src/**/*.d.ts` - type-only files, no executable code.
- `frontend/src/main.tsx`, `src/vite-env.d.ts` - DOM bootstrap / declarations only.
- Not excluded but low: `frontend/src/types.ts` shows 0% because it contains only type declarations.

## TDD record (RED -> GREEN), real run summaries

Full extract: `docs/test-evidence/tdd-run-summaries.txt`. Highlights:

| Step | Command output |
|---|---|
| Auth RED | `7 failed (7)` test files, `no tests` ran: every file failed to load because `src/...` modules did not exist |
| Auth GREEN attempt 1 | `5 failed \| 28 passed` - `Prisma.PrismaClientKnownRequestError` undefined (stale Prisma client) |
| Auth GREEN attempt 2 | `20 failed \| 39 passed` - Postgres `name` type (`current_database()`) not deserialisable by the pg adapter |
| Auth GREEN | `7 passed (7)` files, `59 passed (59)` tests |
| Vehicles RED | `3 failed \| 7 passed` files; `53 failed \| 60 passed` tests |
| Vehicles GREEN attempt 1 | `1 failed \| 150 passed` - real bug: LIKE wildcards (`%`) not escaped in search |
| Vehicles GREEN | `10 passed (10)`, `151 passed (151)` |
| Inventory RED | `2 failed \| 10 passed` files; `25 failed \| 153 passed` tests |
| Inventory GREEN | `12 passed (12)`, `190 passed (190)`; concurrency file re-run 5x: `27 passed (27)` every time |
| Frontend RED | `6 failed (6)` files, `no tests` (components did not exist) |
| Frontend GREEN attempt 1 | all failed: duplicate React copies (19 hoisted at root vs 18 in frontend) |
| Frontend GREEN | `7 passed`, `65 passed` |
| Cart/payment RED | `8 failed \| 1 passed` files (cart modules missing) |
| Cart/payment GREEN attempt 1 | `8 failed \| 82 passed` - race: cart loaded in an effect, so /payment redirected to /cart |
| Cart/payment GREEN | `9 passed (9)` files, `90 passed (90)` tests |

Honest note: in the vehicles RED run, a few tests (for example "PUT ... 404 when the vehicle does not exist", "401 without a token" on not-yet-existing routes) **passed for the wrong reason** because the generic 404/401 handlers produced the expected status. They were still useful once the routes existed, but the RED run is not a pure "all new tests fail".

## Manual / smoke verification actually performed (not automated tests)

- `npm run db:seed` run twice on a real PostgreSQL 16 DB: first run inserted 12 vehicles and an admin with a `$2b$10$` bcrypt hash; second run skipped vehicles (idempotent).
- Compiled backend (`node dist/server.js`) and `npm run dev:backend` / `npm run dev:frontend` started and answered `curl`: health OK, login OK, stats, search, `401` without token, CORS preflight from `http://localhost:5173` allowed, registering with `"role":"ADMIN"` produced a `CUSTOMER`, purchase decremented stock, over-purchase returned `409`, a customer creating a vehicle returned `403`. Vite served the HTML page with the AutoHub title.
- `prisma generate` verified to work without a `.env` file (fresh-clone scenario).

## Known limitations (be aware before relying on this)
1. Access tokens are stateless: a deleted user's token is rejected on `/api/auth/me` but other routes trust the signed token until it expires (default 1h). Documented in README Security.
2. The Purchase model records purchases but there is no UI to list purchase history.
3. **Cart and payment are client-side/demo.** The cart does not reserve stock on the server, so someone else can buy a car while it sits in your cart (the payment step handles that and says so). Card details are validated in the browser only and are never sent or stored; there is no real payment provider. Paying for several cars makes one atomic purchase call per car, not one transaction for the whole cart, so a later car can fail after an earlier one succeeded (handled and shown, but not rolled back).
