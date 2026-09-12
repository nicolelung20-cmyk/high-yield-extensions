# Deployment status

## Live now (free) -- Supabase Edge Function

The backend in `index.js` is also deployed as a Supabase Edge Function, so it
runs on Supabase's free tier instead of needing a billable Render service:

    https://kqidlsjjsocnnqfftynj.supabase.co/functions/v1/hye

Source: `supabase/functions/hye/index.ts` (a direct port of `index.js` --
same 4 routes, same auth model: publishable key for `/api/license/verify`,
user JWT for `/api/profile`, the service-role/secret key as a bearer
credential for `/admin/licenses`). No `.env` needed there -- Supabase injects
SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY into every Edge
Function automatically.

Verified 2026-09-12: `/health` 200s, `/api/license/verify` 200s with a
correct not_found for an unknown key, `/api/profile` and `/admin/licenses`
both 401 without credentials, as expected.

To redeploy after editing `supabase/functions/hye/index.ts`:

    supabase functions deploy hye --project-ref kqidlsjjsocnnqfftynj --no-verify-jwt

## Still open

- The PR with this repo's Node/Hono backend (`index.js`) is open on GitHub
  but not pushed from this branch -- run `git push origin main` (or your PR
  branch) yourself to land it; pushing isn't done automatically.
- Render hosting for the same backend (`index.js` run directly, not the Edge
  Function) is still unprovisioned and would cost money -- only start that if
  you want a second, non-Supabase deployment option. The Edge Function above
  already gives you a free, live backend without it.
