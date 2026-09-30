import { readFileSync } from "node:fs";
import assert from "node:assert";

// Minimal chrome stub: local storage + captured listeners/handlers.
const store = {};
let navHandler, msgHandler;
globalThis.chrome = {
  storage: { local: {
    get: async (k) => { const keys = Array.isArray(k) ? k : [k];
      return Object.fromEntries(keys.filter(x => x in store).map(x => [x, store[x]])); },
    set: async (o) => Object.assign(store, o),
    remove: async (k) => (Array.isArray(k) ? k : [k]).forEach(x => delete store[x]),
  }},
  webNavigation: { onCommitted: { addListener: (f) => { navHandler = f; } } },
  runtime: { onMessage: { addListener: (f) => { msgHandler = f; } } },
};

const src = readFileSync(new URL("../background.js", import.meta.url), "utf8");
await import("data:text/javascript," + encodeURIComponent(src));

const ask = (action) => new Promise(res => msgHandler({ action }, null, res));
const visit = async (url, frameId = 0) => { await navHandler({ url, frameId }); await new Promise(r => setTimeout(r, 0)); };

// 1. Nothing recorded before consent.
await visit("https://example.com/page");
let s = await ask("getState");
assert.equal(s.consent, false, "consent should start false");
assert.equal(s.totalVisits, 0, "must record nothing pre-consent");
console.log("PASS  records nothing before consent");

// 2. After consent, visits count.
await ask("grantConsent");
await visit("https://example.com/a");
await visit("https://example.com/b?q=secret");
await visit("https://other.test/x");
s = await ask("getState");
assert.equal(s.totalVisits, 3);
assert.equal(s.domainCount, 2);
assert.equal(s.topDomains[0].domain, "example.com");
assert.equal(s.topDomains[0].visits, 2);
console.log("PASS  counts visits, ranks by frequency");

// 3. Only the domain is stored — no paths or query strings.
const raw = JSON.stringify(store);
assert.ok(!raw.includes("secret"), "query string leaked into storage");
assert.ok(!raw.includes("/a"), "path leaked into storage");
console.log("PASS  stores domain only, no paths or query strings");

// 4. Non-http schemes and iframes ignored.
await visit("chrome://settings");
await visit("file:///etc/passwd");
await visit("https://iframe.test/y", 1);
s = await ask("getState");
assert.equal(s.totalVisits, 3, "should ignore chrome://, file://, iframes");
console.log("PASS  ignores chrome://, file:// and subframes");

// 5. Clearing stats keeps consent.
await ask("clearStats");
s = await ask("getState");
assert.equal(s.totalVisits, 0);
assert.equal(s.consent, true);
console.log("PASS  clear stats preserves consent");

// 6. Revoking deletes both.
await visit("https://example.com/z");
await ask("revokeConsent");
s = await ask("getState");
assert.equal(s.consent, false);
assert.equal(s.totalVisits, 0);
assert.ok(!JSON.stringify(store).includes("example.com"), "data survived revoke");
console.log("PASS  revoke deletes consent and all collected data");

console.log("\nAll 6 behaviour tests passed.");
