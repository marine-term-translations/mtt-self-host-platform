# Achievement System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a Duolingo-inspired gamification achievement system using marine creature badges (reusing original pufferfish and newly generated minimalistic anglerfish, plus SVGs for others) where criteria are adjustable in admin settings, user profiles feature achievements tabs and showcases, and global rarity percentages are displayed.

**Architecture:** We use Approach A (Direct Request-Hook Check) in route handlers, storing achievements configuration in DB tables (`achievements`, `achievement_tiers`) and unlocks in `user_achievements`. An API provides progress/unlock history, while admin APIs allow updating thresholds. Real-time notifications are returned in APIs and toasted.

**Tech Stack:** React 18, Vite 6, Node.js, Express, SQLite (better-sqlite3), Lucide-react, react-hot-toast.

## Global Constraints
- Every new function/method has a test.
- Watched each test fail before implementing.
- Wrote minimal code to pass each test.
- Tests use real code (mocks only if unavoidable).

---

### Task 1: Database Setup and Seeding

**Files:**
- Create: `backend/src/db/migrations/032_user_achievements.sql`
- Modify: `backend/src/services/dbInit.service.js`
- Modify: `backend/src/db/migrations/schema.sql`
- Test: `backend/tests/achievements-db.test.js`

**Interfaces:**
- Consumes: `getDatabase` from `../db/database`
- Produces: Tables `achievements`, `achievement_tiers`, `user_achievements` in SQLite.

- [ ] **Step 1: Write failing test for database tables**
  Create `backend/tests/achievements-db.test.js` verifying that `achievements`, `achievement_tiers`, and `user_achievements` tables are created and seeded with 6 default achievements and 18 default tiers.
  ```javascript
  const assert = require('assert');
  const { getDatabase } = require('../src/db/database');
  const { initializeDatabase } = require('../src/services/dbInit.service');

  async function run() {
    initializeDatabase();
    const db = getDatabase();

    const achCount = db.prepare("SELECT COUNT(*) as count FROM achievements").get().count;
    assert.strictEqual(achCount, 6);

    const tierCount = db.prepare("SELECT COUNT(*) as count FROM achievement_tiers").get().count;
    assert.strictEqual(tierCount, 18);

    console.log("✓ Achievements DB Schema & Seeds check passed!");
  }
  run().catch(e => { console.error(e); process.exit(1); });
  ```

- [ ] **Step 2: Run test to verify it fails**
  Run: `node backend/tests/achievements-db.test.js`
  Expected: FAIL with "no such table: achievements"

- [ ] **Step 3: Write migration and update database initialization service**
  Create `backend/src/db/migrations/032_user_achievements.sql`:
  ```sql
  CREATE TABLE IF NOT EXISTS achievements (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS achievement_tiers (
    achievement_id TEXT NOT NULL,
    tier INTEGER NOT NULL,
    target_value INTEGER NOT NULL,
    reward_points INTEGER NOT NULL,
    PRIMARY KEY (achievement_id, tier),
    FOREIGN KEY (achievement_id) REFERENCES achievements(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS user_achievements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    achievement_id TEXT NOT NULL,
    tier INTEGER NOT NULL,
    unlocked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (achievement_id, tier) REFERENCES achievement_tiers(achievement_id, tier),
    UNIQUE(user_id, achievement_id, tier)
  );

  CREATE INDEX IF NOT EXISTS idx_user_achievements_user ON user_achievements(user_id);
  ```

  Append tables definitions to `backend/src/db/migrations/schema.sql` at the end so fresh DB installations have them.
  Modify `backend/src/services/dbInit.service.js` to seed default rows if table `achievements` is empty. Under `initializeDatabase()` or `bootstrap()`, add:
  ```javascript
  const achs = [
    { id: 'streak_puffer', name: 'Pufferfish Pride', desc: 'Maintain a daily translation/review streak.', cat: 'streak' },
    { id: 'translation_angler', name: 'Deep Sea Translator', desc: 'Translate terms to help grow the marine knowledge base.', cat: 'translations' },
    { id: 'review_turtle', name: 'Coral Conservator', desc: 'Review other translators\' work for quality control.', cat: 'reviews' },
    { id: 'discussion_dolphin', name: 'Ocean Talker', desc: 'Participate in term discussions and translation appeals.', cat: 'discussions' },
    { id: 'reputation_stingray', name: 'Tidal Wave', desc: 'Earn gamification points and build reputation.', cat: 'points' },
    { id: 'goal_seahorse', name: 'Goal Getter', desc: 'Complete your daily translation/review goals.', cat: 'daily_goals' }
  ];

  const db = getDatabase();
  const existing = db.prepare("SELECT COUNT(*) as c FROM achievements").get().c;
  if (existing === 0) {
    const insertAch = db.prepare("INSERT INTO achievements (id, name, description, category) VALUES (?, ?, ?, ?)");
    const insertTier = db.prepare("INSERT INTO achievement_tiers (achievement_id, tier, target_value, reward_points) VALUES (?, ?, ?, ?)");
    db.transaction(() => {
      for (const a of achs) {
        insertAch.run(a.id, a.name, a.desc, a.cat);
        const targets = {
          streak_puffer: [3, 7, 30],
          translation_angler: [10, 50, 250],
          review_turtle: [20, 100, 500],
          discussion_dolphin: [5, 25, 100],
          reputation_stingray: [50, 250, 1000],
          goal_seahorse: [5, 25, 100]
        }[a.id];
        const rewards = [10, 25, 100];
        insertTier.run(a.id, 1, targets[0], rewards[0]);
        insertTier.run(a.id, 2, targets[1], rewards[1]);
        insertTier.run(a.id, 3, targets[2], rewards[2]);
      }
    })();
  }
  ```

- [ ] **Step 4: Run test to verify it passes**
  Run: `node backend/tests/achievements-db.test.js`
  Expected: PASS

- [ ] **Step 5: Commit**
  Commit database migration and seeder setup.

---

### Task 2: Service Layer Logic (Checking, Unlocking, Progress)

**Files:**
- Create: `backend/src/services/achievement.service.js`
- Test: `backend/tests/achievements-service.test.js`

**Interfaces:**
- Consumes: SQLite DB tables populated in Task 1, `awardPoints` from `backend/src/services/gamification.service.js`
- Produces: `checkAndAwardAchievements(userId)`, `getUserAchievementsWithProgress(userId)`

- [ ] **Step 1: Write failing test for achievement calculations**
  Create `backend/tests/achievements-service.test.js` verifying unlocking calculations. It inserts mock user activities (e.g. 10 translations in user_stats, 5 discussion messages) and calls `checkAndAwardAchievements` to assert that correct rows are written in `user_achievements` and points awarded.

- [ ] **Step 2: Run test to verify it fails**
  Run: `node backend/tests/achievements-service.test.js`
  Expected: FAIL with "checkAndAwardAchievements is not a function"

- [ ] **Step 3: Implement calculation and progress retrieval logic**
  Create `backend/src/services/achievement.service.js`:
  - `checkAndAwardAchievements(userId)` checks each metric:
    - Streaks: `longest_streak` in `user_stats`.
    - Translations: `translations_count` in `user_stats`.
    - Reviews: `reviews_count` in `user_stats`.
    - Discussions: `SELECT (SELECT COUNT(*) FROM term_discussion_messages WHERE user_id = ?) + (SELECT COUNT(*) FROM appeal_messages WHERE user_id = ?) AS count`.
    - Reputation: `points` in `user_stats`.
    - Daily Goals: `SELECT COUNT(*) FROM user_daily_goals WHERE user_id = ? AND completed = 1`.
  - Compares these metrics with criteria in `achievement_tiers`.
  - Inserts unlocked tiers into `user_achievements` and calls `awardPoints(userId, tier.reward_points, 'achievement_' + id + '_tier_' + tier)`.
  - Returns array of newly unlocked achievement objects (to display toasted notification).
  - `getUserAchievementsWithProgress(userId)` fetches metrics, targets, unlocked statuses, and unlocked percentages:
    - Percentage: `SELECT (SELECT COUNT(DISTINCT user_id) FROM user_achievements WHERE achievement_id = a.id AND tier = t.tier) * 100.0 / (SELECT COUNT(*) FROM user_stats) as pct`.

- [ ] **Step 4: Run test to verify it passes**
  Run: `node backend/tests/achievements-service.test.js`
  Expected: PASS

- [ ] **Step 5: Commit**
  Commit achievement service implementation.

---

### Task 3: API Integration & Route Hooking

**Files:**
- Create: `backend/src/routes/achievements.routes.js`
- Modify: `backend/src/app.js`
- Modify: route handlers in `backend/src/routes/terms.routes.js`, `backend/src/services/gamification.service.js` to call `checkAndAwardAchievements`
- Test: `backend/tests/achievements-api.test.js`

- [ ] **Step 1: Write failing test for REST API routes**
  Create `backend/tests/achievements-api.test.js` testing endpoints `GET /api/gamification/achievements` and admin edit endpoints.

- [ ] **Step 2: Run test to verify it fails**
  Run: `node backend/tests/achievements-api.test.js`
  Expected: FAIL with 404 error

- [ ] **Step 3: Implement achievements routes and API hooks**
  Create `backend/src/routes/achievements.routes.js`:
  - `GET /api/gamification/achievements` (user auth required) -> returns `getUserAchievementsWithProgress(userId)`
  - `GET /api/admin/achievements` (admin required) -> returns all dynamic criteria
  - `PUT /api/admin/achievements/:achievementId/tiers/:tier` (admin required) -> updates `target_value` and `reward_points`
  Mount routes in `backend/src/app.js`.
  Modify route handler helpers or gamification methods (`awardPoints`, `updateStreak`, `updateDailyGoalProgress`) to invoke `checkAndAwardAchievements(userId)` and return the list of newly unlocked achievements to frontend request handlers.

- [ ] **Step 4: Run test to verify it passes**
  Run: `node backend/tests/achievements-api.test.js`
  Expected: PASS

- [ ] **Step 5: Commit**
  Commit route logic and API hooks.

---

### Task 4: Frontend UI (Profile Achievements Grid & Showcase)

**Files:**
- Modify: `frontend/pages/Profile.tsx`
- Modify: `frontend/pages/UserProfile.tsx`
- Modify: `frontend/services/api.ts`

- [ ] **Step 1: Update API client service**
  Modify `frontend/services/api.ts` to include API client wrappers for:
  - `getUserAchievements()` fetching `/api/gamification/achievements`
  - `pinAchievement(id, tier)` (pinning/saving favorites to profile settings)

- [ ] **Step 2: Implement Profile achievements showcase and tab**
  Modify `frontend/pages/Profile.tsx` (and `UserProfile.tsx` for other users):
  - Add "Achievements" tab next to other tabs.
  - Render Pufferfish (Streak) base using `/puffer.png` and Anglerfish (Translations) using `/images/achievements/achievement_translation_minimal.png` (copy generated minimalistic PNG to public directory).
  - For others, render beautiful inline vector SVGs matching the style.
  - Apply CSS metallic color filters dynamically on the badge images based on unlocked tier.
  - Implement top "Showcase Card" displaying the 3 highest unlocked or custom pinned badges.
  - Show tooltips on hover with targets, progress bar, points, and global rarity percentage.

- [ ] **Step 3: Verify frontend displays items correctly**
  Review profile tab rendering in browser.

- [ ] **Step 4: Commit**
  Commit profile achievements visual features.

---

### Task 5: Frontend Admin Settings Panel for Achievements

**Files:**
- Create: `frontend/pages/admin/AdminAchievements.tsx`
- Modify: `frontend/pages/AdminDashboard.tsx`
- Modify: `frontend/App.tsx` (or route switcher)

- [ ] **Step 1: Create Admin Settings Panel component**
  Create `frontend/pages/admin/AdminAchievements.tsx` displaying the editable form for the 6 achievements and 3 tiers. Allows admins to update target threshold values and points rewards.
- [ ] **Step 2: Add route link to Admin Dashboard**
  Modify `frontend/pages/AdminDashboard.tsx` to add a navigation card linking to `/admin/achievements`. Mount the path in `frontend/App.tsx` mapping to `AdminAchievements`.
- [ ] **Step 3: Verify changes save correctly**
  Verify setting updates persist to DB and update calculations immediately.
- [ ] **Step 4: Commit**
  Commit achievements configuration system.
