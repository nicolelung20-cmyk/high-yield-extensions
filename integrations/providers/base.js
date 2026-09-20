// Shared contract for every provider adapter.
//
// Each adapter exposes:
//   name       - stable identifier used in logs and config
//   role       - which ROLES slot it fills
//   isReady()  - true when the adapter can actually serve a request
//   status()   - { name, role, ready, reason } for the dashboard health view
//   send(req)  - resolves to { provider, text, raw } or throws

class ProviderDisabledError extends Error {
  constructor(name, reason) {
    super(`Provider "${name}" is not enabled: ${reason}`);
    this.name = "ProviderDisabledError";
    this.provider = name;
    this.reason = reason;
  }
}

class ProviderRequestError extends Error {
  constructor(name, message, cause) {
    super(`Provider "${name}" request failed: ${message}`);
    this.name = "ProviderRequestError";
    this.provider = name;
    this.cause = cause;
  }
}

// Adapters that cannot run yet share this body so the registry, the health
// view and any caller see one uniform shape instead of a missing method.
function disabledAdapter({ name, role, reason }) {
  return {
    name,
    role,
    isReady: () => false,
    status: () => ({ name, role, ready: false, reason }),
    async send() {
      throw new ProviderDisabledError(name, reason);
    },
  };
}

module.exports = { ProviderDisabledError, ProviderRequestError, disabledAdapter };
