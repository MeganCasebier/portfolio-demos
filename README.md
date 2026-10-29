# portfolio-demos

Interactive rebuilds of two interface patterns.

> A fresh rebuild of the pattern on personal time — no employer code, data, or design assets.
> The original story: [Designing a rules engine humans can read](https://megancasebier.com/case-studies/rules-engine/).

Built from a written spec only. All data is fictional; everything runs in the browser, with no
backend, no telemetry and no external calls beyond fonts. Rulings are in `DECISIONS.md`.

- `demos/rules-wrapper/` — Demo 1: a designed shell around an immovable rules table, with a working test panel.

`npm test` runs the rules evaluator's tests. `npm run check` runs the blocklist over every file,
path and commit message (hooks in `.githooks/`, enabled with `git config core.hooksPath .githooks`).
