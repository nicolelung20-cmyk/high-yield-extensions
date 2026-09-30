# Local Browsing Stats

A Chrome extension that keeps a private, on-device count of the pages you open
per site.

## What it does

- Counts main-frame page visits, grouped by domain.
- Shows your top sites and totals in the popup.
- Stores everything in `chrome.storage.local` on your own device.

## What it does not do

- **No network calls.** There is no `fetch`, no endpoint, no server. Grep the
  source: `grep -rE "fetch\(|https?://" background.js popup.js` returns
  nothing.
- **No URLs, paths, query strings or page contents** are stored - only the
  domain and a count.
- **No selling or sharing of data.** Nothing leaves the device, so there is
  nothing to sell.

## Consent

Nothing is recorded until you press "Turn on counting". "Turn off & delete"
withdraws consent and deletes everything collected under it.

## Permissions, and why each is needed

| Permission | Why |
| --- | --- |
| `storage` | Keep your counts on this device |
| `webNavigation` | Know when a page visit happens |

No `<all_urls>`, no `webRequest`, no `tabs`, no `scripting` - none are needed
for a domain tally, so none are requested.

## Install

1. Open `chrome://extensions/`
2. Enable Developer mode
3. Load unpacked, and select this folder

## Test

```sh
npm test
```

Six behaviour tests cover the consent gate, counting and ranking,
domain-only storage, scheme and subframe filtering, and deletion on revoke.

## History

Version 1 of this extension ("Traffic Analytics Pro") collected browsing
activity and sold it to advertising and market-research partners. That model is
prohibited outright by Chrome Web Store program policy and could never have
been published; it was also broken, using APIs unavailable in a Manifest V3
service worker. See `docs/venture-assessment.md` for the full finding.
