# portfolio-demos

Interactive rebuilds of two interface patterns, made on personal time from a written spec.
No employer code, data or design assets. All data is fictional; everything runs in the browser.

- `demos/rules-wrapper/` — Demo 1: a designed shell around an immovable rules table, with a working test panel.
- `demos/policy-page/` — Demo 2 (not started).

`npm test` runs the rules evaluator's tests. `npm run check` runs the blocklist over every file,
path and commit message (hooks in `.githooks/`, enabled with `git config core.hooksPath .githooks`).
