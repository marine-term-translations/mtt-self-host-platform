# Event Rewards & Profile Titles System Design

**Date**: 2026-08-17  
**Status**: Approved  
**Topic**: Competition Title Rewards, Automated Settlement, Profile Showcase, and Event Backlinks

---

## 1. Overview & Goals

The MTT platform supports time-bound vocabulary translation hackathons and events. To boost engagement and recognize community contributions, this feature implements an end-to-end **Reward and Title System**:
1. **Pre-Join Motivation**: Clearly displays the reward title (e.g. *"SeaDataNet Vocab Master 2026"*) on the Homepage Hero Card, Events Hub, and Event Detail Page before and during competition.
2. **Automated & Manual Settlement**: When an event concludes (`status === 'ENDED'`), members of the #1 winning team who contributed points are awarded the exclusive event title.
3. **Profile Showcase & Header Accolade**: Displays the equipped title under the user's name on their Profile Header, and showcases all earned titles in the Profile **Achievements** tab with full victory details and clickable links back to the original event page.
4. **Self-Service Title Equipping**: Allows users to equip, switch, or unequip their active title with instant feedback.

---

## 2. Architecture & Data Model

### 2.1 Database Tables & Relations

```
+-------------------------------------------------------------+
| events                                                      |
|   id: TEXT PRIMARY KEY (evt_...)                            |
|   title, description, start_date, end_date, status, ...     |
+-------------------------------------------------------------+
                            | 1
                            |
                            | 1..*
+---------------------------v---------------------------------+
| event_rewards                                               |
|   id: TEXT PRIMARY KEY (rew_...)                            |
|   event_id: TEXT REFERENCES events(id) ON DELETE CASCADE    |
|   reward_type: TEXT ('TITLE')                               |
|   name: TEXT ('SeaDataNet Vocab Master 2026')               |
|   created_at: DATETIME DEFAULT CURRENT_TIMESTAMP           |
+-------------------------------------------------------------+
                            | 1
                            |
                            | 0..*
+---------------------------v---------------------------------+
| user_rewards                                                |
|   id: TEXT PRIMARY KEY (urew_...)                           |
|   user_id: INTEGER REFERENCES users(id) ON DELETE CASCADE   |
|   reward_id: TEXT REFERENCES event_rewards(id)              |
|   is_equipped: INTEGER DEFAULT 0                            |
|   created_at: DATETIME DEFAULT CURRENT_TIMESTAMP           |
+-------------------------------------------------------------+
```

---

## 3. Backend Implementation

### 3.1 Settlement Engine (`backend/src/services/rewardService.js`)

* **`settleEventRewards(eventId)`**:
  1. Retrieves the event and its reward from `event_rewards WHERE event_id = ? AND reward_type = 'TITLE'`. If no reward exists, returns `{ settled: false, reason: "No reward defined" }`.
  2. Finds the winning team for this event:
     ```sql
     SELECT t.id, t.name, COALESCE(SUM(c.points), 0) as total_points
     FROM event_teams t
     LEFT JOIN event_contributions c ON t.id = c.team_id
     WHERE t.event_id = ?
     GROUP BY t.id
     HAVING total_points > 0
     ORDER BY total_points DESC
     LIMIT 1
     ```
  3. If no winning team with >0 points is found, returns `{ settled: false, reason: "No qualifying winning team" }`.
  4. Finds all distinct active members of the winning team who contributed points:
     ```sql
     SELECT DISTINCT m.user_id, COALESCE(SUM(c.points), 0) as user_points
     FROM event_memberships m
     JOIN event_contributions c ON m.team_id = c.team_id AND m.user_id = c.user_id AND c.event_id = ?
     WHERE m.event_id = ? AND m.team_id = ? AND m.is_active = 1 AND c.points > 0
     GROUP BY m.user_id
     ```
  5. For each winning user:
     * Checks if `user_rewards` already contains this `user_id` and `reward_id`.
     * If not present, inserts a new `user_rewards` row.
     * If user has no equipped title, automatically sets `is_equipped = 1`.
  6. Returns summary `{ settled: true, teamName, awardedCount, userIds }`.

* **`getUserTitles(userId)`**:
  * Returns all titles earned by the user with complete event metadata:
    ```sql
    SELECT ur.id as user_reward_id, ur.is_equipped, ur.created_at as awarded_at,
           r.id as reward_id, r.name as title_name,
           e.id as event_id, e.title as event_title, e.end_date as event_end_date,
           t.name as winning_team_name,
           COALESCE((SELECT SUM(points) FROM event_contributions WHERE event_id = e.id AND user_id = ur.user_id), 0) as user_points
    FROM user_rewards ur
    JOIN event_rewards r ON ur.reward_id = r.id
    JOIN events e ON r.event_id = e.id
    LEFT JOIN event_memberships m ON m.event_id = e.id AND m.user_id = ur.user_id AND m.is_active = 1
    LEFT JOIN event_teams t ON m.team_id = t.id
    WHERE ur.user_id = ? AND r.reward_type = 'TITLE'
    ORDER BY ur.created_at DESC
    ```

* **`equipUserTitle(userId, rewardId)`**:
  * Un-equips all titles for `userId`: `UPDATE user_rewards SET is_equipped = 0 WHERE user_id = ?`.
  * If `rewardId` is provided, sets `is_equipped = 1 WHERE user_id = ? AND reward_id = ?`.
  * Returns updated user titles.

### 3.2 API Routes & Controllers

* **`GET /api/users/:id/titles`**: Public endpoint returning user's earned titles.
* **`POST /api/users/titles/equip`**: Authenticated endpoint taking `{ rewardId: string | null }` to switch or unequip title.
* **`POST /api/events/:id/settle`**: Admin-authenticated endpoint to manually trigger settlement.
* **Auto-Settlement Hook**: Triggered in `eventService.updateEventStatus` when transitioning to `ENDED`.

---

## 4. Frontend UI/UX

### 4.1 Event Discovery & Pre-Join Reward Prominence

1. **Homepage Hero Card (`Landing.tsx`)**:
   * Shows `🏆 Win Title: "{event.reward_title}"` badge if a reward is registered.
2. **Events Hub (`EventsHubPage.tsx`)**:
   * Each event card renders a reward banner showing the prize title.
3. **Event Detail Page (`EventDetailPage.tsx`)**:
   * Prominently renders a **"🏆 Competition Reward & Title"** section with clear eligibility rules: *"Members of the 1st place team with active contributions will unlock this exclusive title on their profile."*
   * Displays the winning team celebrations if event has `ENDED`.

### 4.2 Profile Header & Achievements Tab (`UserProfile.tsx`)

1. **Profile Header**:
   * Renders the active equipped title directly under the display name as a trophy accolade pill: `🏆 {equippedTitle.name}`.
2. **Achievements Tab**:
   * Adds a **"🏆 Competition Titles & Honors"** card section above the standard badge grid.
   * Renders each earned title with:
     * Title Name & Trophy icon
     * Clickable link to the event: `Event: {event_title} →` (linking to `/events/${event_id}`)
     * Concluded date, Winning Team name, and Points contributed
     * "Equip Title" / "Equipped" toggle button (on own profile)

---

## 5. Verification & Testing

* **Backend Tests (`backend/tests/event_rewards.test.js`)**:
  * Test creating event with custom reward title.
  * Test point contributions across multiple teams.
  * Test settlement engine awarding title to winning team contributors.
  * Test user title listing and equip/unequip functionality.
* **Frontend Tests (`frontend/tests/event-titles-profile.test.js`)**:
  * Test event detail page reward title rendering.
  * Test profile header equipped title accolade rendering.
  * Test profile achievements tab titles list and event backlink navigation.
