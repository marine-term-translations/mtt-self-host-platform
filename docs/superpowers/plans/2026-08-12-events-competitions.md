# Events & Competitions Feature Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a complete, time-bound "Events & Competitions" feature allowing users to join flexible teams, participate in target metric translation challenges, view real-time visual leaderboards, scan QR codes for deep-link onboarding, earn profile titles/rewards, and receive automated milestone/digest emails.

**Architecture:** Extend SQLite database with 6 event tables, create REST endpoints under `/api/events/*`, intercept translation creation/approval for multi-metric event scoring, implement a polymorphic reward engine for profile title equipping, add a hybrid `node-cron` email service, and construct Vite+React frontend pages (`/events`, `/events/:id`, `/events/:id/teams/:teamId`).

**Tech Stack:** Node.js 20, Express.js, SQLite (`better-sqlite3`), `node-cron`, `qrcode`, React 18, TypeScript, Tailwind CSS, Vite.

## Global Constraints

- Database: SQLite via `better-sqlite3` in `backend/src/db/`. Use integer primary keys for foreign key references matching `users(id)` and `translations(id)`.
- Backend Auth: Passport.js ORCID OAuth session middleware.
- QR Code: Render SVG / PNG data URLs via `qrcode` / `qrcode.react`.
- Email: Hybrid notification strategy (Immediate for Event Launch & Victory; Daily digest for rank changes) with user opt-out toggle.
- Code style & testing: Strict TDD workflow (failing test -> implementation -> pass -> commit) for backend services.

---

### Task 1: Database Migration & Schema Setup for Events

**Files:**
- Modify: `backend/src/db/migrations/schema.sql`
- Modify: `backend/src/db/database.js`
- Test: `backend/tests/events_db.test.js`

**Interfaces:**
- Consumes: Existing SQLite connection via `getDatabase()` in `backend/src/db/database.js`
- Produces: Tables `events`, `event_teams`, `event_memberships`, `event_contributions`, `event_rewards`, `user_rewards`, `user_email_preferences`

- [ ] **Step 1: Write the failing database integration test**

Create `backend/tests/events_db.test.js`:
```javascript
const { getDatabase, applySchema } = require("../src/db/database");

describe("Events Database Schema", () => {
  beforeAll(() => {
    applySchema();
  });

  test("creates event and team tables successfully", () => {
    const db = getDatabase();
    
    // Insert test event
    const stmtEvent = db.prepare(`
      INSERT INTO events (id, title, description, start_date, end_date, target_category, status)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    stmtEvent.run("evt-1", "Marine Bio Challenge", "Translate benthic terms", "2026-08-01T00:00:00Z", "2026-08-31T23:59:59Z", "Marine Biology", "ACTIVE");

    const fetchedEvent = db.prepare("SELECT * FROM events WHERE id = ?").get("evt-1");
    expect(fetchedEvent.title).toBe("Marine Bio Challenge");

    // Insert test team
    const stmtTeam = db.prepare(`
      INSERT INTO event_teams (id, event_id, name, join_code)
      VALUES (?, ?, ?, ?)
    `);
    stmtTeam.run("team-1", "evt-1", "Team Coral", "TM-CORAL-99");

    const fetchedTeam = db.prepare("SELECT * FROM event_teams WHERE id = ?").get("team-1");
    expect(fetchedTeam.name).toBe("Team Coral");
    expect(fetchedTeam.join_code).toBe("TM-CORAL-99");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest backend/tests/events_db.test.js`
Expected: FAIL with "no such table: events"

- [ ] **Step 3: Add schema definitions to `schema.sql`**

Append to `backend/src/db/migrations/schema.sql`:
```sql
-- Events Feature Schema additions
CREATE TABLE IF NOT EXISTS events (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    start_date TEXT NOT NULL,
    end_date TEXT NOT NULL,
    target_category TEXT,
    status TEXT NOT NULL DEFAULT 'UPCOMING' CHECK(status IN ('UPCOMING', 'ACTIVE', 'ENDED', 'CANCELLED')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS event_teams (
    id TEXT PRIMARY KEY,
    event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    image_url TEXT,
    join_code TEXT NOT NULL UNIQUE,
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS event_memberships (
    id TEXT PRIMARY KEY,
    event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    team_id TEXT NOT NULL REFERENCES event_teams(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    is_active INTEGER NOT NULL DEFAULT 1 CHECK(is_active IN (0, 1))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_active_event_membership 
ON event_memberships (event_id, user_id) 
WHERE is_active = 1;

CREATE TABLE IF NOT EXISTS event_contributions (
    id TEXT PRIMARY KEY,
    event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    team_id TEXT NOT NULL REFERENCES event_teams(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    translation_id INTEGER REFERENCES translations(id) ON DELETE SET NULL,
    action_type TEXT NOT NULL CHECK(action_type IN ('TRANSLATION_CREATED', 'TRANSLATION_APPROVED', 'VOTE_CAST')),
    points INTEGER NOT NULL DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS event_rewards (
    id TEXT PRIMARY KEY,
    event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    reward_type TEXT NOT NULL DEFAULT 'TITLE' CHECK(reward_type IN ('TITLE', 'BADGE', 'POINTS')),
    name TEXT NOT NULL,
    metadata_json TEXT
);

CREATE TABLE IF NOT EXISTS user_rewards (
    id TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reward_id TEXT NOT NULL REFERENCES event_rewards(id) ON DELETE CASCADE,
    unlocked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    is_equipped INTEGER NOT NULL DEFAULT 0 CHECK(is_equipped IN (0, 1))
);

CREATE TABLE IF NOT EXISTS user_email_preferences (
    user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    event_emails_enabled INTEGER NOT NULL DEFAULT 1 CHECK(event_emails_enabled IN (0, 1)),
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest backend/tests/events_db.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/src/db/migrations/schema.sql backend/tests/events_db.test.js
git commit -m "feat(db): add database tables and indexes for events feature"
```

---

### Task 2: Events & Teams Backend API Service & Controllers

**Files:**
- Create: `backend/src/services/eventService.js`
- Create: `backend/src/controllers/eventController.js`
- Create: `backend/src/routes/eventRoutes.js`
- Modify: `backend/src/app.js`
- Test: `backend/tests/event_api.test.js`

**Interfaces:**
- Consumes: `getDatabase()` from `backend/src/db/database.js`
- Produces: API endpoints `/api/events`, `/api/events/:id`, `/api/events/:id/join`, `/api/events/:id/teams`, `/api/events/:id/qr`

- [ ] **Step 1: Write failing API endpoint test**

Create `backend/tests/event_api.test.js`:
```javascript
const request = require("supertest");
const app = require("../src/app");
const { getDatabase, applySchema } = require("../src/db/database");

describe("Event API Endpoints", () => {
  beforeAll(() => {
    applySchema();
    const db = getDatabase();
    db.prepare(`
      INSERT INTO events (id, title, description, start_date, end_date, target_category, status)
      VALUES ('evt-test-1', 'Summer Translation Rally', 'Translate marine species', '2026-08-01T00:00:00Z', '2026-08-31T23:59:59Z', 'ALL', 'ACTIVE')
    `).run();
    db.prepare(`
      INSERT INTO event_teams (id, event_id, name, join_code)
      VALUES ('team-test-1', 'evt-test-1', 'Ocean Defenders', 'TM-OD-100')
    `).run();
  });

  test("GET /api/events returns list of events", async () => {
    const res = await request(app).get("/api/events");
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
    expect(res.body[0].id).toBe("evt-test-1");
  });

  test("GET /api/events/:id returns event details with leaderboard", async () => {
    const res = await request(app).get("/api/events/evt-test-1");
    expect(res.statusCode).toBe(200);
    expect(res.body.id).toBe("evt-test-1");
    expect(Array.isArray(res.body.teams)).toBe(true);
    expect(res.body.teams[0].name).toBe("Ocean Defenders");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest backend/tests/event_api.test.js`
Expected: FAIL with 404 Not Found

- [ ] **Step 3: Implement `eventService.js` and `eventController.js`**

Create `backend/src/services/eventService.js`:
```javascript
const { getDatabase } = require("../db/database");
const crypto = require("crypto");

function getAllEvents() {
  const db = getDatabase();
  return db.prepare("SELECT * FROM events ORDER BY start_date DESC").all();
}

function getEventById(eventId) {
  const db = getDatabase();
  const event = db.prepare("SELECT * FROM events WHERE id = ?").get(eventId);
  if (!event) return null;

  const teams = db.prepare(`
    SELECT t.*, 
           COUNT(DISTINCT m.user_id) as member_count,
           COALESCE(SUM(c.points), 0) as total_points
    FROM event_teams t
    LEFT JOIN event_memberships m ON t.id = m.team_id AND m.is_active = 1
    LEFT JOIN event_contributions c ON t.id = c.team_id
    WHERE t.event_id = ?
    GROUP BY t.id
    ORDER BY total_points DESC
  `).all(eventId);

  return { ...event, teams };
}

function createTeam(eventId, name, imageUrl, createdByUserId) {
  const db = getDatabase();
  const id = `team_${crypto.randomUUID()}`;
  const joinCode = `TM-${name.substring(0, 4).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;
  
  db.prepare(`
    INSERT INTO event_teams (id, event_id, name, image_url, join_code, created_by)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(id, eventId, name, imageUrl || null, joinCode, createdByUserId || null);

  return db.prepare("SELECT * FROM event_teams WHERE id = ?").get(id);
}

function joinTeam(eventId, identifier, userId) {
  const db = getDatabase();
  
  // Find team by team_id or join_code
  let team = db.prepare("SELECT * FROM event_teams WHERE event_id = ? AND (id = ? OR join_code = ?)").get(eventId, identifier, identifier);
  if (!team) throw new Error("Team not found");

  // Deactivate any existing team membership for this user in this event
  db.prepare("UPDATE event_memberships SET is_active = 0 WHERE event_id = ? AND user_id = ?").run(eventId, userId);

  // Insert new active membership
  const membershipId = `mem_${crypto.randomUUID()}`;
  db.prepare(`
    INSERT INTO event_memberships (id, event_id, team_id, user_id, is_active)
    VALUES (?, ?, ?, ?, 1)
  `).run(membershipId, eventId, team.id, userId);

  return { success: true, teamId: team.id, teamName: team.name };
}

module.exports = {
  getAllEvents,
  getEventById,
  createTeam,
  joinTeam
};
```

Create `backend/src/controllers/eventController.js`:
```javascript
const eventService = require("../services/eventService");
const QRCode = require("qrcode");

async function listEvents(req, res) {
  try {
    const events = eventService.getAllEvents();
    res.json(events);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function getEvent(req, res) {
  try {
    const event = eventService.getEventById(req.params.id);
    if (!event) return res.status(404).json({ error: "Event not found" });
    res.json(event);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function createTeam(req, res) {
  try {
    const { name, imageUrl } = req.body;
    const userId = req.user ? req.user.id : null;
    const team = eventService.createTeam(req.params.id, name, imageUrl, userId);
    res.status(201).json(team);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

async function joinTeam(req, res) {
  try {
    const { joinCode, teamId } = req.body;
    const identifier = joinCode || teamId;
    const userId = req.user ? req.user.id : req.body.userId;
    if (!userId) return res.status(401).json({ error: "Authentication required to join team" });
    
    const result = eventService.joinTeam(req.params.id, identifier, userId);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

async function generateQR(req, res) {
  try {
    const { joinCode } = req.query;
    const targetUrl = `${req.protocol}://${req.get("host")}/events/${req.params.id}${joinCode ? `?joinCode=${joinCode}` : ""}`;
    const qrSvg = await QRCode.toString(targetUrl, { type: "svg" });
    res.type("image/svg+xml").send(qrSvg);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = {
  listEvents,
  getEvent,
  createTeam,
  joinTeam,
  generateQR
};
```

Create `backend/src/routes/eventRoutes.js`:
```javascript
const express = require("express");
const router = express.Router();
const eventController = require("../controllers/eventController");

router.get("/", eventController.listEvents);
router.get("/:id", eventController.getEvent);
router.post("/:id/teams", eventController.createTeam);
router.post("/:id/join", eventController.joinTeam);
router.get("/:id/qr", eventController.generateQR);

module.exports = router;
```

Modify `backend/src/app.js` to register `/api/events`:
```javascript
const eventRoutes = require("./routes/eventRoutes");
app.use("/api/events", eventRoutes);
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest backend/tests/event_api.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/src/services/eventService.js backend/src/controllers/eventController.js backend/src/routes/eventRoutes.js backend/src/app.js backend/tests/event_api.test.js
git commit -m "feat(api): add event listing, team creation, team joining, and QR code generation endpoints"
```

---

### Task 3: Scoring Interceptor & Leaderboard Engine

**Files:**
- Create: `backend/src/services/scoringService.js`
- Modify: `backend/src/routes/translationRoutes.js` (or translation controllers)
- Test: `backend/tests/event_scoring.test.js`

**Interfaces:**
- Consumes: Translation creation & voting actions
- Produces: `recordEventContribution(userId, translationId, actionType, category)`

- [ ] **Step 1: Write failing scoring test**

Create `backend/tests/event_scoring.test.js`:
```javascript
const scoringService = require("../src/services/scoringService");
const { getDatabase, applySchema } = require("../src/db/database");

describe("Event Scoring Engine", () => {
  beforeAll(() => {
    applySchema();
    const db = getDatabase();
    db.prepare("INSERT INTO users (id, username) VALUES (1, 'marine_user')").run();
    db.prepare(`
      INSERT INTO events (id, title, start_date, end_date, target_category, status)
      VALUES ('evt-score-1', 'Scoring Event', '2026-08-01T00:00:00Z', '2026-08-31T23:59:59Z', 'ALL', 'ACTIVE')
    `).run();
    db.prepare(`
      INSERT INTO event_teams (id, event_id, name, join_code)
      VALUES ('team-score-1', 'evt-score-1', 'Score Team', 'TM-SC-01')
    `).run();
    db.prepare(`
      INSERT INTO event_memberships (id, event_id, team_id, user_id, is_active)
      VALUES ('mem-score-1', 'evt-score-1', 'team-score-1', 1, 1)
    `).run();
  });

  test("records contribution for active event team member", () => {
    const recorded = scoringService.recordEventContribution(1, 101, 'TRANSLATION_APPROVED', 'ALL');
    expect(recorded.length).toBe(1);
    expect(recorded[0].team_id).toBe('team-score-1');

    const db = getDatabase();
    const contr = db.prepare("SELECT * FROM event_contributions WHERE user_id = 1").all();
    expect(contr.length).toBe(1);
    expect(contr[0].points).toBe(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest backend/tests/event_scoring.test.js`
Expected: FAIL with "scoringService.recordEventContribution is not a function"

- [ ] **Step 3: Implement `scoringService.js`**

Create `backend/src/services/scoringService.js`:
```javascript
const { getDatabase } = require("../db/database");
const crypto = require("crypto");

function recordEventContribution(userId, translationId, actionType, category = 'ALL') {
  const db = getDatabase();

  // Find all active events matching the category
  const activeEvents = db.prepare(`
    SELECT e.id as event_id, m.team_id
    FROM events e
    JOIN event_memberships m ON e.id = m.event_id AND m.user_id = ? AND m.is_active = 1
    WHERE e.status = 'ACTIVE'
      AND (e.target_category = 'ALL' OR e.target_category = ?)
  `).all(userId, category);

  const inserted = [];
  const stmt = db.prepare(`
    INSERT INTO event_contributions (id, event_id, team_id, user_id, translation_id, action_type, points)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const pointsMap = {
    'TRANSLATION_APPROVED': 10,
    'TRANSLATION_CREATED': 5,
    'VOTE_CAST': 2
  };
  const points = pointsMap[actionType] || 1;

  for (const ev of activeEvents) {
    const id = `cnt_${crypto.randomUUID()}`;
    stmt.run(id, ev.event_id, ev.team_id, userId, translationId || null, actionType, points);
    inserted.push({ id, event_id: ev.event_id, team_id: ev.team_id, points });
  }

  return inserted;
}

module.exports = {
  recordEventContribution
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest backend/tests/event_scoring.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/src/services/scoringService.js backend/tests/event_scoring.test.js
git commit -m "feat(scoring): add contribution interceptor and multi-metric event scoring"
```

---

### Task 4: Reward Engine & User Profile Title Endpoints

**Files:**
- Create: `backend/src/services/rewardService.js`
- Modify: `backend/src/routes/userRoutes.js` (or user controller)
- Test: `backend/tests/event_rewards.test.js`

**Interfaces:**
- Consumes: `user_rewards` table and event conclusion events
- Produces: `grantEventRewards(eventId)`, `getUserTitles(userId)`, `equipUserTitle(userId, rewardId)`

- [ ] **Step 1: Write failing reward test**

Create `backend/tests/event_rewards.test.js`:
```javascript
const rewardService = require("../src/services/rewardService");
const { getDatabase, applySchema } = require("../src/db/database");

describe("Polymorphic Reward Engine", () => {
  beforeAll(() => {
    applySchema();
    const db = getDatabase();
    db.prepare("INSERT INTO users (id, username) VALUES (10, 'champion_user')").run();
    db.prepare(`
      INSERT INTO events (id, title, start_date, end_date, status)
      VALUES ('evt-rew-1', 'Title Challenge', '2026-08-01T00:00:00Z', '2026-08-31T23:59:59Z', 'ENDED')
    `).run();
    db.prepare(`
      INSERT INTO event_rewards (id, event_id, reward_type, name)
      VALUES ('rew-1', 'evt-rew-1', 'TITLE', 'Coral Vocab Champion 2026')
    `).run();
  });

  test("grants and equips profile titles", () => {
    rewardService.awardRewardToUser(10, 'rew-1');
    const titles = rewardService.getUserTitles(10);
    expect(titles.length).toBe(1);
    expect(titles[0].name).toBe('Coral Vocab Champion 2026');

    const equipped = rewardService.equipUserTitle(10, 'rew-1');
    expect(equipped.is_equipped).toBe(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest backend/tests/event_rewards.test.js`
Expected: FAIL with "rewardService.awardRewardToUser is not a function"

- [ ] **Step 3: Implement `rewardService.js`**

Create `backend/src/services/rewardService.js`:
```javascript
const { getDatabase } = require("../db/database");
const crypto = require("crypto");

function awardRewardToUser(userId, rewardId) {
  const db = getDatabase();
  const id = `urew_${crypto.randomUUID()}`;
  db.prepare(`
    INSERT INTO user_rewards (id, user_id, reward_id, is_equipped)
    VALUES (?, ?, ?, 0)
  `).run(id, userId, rewardId);
  return id;
}

function getUserTitles(userId) {
  const db = getDatabase();
  return db.prepare(`
    SELECT ur.id as user_reward_id, ur.is_equipped, r.*
    FROM user_rewards ur
    JOIN event_rewards r ON ur.reward_id = r.id
    WHERE ur.user_id = ? AND r.reward_type = 'TITLE'
  `).all(userId);
}

function equipUserTitle(userId, rewardId) {
  const db = getDatabase();
  // Unequip all existing titles for this user
  db.prepare(`
    UPDATE user_rewards 
    SET is_equipped = 0 
    WHERE user_id = ? AND reward_id IN (SELECT id FROM event_rewards WHERE reward_type = 'TITLE')
  `).run(userId);

  // Equip target title if provided
  if (rewardId) {
    db.prepare("UPDATE user_rewards SET is_equipped = 1 WHERE user_id = ? AND reward_id = ?").run(userId, rewardId);
  }

  return db.prepare("SELECT * FROM user_rewards WHERE user_id = ? AND reward_id = ?").get(userId, rewardId);
}

module.exports = {
  awardRewardToUser,
  getUserTitles,
  equipUserTitle
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest backend/tests/event_rewards.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/src/services/rewardService.js backend/tests/event_rewards.test.js
git commit -m "feat(rewards): implement title reward granting and profile equip endpoints"
```

---

### Task 5: Automated Email Engine & Daily Cron Scheduler

**Files:**
- Create: `backend/src/services/eventEmailService.js`
- Create: `backend/src/services/cronScheduler.js`
- Test: `backend/tests/event_email.test.js`

**Interfaces:**
- Consumes: Event rank changes & status transitions
- Produces: Daily snapshot digests and immediate launch/winner email dispatching

- [ ] **Step 1: Write failing email service test**

Create `backend/tests/event_email.test.js`:
```javascript
const eventEmailService = require("../src/services/eventEmailService");

describe("Event Email Service", () => {
  test("generates digest template for rank changes", () => {
    const emailContent = eventEmailService.buildRankChangeDigest("Team Coral", 1, 2, "Marine Bio Rally");
    expect(emailContent.subject).toContain("Marine Bio Rally");
    expect(emailContent.body).toContain("Team Coral");
    expect(emailContent.body).toContain("2nd place");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest backend/tests/event_email.test.js`
Expected: FAIL with "eventEmailService.buildRankChangeDigest is not a function"

- [ ] **Step 3: Implement `eventEmailService.js` and `cronScheduler.js`**

Create `backend/src/services/eventEmailService.js`:
```javascript
function buildRankChangeDigest(teamName, oldRank, newRank, eventTitle) {
  const subject = `[${eventTitle}] Team Standings Update: ${teamName}`;
  const body = `Hello! Your team "${teamName}" in the competition "${eventTitle}" has moved from rank ${oldRank} to rank ${newRank}.\n\nKeep contributing translations to reach 1st place!`;
  return { subject, body };
}

function buildEventWinnerNotice(teamName, eventTitle, titleRewardName) {
  const subject = `🎉 Congratulations! Your team won ${eventTitle}`;
  const body = `Great news! Team "${teamName}" took 1st place in "${eventTitle}". You have unlocked the profile title: "${titleRewardName}".`;
  return { subject, body };
}

module.exports = {
  buildRankChangeDigest,
  buildEventWinnerNotice
};
```

Create `backend/src/services/cronScheduler.js`:
```javascript
const cron = require("node-cron");
const { getDatabase } = require("../db/database");
const eventService = require("./eventService");

function initCronJobs() {
  // Run daily at midnight: 0 0 * * *
  cron.schedule("0 0 * * *", () => {
    console.log("[Cron] Running daily event status check and rank digests...");
    const db = getDatabase();
    const nowISO = new Date().toISOString();

    // Transition UPCOMING -> ACTIVE
    db.prepare("UPDATE events SET status = 'ACTIVE' WHERE status = 'UPCOMING' AND start_date <= ?").run(nowISO);

    // Transition ACTIVE -> ENDED
    db.prepare("UPDATE events SET status = 'ENDED' WHERE status = 'ACTIVE' AND end_date <= ?").run(nowISO);
  });
}

module.exports = { initCronJobs };
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest backend/tests/event_email.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/src/services/eventEmailService.js backend/src/services/cronScheduler.js backend/tests/event_email.test.js
git commit -m "feat(email): add event email template builders and node-cron daily scheduler"
```

---

### Task 6: Frontend API Service & Event Types

**Files:**
- Modify: `frontend/types.ts`
- Create: `frontend/services/eventApi.ts`
- Test: `frontend/tests/eventApi.test.ts`

**Interfaces:**
- Consumes: Backend REST API `/api/events`
- Produces: TypeScript interfaces (`Event`, `EventTeam`, `EventContribution`, `UserTitle`) and API helper functions

- [ ] **Step 1: Write failing frontend types/api test**

Create `frontend/tests/eventApi.test.ts`:
```typescript
import { fetchEvents } from "../services/eventApi";

describe("Frontend Event API Service", () => {
  test("fetchEvents function is exported", () => {
    expect(typeof fetchEvents).toBe("function");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest frontend/tests/eventApi.test.ts`
Expected: FAIL with "Cannot find module '../services/eventApi'"

- [ ] **Step 3: Update `types.ts` and create `eventApi.ts`**

Append to `frontend/types.ts`:
```typescript
export interface EventTeam {
  id: string;
  event_id: string;
  name: string;
  image_url?: string;
  join_code: string;
  member_count?: number;
  total_points?: number;
}

export interface Event {
  id: string;
  title: string;
  description: string;
  start_date: string;
  end_date: string;
  target_category?: string;
  status: 'UPCOMING' | 'ACTIVE' | 'ENDED' | 'CANCELLED';
  teams?: EventTeam[];
}

export interface UserTitle {
  user_reward_id: string;
  reward_id: string;
  name: string;
  is_equipped: number;
}
```

Create `frontend/services/eventApi.ts`:
```typescript
import { Event, EventTeam, UserTitle } from "../types";

const API_BASE = "/api/events";

export async function fetchEvents(): Promise<Event[]> {
  const res = await fetch(API_BASE);
  if (!res.ok) throw new Error("Failed to fetch events");
  return res.json();
}

export async function fetchEventDetails(eventId: string): Promise<Event> {
  const res = await fetch(`${API_BASE}/${eventId}`);
  if (!res.ok) throw new Error("Failed to fetch event details");
  return res.json();
}

export async function joinEventTeam(eventId: string, joinCode: string): Promise<{ success: boolean; teamId: string }> {
  const res = await fetch(`${API_BASE}/${eventId}/join`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ joinCode })
  });
  if (!res.ok) throw new Error("Failed to join team");
  return res.json();
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest frontend/tests/eventApi.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/types.ts frontend/services/eventApi.ts frontend/tests/eventApi.test.ts
git commit -m "feat(frontend): define event TypeScript types and REST client API service"
```

---

### Task 7: Frontend Events Hub & Detail Leaderboard Pages (`/events`, `/events/:id`)

**Files:**
- Create: `frontend/pages/EventsHubPage.tsx`
- Create: `frontend/pages/EventDetailPage.tsx`
- Create: `frontend/components/QRCodeModal.tsx`
- Modify: `frontend/App.tsx`

**Interfaces:**
- Consumes: `fetchEvents`, `fetchEventDetails`, `joinEventTeam`
- Produces: Visual Leaderboard page with Top-3 Podium, Team listing, and QR modal generator

- [ ] **Step 1: Implement `QRCodeModal.tsx`**

Create `frontend/components/QRCodeModal.tsx`:
```tsx
import React from "react";

interface QRCodeModalProps {
  eventId: string;
  joinCode?: string;
  onClose: () => void;
}

export const QRCodeModal: React.FC<QRCodeModalProps> = ({ eventId, joinCode, onClose }) => {
  const qrUrl = `/api/events/${eventId}/qr${joinCode ? `?joinCode=${joinCode}` : ""}`;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 max-w-sm w-full text-center shadow-2xl">
        <h3 className="text-xl font-bold text-white mb-2">Scan to Join</h3>
        <p className="text-sm text-slate-400 mb-4">Point your camera to join this competition team instantly</p>
        <div className="bg-white p-4 rounded-lg inline-block mb-4">
          <img src={qrUrl} alt="Join QR Code" className="w-48 h-48 mx-auto" />
        </div>
        <button
          onClick={onClose}
          className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-medium transition"
        >
          Close
        </button>
      </div>
    </div>
  );
};
```

- [ ] **Step 2: Implement `EventsHubPage.tsx`**

Create `frontend/pages/EventsHubPage.tsx`:
```tsx
import React, { useEffect, useState } from "react";
import { fetchEvents } from "../services/eventApi";
import { Event } from "../types";

export const EventsHubPage: React.FC = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEvents()
      .then(setEvents)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-8 text-center text-white">Loading events...</div>;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-white mb-6">Competitions & Events</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {events.map((event) => (
          <div key={event.id} className="bg-slate-800/80 border border-slate-700 rounded-xl p-6 shadow-lg">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-xl font-semibold text-white">{event.title}</h2>
              <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                event.status === 'ACTIVE' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-slate-700 text-slate-300'
              }`}>
                {event.status}
              </span>
            </div>
            <p className="text-slate-300 text-sm mb-4">{event.description}</p>
            <a
              href={`#/events/${event.id}`}
              className="inline-block px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-medium rounded-lg transition"
            >
              View Leaderboard & Teams
            </a>
          </div>
        ))}
      </div>
    </div>
  );
};
```

- [ ] **Step 3: Implement `EventDetailPage.tsx`**

Create `frontend/pages/EventDetailPage.tsx`:
```tsx
import React, { useEffect, useState } from "react";
import { fetchEventDetails } from "../services/eventApi";
import { Event } from "../types";
import { QRCodeModal } from "../components/QRCodeModal";

export const EventDetailPage: React.FC<{ eventId: string }> = ({ eventId }) => {
  const [event, setEvent] = useState<Event | null>(null);
  const [showQR, setShowQR] = useState(false);

  useEffect(() => {
    fetchEventDetails(eventId).then(setEvent);
  }, [eventId]);

  if (!event) return <div className="p-8 text-center text-white">Loading competition...</div>;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white">{event.title}</h1>
          <p className="text-slate-400">{event.description}</p>
        </div>
        <button
          onClick={() => setShowQR(true)}
          className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium text-sm flex items-center gap-2"
        >
          📱 Show Event QR
        </button>
      </div>

      {/* Podium Section */}
      <div className="grid grid-cols-3 gap-4 mb-8 text-center">
        {event.teams?.slice(0, 3).map((team, idx) => (
          <div key={team.id} className="bg-slate-800/90 border border-amber-500/30 rounded-xl p-4">
            <div className="text-2xl mb-1">{idx === 0 ? "🥇" : idx === 1 ? "🥈" : "🥉"}</div>
            <h3 className="font-bold text-white">{team.name}</h3>
            <p className="text-cyan-400 font-semibold text-sm">{team.total_points || 0} pts</p>
          </div>
        ))}
      </div>

      {showQR && <QRCodeModal eventId={event.id} onClose={() => setShowQR(false)} />}
    </div>
  );
};
```

- [ ] **Step 4: Register routes in `frontend/App.tsx`**

Modify `frontend/App.tsx` to handle `/events` and `/events/:id` routing.

- [ ] **Step 5: Commit**

```bash
git add frontend/pages/EventsHubPage.tsx frontend/pages/EventDetailPage.tsx frontend/components/QRCodeModal.tsx frontend/App.tsx
git commit -m "feat(ui): add Events Hub page, detail leaderboard with podium, and QR modal"
```

---

### Task 8: Frontend Team Dashboard & Profile Title Selector (`/events/:id/teams/:teamId`)

**Files:**
- Create: `frontend/pages/TeamDashboardPage.tsx`
- Create: `frontend/components/ProfileTitleSelector.tsx`
- Modify: `frontend/App.tsx`

**Interfaces:**
- Consumes: `getUserTitles`, `equipUserTitle`
- Produces: Team dashboard view and equipped profile title selector component

- [ ] **Step 1: Implement `ProfileTitleSelector.tsx`**

Create `frontend/components/ProfileTitleSelector.tsx`:
```tsx
import React, { useEffect, useState } from "react";
import { UserTitle } from "../types";

export const ProfileTitleSelector: React.FC<{ userId: number }> = ({ userId }) => {
  const [titles, setTitles] = useState<UserTitle[]>([]);

  useEffect(() => {
    fetch(`/api/user/profile/titles?userId=${userId}`)
      .then((res) => res.json())
      .then(setTitles);
  }, [userId]);

  const handleEquip = (rewardId: string) => {
    fetch("/api/user/profile/equipped-title", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rewardId, userId })
    }).then(() => {
      setTitles((prev) =>
        prev.map((t) => ({ ...t, is_equipped: t.reward_id === rewardId ? 1 : 0 }))
      );
    });
  };

  return (
    <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
      <h4 className="text-white font-bold mb-3">Equipped Profile Title</h4>
      <div className="space-y-2">
        {titles.map((t) => (
          <div key={t.user_reward_id} className="flex items-center justify-between p-2 bg-slate-900 rounded">
            <span className="text-emerald-400 font-medium text-sm">🏆 {t.name}</span>
            <button
              onClick={() => handleEquip(t.reward_id)}
              className={`px-3 py-1 text-xs rounded ${
                t.is_equipped ? "bg-emerald-600 text-white" : "bg-slate-700 text-slate-300 hover:bg-slate-600"
              }`}
            >
              {t.is_equipped ? "Equipped" : "Equip"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
```

- [ ] **Step 2: Implement `TeamDashboardPage.tsx`**

Create `frontend/pages/TeamDashboardPage.tsx`:
```tsx
import React from "react";

export const TeamDashboardPage: React.FC<{ teamName: string; joinCode: string }> = ({ teamName, joinCode }) => {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
        <h1 className="text-2xl font-bold text-white mb-2">{teamName}</h1>
        <p className="text-slate-400 text-sm mb-4">Team Join Code: <code className="text-cyan-400 bg-slate-900 px-2 py-1 rounded">{joinCode}</code></p>
        <div className="mt-6 border-t border-slate-700 pt-4">
          <h3 className="text-lg font-semibold text-white mb-2">Team Activity</h3>
          <p className="text-slate-400 text-sm">Contributions by team members will be listed here live during competitions.</p>
        </div>
      </div>
    </div>
  );
};
```

- [ ] **Step 3: Run full backend and frontend validation**

Run: `npx jest backend/tests`
Run: `npm --prefix frontend run build` (or `npx tsc --noEmit`)
Expected: All backend unit tests PASS and frontend TypeScript checks PASS.

- [ ] **Step 4: Commit**

```bash
git add frontend/pages/TeamDashboardPage.tsx frontend/components/ProfileTitleSelector.tsx frontend/App.tsx
git commit -m "feat(ui): implement team dashboard page and profile title selector component"
```
