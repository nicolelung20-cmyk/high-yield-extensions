// Grok adapter - the bot fleet.
//
// STUB. Not wired to xAI. The venture's standing rule is no paid services, and
// the xAI API is paid, so this stays disabled until that rule is lifted and a
// key is provisioned by hand (never by an automated account signup).
//
// To finish this adapter:
//   1. Set XAI_API_KEY and GROK_ENABLED=true.
//   2. Replace the disabled body below with a real client call, keeping the
//      same { provider, text, raw } return shape the registry expects.

const { ROLES } = require("../config");
const { disabledAdapter } = require("./base");

const NAME = "grok";

function createGrokAdapter(cfg) {
  if (!cfg.enabled) {
    return disabledAdapter({
      name: NAME,
      role: ROLES.BOTS,
      reason: "GROK_ENABLED is not true (xAI is a paid API; disabled by policy)",
    });
  }
  if (!cfg.apiKey) {
    return disabledAdapter({
      name: NAME,
      role: ROLES.BOTS,
      reason: "XAI_API_KEY is not set",
    });
  }

  // Reached only once the flag and key are both present. Left unimplemented on
  // purpose rather than guessed at - it fails loudly instead of silently
  // pretending the bot fleet is connected.
  return disabledAdapter({
    name: NAME,
    role: ROLES.BOTS,
    reason: "adapter not implemented - see integrations/README.md",
  });
}

module.exports = { createGrokAdapter };
