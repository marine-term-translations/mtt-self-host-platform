# Design Spec: Event Join UX, User Team Recognition, Source-Scoped Flow, and Admin Featured Toggle

**Date:** 2026-08-12  
**Status:** Approved by User  

---

## 1. Overview & Objectives

This specification enhances the MTT Event & Competition ecosystem across five key areas:
1. **Seamless QR & Team Join UX**: Eliminates manual join code input fields when scanning team QR codes. Redirects users straight to the Event Detail page, smooth-scrolls to the target team card, and applies a vibrant glowing highlight with a direct "Join [Team Name]" button.
2. **User Team Membership Recognition**: Backend identifies the authenticated user's active team (`user_team_id`) per event and flags `is_user_member: true` on their team card.
3. **Source-Scoped Event Flow & Redirect**: Clicking "Start Competition Flow →" opens `/flow` filtered precisely to the event's target `source_id` and user preferred language, linking directly to the relevant community goal.
4. **Strict Source-Scoped Event Point Scoring**: `recordEventContribution` validates that translations match the event's configured `source_id` before awarding competition points.
5. **Community Goals Widget & Admin Featured Toggle**: Features active events in `CommunityGoalWidget` and provides a per-event radio button in `AdminEvents.tsx` to set the featured landing homepage event.

---

## 2. Component Specifications & Requirements

### 2.1 User Team Recognition & QR Join UX (`eventService.js`, `EventDetailPage.tsx`)
- `getEventById(eventId, userId)` retrieves active team membership for `userId`.
- Returned event payload contains `user_team_id` and flags `is_user_member: true` on the member's team card in `event.teams`.
- On page load with `joinTeamId` or `joinCode`:
  - Smooth-scrolls to target team card (`element.scrollIntoView({ behavior: 'smooth' })`).
  - Highlights team card with cyan/emerald ring and direct on-card "Join Team" button.

### 2.2 Source-Filtered Flow & Event Point Scoring (`scoringService.js`, `TranslationFlow.tsx`)
- When a user clicks "Start Competition Flow →", navigate to `/flow?source=${event.source_id}&language=${preferredLanguage}&eventId=${event.id}`.
- `recordEventContribution`:
  - Queries `translations` -> `term_fields` -> `terms.source_id`.
  - Only awards event points if `(e.source_id IS NULL OR e.source_id = term.source_id)`.

### 2.3 Community Goals Widget & Admin Featured Toggle
- `CommunityGoalWidget`: Shows Active Competition card at top of list.
- `AdminEvents`: Per-event radio selector `is_featured_homepage` persists featured homepage competition.

---

## 3. Verification Plan
1. Backend Tests:
   - `backend/tests/event_membership_scoring.test.js`: Verify `getEventById` returns `user_team_id` for logged-in user and `recordEventContribution` only awards points for matching `source_id`.
2. Frontend Build:
   - Verify `npx tsc --noEmit` clean compilation.
