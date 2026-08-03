# Documentation Update & EMODnet Sponsorship Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a comprehensive `README.md` and synchronize EMODnet Biology sponsorship branding and features across all repository documentation on branch `docs/update`.

**Architecture:** Update `README.md`, `ARCHITECTURE.md`, `docs/SETUP.md`, and key `docs/*.md` files to include official EMODnet Biology sponsorship header badges, European Union financing acknowledgments, full environment variable specifications, and a categorized documentation directory index.

**Tech Stack:** GitHub Flavored Markdown (GFM), Mermaid diagrams, Shields.io badges.

## Global Constraints

- **Branch:** Work must be committed on `docs/update`.
- **EMODnet Target Link:** `https://emodnet.ec.europa.eu/en/biology`
- **EMODnet Logo Asset:** `/emodnet-logo.png` / `frontend/public/emodnet-logo.png`
- **EU Financing Statement:** "The European Marine Observation and Data Network (EMODnet) is financed by the European Union under Regulation (EU) 2021/1139 of the European Parliament and of the Council of 7 July 2021 establishing the European Maritime, Fisheries and Aquaculture Fund."

---

### Task 1: Comprehensive `README.md` Update

**Files:**
- Modify: `README.md`

**Interfaces:**
- Consumes: EMODnet sponsorship specs, existing codebase features (LDES, Community Goals, AI translation, ORCID auth, User API keys, Admin Moderation).
- Produces: Complete, single-source-of-truth `README.md` landing page.

- [ ] **Step 1: Draft updated README.md**

Construct `README.md` with:
- Top EMODnet Biology badge & EU financing callout box.
- Interactive Table of Contents.
- Expanded Overview & Feature Matrix.
- Services breakdown table.
- Exhaustive Environment Variables Reference Table (`NODE_ENV`, `PORT`, `BASE_URL`, `FRONTEND_URL`, `ORCID_CLIENT_ID`, `ORCID_CLIENT_SECRET`, `SESSION_SECRET`, `SQLITE_DB_PATH`, `VITE_API_URL`, `VITE_DOMAIN`).
- Quick Start commands (`docker compose up -d --build`).
- Categorized Documentation Index linking all 19+ files in `docs/` and root docs.

- [ ] **Step 2: Apply changes to README.md**

Update `README.md` with the full content.

- [ ] **Step 3: Verify markdown formatting**

Run: `git diff README.md`
Expected: Diff shows clean header, badges, callout, tables, and links.

- [ ] **Step 4: Commit README.md changes**

Run:
```bash
git add README.md
git commit -m "docs: expand README with EMODnet sponsorship header, feature matrix, env reference, and doc index"
```

---

### Task 2: Update `ARCHITECTURE.md`

**Files:**
- Modify: `ARCHITECTURE.md`

**Interfaces:**
- Consumes: Architectural details, EMODnet header badge standard.
- Produces: Updated architecture document.

- [ ] **Step 1: Update ARCHITECTURE.md with EMODnet header and updated service descriptions**

Add top EMODnet Biology sponsorship badge and callout box to `ARCHITECTURE.md`. Ensure LDES feed generation, EMODnet API integration, and SQLite database migration structure are clearly reflected in the architecture overview.

- [ ] **Step 2: Commit ARCHITECTURE.md changes**

Run:
```bash
git add ARCHITECTURE.md
git commit -m "docs: add EMODnet sponsorship header and update architecture overview"
```

---

### Task 3: Update `docs/SETUP.md`

**Files:**
- Modify: `docs/SETUP.md`

**Interfaces:**
- Consumes: Self-hosting setup guide requirements.
- Produces: Updated setup guide with EMODnet branding and complete post-deployment steps.

- [ ] **Step 1: Add EMODnet sponsorship header to docs/SETUP.md**

Insert top EMODnet Biology badge and callout box at the top of `docs/SETUP.md`. Update post-deployment steps to cover OpenRouter AI config, ORCID OAuth redirect URIs, LDES feed verification, and Docker admin tools.

- [ ] **Step 2: Commit docs/SETUP.md changes**

Run:
```bash
git add docs/SETUP.md
git commit -m "docs: add EMODnet header and update setup guide"
```

---

### Task 4: Standardize EMODnet Headers Across Key `docs/*.md` Files

**Files:**
- Modify: `docs/PRODUCTION_DEPLOYMENT.md`
- Modify: `docs/COMMUNITY_GOALS.md`
- Modify: `docs/LDES.md`
- Modify: `docs/DATABASE_INITIALIZATION.md`
- Modify: `docs/AI_TRANSLATION_GUIDE.md`

**Interfaces:**
- Consumes: EMODnet badge format.
- Produces: Consistent header badges across primary sub-documentation files.

- [ ] **Step 1: Add top EMODnet badge to key sub-documents**

Insert the standard EMODnet Biology sponsorship badge at the top of `PRODUCTION_DEPLOYMENT.md`, `COMMUNITY_GOALS.md`, `LDES.md`, `DATABASE_INITIALIZATION.md`, and `AI_TRANSLATION_GUIDE.md`.

- [ ] **Step 2: Commit sub-document updates**

Run:
```bash
git add docs/
git commit -m "docs: standardize EMODnet sponsorship header badges across primary docs"
```

---

### Task 5: Final Validation and Link Check

**Files:**
- Audit: All modified files (`README.md`, `ARCHITECTURE.md`, `docs/*.md`)

- [ ] **Step 1: Check git status and branch**

Run: `git status && git branch --show-current`
Expected: Working tree clean, on branch `docs/update`.

- [ ] **Step 2: Verify links and document structure**

Ensure all doc paths in the `README.md` Documentation Index exist on disk.
