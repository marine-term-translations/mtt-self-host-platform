# Design Spec: Admin Event & Team Management, Landing Page Active Event Showcase, and Points System Overhaul

**Date:** 2026-08-12  
**Status:** Approved by User  

---

## 1. Overview & Context

This design addresses three core requirements in the MTT platform:
1. **Admin Deletion Capabilities**: Enabling administrators (and team creators where appropriate) to delete events and delete teams.
2. **Landing Page Active Event Feature Card**: Introducing an active event banner/card on the homepage hero grid (replacing the *Interoperable* card slot with a highlighted layout) when an active event is ongoing, controlled via an admin setting toggle.
3. **Points & Reputation System Repair**: Hooking up `recordEventContribution` to live translation/review actions and synchronizing `user_stats.points` with `users.reputation` across the gamification and reputation services.

---

## 2. Component Design & Functional Requirements

### 2.1 Admin Event & Team Deletion

#### Data Cascade Strategy
Deleting an event or team cleans up competition metadata while preserving all translated terms:
- **Delete Event**:
  - Removes rows from `event_rewards`, `event_contributions`, `event_memberships`, `event_teams`, and `events`.
  - Underlying `translations`, `user_activity`, and `users` remain untouched.
- **Delete Team**:
  - Removes rows from `event_contributions` (associated with team), `event_memberships` (associated with team), and `event_teams`.
  - Underlying `translations` remain intact.

#### Backend Routes & Logic
- `DELETE /api/events/:id`: Requiring admin session auth. Calls `eventService.deleteEvent(eventId)`.
- `DELETE /api/events/:eventId/teams/:teamId`: Requiring admin session auth or team creator auth. Calls `eventService.deleteTeam(eventId, teamId)`.

#### Frontend Administration UI
- **Admin Dashboard** (`frontend/pages/AdminDashboard.tsx`):
  - Add red "Delete Event" button with modal confirmation to event list cards.
- **Event Detail Page** (`frontend/pages/EventDetailPage.tsx`):
  - Add "Delete Event" button (for admins) and "Delete Team" action triggers on team leaderboards.

---

### 2.2 Landing Page Featured Active Event Card & Toggle Flag

#### System Setting
- System setting `show_active_event_on_landing` (stored in system settings table or app config, defaults to `true`).
- Admin UI toggle in `AdminDashboard.tsx` under settings section to enable or disable displaying active events on landing page.

#### Hero Grid Dynamics (`frontend/pages/Landing.tsx`)
- Standard hero grid contains 4 cards:
  1. *Standardized*
  2. *International*
  3. *Interoperable*
  4. *LDES Feeds*
- When `show_active_event_on_landing` is enabled AND an event with status `ACTIVE` exists:
  - The **Interoperable** slot is replaced with an **Active Competition Event** card.
  - Design aesthetic: Cyan/emerald glassmorphic highlight border, pulsing "LIVE COMPETITION" status pill badge, current team count & contribution tally, and "Join Competition →" CTA button linking to `/events/:id`.
- Fallback: If no event is active or toggle is disabled, standard *Interoperable* feature card renders.

---

### 2.3 Points System Overhaul & Event Scoring Integration

#### Event Contribution Hooks (`backend/src/services/scoringService.js`)
Hook `recordEventContribution(userId, translationId, actionType, category)` into key workflows:
1. `terms.routes.js` (Translation creation): Calls `recordEventContribution(createdByUserId, translationId, 'TRANSLATION_CREATED')`.
2. `flow.service.js` (Status change / approval): Calls `recordEventContribution(reviewerUserId, translationId, 'TRANSLATION_APPROVED')` when status changes to `approved` or `merged`.
3. `flow.service.js` (Review vote): Calls `recordEventContribution(reviewerUserId, translationId, 'VOTE_CAST')`.

#### Synchronizing Reputation & User Stats Points
- `reputation.service.js`: Update `applyReputationChange` to update both `users.reputation` AND `user_stats.points` via `UPDATE user_stats SET points = MAX(0, points + ?) WHERE user_id = ?`.
- `gamification.service.js`: Ensure `awardPoints` performs atomic updates on both `users.reputation` and `user_stats.points`.
- Guarantees leaderboards, profile badges, reputation tiers, and streak points remain in sync.

---

## 3. Verification & Testing Strategy

1. **Automated Unit & Integration Tests**:
   - `backend/tests/event_deletion.test.js`: Test deleting events and teams; verify cascade clean-up of `event_*` tables and preservation of `translations`.
   - `backend/tests/event_scoring.test.js`: Test contribution recording during translation submission and verification of dynamic team point updates.
   - `backend/tests/points_sync.test.js`: Test synchronization between `users.reputation` and `user_stats.points`.
2. **Manual & Visual Verification**:
   - Create an active event in Admin.
   - Verify Landing page replaces the *Interoperable* card with the visually prominent Active Event card.
   - Submit translations while joined to a team and confirm team points increase on leaderboard.
   - Delete team and event via Admin UI and confirm clean removal.
