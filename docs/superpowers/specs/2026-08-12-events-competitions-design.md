# Events & Competitions Feature Design Specification

**Date:** 2026-08-12  
**Status:** Approved Design Spec  
**Target Branch:** `feature/events-competitions`  

---

## 1. Overview & Objective

To increase user engagement and platform translation activity, the platform will introduce a time-bound, goal-oriented **Events & Competitions** feature. 

This feature enables admins to launch structured competitions where community members join flexible teams, contribute to specific translation categories or platform goals, track real-time leaderboards, and unlock custom profile rewards upon completion.

---

## 2. Core Technical Architecture & Database Schema

The implementation extends the existing Express.js backend and SQLite database (`backend/data/translations.db`).

### SQLite Schema (`backend/src/db/migrations/` & Database Initialization)

```sql
-- 1. Events Table
CREATE TABLE IF NOT EXISTS events (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    start_date TEXT NOT NULL, -- ISO8601 UTC string
    end_date TEXT NOT NULL,   -- ISO8601 UTC string
    target_category TEXT,     -- e.g. 'Benthic Biology' or 'ALL'
    status TEXT NOT NULL DEFAULT 'UPCOMING', -- 'UPCOMING' | 'ACTIVE' | 'ENDED' | 'CANCELLED'
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 2. Event Teams Table
CREATE TABLE IF NOT EXISTS event_teams (
    id TEXT PRIMARY KEY,
    event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    image_url TEXT,
    join_code TEXT NOT NULL UNIQUE, -- e.g. 'TM-CORAL-99' for QR deep linking
    created_by TEXT REFERENCES users(id),
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 3. Event Memberships Table (Supports team switching & single-team constraint per event)
CREATE TABLE IF NOT EXISTS event_memberships (
    id TEXT PRIMARY KEY,
    event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    team_id TEXT NOT NULL REFERENCES event_teams(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    joined_at TEXT NOT NULL DEFAULT (datetime('now')),
    is_active INTEGER NOT NULL DEFAULT 1 -- 1 = active team; 0 = historical team before switch
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_active_event_membership 
ON event_memberships (event_id, user_id) 
WHERE is_active = 1;

-- 4. Event Contributions Log Table
CREATE TABLE IF NOT EXISTS event_contributions (
    id TEXT PRIMARY KEY,
    event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    team_id TEXT NOT NULL REFERENCES event_teams(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    translation_id TEXT REFERENCES translations(id) ON DELETE SET NULL,
    action_type TEXT NOT NULL, -- 'TRANSLATION_CREATED' | 'TRANSLATION_APPROVED' | 'VOTE_CAST'
    points INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 5. Polymorphic Reward Engine Tables
CREATE TABLE IF NOT EXISTS event_rewards (
    id TEXT PRIMARY KEY,
    event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    reward_type TEXT NOT NULL DEFAULT 'TITLE', -- 'TITLE' | 'BADGE' | 'POINTS'
    name TEXT NOT NULL,                        -- e.g. 'Coral Champion 2026'
    metadata_json TEXT                         -- Holds extra icon URLs, badge properties, or points
);

CREATE TABLE IF NOT EXISTS user_rewards (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reward_id TEXT NOT NULL REFERENCES event_rewards(id) ON DELETE CASCADE,
    unlocked_at TEXT NOT NULL DEFAULT (datetime('now')),
    is_equipped INTEGER NOT NULL DEFAULT 0 -- 1 = currently displayed on profile
);

-- 6. User Email Preferences Table
CREATE TABLE IF NOT EXISTS user_email_preferences (
    user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    event_emails_enabled INTEGER NOT NULL DEFAULT 1,
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

---

## 3. REST API Specifications (`/api/events/*`)

### Endpoints Summary

| Endpoint | Method | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `/api/events` | `GET` | List all events (filtered by status: active, upcoming, past) | No |
| `/api/events/:id` | `GET` | Get detailed event metadata, metric goals, and leaderboards | No |
| `/api/events` | `POST` | Create a new event with goals and rewards | Admin |
| `/api/events/:id/teams` | `POST` | Create a team in an event | User |
| `/api/events/:id/teams/:teamId` | `PUT` | Update team details (name, image) | Team Creator / Admin |
| `/api/events/:id/join` | `POST` | Join or switch team (Body: `{ joinCode }` or `{ teamId }`) | User |
| `/api/events/:id/teams/:teamId` | `GET` | Get team dashboard, roster, and activity timeline | No |
| `/api/events/:id/qr` | `GET` | Return SVG/PNG QR Code for event or specific team join link | No |
| `/api/user/profile/titles` | `GET` | List user's unlocked titles | User |
| `/api/user/profile/equipped-title`| `PUT` | Equip or un-equip a profile title | User |

---

## 4. Scoring Engine & Leaderboard Logic

1. **Contribution Interception**:
   - Whenever a translation is submitted or approved, backend checks for `ACTIVE` events where `target_category` matches the term (or is `'ALL'`).
   - Inserts an `event_contributions` record tagged with the user's current active `team_id`.

2. **Scoring Criteria**:
   - **Primary Metric**: Total Validated/Approved Translations (`action_type = 'TRANSLATION_APPROVED'`).
   - **Secondary Metric**: Total Community Votes Cast (`action_type = 'VOTE_CAST'`).
   - **Tie-Breaker**: Timestamp of earliest contribution achieving the current top score.

3. **Team Membership Switch Rule**:
   - A user can belong to only **1 active team** per event at any time.
   - If a user scans another team's QR code and switches teams, their **past contributions stay credited to the team they belonged to when the contribution occurred**, while all new contributions credit their new team.

---

## 5. QR Code Deep-Linking & ORCID Onboarding

1. **QR Format**: QR codes render deep-link URLs:  
   `https://<domain>/events/<eventId>?joinCode=<teamJoinCode>`
2. **Guest Flow**:
   - Unauthenticated users land on the **Guest Preview Screen** showing event details, target goal, and team summary.
   - Prominent CTA: **"Sign in with ORCID to Join <Team Name>"**.
3. **OAuth Redirect Preservation**:
   - Clicking sign-in passes `returnTo=/events/<eventId>?joinCode=<teamJoinCode>` to `/api/auth/orcid`.
   - After successful authentication callback, the frontend auto-submits `POST /api/events/<eventId>/join` with `joinCode`.
   - User is joined seamlessly and redirected to their **Team Dashboard**.

---

## 6. Gamification, Profile Titles & Email Engine

### Reward Resolution & Profile Titles
- Upon reaching `end_date`, a scheduled job marks the event as `ENDED`, computes final rankings, and grants `event_rewards` to winning users.
- Users manage unlocked titles on their settings page.
- Equipped titles render as visual badges alongside user handles across the platform.

### Email Notification Engine (`node-cron` + Node Mailer)
- **Immediate Milestones**:
  - *Event Launch*: Broadcast to opted-in users when an event starts.
  - *Event Conclusion & Rewards*: Sent to participants announcing final rankings and unlocked titles.
- **Daily Digest**:
  - A scheduled cron job runs daily during active events.
  - Detects if team rank swaps occurred over the previous 24 hours (e.g. team moved from 2nd to 1st, or dropped to 2nd).
  - Sends a consolidated summary digest email.
- **User Control**: Opt-out toggle in user settings (`event_emails_enabled`).

---

## 7. Frontend UI Components (`frontend/src/`)

1. `EventsHubPage.tsx` (`/events`): List active, upcoming, and past competitions.
2. `EventDetailPage.tsx` (`/events/:id`): Real-time Leaderboard with Podium (1st, 2nd, 3rd place visual cards), team progress bars, and QR modal launcher.
3. `TeamDashboardPage.tsx` (`/events/:id/teams/:teamId`): Team roster, image editor, recent activity timeline, and shareable QR widget.
4. `ProfileTitleSelector.tsx`: Settings component to view unlocked titles and select equipped title.

---

## 8. Verification & Testing Strategy

- **Backend Integration Tests**: Unit and API tests covering database schema, team switching constraints, multi-metric scoring determinism, and reward granting.
- **Frontend Verification**: Production build validation (`npm run build`) and component unit testing.
