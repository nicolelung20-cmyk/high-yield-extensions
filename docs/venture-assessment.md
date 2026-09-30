# Venture assessment — 2026-09-30

Evidence-based status of the four ventures, written because the revenue
projections in README.md are not measurements and one venture cannot legally
ship at all.

## Measured revenue state: zero everywhere

Live queries against both Supabase projects, 2026-09-29:

| Project | Table | Rows |
| --- | --- | --- |
| `kqidlsjjsocnnqfftynj` | `licenses` | 0 |
| | `elevat_leads` | 0 |
| | `elevat_bots` | 0 |
| | `elevat_wallets` | 0 |
| | `elevat_transaction_requests` | 0 |
| | `profiles` | 0 |
| `mlrrexbqdeogcdbtamxa` | `subscriptions` | 0 |
| | `consultation_leads` | 0 |
| | `funnel_events` | 0 |
| | `eai_conversations` | 0 |
| | `profiles` | 0 |

No users, no subscriptions, no leads, no transactions. The only real rows
anywhere are 3 test `todos`. There is no revenue to grow yet — there is a
product to ship.

## Traffic Analytics Pro cannot ship. Stop work on it.

The model is: collect browsing activity → sell to "advertising/market research
partners" → pay the user a share. Chrome Web Store program policy prohibits
each half of that, so no amount of consent UI, privacy policy or anonymisation
makes it publishable.

What the policy says:

- Transferring or selling user data to third parties such as advertising
  platforms, data brokers or information resellers is prohibited.
- Collection and use of web browsing activity is prohibited except as required
  for a user-facing feature described prominently on the store listing and in
  the product UI.
- Using or transferring user data to serve personalised, retargeted or
  interest-based advertising is never allowed.
- Since 2026, collected data must be strictly necessary to the extension's
  disclosed single purpose.

Source: Chrome Web Store Program Policies, Limited Use
(<https://developer.chrome.com/docs/webstore/program-policies/limited-use>).

What the code does, at `background.js`:

- `trackPageVisit(tab.url)` on every `tabs.onActivated` and `webNavigation`
  event (lines 35-42), extracting `hostname` and `document.referrer`.
- `sendBatchData()` POSTs batches to a remote endpoint (line 134).
- Requests `<all_urls>` with `webRequest`, `webNavigation` and `tabs`.
- **Zero consent code.** `grep -ciE "consent|opt.?in|agree"` across
  `background.js`, `popup.js` and `popup.html` returns 0, 0, 0.
- The endpoint is `analytics-api.example.com` — a placeholder that does not
  exist, so the extension has never transmitted anything.

The README also claims "GDPR & CCPA compliant" and "100% anonymous" while no
consent flow exists. Under GDPR this processing needs informed, freely given
consent; shipping as-is would be a violation independent of store policy.

**Recommendation: do not ship this model.** It conflicts with the venture's own
"legal only" rule. Two lawful options for the same codebase:

1. **Local-only analytics.** The user sees their own browsing stats; nothing
   leaves the device. Publishable, honest, monetisable as a paid tier. Requires
   deleting the exfiltration path entirely.
2. **Retire it** and put the effort into EAI.

## EAI / psychiczebra-platform is the shortest path to a first dollar

It deploys successfully on Vercel, has `subscriptions` and `consultation_leads`
schema, and an RPC (`upsert_subscription`) already locked down. The missing
piece is narrow and well defined: **no payment integration wired to
`subscriptions`.** That is a finite build with a clear finish line, on a
product whose business model is lawful.

## money

A small Go library (`money.go`, `money_test.go`). Not a product; no revenue
path. Leave it.

## What the projections are worth

README.md projects $500K-$2M/month at 100K users. That table is a typed
assumption, not a measurement, and it rests on a model that cannot be
published. Treat it as void.
