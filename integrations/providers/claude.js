// Claude adapter - the dashboard backend. This is the only provider wired to a
// live API; Grok and Hermes are deliberately stubbed (see their modules).

const { ROLES } = require("../config");
const {
  ProviderRequestError,
  disabledAdapter,
} = require("./base");

const NAME = "claude";

// OpenRouter exposes an OpenAI-compatible chat completions API.
function createOpenRouterAdapter(or) {
  return {
    name: NAME,
    role: ROLES.DASHBOARD,
    isReady: () => true,
    status: () => ({
      name: NAME,
      role: ROLES.DASHBOARD,
      ready: true,
      model: or.model,
      via: "openrouter",
    }),

    // req: { prompt, system?, maxTokens? }
    async send(req) {
      try {
        const res = await fetch(`${or.baseUrl}/chat/completions`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${or.apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: or.model,
            max_tokens: req.maxTokens || 16000,
            messages: [
              ...(req.system ? [{ role: "system", content: req.system }] : []),
              { role: "user", content: req.prompt },
            ],
          }),
        });
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}: ${await res.text()}`);
        }
        const raw = await res.json();
        const text = (raw.choices && raw.choices[0]?.message?.content) || "";
        return { provider: NAME, text, raw };
      } catch (err) {
        throw new ProviderRequestError(NAME, err.message, err);
      }
    },
  };
}

function createClaudeAdapter(cfg) {
  if (!cfg.enabled) {
    return disabledAdapter({
      name: NAME,
      role: ROLES.DASHBOARD,
      reason: "CLAUDE_ENABLED is false",
    });
  }
  if (cfg.openrouter && cfg.openrouter.apiKey) {
    return createOpenRouterAdapter(cfg.openrouter);
  }
  if (!cfg.apiKey) {
    return disabledAdapter({
      name: NAME,
      role: ROLES.DASHBOARD,
      reason: "ANTHROPIC_API_KEY or OPENROUTER_API_KEY is not set",
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
