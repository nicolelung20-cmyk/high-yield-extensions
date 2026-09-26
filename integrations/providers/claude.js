// Claude adapter - the dashboard backend. This is the only provider wired to a
// live API; Grok and Hermes are deliberately stubbed (see their modules).

const { ROLES } = require("../config");
const {
  ProviderRequestError,
  disabledAdapter,
} = require("./base");

const NAME = "claude";

function createClaudeAdapter(cfg) {
  if (!cfg.enabled) {
    return disabledAdapter({
      name: NAME,
      role: ROLES.DASHBOARD,
      reason: "CLAUDE_ENABLED is false",
    });
  }
  if (!cfg.apiKey) {
    return disabledAdapter({
      name: NAME,
      role: ROLES.DASHBOARD,
      reason: "ANTHROPIC_API_KEY is not set",
    });
  }

  // Required lazily so the module still loads when the SDK is absent - the
  // registry can then report a useful status instead of failing at import.
  let client;
  function getClient() {
    if (!client) {
      const Anthropic = require("@anthropic-ai/sdk");
      client = new Anthropic({ apiKey: cfg.apiKey });
    }
    return client;
  }

  return {
    name: NAME,
    role: ROLES.DASHBOARD,
    isReady: () => true,
    status: () => ({
      name: NAME,
      role: ROLES.DASHBOARD,
      ready: true,
      model: cfg.model,
    }),

    // req: { prompt, system?, maxTokens? }
    async send(req) {
      try {
        const response = await getClient().messages.create({
          model: cfg.model,
          max_tokens: req.maxTokens || 16000,
          thinking: { type: "adaptive" },
          ...(req.system ? { system: req.system } : {}),
          messages: [{ role: "user", content: req.prompt }],
        });

        // content is a discriminated union - narrow before reading .text.
        const text = response.content
          .filter((block) => block.type === "text")
          .map((block) => block.text)
          .join("");

        return { provider: NAME, text, raw: response };
      } catch (err) {
        throw new ProviderRequestError(NAME, err.message, err);
      }
    },
  };
}

module.exports = { createClaudeAdapter };
