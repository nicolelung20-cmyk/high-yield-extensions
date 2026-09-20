# Integrations

Three providers behind one registry. Callers address a **role**, never a vendor,
so a backend can be swapped or switched on without touching call sites.

| Role        | Provider | Purpose              | Status |
|-------------|----------|----------------------|--------|
| `dashboard` | Claude   | Operator-facing surface | **Live** (needs `ANTHROPIC_API_KEY`) |
| `bots`      | Grok     | Bot fleet            | Stub - disabled by policy |
| `ops`       | Hermes   | Operational automation | Stub - not installable here |

## Usage

```js
const { createRegistry, ROLES } = require("./integrations/registry");
const registry = createRegistry();

registry.health();                    // status of all three, ready or not
await registry.send(ROLES.DASHBOARD, { prompt: "..." });
```

Health is also served at `GET /integrations/health`.

Every adapter returns `{ provider, text, raw }` or throws. A provider that
isn't ready throws `ProviderDisabledError` with a `reason` - it never silently
pretends to work.

## Environment variables

| Variable | Role | Notes |
|---|---|---|
| `ANTHROPIC_API_KEY` | dashboard | Required for Claude |
| `CLAUDE_MODEL` | dashboard | Defaults to `claude-opus-5` |
| `CLAUDE_ENABLED` | dashboard | Set `false` to disable |
| `XAI_API_KEY` | bots | Not provisioned |
| `GROK_ENABLED` | bots | Must be `true` to attempt |
| `HERMES_BASE_URL` | ops | Hermes OpenAI-compatible endpoint |
| `HERMES_ENABLED` | ops | Must be `true` to attempt |

Keys come from the environment only. Never commit them.

## Why Grok and Hermes are stubs

**Grok** - the xAI API is paid, and this venture's standing rule is no paid
services. The adapter is wired into the registry and flag-gated; lifting the
rule and supplying `XAI_API_KEY` is all that stands between it and a real
implementation.

**Hermes** - Hermes Agent (Nous Research, MIT) cannot be installed from the
Claude Code web container. The egress policy returns 403 on CONNECT for both
`hermes-agent.nousresearch.com` and `astral.sh`, and the installer needs
`astral.sh` to fetch `uv`. Install it on a host with unrestricted egress:

```sh
curl -fsSL https://hermes-agent.nousresearch.com/install.sh | bash
```

Then set `HERMES_BASE_URL` to its API server and implement `send()`.

## Finishing a stub

Both stubs currently return a disabled adapter even once flagged on, so they
fail loudly rather than appearing connected. To complete one, replace that
final `disabledAdapter(...)` with a real client call that returns the same
`{ provider, text, raw }` shape. The registry and health view need no changes.
