# SHTFx

**SHTFx — Shit Hits the Fan** is a survival handbook generator that helps households turn preparedness inputs into a practical, personalized emergency playbook.

## What this repo is

This repository contains the **generator-side foundation**:
- A handbook data schema
- A structured intake question bank
- Research note conventions
- A generator stub for markdown output

## Two-repo architecture (recommended)

SHTFx works best as two repos:

1. **Public generator repo (this repo)**
   - Generic schema, questions, templates, and rendering code
   - Safe to share publicly

2. **Private household profile repo**
   - Your `profile.json` and local research notes
   - Sensitive household/location/medical/financial details
   - Should remain private

The generator reads private profile data and research notes to produce a tailored handbook.

## Quick start

```bash
node generator/generate.js --profile ./profile.json --research ./research --out ./handbook.md
```

Current output target: markdown (`handbook.md`).

## Project layout

- `schema/handbook-schema.json` — required handbook sections and data points
- `questions/question-bank.json` — intake questions mapped to schema sections
- `research/README.md` — research note conventions
- `generator/generate.js` — Phase 1 markdown generator stub

## Phase roadmap

- **Phase 1:** schema + intake + markdown generation (current)
- **Phase 2:** render-to-PDF and render-to-HTML
