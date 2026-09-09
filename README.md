# high-yield-extensions

5 high-revenue browser extensions with complete boilerplate code. See the
`extension-*` branches for each extension's own source.

## Shared backend

This branch adds a small shared backend (`index.js`, Hono + `@supabase/server`)
that the extensions can call for license checks and per-user data, backed by
a Supabase project.

Routes:

- `GET /health` — public. Reports `{ status, supabaseConfigured }`.
- `GET /api/license/verify?key=&extension_id=` — publishable-key route the
  extensions call to check whether a license key is active. Expects a
  `licenses` table: `key text primary key, extension_id text, active boolean,
  expires_at timestamptz null`.
- `GET /api/profile` — user-authenticated (JWT), RLS-scoped to the caller.
  Expects a `profiles` table keyed by the Supabase auth user id.
- `POST /admin/licenses` — secret-key route (server-to-server only, never
  exposed to the extension frontends) for issuing new license keys.

### Setup

```bash
npm install
cp .env.example .env   # fill in your Supabase project URL + keys
npm start
```

Without a `.env`, the server still starts and `/health` works — the
Supabase-backed routes just return a clear "not configured" error instead of
crashing, until you create a Supabase project and connect it.
