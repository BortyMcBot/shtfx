# SHTFx app

A small self-serve profile editor, built so filling in a household profile
doesn't depend on an unattended process. Reads `schema/handbook-schema.json`
and `questions/question-bank.json` from this repo, reads and writes
`profile.json`/`handbook.md` in a separate data directory (your private
profile repo, e.g. `shtfx-duckworth`), and calls the existing
`generator/generate.js` to render the handbook.

Zero dependencies — plain Node `http` server, vanilla JS/HTML frontend.

## Running it

```bash
SHTFX_DATA_DIR=/path/to/shtfx-duckworth node app/server.js
```

- `SHTFX_DATA_DIR` (required) — a directory containing (or that will contain)
  `profile.json`, `handbook.md`, and optionally `research/`. Point this at a
  clone of your private profile repo. The app never touches git — commit and
  push that repo yourself when you want a checkpoint.
- `PORT` (optional, default `4173`).

Binds `0.0.0.0`. Safe to run as-is on a box whose firewall already restricts
inbound to a private network (e.g. Tailscale) — the app has no auth of its
own, see below.

## What it does

- Renders a form from the schema — one section per top-level schema key,
  repeatable rows for array-of-object fields (household members, pets,
  bug-out destinations, threats).
- Autosaves to `profile.json` on edit (debounced).
- "What's missing" panel: required schema fields with no value yet, ranked by
  the matching question bank section's priority.
- "Regenerate handbook" calls the existing generator in-process and shows the
  result.

## Known gaps (single-user v1, by design)

- **No auth.** Whatever network boundary sits in front of this server is the
  only access control. Do not expose it beyond a trusted private network
  without adding one.
- **No real JSON Schema validation on save** — only checks the request body
  is a JSON object. Fine for one trusted user; add real validation (e.g.
  `ajv`) before accepting input from anyone else.
- **One data directory, not per-user.** `SHTFX_DATA_DIR` is a single env var.
  A multi-user version needs to resolve a data directory per authenticated
  session instead — everything else here (schema-driven forms, the
  generator call, the gaps calculation) doesn't need to change for that.
