// Background service worker - local browsing stats.
//
// Single purpose: show you a count of your own page visits per domain.
//
// Everything stays on this device. There is deliberately no network code in
// this file and no remote endpoint anywhere in the extension: the previous
// version sold browsing activity to advertising and market-research partners,
// which Chrome Web Store program policy prohibits outright (see
// docs/venture-assessment.md). Nothing is recorded until the user opts in.

const CONSENT_KEY = "consentGrantedAt";

// Recorded per domain: a visit count and the last time it was seen. No URLs,
// no paths, no query strings, no referrers - a domain tally is all the
// user-facing feature needs, so it is all that is kept.
const STATS_KEY = "domainStats";

// --- consent -----------------------------------------------------------

async function hasConsent() {
  const { [CONSENT_KEY]: grantedAt } = await chrome.storage.local.get(CONSENT_KEY);
  return Boolean(grantedAt);
}

async function grantConsent() {
  await chrome.storage.local.set({ [CONSENT_KEY]: Date.now() });
}

// Withdrawing consent also discards what was collected under it.
async function revokeConsent() {
  await chrome.storage.local.remove([CONSENT_KEY, STATS_KEY]);
}

// --- recording ---------------------------------------------------------

// Only http(s) pages are counted. Browser-internal pages (chrome://,
// about:, extension pages) and file:// URLs are skipped.
function domainOf(url) {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
    return parsed.hostname || null;
  } catch {
    return null; // not a URL we can read
  }
}

async function recordVisit(url) {
  if (!(await hasConsent())) return;

  const domain = domainOf(url);
  if (!domain) return;

  const { [STATS_KEY]: stats = {} } = await chrome.storage.local.get(STATS_KEY);
  const entry = stats[domain] || { visits: 0, lastSeen: 0 };
  stats[domain] = { visits: entry.visits + 1, lastSeen: Date.now() };
  await chrome.storage.local.set({ [STATS_KEY]: stats });
}

// A committed main-frame navigation is one page visit. onActivated is not
// used: switching back to an existing tab is not a new visit, and counting it
// inflated the numbers in the previous version.
chrome.webNavigation.onCommitted.addListener((details) => {
  if (details.frameId !== 0) return; // ignore iframes
  recordVisit(details.url);
});

// --- popup messages ----------------------------------------------------

// Each branch returns true to keep the message channel open for the async
// reply, which is required by chrome.runtime.onMessage.
chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  if (request.action === "getState") {
    (async () => {
      const { [STATS_KEY]: stats = {} } = await chrome.storage.local.get(STATS_KEY);
      const domains = Object.entries(stats)
        .map(([domain, v]) => ({ domain, ...v }))
        .sort((a, b) => b.visits - a.visits);

      sendResponse({
        consent: await hasConsent(),
        totalVisits: domains.reduce((sum, d) => sum + d.visits, 0),
        domainCount: domains.length,
        topDomains: domains.slice(0, 10),
      });
    })();
    return true;
  }

  if (request.action === "grantConsent") {
    grantConsent().then(() => sendResponse({ ok: true }));
    return true;
  }

  if (request.action === "revokeConsent") {
    revokeConsent().then(() => sendResponse({ ok: true }));
    return true;
  }

  if (request.action === "clearStats") {
    chrome.storage.local.remove(STATS_KEY).then(() => sendResponse({ ok: true }));
    return true;
  }
});
