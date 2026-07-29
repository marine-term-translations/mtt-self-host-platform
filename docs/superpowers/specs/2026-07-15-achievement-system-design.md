# SPEC-2026-07-15: MTT Achievement System Design

## Overview

The Achievement System is a Duolingo-inspired gamification feature designed to increase user engagement across the Marine Term Translations (MTT) platform. It rewards users with custom marine creature badges for participating in various aspects of the ecosystem (streaks, translations, reviews, discussions, reputation points, and daily goals).

---

## 1. Visual Design

### 1.1 Achievement Creatures (Minimalistic Style)
To ensure a friendly, toy-like casual game look, the characters feature simplified body shapes and clean cartoon round eyes (large blue pupils, white reflection highlights) with simple smiling mouths:

1. **Pufferfish (Streak)** - *Pufferfish Pride* (Longest active daily streak) -> **Original Pufferfish Image**
2. **Anglerfish (Translations)** - *Deep Sea Translator* (Translations count) -> **Minimalistic Image**
3. **Sea Turtle (Reviews)** - *Coral Conservator* (Translation reviews count) -> **Minimalistic SVG**
4. **Dolphin (Discussions)** - *Ocean Talker* (Term discussion and appeal messages) -> **Minimalistic SVG**
5. **Stingray (Reputation)** - *Tidal Wave* (Total reputation points earned) -> **Minimalistic SVG**
6. **Seahorse (Daily Goals)** - *Goal Getter* (Completed daily translation/review goals) -> **Minimalistic SVG**

### 1.2 Metallic Tier Styling
Rather than downloading separate image files for each tier, the frontend will dynamically apply high-end CSS filters to the base transparent PNGs/SVGs to render a premium metallic look:

* **Bronze Tier (sepia/bronze hue)**:
  ```css
  filter: sepia(0.6) hue-rotate(-15deg) saturate(1.8) contrast(1.1) brightness(0.9);
  ```
* **Silver Tier (metallic chrome/silver)**:
  ```css
  filter: grayscale(1) brightness(1.2) contrast(1.1);
  ```
* **Gold Tier (warm glowing gold)**:
  ```css
  filter: sepia(0.7) hue-rotate(15deg) saturate(2.5) contrast(1.2) brightness(1.1) drop-shadow(0 0 8px rgba(234, 179, 8, 0.4));
  ```

Hovering over an achievement will trigger a subtle micro-animation (slight rotation tilt and a sliding shimmer shine gradient overlay on the icon).

---

## 2. Database Schema

We will use two tables to support dynamic configuration of criteria by administrators:

```sql
-- Defines the base achievements configuration
CREATE TABLE achievements (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL
);

-- Defines the tiers criteria (adjustable by admins)
CREATE TABLE achievement_tiers (
  achievement_id TEXT NOT NULL,
  tier INTEGER NOT NULL,          -- 1 = Bronze, 2 = Silver, 3 = Gold
  target_value INTEGER NOT NULL,
  reward_points INTEGER NOT NULL,
  PRIMARY KEY (achievement_id, tier),
  FOREIGN KEY (achievement_id) REFERENCES achievements(id) ON DELETE CASCADE
);

-- Tracks user unlocks
CREATE TABLE user_achievements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  achievement_id TEXT NOT NULL,
  tier INTEGER NOT NULL,
  unlocked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (achievement_id, tier) REFERENCES achievement_tiers(achievement_id, tier),
  UNIQUE(user_id, achievement_id, tier)
);

CREATE INDEX idx_user_achievements_user ON user_achievements(user_id);
```

---

## 3. Dynamic Default Criteria

When the database is initialized, default criteria will be seeded:

| Achievement ID | Category / Metric Checked | Tier 1 (Bronze) | Tier 2 (Silver) | Tier 3 (Gold) | Default Points Reward |
|---|---|---|---|---|---|
| `streak_puffer` | `longest_streak` in `user_stats` | 3 days | 7 days | 30 days | 10 / 25 / 100 |
| `translation_angler` | `translations_count` in `user_stats` | 10 | 50 | 250 | 10 / 25 / 100 |
| `review_turtle` | `reviews_count` in `user_stats` | 20 | 100 | 500 | 10 / 25 / 100 |
| `discussion_dolphin` | Count of discussion/appeal messages | 5 | 25 | 100 | 10 / 25 / 100 |
| `reputation_stingray` | `points` in `user_stats` | 50 | 250 | 1,000 | 10 / 25 / 100 |
| `goal_seahorse` | Completed rows in `user_daily_goals` | 5 | 25 | 100 | 10 / 25 / 100 |

---

## 4. Backend Service and API Architecture

### 4.1 Achievement Checking Service
A new module `backend/src/services/achievement.service.js` will export:
* `checkAndAwardAchievements(userId)`: Scans all 6 metrics for a user, matches against dynamic criteria in `achievement_tiers`, awards qualifying locked tiers inside a database transaction, adds reputation points, and returns an array of unlocked items.
* `getUserAchievementsWithProgress(userId)`: Computes current progress numbers, returns all achievements, their criteria, unlocked status, and the percentage of all users who have unlocked each tier:
  $$\text{Unlocked \%} = \frac{\text{Users who unlocked tier}}{\text{Total registered users}} \times 100$$

### 4.2 REST APIs
#### User Endpoints
* `GET /api/gamification/achievements`: Returns the achievements matrix for the logged-in user, their progress, and rarity percentage.
  ```json
  [
    {
      "id": "translation_angler",
      "name": "Deep Sea Translator",
      "description": "Translate terms to help grow the marine knowledge base.",
      "currentProgress": 12,
      "tiers": [
        { "tier": 1, "name": "Bronze Anglerfish", "target": 10, "unlocked": true, "unlockedAt": "2026-07-15T05:00:00Z", "unlockedPercentage": 42.5 },
        { "tier": 2, "name": "Silver Anglerfish", "target": 50, "unlocked": false, "unlockedPercentage": 12.0 }
      ]
    }
  ]
  ```

#### Admin Endpoints
* `GET /api/admin/achievements`: Returns the editable criteria and default settings.
* `PUT /api/admin/achievements/:achievementId/tiers/:tier`: Updates target values and reward points for a specific tier (only accessible to administrators).

---

## 5. Frontend UI Integration

### 5.1 Profile Showcase and Achievements Tab
The Profile page will be updated with two distinct features:

#### 1. Profile Achievements Tab
A dedicated tab on the User Profile page showing:
* A beautiful grid of the 6 creature badges.
* Progress bars showing the user's progress towards the next tier.
* Tooltips displaying detail info (e.g. target, points, and global rarity percentage: *"Unlocked by 5.4% of translators"*).

#### 2. Showcase Component (Featured Badges)
At the top header or side panel of the Profile page, a **Showcase** card will feature the user's top achievements:
* Displays up to 3 highest-unlocked badges (prioritizing Gold -> Silver -> Bronze).
* Allows a user to customize their showcased badges by clicking a "Pin to Showcase" button in the Achievements Grid.

### 5.2 Admin Settings Editor
A new section in the Admin settings panel will allow administrators to:
* View a form showing all 6 achievements and their 3 tiers.
* Dynamically adjust the `target_value` (e.g. increase Gold Puffer streak target from 30 to 45 days) and `reward_points`.
* Save changes dynamically to the database.

### 5.3 Real-time Unlock Toasts
When a user completes an action that unlocks a new tier, API responses will return an `unlockedAchievements` array, triggering a beautiful `react-hot-toast` popup in real-time.

---

## 6. Verification & Testing

### 6.1 Backend Unit Tests
A test suite `backend/tests/achievements.test.js` will verify:
* Schema seeding and migrations.
* Dynamic criteria adjustments and correct calculation of progress.
* Atomicity of unlocking and reputation updates.
* Rarity percentage calculations.
* API endpoints permissions (normal vs admin).
