// Edge-Function port of index.js (the Hono/Node server), so this backend can
// run on Supabase's free Edge Functions tier instead of a billable Render
// service. Same 4 routes, same auth model, same response shapes as the
// original -- this is a runtime port, not a rewrite.
//
// Deployed live at:
//   https://kqidlsjjsocnnqfftynj.supabase.co/functions/v1/hye
//
// verify_jwt is OFF for this function (set at deploy time) because only one
// of the three Supabase-backed routes (/api/profile) needs a real end-user
// JWT; the other two use different credentials (the publishable/anon key for
// license checks, the service-role/secret key for the admin route). Each
// route below enforces its own auth instead, mirroring the three `auth:`
// modes ("publishable" / "user" / "secret") the original index.js used.
//
// Built-in secrets (no .env needed here -- Supabase injects these into every
// Edge Function automatically):
//   SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
//
// To redeploy after editing this file:
//   supabase functions deploy hye --project-ref kqidlsjjsocnnqfftynj --no-verify-jwt

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { Hono } from "npm:hono@4.6.14";
import { cors } from "npm:hono@4.6.14/cors";
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabaseConfigured = Boolean(SUPABASE_URL && ANON_KEY && SERVICE_ROLE_KEY);

// Confirmed by testing against the deployed function: the edge runtime
// strips "/functions/v1" but keeps the function's own slug ("/hye") in
// front of the path this code sees. So Hono needs "/hye" as its base path;
// the routes below then keep their original sub-paths unchanged.
const app = new Hono().basePath("/hye");

app.use("*", cors());

app.get("/health", (c) =>
  c.json({
    status: "ok",
    service: "high-yield-extensions",
    runtime: "supabase-edge-function",
    supabaseConfigured,
  })
);

app.get("/", (c) =>
  c.text(
    "high-yield-extensions: browser extension boilerplate collection.\n" +
      "See README.md and the extension-* branches for individual project sources.\n"
  )
);

// Publishable-key route -- anon, RLS still applies (licenses has none; all
// access goes through the verify_license() SECURITY DEFINER RPC). The Edge
// Function gateway itself already requires a valid apikey header to reach
// this function at all (verify_jwt is off, but apikey is still mandatory),
// so no extra check is needed here -- this matches the original's
// `auth: "publishable"` gate.
app.get("/api/license/verify", async (c) => {
  const key = c.req.query("key");
  const extensionId = c.req.query("extension_id");
  if (!key || !extensionId) {
    return c.json({ error: "key and extension_id are required" }, 400);
  }

  const supabase = createClient(SUPABASE_URL, ANON_KEY);
  const { data, error } = await supabase
    .rpc("verify_license", { p_key: key, p_extension_id: extensionId })
    .maybeSingle();

  if (error) return c.json({ error: error.message }, 500);
  if (!data) return c.json({ valid: false, reason: "not_found" });

  const expired = data.expires_at ? new Date(data.expires_at) < new Date() : false;
  return c.json({ valid: Boolean(data.active) && !expired, reason: expired ? "expired" : null });
});

// User-authenticated route -- needs a real end-user JWT (not just the anon
// key), since verify_jwt is off at the function level. Mirrors the
// original's `auth: "user"` mode: reject with 401 if there's no bearer
// token, otherwise create a client scoped to that JWT so RLS applies
// exactly as it would for a normal authenticated request.
app.get("/api/profile", async (c) => {
  const authHeader = c.req.header("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return c.json({ error: "missing or invalid Authorization header" }, 401);
  }

  const supabase = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData?.user) {
    return c.json({ error: "invalid or expired token" }, 401);
  }

  const { data, error } = await supabase
    .from("profiles")
    .select()
    .eq("id", userData.user.id)
    .maybeSingle();

  if (error) return c.json({ error: error.message }, 500);
  return c.json(data ?? {});
});

// Secret-key admin route -- server-to-server only. Mirrors the original's
// `auth: "secret"` mode: the caller must present the project's own
// service-role/secret key as its bearer credential (NOT a user JWT).
// This must never be called from the extension frontends directly.
app.post("/admin/licenses", async (c) => {
  const authHeader = c.req.header("Authorization");
  const presented = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!presented || presented !== SERVICE_ROLE_KEY) {
    return c.json({ error: "unauthorized" }, 401);
  }

  const body = await c.req.json().catch(() => null);
  if (!body?.key || !body?.extension_id) {
    return c.json({ error: "key and extension_id are required" }, 400);
  }

  const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
  const { data, error } = await supabaseAdmin
    .from("licenses")
    .insert({
      key: body.key,
      extension_id: body.extension_id,
      active: true,
      expires_at: body.expires_at ?? null,
    })
    .select()
    .maybeSingle();

  if (error) return c.json({ error: error.message }, 500);
  return c.json(data, 201);
});

Deno.serve(app.fetch);
