# Event Rewards & Profile Titles Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement automated and manual competition reward title settlement, display prospective reward titles before and during events, and showcase earned titles with event backlinks on user profiles.

**Architecture:** Extend `backend/src/services/rewardService.js` with settlement and title retrieval logic. Expose user titles and title equipping endpoints via `userRoutes.js` / `eventRoutes.js`. Update frontend event views (`Landing.tsx`, `EventsHubPage.tsx`, `EventDetailPage.tsx`, `AdminEvents.tsx`) to show reward titles, and enhance `UserProfile.tsx` with a header accolade banner and an interactive competition titles section inside the Achievements tab.

**Tech Stack:** Node.js, Express, SQLite (better-sqlite3), React 18, TypeScript, Tailwind CSS, Lucide Icons.

---

### Task 1: Backend Reward Settlement Engine & Titles Data Access

**Files:**
- Modify: `backend/src/services/rewardService.js`
- Test: `backend/tests/event_rewards.test.js`

**Interfaces:**
- Produces:
  - `settleEventRewards(eventId: string): { settled: boolean, teamName?: string, awardedCount?: number, userIds?: number[] }`
  - `getUserTitles(userId: number | string): Array<{ user_reward_id: string, is_equipped: number, awarded_at: string, reward_id: string, title_name: string, event_id: string, event_title: string, event_end_date: string, winning_team_name: string, user_points: number }>`
  - `equipUserTitle(userId: number | string, rewardId: string | null): { success: boolean, equippedTitle: any }`

- [ ] **Step 1: Write the failing tests in `backend/tests/event_rewards.test.js`**

```javascript
const assert = require("assert");
const { getDatabase, applySchema, isDatabaseInitialized } = require("../src/db/database");
const eventService = require("../src/services/eventService");
const rewardService = require("../src/services/rewardService");

function testRewardSettlement() {
  if (!isDatabaseInitialized()) applySchema();
  const db = getDatabase();

  // Create test event with reward
  const evt = eventService.createEvent({
    title: "Championship Hackathon",
    startDate: "2026-08-01T00:00:00Z",
    endDate: "2026-08-10T23:59:59Z",
    rewardTitle: "Championship Master 2026"
  });

  const team1 = eventService.createTeam(evt.id, "Alpha Winners", null, 101);
  const team2 = eventService.createTeam(evt.id, "Beta Runners", null, 102);

  // Join teams
  eventService.joinTeam(evt.id, team1.join_code, 101);
  eventService.joinTeam(evt.id, team2.join_code, 102);

  // Add contributions (team1 has 50 pts, team2 has 20 pts)
  db.prepare(`
    INSERT INTO event_contributions (id, event_id, team_id, user_id, term_id, points)
    VALUES ('c1', ?, ?, 101, 'term-1', 50), ('c2', ?, ?, 102, 'term-2', 20)
  `).run(evt.id, team1.id, evt.id, team2.id);

  // Settle rewards
  const settleResult = rewardService.settleEventRewards(evt.id);
  assert.strictEqual(settleResult.settled, true);
  assert.strictEqual(settleResult.teamName, "Alpha Winners");
  assert.strictEqual(settleResult.awardedCount, 1);

  // Verify user 101 received the title and it was auto-equipped
  const titles101 = rewardService.getUserTitles(101);
  assert.strictEqual(titles101.length, 1);
  assert.strictEqual(titles101[0].title_name, "Championship Master 2026");
  assert.strictEqual(titles101[0].is_equipped, 1);
  assert.strictEqual(titles101[0].event_title, "Championship Hackathon");
  assert.strictEqual(titles101[0].winning_team_name, "Alpha Winners");
  assert.strictEqual(titles101[0].user_points, 50);

  // Verify user 102 did NOT receive the title
  const titles102 = rewardService.getUserTitles(102);
  assert.strictEqual(titles102.length, 0);

  // Test equipping/unequipping
  rewardService.equipUserTitle(101, null);
  const titlesAfterUnequip = rewardService.getUserTitles(101);
  assert.strictEqual(titlesAfterUnequip[0].is_equipped, 0);

  rewardService.equipUserTitle(101, titles101[0].reward_id);
  const titlesAfterReEquip = rewardService.getUserTitles(101);
  assert.strictEqual(titlesAfterReEquip[0].is_equipped, 1);

  console.log("✅ Event reward settlement & titles test passed!");
}

try {
  testRewardSettlement();
} catch (err) {
  console.error("FAIL:", err.message);
  process.exit(1);
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node backend/tests/event_rewards.test.js`
Expected: FAIL with `rewardService.settleEventRewards is not a function`

- [ ] **Step 3: Implement `settleEventRewards`, `getUserTitles`, and `equipUserTitle` in `backend/src/services/rewardService.js`**

```javascript
const { getDatabase } = require("../db/database");
const crypto = require("crypto");

function awardRewardToUser(userId, rewardId) {
  const db = getDatabase();
  const existing = db.prepare("SELECT * FROM user_rewards WHERE user_id = ? AND reward_id = ?").get(userId, rewardId);
  if (existing) return existing.id;

  const id = `urew_${crypto.randomUUID()}`;
  const hasEquipped = db.prepare("SELECT id FROM user_rewards WHERE user_id = ? AND is_equipped = 1").get(userId);
  const isEquipped = hasEquipped ? 0 : 1;

  db.prepare(`
    INSERT INTO user_rewards (id, user_id, reward_id, is_equipped)
    VALUES (?, ?, ?, ?)
  `).run(id, userId, rewardId, isEquipped);
  return id;
}

function settleEventRewards(eventId) {
  const db = getDatabase();
  const reward = db.prepare("SELECT * FROM event_rewards WHERE event_id = ? AND reward_type = 'TITLE'").get(eventId);
  if (!reward) {
    return { settled: false, reason: "No reward defined for this event" };
  }

  // Find winning team with highest total points > 0
  const winningTeam = db.prepare(`
    SELECT t.id, t.name, COALESCE(SUM(c.points), 0) as total_points
    FROM event_teams t
    LEFT JOIN event_contributions c ON t.id = c.team_id
    WHERE t.event_id = ?
    GROUP BY t.id
    HAVING total_points > 0
    ORDER BY total_points DESC
    LIMIT 1
  `).get(eventId);

  if (!winningTeam) {
    return { settled: false, reason: "No qualifying winning team with points" };
  }

  // Find active members of winning team who contributed points
  const winningUsers = db.prepare(`
    SELECT DISTINCT m.user_id, COALESCE(SUM(c.points), 0) as user_points
    FROM event_memberships m
    JOIN event_contributions c ON m.team_id = c.team_id AND m.user_id = c.user_id AND c.event_id = ?
    WHERE m.event_id = ? AND m.team_id = ? AND m.is_active = 1 AND c.points > 0
    GROUP BY m.user_id
  `).all(eventId, eventId, winningTeam.id);

  const awardedUserIds = [];
  for (const u of winningUsers) {
    awardRewardToUser(u.user_id, reward.id);
    awardedUserIds.push(u.user_id);
  }

  return {
    settled: true,
    teamName: winningTeam.name,
    awardedCount: awardedUserIds.length,
    userIds: awardedUserIds
  };
}

function getUserTitles(userId) {
  const db = getDatabase();
  return db.prepare(`
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
  `).all(userId);
}

function equipUserTitle(userId, rewardId) {
  const db = getDatabase();
  db.prepare(`
    UPDATE user_rewards 
    SET is_equipped = 0 
    WHERE user_id = ? AND reward_id IN (SELECT id FROM event_rewards WHERE reward_type = 'TITLE')
  `).run(userId);

  if (rewardId) {
    db.prepare("UPDATE user_rewards SET is_equipped = 1 WHERE user_id = ? AND reward_id = ?").run(userId, rewardId);
  }

  return { success: true, titles: getUserTitles(userId) };
}

module.exports = {
  awardRewardToUser,
  settleEventRewards,
  getUserTitles,
  equipUserTitle
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node backend/tests/event_rewards.test.js`
Expected: PASS with `✅ Event reward settlement & titles test passed!`

- [ ] **Step 5: Commit**

```bash
git add backend/src/services/rewardService.js backend/tests/event_rewards.test.js
git commit -m "feat(backend): add reward settlement engine and user titles queries"
```

---

### Task 2: Backend Routes, Auto-Settlement Trigger & Controllers

**Files:**
- Modify: `backend/src/services/eventService.js` (include `reward_title` in queries & trigger `settleEventRewards` on ENDED)
- Modify: `backend/src/controllers/eventController.js` (add `settleEvent`, `getUserTitles`, `equipTitle`)
- Modify: `backend/src/routes/eventRoutes.js` and `backend/src/routes/user.routes.js`
- Test: `backend/tests/event_api.test.js`

- [ ] **Step 1: Write integration tests for titles API and event settlement in `backend/tests/event_api.test.js`**

```javascript
// Test GET /api/users/:id/titles and settlement endpoint
```

- [ ] **Step 2: Update `eventService.js` to attach `reward_title` to events and trigger settlement when status becomes ENDED**

```javascript
// in getAllEvents and getEventById:
// e.reward_title = (SELECT name FROM event_rewards WHERE event_id = e.id AND reward_type = 'TITLE' LIMIT 1)
// in updateEventStatus:
// if (status === 'ENDED') rewardService.settleEventRewards(eventId);
```

- [ ] **Step 3: Add routes and controller actions**

```javascript
// In eventRoutes.js:
// addRoute("post", "/events/:id/settle", eventController.settleEvent);
// In user.routes.js / eventRoutes.js:
// addRoute("get", "/users/:id/titles", eventController.getUserTitles);
// addRoute("post", "/users/titles/equip", eventController.equipUserTitle);
```

- [ ] **Step 4: Run backend tests**

Run: `npm test --prefix backend`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/src/services/eventService.js backend/src/controllers/eventController.js backend/src/routes/eventRoutes.js backend/src/routes/user.routes.js backend/tests/event_api.test.js
git commit -m "feat(backend): add titles API, event reward settlement endpoints and auto-trigger on ENDED"
```

---

### Task 3: Frontend Types & API Client Services

**Files:**
- Modify: `frontend/types.ts`
- Modify: `frontend/services/api.ts`
- Modify: `frontend/services/eventApi.ts`

- [ ] **Step 1: Update `frontend/types.ts` to include `UserTitle` and `reward_title` on `Event`**

```typescript
export interface UserTitle {
  user_reward_id: string;
  is_equipped: number;
  awarded_at: string;
  reward_id: string;
  title_name: string;
  event_id: string;
  event_title: string;
  event_end_date: string;
  winning_team_name: string;
  user_points: number;
}

export interface Event {
  // ... existing fields
  reward_title?: string;
}
```

- [ ] **Step 2: Add API methods to `eventApi.ts` and `api.ts`**

```typescript
export async function fetchUserTitles(userId: number | string): Promise<UserTitle[]> {
  return backendApi.get<UserTitle[]>(`/users/${userId}/titles`);
}

export async function equipUserTitle(rewardId: string | null): Promise<{ success: boolean; titles: UserTitle[] }> {
  return backendApi.post<{ success: boolean; titles: UserTitle[] }>("/users/titles/equip", { rewardId });
}

export async function settleEventRewards(eventId: string): Promise<{ settled: boolean; teamName?: string; awardedCount?: number }> {
  return backendApi.post<{ settled: boolean; teamName?: string; awardedCount?: number }>(`/events/${eventId}/settle`, {});
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/types.ts frontend/services/api.ts frontend/services/eventApi.ts
git commit -m "feat(frontend): add UserTitle interface and titles API client methods"
```

---

### Task 4: Pre-Join Event Reward Visibility Across Event Pages

**Files:**
- Modify: `frontend/pages/Landing.tsx`
- Modify: `frontend/pages/EventsHubPage.tsx`
- Modify: `frontend/pages/EventDetailPage.tsx`
- Modify: `frontend/pages/admin/AdminEvents.tsx`

- [ ] **Step 1: Update `Landing.tsx` Hero Card to display `🏆 Win Title: "{activeEvent.reward_title}"`**
- [ ] **Step 2: Update `EventsHubPage.tsx` competition cards to show prize title badge**
- [ ] **Step 3: Update `EventDetailPage.tsx` with dedicated "🏆 Competition Reward & Title" card with eligibility explanation**
- [ ] **Step 4: Update `AdminEvents.tsx` to display prize titles and add "🏆 Settle & Distribute Titles" button for ENDED events**
- [ ] **Step 5: Commit**

```bash
git add frontend/pages/Landing.tsx frontend/pages/EventsHubPage.tsx frontend/pages/EventDetailPage.tsx frontend/pages/admin/AdminEvents.tsx
git commit -m "feat(frontend): show competition reward titles in Landing, EventsHub, EventDetail, and Admin"
```

---

### Task 5: User Profile Header Accolade & Achievements Tab Titles Showcase

**Files:**
- Modify: `frontend/pages/UserProfile.tsx`

- [ ] **Step 1: Fetch user titles in `UserProfile.tsx` on mount and profile change**
- [ ] **Step 2: Render equipped title accolade banner beneath user name in profile header**
- [ ] **Step 3: Render "🏆 Competition Titles & Honors" section inside Achievements tab with victory details, clickable event backlink, and Equip/Unequip buttons**
- [ ] **Step 4: Commit**

```bash
git add frontend/pages/UserProfile.tsx
git commit -m "feat(frontend): add equipped title accolade header and competition titles showcase with event backlinks"
```

---

### Task 6: Automated Integration & Regression Tests

**Files:**
- Create: `frontend/tests/event-titles-profile.test.js`

- [ ] **Step 1: Write full test suite in `frontend/tests/event-titles-profile.test.js`**
- [ ] **Step 2: Run all backend and frontend tests**
- [ ] **Step 3: Run production build `npm run build --prefix frontend`**
- [ ] **Step 4: Commit**

```bash
git add frontend/tests/event-titles-profile.test.js
git commit -m "test: add automated integration tests for event reward titles and profile showcase"
```
