// Integration configuration.
//
// Secrets are read from the environment only - never commit keys to this repo.
// See integrations/README.md for the full variable list.

const ROLES = {
  DASHBOARD: "dashboard", // Claude - operator-facing surface
  BOTS: "bots",           // Grok - bot fleet
  OPS: "ops",             // Hermes - operational automation
};

// A provider is live only when its feature flag is on AND its key is present.
// Absent config means disabled, never a crash at import time.
function providerConfig(env = process.env) {
  return {
    [ROLES.DASHBOARD]: {
      name: "claude",
      enabled: env.CLAUDE_ENABLED !== "false",
      apiKey: env.ANTHROPIC_API_KEY || null,
      model: env.CLAUDE_MODEL || "claude-opus-5",
    },
    [ROLES.BOTS]: {
      name: "grok",
      // Off by default: xAI is a paid API and no key is provisioned.
      enabled: env.GROK_ENABLED === "true",
      apiKey: env.XAI_API_KEY || null,
      model: env.GROK_MODEL || null,
    },
    [ROLES.OPS]: {
      name: "hermes",
      // Off by default: requires a reachable Hermes Agent install.
      enabled: env.HERMES_ENABLED === "true",
      baseUrl: env.HERMES_BASE_URL || null,
    },
  };
}

module.exports = { ROLES, providerConfig };
