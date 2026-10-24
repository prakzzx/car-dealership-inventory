# PROMPTS.md

This file records the prompts I (the student) sent to the AI assistant while building this project.
Responses are **not** summarised or invented here. See "How to attach the full raw chat" at the bottom.

Tool used: Claude (Anthropic), via the claude.ai chat interface.

---

## Prompt 1 (verbatim, first message)

````text
You are a senior full-stack engineer, architect, QA engineer and UI/UX designer. Build the complete "Car Dealership Inventory System" TDD kata below as a real, runnable project I can download as a ZIP, extract on Windows, open in VS Code and run locally. Create actual files with full implementations, not snippets, pseudocode or tutorials.

## Honesty rules (highest priority)
- Never claim a file was created, a test passed, a coverage number was reached, a screenshot was captured or a feature was verified unless it actually happened in your environment. Report real command output.
- Never fabricate Git history, chat logs or test results. If something cannot be done in your environment, say exactly what and why, and give me the commands to do it locally.
- If you run low on capacity, stop adding features, fix what exists, package a working ZIP of what is done, and list exactly what is incomplete.

## Fixed tech stack
- Monorepo with root npm workspaces: /backend, /frontend, /docs.
- Backend: Node.js, TypeScript (strict, avoid `any`), Express, Prisma ORM, PostgreSQL, Zod validation, jsonwebtoken, bcryptjs, helmet, cors, express-rate-limit, request logging (morgan or pino-http).
- Database: PostgreSQL with Prisma migrations, persistent Docker volume, and docker-compose.yml for local Postgres (service name, user, db name and credentials consistent across compose, .env.example, Prisma and README). Use Prisma Decimal for price. Add indexes on make, model, category, price. No in-memory DB as the real database; tests use a separate isolated Postgres test database and must exercise real DB behaviour, with safe reset logic that refuses to run against a non-test database.
- If Docker is not available in your environment, try installing PostgreSQL directly in your sandbox to run the real test suite. If that is impossible, say so clearly and do not substitute SQLite silently.
- Frontend: React + TypeScript (Vite), HTML5, CSS3, Tailwind CSS v3 (pin the version so the config is correct), React Router, Axios, Lucide React, React Hook Form + Zod.
- Tests: Vitest for backend and frontend, Supertest for API integration, React Testing Library, @vitest/coverage-v8.

## Auth
- POST /api/auth/register (name, email, password): validate, enforce password policy, bcrypt hash, reject duplicate email (409), role is always CUSTOMER, never accept a role from the client, never return hashes. Return a token for automatic login.
- POST /api/auth/login: signed JWT with configurable expiry (env var). Identical generic 401 for unknown email and wrong password.
- Roles: CUSTOMER, ADMIN. Middleware: authenticate, requireRole. Backend must enforce authorization independently of frontend visibility.
- Token strategy: Authorization Bearer token kept in the AuthContext and localStorage. Document the XSS trade-offs of browser storage in the README Security section (do not use cookies).
- JWT_SECRET and other secrets only via environment variables; never commit real secrets.

## Vehicle API (all protected by JWT)
Fields: id, make, model, category, price (Decimal), quantity (int >= 0), optional year, description, imageUrl, createdAt, updatedAt.
- POST /api/vehicles: ADMIN only, validated, returns 201.
- GET /api/vehicles: authenticated users, paginated and sortable, with pagination metadata. By default only vehicles with stock > 0; support an documented `availability` filter to include out-of-stock.
- GET /api/vehicles/search: make, model, category (case-insensitive partial), minPrice, maxPrice, availability, year, plus page/limit/sort. Filters combine; validate all params. Register it BEFORE /:id routes.
- GET /api/vehicles/:id: single vehicle.
- PUT /api/vehicles/:id: ADMIN only, validated, 404 if missing.
- DELETE /api/vehicles/:id: ADMIN only, 204 on success, 404 if missing.
- GET /api/vehicles/stats (or equivalent, before /:id): total vehicles, total stock, category counts, for the dashboard summary. No hardcoded stats on the frontend.

## Inventory
- POST /api/vehicles/:id/purchase: any authenticated user; quantity defaults to 1; reject < 1; 409 for insufficient stock; stock never negative. Implement with an atomic conditional update (e.g. updateMany where quantity >= requested, then check count) inside a transaction. NO read-then-write. Return updated inventory and a purchase confirmation. Optionally record a Purchase model row for auditability.
- POST /api/vehicles/:id/restock: ADMIN only, positive integer quantity, transactional, 404 for missing.

## API quality
- Layered architecture: routes -> controllers (thin) -> services (business logic) -> repositories (Prisma). Dependency injection of repositories into services. SOLID, clear names, comments that explain WHY.
- Consistent JSON response and error shape; centralized error middleware with custom error classes; Prisma error mapping; no stack traces or SQL details in production responses.
- Correct codes: 200, 201, 204, 400, 401, 403, 404, 409, 500.
- GET /api/health, env-based CORS, request body size limit, security headers, rate limiting on auth routes.

## Frontend
Pages: Login, Register, Dashboard/inventory, search and filter UI, vehicle details (modal or page), admin management, add-vehicle form, edit-vehicle form, 404.
- Responsive header or sidebar, branding "AutoHub", summary cards from the real API, vehicle cards (make, model, category, year, price, stock), search bar, category filter, price range, sort, pagination, loading skeletons, empty states, error messages, toast notifications.
- Purchase: requires auth, quantity selector, button DISABLED when stock is 0, success confirmation, UI refresh after purchase, graceful handling of insufficient-stock and concurrent-change errors.
- Admin only (hidden from customers AND guarded by admin routes): add, edit, delete (with confirmation dialog), restock.
- Protected routes, role-aware navigation, logout, form validation with helpful messages.
- Polished modern design: cohesive palette, good typography, cards with subtle shadows, hover and visible focus states, semantic HTML, labelled inputs, keyboard-friendly dialogs, good contrast. Images use public URLs with a local fallback placeholder so nothing breaks offline.

## TDD process (mandatory)
Work strictly Red -> Green -> Refactor, backend first:
1. Write a failing test, run it, record the actual failure.
2. Implement the minimum code, run it, record the actual pass.
3. Refactor with tests green.
Cover at least: registration (success, duplicate, invalid email, weak password, hashing, no admin via public registration), login (success, wrong password, unknown email), missing/invalid/expired token, customer blocked from admin operations, vehicle create/list/pagination/sorting/search by make/model/category/price range/combined filters/invalid filters/update/delete/404s, purchase (success, multiple units, zero stock, more than stock, invalid quantity), restock (admin success, customer rejected, invalid quantity), concurrent purchases never oversell or go negative, quantity persisted in PostgreSQL. Include service-level unit tests with mocked repositories plus Supertest integration tests on the real test DB.
Frontend tests: login and register validation, inventory rendering, search/filter behaviour, Purchase disabled at zero stock, loading and error states, admin controls hidden from customers, protected-route behaviour.
Set a coverage target of 80% for backend business logic (services, middleware). Report real coverage numbers and explain any exclusions.

## Git and AI co-authorship
- Initialise Git and make REAL commits in the real development order, using Conventional Commits (test: ..., feat: ..., refactor: ..., docs: ...), with failing-test commits before their implementation commits. Use a placeholder git identity (user.name "Your Name", user.email "you@example.com") that I will replace for my own later commits. Never fabricate or backdate.
- Every commit that involved AI must end with two blank lines (a blank line before the trailer) and exactly this trailer format required by the task:

Co-authored-by: Claude <AI@users.noreply.github.com>

- Commit bodies must honestly describe what AI generated and must not claim manual verification that did not happen.
- Include the .git directory in the final ZIP so the history carries over. Exclude node_modules, .env files, logs, coverage output and build artifacts.
- At the end give me the real `git log --oneline`.

## Documentation deliverables
1. README.md with: overview, features, tech stack, architecture, directory tree, Windows prerequisites (Node LTS, Git, Docker Desktop), numbered PowerShell setup steps with the directory for each command, env configuration, Docker Postgres setup, migrations, seeding, admin login, running backend and frontend, API table with example requests/responses, auth/authorization explanation, test commands, coverage instructions, TDD workflow and commit explanation, screenshots section, troubleshooting, security considerations (including JWT storage trade-offs), "My AI Usage", and future improvements.
2. "My AI Usage" section: tool used (Claude), tasks it was used for (scaffolding, generating tests and boilerplate, debugging), how outputs were verified, what needed correction, benefits and limits, how it helped TDD. Leave a clearly marked "My own reflection" paragraph for me to write myself. Do not invent manual changes I did not make.
3. PROMPTS.md in the root: record this prompt verbatim as the first entry. Do not invent responses or summaries. Add a clear section telling me how to paste my full raw chat or the public share link before submission.
4. docs/TEST_REPORT.md with the real outputs: commands, tests discovered/passed/failed/skipped, coverage, known limitations. If tests could not run, say so explicitly.
5. Screenshots in docs/screenshots only if you can actually run and capture the app; otherwise leave placeholders and say so.
6. .env.example at root, backend and frontend with safe placeholders (DATABASE_URL, JWT_SECRET, JWT_EXPIRES_IN, PORT, CLIENT_URL, VITE_API_BASE_URL, ADMIN_EMAIL, ADMIN_PASSWORD, TEST_DATABASE_URL), consistent with the code. .gitignore for secrets, node_modules, builds, coverage and logs.
7. A final checklist: how to install, run, test and verify each major feature.

## Seed data
- Seed ~12 sample vehicles. Create the admin from ADMIN_EMAIL/ADMIN_PASSWORD env vars, hashed before saving; document development-only defaults in .env.example. No hardcoded production admin password.

## Root scripts (every documented command must exist and work)
npm run dev, dev:backend, dev:frontend, test, test:coverage, db:up, db:down, db:migrate, db:seed, build, typecheck.

## Execution order
1. Architecture, schema, API contracts, short plan.
2. Project structure, scripts, env, Docker Compose, Prisma.
3. Failing backend tests, then implementation: auth.
4. Vehicle CRUD, search, authorization (tests first).
5. Purchase, restock, concurrency (tests first).
6. React frontend connected to the real API.
7. Frontend tests.
8. Typecheck, frontend build, full test run, coverage, fix failures.
9. README, PROMPTS.md, TEST_REPORT.md, screenshots if possible.
10. Create the real ZIP named car-dealership-inventory.zip, list its contents, verify it has all source files, no secrets and no node_modules, and give me a direct download link.
Do not stop after the plan; continue through delivery.

## Final response must include
1. Download link to the ZIP.
2. The folder structure.
3. How to extract and open in VS Code.
4. Exact PowerShell commands, with the directory for each, to install and run everything.
5. Local frontend and backend URLs.
6. Admin account instructions.
7. Commands for all tests and coverage.
8. Actual test and coverage results, or an explicit statement that they were not verified.
9. Locations of README.md, PROMPTS.md and TEST_REPORT.md.
10. The real git log and a list of any incomplete requirements or limitations.
````

---

## Prompt 2 (verbatim, follow-up message sent in the same chat)

````text
make sure nothing is pushed to github and you are only generating the zip file that i can download and run on vscode.
````

---

## Prompt 3 and later (verbatim)

The only further messages I sent in the same chat were the single word below (sent to let the assistant continue working):

````text
Continue
````

---

## How to attach the full raw chat (DO THIS BEFORE SUBMISSION)

This file only holds the prompts. The assistant's replies and the full back-and-forth are **not** included and must not be invented. Before you submit:

1. Open the chat in claude.ai.
2. Either:
   - **Share link:** use the chat's "Share" option, create a public link, and paste it below; or
   - **Raw transcript:** select the whole conversation, copy it, and paste it into the section below (or save it as `docs/CHAT_TRANSCRIPT.md` and link to it from here).
3. Re-read it once to make sure nothing private (keys, passwords) is in it.
4. Commit it with your own identity, e.g. `git commit -m "docs: add full AI chat transcript"` (this commit has no AI co-author trailer because you made it yourself).

**Public share link:** _(paste here)_

**Full raw chat:** _(paste here, or link to docs/CHAT_TRANSCRIPT.md)_
