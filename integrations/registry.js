// Provider registry - the single place the rest of the codebase talks to.
//
// Callers address providers by ROLE, not by vendor name, so swapping the
// backend behind a role (or enabling a stub) touches only this directory.

const { ROLES, providerConfig } = require("./config");
const { createClaudeAdapter } = require("./providers/claude");
const { createGrokAdapter } = require("./providers/grok");
const { createHermesAdapter } = require("./providers/hermes");

function createRegistry(env = process.env) {
  const cfg = providerConfig(env);

  const adapters = {
    [ROLES.DASHBOARD]: createClaudeAdapter(cfg[ROLES.DASHBOARD]),
    [ROLES.BOTS]: createGrokAdapter(cfg[ROLES.BOTS]),
    [ROLES.OPS]: createHermesAdapter(cfg[ROLES.OPS]),
  };

  function get(role) {
    const adapter = adapters[role];
    if (!adapter) {
      throw new Error(
        `Unknown role "${role}". Expected one of: ${Object.values(ROLES).join(", ")}`
      );
    }
    return adapter;
  }

  // Health view for the dashboard: every role, ready or not, with the reason.
  function health() {
    return Object.values(ROLES).map((role) => adapters[role].status());
  }

  // Route a request to a role's provider.
  function send(role, req) {
    return get(role).send(req);
  }

  return { get, health, send, roles: ROLES };
}

module.exports = { createRegistry, ROLES };
