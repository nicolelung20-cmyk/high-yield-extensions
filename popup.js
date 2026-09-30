// Popup UI - renders local stats and owns the consent decision.

const $ = (id) => document.getElementById(id);

function send(action) {
  return chrome.runtime.sendMessage({ action });
}

function renderConsentGate() {
  $("gate").hidden = false;
  $("stats").hidden = true;
}

function renderStats(state) {
  $("gate").hidden = true;
  $("stats").hidden = false;

  $("totalVisits").textContent = state.totalVisits.toLocaleString();
  $("domainCount").textContent = state.domainCount.toLocaleString();

  const list = $("topDomains");
  list.textContent = "";

  if (state.topDomains.length === 0) {
    const li = document.createElement("li");
    li.className = "empty";
    li.textContent = "No visits recorded yet. Browse a little and reopen this.";
    list.appendChild(li);
    return;
  }

  // Built with createElement rather than innerHTML: domain strings come from
  // pages the user visited, so they are never interpolated into markup.
  for (const { domain, visits } of state.topDomains) {
    const li = document.createElement("li");

    const name = document.createElement("span");
    name.className = "domain";
    name.textContent = domain;

    const count = document.createElement("span");
    count.className = "count";
    count.textContent = visits.toLocaleString();

    li.append(name, count);
    list.appendChild(li);
  }
}

async function refresh() {
  const state = await send("getState");
  if (!state) return;
  state.consent ? renderStats(state) : renderConsentGate();
}

document.addEventListener("DOMContentLoaded", () => {
  $("grant").addEventListener("click", async () => {
    await send("grantConsent");
    refresh();
  });

  $("revoke").addEventListener("click", async () => {
    await send("revokeConsent");
    refresh();
  });

  $("clear").addEventListener("click", async () => {
    await send("clearStats");
    refresh();
  });

  refresh();
});
