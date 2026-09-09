# SHTFx

**SHTFx** — *Shit Hits the Fan* — is a survival handbook generator that turns structured household data plus research notes into a practical, readable preparedness handbook.

## Purpose

The goal is to help a household move from vague preparedness ideas to an actual documented plan: who is in the household, what risks matter most, what supplies exist, where to go, who to contact, and what gaps need to be closed.

## Two-repo architecture

This project is designed around a simple two-repo model:

1. **Public generator repo (this repo)**
   - Stores the schema, question bank, generator code, and research-note conventions.
   - Safe to share publicly because it contains no personal preparedness data.

2. **Private profile/content repo**
   - Stores household-specific answers, profile data, research notes, document scans, and generated handbooks.
   - Should remain private because it may include sensitive personal and operational details.

In practice, the public repo defines the *tooling and format*, while the private repo stores the *actual household data*.

## How to use the generator

### 1. Fill out a profile
Create a `profile.json` file in a private working directory or a separate private repo. Its shape should align with `schema/handbook-schema.json`.

### 2. Gather research notes
Add topic-based research notes under a `research/` directory. Keep one file per topic and date it so sources can be updated over time.

### 3. Run the generator
From the project root:

```bash
node generator/generate.js
```

The script will read `profile.json` and available research notes, then generate `handbook.md`.

### 4. Review and harden
Review the generated handbook for completeness, operational realism, and sensitive details before printing or sharing it.

## How to use SHTFx for your family

1. **Fork or clone this repo** to get the public generator, schema, question bank, and generic research guidance.
2. **Create a separate private repo** for your household data and outputs, such as `shtfx-yourname`.
3. **Run the intake Q&A** with your own Bort instance, another assistant, or by manually filling out `profile.json`.
4. **Add household-specific research notes** in the private repo, especially anything tied to your geography, routes, local hazards, contacts, or supplies.
5. **Run `generator/generate.js`** from your working copy to produce `handbook.md`.
6. **Keep the private repo private.** Never commit personal data, real addresses, medical details, contact trees, or household-specific plans to this public repo.

This public repo is the reusable toolkit. Your private repo is where your real preparedness data belongs.

## Repository layout

- `schema/handbook-schema.json` — canonical handbook data structure
- `questions/question-bank.json` — intake questions used to gather missing information
- `research/README.md` — note-taking structure and sourcing guidance
- `generator/generate.js` — handbook generator (also usable as a library, see `app/`)
- `app/` — self-serve profile editor web app; see `app/README.md`

## Roadmap

### Phase 1
- Define handbook schema
- Define intake question bank
- Generate Markdown handbook draft

### Phase 2
- HTML rendering
- PDF rendering
- Gap analysis and completeness scoring
- Optional interview / guided intake flow

## Security note

Do **not** commit real household profiles, personal addresses, medical details, or scanned documents to this public repository.
