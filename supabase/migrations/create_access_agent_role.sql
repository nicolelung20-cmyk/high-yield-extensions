-- Applied 2026-09-29 to project kqidlsjjsocnnqfftynj as migration
-- `create_access_agent_role`. Recorded here so the repo matches the database.
--
-- Least-privilege `access_agent` role for automated agent reads.
--
-- Deliberately does NOT touch `licenses`, which migrations 20260916183037 /
-- 183048 / 183057 sealed to service_role only. Verified after apply: licenses
-- still grants to service_role alone and its deny policy still evaluates
-- false.
--
-- Cross-owner reads are intentional (using (true)): this is a system-wide
-- agent, authorized explicitly rather than arrived at by default.

-- 1. The role: no login, no RLS bypass. NOLOGIN makes this a permission
--    bundle rather than a connectable account, so no password exists to leak.
create role access_agent nologin;

-- 2. Schema visibility only. No CREATE.
grant usage on schema public to access_agent;

-- 3. Read-only. No INSERT/UPDATE/DELETE anywhere, so the agent cannot corrupt
--    the elevat_transaction_requests approval workflow.
grant select on
  public.elevat_bots,
  public.elevat_leads,
  public.elevat_wallets,
  public.elevat_transaction_requests,
  public.elevat_security_alerts,
  public.elevat_audit_events
to access_agent;

-- 4. RLS still applies to this role (no BYPASSRLS), so grants alone read
--    nothing. These policies scope what it may see: all owners.
create policy elevat_bots_agent_read on public.elevat_bots
  for select to access_agent using (true);

create policy elevat_leads_agent_read on public.elevat_leads
  for select to access_agent using (true);

create policy elevat_wallets_agent_read on public.elevat_wallets
  for select to access_agent using (true);

create policy elevat_tx_agent_read on public.elevat_transaction_requests
  for select to access_agent using (true);

create policy elevat_alerts_agent_read on public.elevat_security_alerts
  for select to access_agent using (true);

create policy elevat_audit_agent_read on public.elevat_audit_events
  for select to access_agent using (true);

-- NOTE: if the agent reaches the DB through PostgREST rather than a direct
-- connection, the authenticator must be able to assume this role:
--   grant access_agent to authenticator;
-- Not applied, because the consumer is not yet known.
