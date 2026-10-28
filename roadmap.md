# Scrounger roadmap

> Priority tier 1 (2026-10-17): live blocker, work first. Order: live blockers, ship pushes, active features, portfolio, exploratory. See ~/Documents/Code/LOOP-HANDOFF.md.

Classifieds browser over Craigslist's undocumented JSON API.
Plan: `~/.claude/plans/magical-noodling-candy.md`.

## Open
- [ ] OfferUp reviews complain about off-platform scam redirects and bans with
      no recourse. Scrounger (browser, no payments) sidesteps that class of
      complaint entirely — worth a line in store copy once listed.
      photo grid has no watch story and no visionOS-specific affordance.

## Notes
- Live at scrounger.jaybulb.com. Serve and share that, never the pages.dev URL.
- `sapi` ignores User-Agent completely, so native needs no disguise and no server.
- `cc` is ignored upstream; any page size but 360 is rejected.
- Posting bodies are stranger-authored HTML. Both decoders strip them to plain
  text; nothing may ever render them as markup.
- Craigslist does **not** block Cloudflare egress, verified against the live
  deployed Worker.
- Nothing ships under Craigslist's name. They hold the mark and have sued
  third-party clients before.

## TUI pilot (2026-09-05)
- `curbside-tui` SwiftPM target (SwiftTUI). `swift build && ./.build/debug/curbside-tui "bike" vancouver` reuses CraigslistAPI.swift as-is, same client the native apps use. Needs a real TTY.

## Ingested 2026-10-05

## Ingested 2026-10-16
- [ ] Needs iOS ship (macOS live, iOS 1.0.0 waiting). (screenshot: notes/attachments/2026-10-16/app-store-releases-1.png)
  - 2026-10-21 check: iOS 1.0.0 is PREPARE_FOR_SUBMISSION with submission a5b53544 UNRESOLVED_ISSUES (rejected 2026-10-05 under 4.3 spam + 4.2.6; the nine-question reply went out 2026-10-05 18:00, no resubmit). Blocked on Joshua: `asc web auth login` (2FA) so `asc web review show --app 6809031662` can read whether Apple answered.   - 2026-10-26 recheck: `asc web review show` still fails, Apple sign-in returns 503/throttled and asc will not retry before 12:20Z; still needs Joshua to run `asc web auth login` once the throttle clears.
  Never resubmit unchanged; if Apple holds the line, it needs real new iOS-only features first.

## Ingested 2026-10-17

## Ingested 2026-10-25

## Rename follow-ups, 2026-10-26
- [x] App Store name: "Scrounge" was taken, so the app became Scrounger (2026-10-28). Set on the editable iOS 1.0.0 app info, read back 3x.

## /mobbin gap matrix (2026-10-28)
Compared against OfferUp, Facebook Marketplace, Craigslist, Mercari, Kijiji, Poshmark, Gumtree and Vinted (App Store sheets).
Skipped: chat, payments, seller profiles, shipping (Scrounger is a browser, not a market).

| Gap | Who has it | Size | Status |
|---|---|---|---|
| House UI: capsule controls, rounded photo cards, light and dark | all | S | done 2026-10-28 (web) |
| Hide repeat reposts in results | OfferUp, Marketplace | S | done 2026-10-28 (web) |
| Category chips under search instead of a select | OfferUp, Marketplace, Vinted | S | open |
| Share a listing (native share sheet) | all | S | open |
| Recently viewed row | Mercari, Petco, Marketplace | S | open |
| Saved searches with "new since last look" counts | OfferUp, Mercari, Kijiji | M | open |
| Map view of results | Marketplace, Kijiji | M | open |
| Price drop badge on saved items | Mercari, Poshmark | M | open |
| One-word store name (Scrounge was taken, now Scrounger everywhere) | - | S | done 2026-10-28 |
