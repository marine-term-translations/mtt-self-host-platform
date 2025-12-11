# Translation Flow Feature Documentation

## Overview

The **Translation Flow** feature is a gamified, Duolingo-style translation system that guides users through a streamlined sequence of translation tasks. It prioritizes reviews first, then transitions to new translations, with built-in gamification to boost engagement and user retention.

## Table of Contents

- [Features](#features)
- [Architecture](#architecture)
- [Database Schema](#database-schema)
- [API Endpoints](#api-endpoints)
- [Frontend Components](#frontend-components)
- [User Flow](#user-flow)
- [Gamification System](#gamification-system)
- [Usage](#usage)

---

## Features

### Core Functionality

- **Review-First Workflow**: Pending reviews are prioritized over new translations
- **Automatic Task Queue**: System automatically fetches the next appropriate task
- **Multi-Language Support**: Supports Dutch, French, German, Spanish, Italian, and Portuguese
- **Session Tracking**: Tracks user activity and points earned per session

### Gamification

- **Points System**: 
  - Translation submission: 20 points
  - Review approval: 10 points
  - Review rejection: 5 points
- **Daily Streaks**: Maintains consecutive day activity tracking
- **Daily Challenges**: 
  - Translate 5 terms (50 points)
  - Review 10 translations (100 points)
- **Leaderboard**: Global points ranking system
- **Progress Tracking**: Real-time session statistics

---

## Architecture

### Backend Structure

```
backend/
├── src/
│   ├── controllers/
│   │   └── flow.controller.js       # Request handlers
│   ├── services/
│   │   ├── flow.service.js          # Business logic
│   │   └── gamification.service.js   # Points, streaks, challenges
│   ├── routes/
│   │   └── flow.routes.js           # API endpoints
│   └── db/
│       └── migrations/
│           └── 002_gamification.sql # Database schema
```

### Frontend Structure

```
frontend/
├── pages/
│   └── TranslationFlow.tsx          # Main flow page
├── components/
│   ├── FlowTermCard.tsx             # Task display component
│   └── FlowStatsPanel.tsx           # Statistics sidebar
└── services/
    └── flow.api.ts                  # API service layer
```

---

## Database Schema

### New Tables

#### `user_stats`
Tracks user gamification statistics.

| Column | Type | Description |
|--------|------|-------------|
| user_id | TEXT | Primary key, references users.username |
| points | INTEGER | Total points earned |
| daily_streak | INTEGER | Current consecutive days active |
| longest_streak | INTEGER | Longest streak achieved |
| last_active_date | DATE | Last activity date |
| translations_count | INTEGER | Total translations submitted |
| reviews_count | INTEGER | Total reviews completed |

#### `daily_challenges`
Manages daily challenges for users.

| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER | Primary key |
| user_id | TEXT | References users.username |
| challenge_date | DATE | Challenge date |
| challenge_type | TEXT | Type of challenge |
| target_count | INTEGER | Target to complete |
| current_count | INTEGER | Current progress |
| completed | INTEGER | 0 or 1 (boolean) |
| points_reward | INTEGER | Points for completion |

#### `flow_sessions`
Tracks individual translation flow sessions.

| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER | Primary key |
| user_id | TEXT | References users.username |
| started_at | DATETIME | Session start time |
| ended_at | DATETIME | Session end time |
| translations_completed | INTEGER | Translations in session |
| reviews_completed | INTEGER | Reviews in session |
| points_earned | INTEGER | Points earned in session |

---

## API Endpoints

### Flow Management

#### `POST /api/flow/start`
Start a new translation flow session.

**Authentication**: Required

**Response**:
```json
{
  "success": true,
  "sessionId": 123,
  "stats": {
    "points": 1500,
    "daily_streak": 7,
    "longest_streak": 15,
    "translations_count": 45,
    "reviews_count": 32
  },
  "challenges": [...]
}
```

#### `GET /api/flow/next`
Get the next task (review or translation).

**Authentication**: Required

**Response**:
```json
{
  "type": "review",
  "task": {
    "translation_id": 456,
    "term_field_id": 789,
    "language": "nl",
    "value": "Proposed translation",
    "created_by": "user@example.com",
    "term_fields": [...]
  }
}
```

#### `POST /api/flow/review`
Submit a review decision.

**Authentication**: Required

**Request Body**:
```json
{
  "translationId": 456,
  "action": "approve",
  "sessionId": 123
}
```

**Response**:
```json
{
  "success": true,
  "action": "approve",
  "points": 10,
  "streakInfo": {
    "streak": 7,
    "longestStreak": 15,
    "isNewStreak": false
  }
}
```

#### `POST /api/flow/translate`
Submit a new translation.

**Authentication**: Required

**Request Body**:
```json
{
  "termFieldId": 789,
  "language": "nl",
  "value": "Dutch translation",
  "sessionId": 123
}
```

**Response**:
```json
{
  "success": true,
  "translationId": 457,
  "points": 20,
  "streakInfo": {
    "streak": 7,
    "longestStreak": 15,
    "isNewStreak": false
  }
}
```

### Statistics

#### `GET /api/flow/stats`
Get user statistics and challenges.

**Authentication**: Required

**Response**:
```json
{
  "stats": {...},
  "challenges": [...]
}
```

#### `GET /api/flow/leaderboard?limit=10`
Get points leaderboard.

**Parameters**:
- `limit` (optional): Number of users to return (default: 10)

**Response**:
```json
{
  "leaderboard": [
    {
      "user_id": "user@example.com",
      "points": 2500,
      "daily_streak": 15,
      "username": "user@example.com",
      "reputation": 850
    }
  ]
}
```

### Utilities

#### `GET /api/flow/languages`
Get available translation languages.

**Response**:
```json
{
  "languages": [
    { "code": "nl", "name": "Dutch" },
    { "code": "fr", "name": "French" },
    { "code": "de", "name": "German" },
    { "code": "es", "name": "Spanish" },
    { "code": "it", "name": "Italian" },
    { "code": "pt", "name": "Portuguese" }
  ]
}
```

#### `POST /api/flow/session/end`
End a flow session.

**Authentication**: Required

**Request Body**:
```json
{
  "sessionId": 123
}
```

---

## Frontend Components

### TranslationFlow.tsx
Main page component that orchestrates the flow experience.

**Features**:
- Session initialization
- Task loading and navigation
- Submission handling
- Celebration animations
- End session summary

### FlowTermCard.tsx
Displays the current term and interaction controls.

**Props**:
- `task`: Current task data
- `taskType`: 'review' or 'translate'
- `languages`: Available language options
- `onSubmitReview`: Review submission handler
- `onSubmitTranslation`: Translation submission handler
- `isSubmitting`: Loading state

**Modes**:
- **Review Mode**: Shows proposed translation with Approve/Reject buttons
- **Translation Mode**: Shows language selector and text input

### FlowStatsPanel.tsx
Sidebar displaying user statistics and challenges.

**Props**:
- `stats`: User overall statistics
- `challenges`: Active daily challenges
- `sessionPoints`: Points earned in current session
- `sessionTranslations`: Translations in current session
- `sessionReviews`: Reviews in current session

**Sections**:
- Session stats (current session)
- Overall stats (all-time)
- Daily challenges with progress bars

---

## User Flow

1. **User navigates to `/flow`**
2. **System initializes session**
   - Creates new flow session record
   - Loads user stats and challenges
   - Fetches available languages
3. **System fetches first task**
   - Checks for pending reviews (priority)
   - If no reviews, fetches untranslated term
   - If no tasks, shows completion screen
4. **User interacts with task**
   - **Review**: User approves or rejects
   - **Translation**: User selects language and enters text
5. **System processes submission**
   - Awards points
   - Updates streak
   - Increments challenge progress
   - Updates session stats
6. **System loads next task**
   - Auto-advances to next task
   - Shows celebration for streak milestones
7. **User ends session**
   - Shows summary of session achievements
   - Returns to dashboard

---

## Gamification System

### Points Breakdown

| Action | Points |
|--------|--------|
| Submit Translation | 20 |
| Approve Translation | 10 |
| Reject Translation | 5 |
| Complete Daily Challenge | 50-100 |

### Streak System

- **Consecutive Days**: User must be active each day to maintain streak
- **Streak Reset**: Missing a day resets streak to 1
- **Longest Streak**: Tracked separately as achievement
- **Streak Celebration**: Visual celebration when extending streak

### Daily Challenges

Challenges reset daily and award bonus points:

1. **Translate 5 Terms** - 50 points
2. **Review 10 Translations** - 100 points

Progress tracked automatically and updates in real-time.

### Leaderboard

- Global ranking by total points
- Displays top users with their stats
- Accessible via `/api/flow/leaderboard`
- Encourages healthy competition

---

## Usage

### For Users

1. **Access Flow**: Click "Flow" in the navigation menu (⚡ icon)
2. **Complete Tasks**: Follow the prompts to review or translate
3. **Track Progress**: Monitor your stats in the sidebar
4. **Earn Rewards**: Complete challenges and maintain streaks
5. **End Session**: Click "End Session" when done

### For Developers

#### Adding New Challenge Types

Edit `gamification.service.js`:

```javascript
const challenges = [
  { type: 'translate_5', target: 5, points: 50 },
  { type: 'review_10', target: 10, points: 100 },
  { type: 'your_new_challenge', target: X, points: Y }
];
```

#### Customizing Point Values

Edit `flow.service.js`:

```javascript
// In submitReview()
const points = action === 'approve' ? 10 : 5;

// In submitTranslation()
const points = 20;
```

#### Extending Task Queue Logic

Edit `flow.service.js` `getNextTask()` function to modify task prioritization.

---

## Migration

The gamification tables are automatically created via migration `002_gamification.sql` when the backend starts. The migration system in `dbInit.service.js` ensures:

1. Schema is applied on first run
2. Migrations are tracked in `migrations_applied` table
3. Each migration runs only once
4. Safe to restart the application

---

## Testing

### Manual Testing Checklist

- [ ] Start flow session
- [ ] Complete a review task
- [ ] Complete a translation task
- [ ] Verify points are awarded
- [ ] Check streak updates daily
- [ ] Complete a daily challenge
- [ ] View leaderboard
- [ ] End session and check summary

### Backend Testing

```bash
# Start backend
cd backend
npm start

# Test API endpoints
curl -X POST http://localhost:5000/api/flow/start
curl http://localhost:5000/api/flow/next
curl http://localhost:5000/api/flow/languages
curl http://localhost:5000/api/flow/leaderboard
```

### Frontend Testing

```bash
# Start frontend dev server
cd frontend
npm run dev

# Navigate to http://localhost:5173/flow
```

---

## Future Enhancements

### Planned Features

- [ ] Weekly challenges
- [ ] Achievement badges
- [ ] Team competitions
- [ ] Translation suggestions via AI
- [ ] Difficulty levels
- [ ] Custom challenge creation
- [ ] Export statistics
- [ ] Mobile app support

### Performance Optimizations

- [ ] Redis caching for leaderboard
- [ ] Queue pre-fetching
- [ ] Batch operations
- [ ] Index optimization

---

## Support

For issues or questions:
- Check the [main README](../README.md)
- Review [ARCHITECTURE.md](../ARCHITECTURE.md)
- Open an issue on GitHub

---

## License

MIT
