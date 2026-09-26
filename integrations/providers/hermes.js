// Hermes adapter - operations.
//
// STUB. Hermes Agent (Nous Research, MIT) is not installed and cannot be
// installed from the Claude Code web container: the egress policy returns 403
// on CONNECT for both hermes-agent.nousresearch.com and astral.sh, and the
// installer needs astral.sh to fetch uv.
//
// To finish this adapter:
//   1. Install Hermes somewhere with unrestricted egress (your Mac, or a host
//      that can reach those domains):
//        curl -fsSL https://hermes-agent.nousresearch.com/install.sh | bash
//   2. Expose its OpenAI-compatible API server and set HERMES_BASE_URL.
//   3. Set HERMES_ENABLED=true and implement send() against that endpoint,
//      returning the same { provider, text, raw } shape as the other adapters.

const { ROLES } = require("../config");
const { disabledAdapter } = require("./base");

const NAME = "hermes";

function createHermesAdapter(cfg) {
  if (!cfg.enabled) {
    return disabledAdapter({
      name: NAME,
      role: ROLES.OPS,
      reason: "HERMES_ENABLED is not true (no reachable Hermes install)",
    });
  }
  if (!cfg.baseUrl) {
    return disabledAdapter({
      name: NAME,
      role: ROLES.OPS,
      reason: "HERMES_BASE_URL is not set",
    });
  }

  return disabledAdapter({
    name: NAME,
    role: ROLES.OPS,
    reason: "adapter not implemented - see integrations/README.md",
  });
}

module.exports = { createHermesAdapter };
