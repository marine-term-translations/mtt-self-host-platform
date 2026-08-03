# Documentation Update & EMODnet Sponsorship Integration Design

**Date:** 2026-08-03  
**Branch:** `docs/update`  
**Status:** Approved Design Spec  

---

## 1. Overview

The Marine Term Translations (MTT) self-hosted platform documentation needs to be updated to ensure `README.md` is fully comprehensive, covers all platform features, and prominently acknowledges **EMODnet Biology** sponsorship at the top of the README and key documentation files, consistent with the homepage header and footer.

---

## 2. Objectives

1. **EMODnet Sponsorship Integration**: Include top-level EMODnet Biology sponsorship badges and official European Union financing acknowledgment callout boxes across `README.md`, `ARCHITECTURE.md`, `docs/SETUP.md`, and primary documentation guides.
2. **Exhaustive `README.md` Update**: Expand `README.md` into a complete, standalone documentation hub that details all platform features, environment variables, architecture components, quick start steps, and a categorized index of all docs.
3. **Core Documentation Alignment**: Ensure `ARCHITECTURE.md`, `docs/SETUP.md`, and sub-documents in `docs/` reflect all current codebase capabilities (e.g., LDES feeds, Community Goals, AI translation assistance, Admin Moderation, User API keys).

---

## 3. Detailed Specifications

### 3.1 `README.md` Enhancements

- **Header Section**:
  - Add EMODnet Biology badge:
    `[![EMODnet Biology Sponsored](https://img.shields.io/badge/Sponsored%20by-EMODnet%20Biology-005596?style=for-the-badge)](https://emodnet.ec.europa.eu/en/biology)`
  - Add official Sponsorship Callout Box:
    ```markdown
    > [!NOTE]
    > **Sponsored by EMODnet Biology**  
    > Marine Term Translations (MTT) is developed within the framework of [EMODnet Biology](https://emodnet.ec.europa.eu/en/biology) (European Marine Observation and Data Network) to facilitate the internationalization, translation, and harmonization of marine science vocabularies.
    > 
    > *The European Marine Observation and Data Network (EMODnet) is financed by the European Union under Regulation (EU) 2021/1139 of the European Parliament and of the Council of 7 July 2021 establishing the European Maritime, Fisheries and Aquaculture Fund.*
    ```
- **Feature Matrix & Capabilities**:
  - Detailed feature breakdown: Data sovereignty, ORCID OAuth authentication, NERC & EMODnet vocabulary integration, Linked Data Event Streams (LDES) feed publishing/consumption, Community Translation Goals, AI assistance with OpenRouter, Admin Moderation & Dispute resolution, User API key management.
- **Architecture & Services Table**:
  - Service breakdown, ports (4173 & 5000), technology stack, volume mounts, and local/production access points.
- **Environment Variables Reference Table**:
  - Complete, clear documentation of all frontend (`VITE_API_URL`, `VITE_DOMAIN`) and backend (`NODE_ENV`, `PORT`, `BASE_URL`, `FRONTEND_URL`, `ORCID_CLIENT_ID`, `ORCID_CLIENT_SECRET`, `SESSION_SECRET`, `SQLITE_DB_PATH`) variables.
- **Quick Start & Post-Deployment Checklist**:
  - Step-by-step shell commands for installation, configuration, startup, and ORCID OAuth registration.
- **Categorized Documentation Index**:
  - Table linking to all 19+ documents in `docs/` grouped into:
    - User Guides (`AI_TRANSLATION_GUIDE.md`, `COMMUNITY_GOALS.md`, `DISCUSSION_SYSTEM.md`, etc.)
    - Administrator & Deployment (`SETUP.md`, `PRODUCTION_DEPLOYMENT.md`, `DATABASE_INITIALIZATION.md`, `DOCKER_ADMIN_CONTROL.md`, `SMTP_SETUP.md`, `ORCID_MIGRATION.md`)
    - Architecture & Data Standards (`ARCHITECTURE.md`, `LDES.md`, `SEARCH_AND_BROWSE_API.md`, `TRANSLATION_FLOW.md`, `SOURCE_CONFIG_FLOW.md`)

### 3.2 `ARCHITECTURE.md` Updates

- Insert EMODnet Biology sponsorship header badge and callout box at the top.
- Update high-level architecture diagram and descriptions to reflect LDES event stream integration, EMODnet API feeds, and ORCID OAuth flow.

### 3.3 `docs/SETUP.md` & `docs/` Sub-documents Updates

- Insert top EMODnet Biology sponsorship header badge and callout box in `docs/SETUP.md`.
- Add EMODnet header badge to primary sub-documents (`PRODUCTION_DEPLOYMENT.md`, `COMMUNITY_GOALS.md`, `LDES.md`, `DATABASE_INITIALIZATION.md`, `AI_TRANSLATION_GUIDE.md`).
- Validate and update all cross-document links.

---

## 4. Verification Plan

1. **Markdown Formatting Check**: Verify markdown rendering, tables, blockquotes, and links.
2. **Link Validation**: Ensure all markdown links (`file:///...` or relative doc links) resolve correctly without broken anchors.
3. **Git Status & Branch Verification**: Confirm changes are committed on branch `docs/update`.
