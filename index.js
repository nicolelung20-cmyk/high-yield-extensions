import { Hono } from "hono";
import { cors } from "hono/cors";
import { HTTPException } from "hono/http-exception";
import { serve } from "@hono/node-server";
import { withSupabase } from "@supabase/server/adapters/hono";
import { AuthError } from "@supabase/server";

const PORT = process.env.PORT || 3000;

// True once SUPABASE_URL and at least one key are present. Routes stay
// mounted either way — a request just gets a clear 500 instead of the
// process crashing at boot when the project isn't configured yet.
const supabaseConfigured = Boolean(
  process.env.SUPABASE_URL &&
    (process.env.SUPABASE_PUBLISHABLE_KEYS ||
      process.env.SUPABASE_PUBLISHABLE_KEY ||
      process.env.SUPABASE_SECRET_KEYS ||
      process.env.SUPABASE_SECRET_KEY)
);

const app = new Hono();

app.use("*", cors());

app.onError((err, c) => {
  if (err instanceof HTTPException && err.cause instanceof AuthError) {
    const authError = err.cause;
    return c.json({ error: authError.message, code: authError.code }, authError.status);
  }
  if (err instanceof HTTPException) {
    return err.getResponse();
  }
  console.error(err);
  return c.json({ error: "internal server error" }, 500);
});

// Public — no auth, no Supabase call. Used for uptime checks (Railway, etc.)
// and to report at a glance whether the Supabase env vars are actually set.
app.get("/health", (c) =>
  c.json({
    status: "ok",
    service: "high-yield-extensions",
    supabaseConfigured,
  })
);

app.get("/", (c) =>
  c.text(
    "high-yield-extensions: browser extension boilerplate collection.\n" +
      "See README.md and the extension-* branches for individual project sources.\n"
  )
);

// Publishable-key route: the browser extensions call this to check whether a
// license key is active before unlocking a paid feature. Anonymous (RLS
// still applies), gated to known clients via the publishable/apikey header.
// Expects a `licenses` table: (key text primary key, extension_id text,
// active boolean, expires_at timestamptz null).
app.get("/api/license/verify", withSupabase({ auth: "publishable" }), async (c) => {
  const key = c.req.query("key");
  const extensionId = c.req.query("extension_id");
  if (!key || !extensionId) {
    return c.json({ error: "key and extension_id are required" }, 400);
  }

  const { supabase } = c.var.supabaseContext;
  const { data, error } = await supabase
    .from("licenses")
    .select("active, expires_at")
    .eq("key", key)
    .eq("extension_id", extensionId)
    .maybeSingle();

  if (error) return c.json({ error: error.message }, 500);
  if (!data) return c.json({ valid: false, reason: "not_found" });

  const expired = data.expires_at ? new Date(data.expires_at) < new Date() : false;
  return c.json({ valid: Boolean(data.active) && !expired, reason: expired ? "expired" : null });
});

// User-authenticated route: the signed-in user's own profile, RLS-scoped so
// they can only ever see their own row. Expects a `profiles` table keyed by
// auth user id.
app.get("/api/profile", withSupabase({ auth: "user" }), async (c) => {
  const { supabase, userClaims } = c.var.supabaseContext;
  const { data, error } = await supabase
    .from("profiles")
    .select()
    .eq("id", userClaims.id)
    .maybeSingle();

  if (error) return c.json({ error: error.message }, 500);
  return c.json(data ?? {});
});

// Secret-key admin route: services (not end users) issue a new license.
// Uses supabaseAdmin, which bypasses RLS, so this must never be exposed to
// the extension frontends directly — only server-to-server with the secret key.
app.post("/admin/licenses", withSupabase({ auth: "secret" }), async (c) => {
  const body = await c.req.json().catch(() => null);
  if (!body?.key || !body?.extension_id) {
    return c.json({ error: "key and extension_id are required" }, 400);
  }

  const { supabaseAdmin } = c.var.supabaseContext;
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

serve({ fetch: app.fetch, port: PORT }, (info) => {
  console.log(`Server listening on port ${info.port}`);
  if (!supabaseConfigured) {
    console.warn(
      "SUPABASE_URL / SUPABASE_PUBLISHABLE_KEY(S) / SUPABASE_SECRET_KEY(S) are not set — " +
        "/health will report supabaseConfigured:false and the /api and /admin routes will 500. " +
        "See .env.example."
    );
  }
});
