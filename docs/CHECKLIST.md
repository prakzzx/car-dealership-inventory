# Final checklist: install, run, test, verify

Run PowerShell commands from the folder shown in brackets. `<repo>` = the extracted `car-dealership-inventory` folder.

## A. Install
- [ ] Node.js LTS (>= 20), Git and Docker Desktop installed; Docker Desktop is **running**
- [ ] `[<repo>]` `npm install` completes (also runs `prisma generate` automatically)
- [ ] `[<repo>]` `Copy-Item backend\.env.example backend\.env` and `Copy-Item frontend\.env.example frontend\.env`

## B. Database
- [ ] `[<repo>]` `npm run db:up` then `docker compose ps` shows `autohub-postgres` as `healthy`
- [ ] `[<repo>]` `npm run db:migrate` applies `20261024000000_init`
- [ ] `[<repo>\backend]` `npx prisma migrate status` says the database schema is up to date
- [ ] `[<repo>]` `npm run db:seed` prints "Admin ready" and "Inserted 12 sample vehicles"

## C. Run
- [ ] `[<repo>]` `npm run dev` (or two terminals: `npm run dev:backend`, `npm run dev:frontend`)
- [ ] http://localhost:4000/api/health returns `{"success":true,"data":{"status":"ok","database":"up",...}}`
- [ ] http://localhost:5173 shows the AutoHub login page

## D. Test
- [ ] `[<repo>]` `npm run typecheck` - no errors
- [ ] `[<repo>]` `npm test` - backend 190 + frontend 90 passing (needs the Docker DB up and `backend\.env` present)
- [ ] `[<repo>]` `npm run test:coverage` - coverage tables print; backend thresholds pass
- [ ] `[<repo>]` `npm run build` - backend and frontend build

## E. Verified each feature by hand
| Feature | How to verify |
|---|---|
| Registration | /register: weak password shows messages; valid signup logs you in as a Customer |
| No admin via signup | Registering never gives an admin (role is ignored); header shows "Customer" |
| Login errors | Wrong password and unknown email show the same "Invalid email or password" |
| Admin login | Log in with `ADMIN_EMAIL` / `ADMIN_PASSWORD` from `backend\.env`; header shows "Manage inventory" |
| Inventory + stats | Dashboard cards show numbers that change after a purchase or restock |
| Search/filter/sort | Search `toy`; choose category; set price range; change sort; paginate (12 per page) |
| Sold-out handling | Tick "Include sold out"; the Silverado card shows "Sold out" and a disabled Purchase button |
| Cart | Purchase on a card -> toast "Added N x ... to your cart", header cart badge counts units, card shows "N in your cart" |
| Pay bill | Cart icon -> Cart page shows car details and total -> **Pay bill** -> Payment page (demo card `4242 4242 4242 4242`, any future expiry, any 3-digit CVC) |
| Stock reaches 0 | Buy the last units and pay -> inventory shows "Sold out", quantity box shows 0 and Purchase is disabled |
| Insufficient stock | Put the last unit in your cart in two browsers, pay in one, then pay in the other: it shows "Only N unit(s) available" and keeps that item in the cart |
| Customer blocked | As customer, open /admin -> redirected to inventory; `curl` POST /api/vehicles with a customer token -> 403 |
| Admin add/edit | Manage inventory -> Add vehicle (validation messages) -> Edit |
| Delete confirmation | Trash icon opens a dialog; Cancel does nothing; Delete removes it |
| Restock | Box icon -> add units -> stock updates |
| Keyboard | Tab through a dialog (focus stays inside), Esc closes and focus returns to the button |
| 404 | http://localhost:5173/nope shows "Page not found" |
| Logout | "Log out" returns to login; refresh does not restore the session |


