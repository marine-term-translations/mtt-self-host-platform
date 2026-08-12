# Design Spec: Event Join UX, Event-Scoped Translation Flow, Community Goals Featured Card, and Admin Featured Toggle

**Date:** 2026-08-12  
**Status:** Approved by User  

---

## 1. Overview & Objectives

This specification enhances the MTT Event & Competition ecosystem across four key areas:
1. **Seamless QR & Team Join UX**: Eliminates manual join code input fields when scanning team QR codes. Redirects users straight to the Event Detail page, smooth-scrolls to the target team card, and applies a vibrant glowing highlight with a direct "Join [Team Name]" button.
2. **Event Member Translation Flow CTA & Filtering**: Provides active team members with a prominent "Start Competition Flow →" button on the Event Detail page and automatically scopes translation tasks in `/flow` to the active event's vocabulary and language.
3. **Community Goals Bottom-Right Featured Card**: Renders the user's active competition event as a top-featured card inside the bottom-right `CommunityGoalWidget` popup.
4. **Per-Event Admin Homepage Radio Toggle**: Gives administrators explicit control on `AdminEvents.tsx` to designate which event is featured on the landing page hero box via a radio button.

---

## 2. Component Specifications & Requirements

### 2.1 QR Code & Team Highlighting UX

#### QR Link & Query Params
- QR codes generated via `/api/events/:id/qr?joinCode=...` or `?teamId=...` point to `/events/:id?joinTeamId=:teamId` (or `?joinCode=...`).
- When an unauthenticated user scans the QR code, the event ID and team target are saved in `sessionStorage` (`pending_event_join_target`). Upon login, the user lands back on `/events/:id?joinTeamId=:teamId` without auto-submitting secretly.

#### Event Detail Highlighting (`frontend/pages/EventDetailPage.tsx`)
- On page load, if `joinTeamId` or `joinCode` exists in query parameters:
  - Find the target team element on the leaderboard.
  - Smooth-scroll into view (`element.scrollIntoView({ behavior: 'smooth' })`).
  - Apply an animated glowing cyan/emerald border highlight with a "Selected via QR Link" badge.
  - Render a prominent **"Join [Team Name]"** button directly on the card.
  - Remove generic standalone join code input forms.

---

### 2.2 Event-Scoped Translation Flow & Header CTA

#### Event Detail Member CTA (`frontend/pages/EventDetailPage.tsx`)
- When the logged-in user is an active member of a team in the event:
  - Display a primary CTA button: **"Start Competition Flow →"** in the top hero section.
  - Clicking navigates to `/flow?eventId=:eventId`.

#### Translation Flow Scope (`frontend/pages/TranslationFlow.tsx`)
- When `/flow` is opened with `eventId` param OR if the logged-in user belongs to an active event:
  - Pass `sourceId` and `targetLanguage` matching the event scope to backend task fetchers (`getRandomUntranslated`).
  - Render a cyan competition banner at the top:
    `🏆 Competition Mode: Filtering terms for [Event Title] (Team: [Team Name])`
  - Provide a toggle: `Switch to Standard Flow`.

---

### 2.3 Community Goals Widget Top Featured Card (`frontend/components/CommunityGoalWidget.tsx`)

- In the bottom-right `CommunityGoalWidget` popup:
  - Fetch active user event membership.
  - Position an **Active Competition Card** at the **very top** of the list (above regular community goals).
  - Displays:
    - Event Title & Team Name
    - Team Rank & Points Tally (`Rank #1 • 45 pts`)
    - Event Progress Bar
    - Direct CTA button: `Start Translating →` (navigates to `/flow?eventId=:eventId`).

---

### 2.4 Per-Event Admin Homepage Radio Toggle (`backend/src/services/eventService.js`, `frontend/pages/admin/AdminEvents.tsx`)

#### Backend Endpoint & Schema
- `events` table includes `is_featured_homepage INTEGER DEFAULT 0`.
- Endpoint `PATCH /api/events/:id/featured`:
  - Sets `is_featured_homepage = 1` for the specified event ID and resets all other events to `0`.
- `GET /api/events` includes `is_featured_homepage` in the response objects.
- `Landing.tsx` prioritizes the event where `is_featured_homepage = 1` (or latest `ACTIVE` event if none explicitly selected).

#### Admin UI (`frontend/pages/admin/AdminEvents.tsx`)
- Render a **"Featured on Landing Page"** radio selector on each event card.
- Toggling the radio immediately persists the selection via API.

---

## 3. Verification Plan

1. **Backend Tests**:
   - `backend/tests/event_featured.test.js`: Verify `PATCH /api/events/:id/featured` sets exact event as featured and clears previous featured flags.
2. **Frontend Build & Integration**:
   - Verify TypeScript compilation (`npx tsc --noEmit`).
   - Verify QR link navigation scrolls to target team card and applies highlight.
   - Verify `CommunityGoalWidget` renders active competition card at top of list.
