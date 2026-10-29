# Decisions

Rulings from the principal, in order. Each one traces a choice in the code to who made it.

## 2026-10-28

- **D-1, evaluation.** Every firing row's reason is collected; the most severe decision wins
  (Decline > Refer > Accept). The invented field names stand.
- **D-2, type.** Newsreader for headings, IBM Plex Mono for the engine's table and code-flavored UI,
  Inter for UI text, tightened slightly at small sizes. The brief named Geist; Geist is the
  employer's typeface and never appears here. Caught at the first read of the brief.
- **D-3, the border.** The engine's table is read-only while browsing; clicking a cell says "the
  engine's table — design couldn't change its shape." Values become editable only in step 1 of the
  edit flow. Structure is immutable always. Crossing into edit mode should feel like crossing a border.
- **D-4, statuses.** Five: Draft, In QA, Ready for approval, Active, Inactive. No Approved; the legend
  says why in one sentence.
- **D-5, home.** Public GitHub repo (its history is provenance), Netlify on the principal's existing
  account, target demos.megancasebier.com. Build and preview only until the principal's explicit go:
  no repo flip, no DNS, no production deploy.
- **D-6, Demo 2.** Built after Demo 1 and held behind the same gate as the policy-page case study.
  Nothing about it reaches a public surface before that page launches.
- **D-7, footer.** Demo 1 links to https://megancasebier.com/case-studies/rules-engine/.
- **D-8, recording.** Headless and scripted with ffmpeg. If it reads robotic, fall back to a
  click-by-click script recorded by hand, and say so.

## 2026-10-29

- **D-9, confirmed judgment calls.** Decision is an editable dropdown in edit mode; reason codes stay
  read-only (closed vocabulary). Tests re-run live only after a manual first Run all: the visitor
  chooses to run reality once, then reality follows them. "Play the other roles" is part of the
  demo's story. The first-visit hint and noindex/robots stand.
- **D-10, Demo 2's home.** A private second repo, merged into this one the day the policy page
  launches. Nothing about it is referenced here before then.
- **D-11, approver names.** Jordan Hale, Priya Nandakumar and Theo Marchetti are clear of every
  colleague in the record; the principal checks them once against the company directory.
- **D-12, Lighthouse.** Run locally with npx; report scores; "not embarrassing" is the bar.
- **D-13, the next gate.** After the capture and Lighthouse, stop. The principal reviews the preview
  herself before the repo, DNS or any production deploy changes.
