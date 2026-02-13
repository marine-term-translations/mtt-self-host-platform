# Community Goals Feature

## Overview

The Community Goals feature allows administrators to create and manage community-wide translation goals and challenges to motivate and engage translators. Goals can be set for specific translation counts, languages, or entire collections.

## Features

### For Administrators

Administrators can:
- Create translation goals with specific targets
- Set goals for specific languages (e.g., "50 French translations")
- Set goals for entire collections/sources
- Configure recurring goals (daily, weekly, monthly)
- Track progress in real-time
- Enable/disable goals
- View completion statistics

### For Users

Users can:
- View active community goals relevant to their language preferences
- See real-time progress on goals
- Dismiss goals they don't want to track
- Access goals from a persistent widget on every page
- View goal details in the community section

## Database Schema

### `community_goals` Table

Stores all community goals created by administrators.

| Column | Type | Description |
|--------|------|-------------|
| `id` | INTEGER | Primary key |
| `title` | TEXT | Goal title (required) |
| `description` | TEXT | Optional detailed description |
| `goal_type` | TEXT | Type: 'translation_count' or 'collection' |
| `target_count` | INTEGER | Number of translations/terms to complete |
| `target_language` | TEXT | Language code (e.g., 'fr', 'nl') |
| `collection_id` | INTEGER | Reference to sources table |
| `is_recurring` | INTEGER | Boolean: 0 or 1 |
| `recurrence_type` | TEXT | 'daily', 'weekly', or 'monthly' |
| `start_date` | DATETIME | When the goal starts |
| `end_date` | DATETIME | When the goal ends (NULL for infinite) |
| `is_active` | INTEGER | Boolean: 0 or 1 |
| `created_by_id` | INTEGER | User who created the goal |
| `created_at` | DATETIME | Creation timestamp |
| `updated_at` | DATETIME | Last update timestamp |

### `community_goal_dismissals` Table

Tracks which users have dismissed which goals.

| Column | Type | Description |
|--------|------|-------------|
| `id` | INTEGER | Primary key |
| `user_id` | INTEGER | User who dismissed the goal |
| `goal_id` | INTEGER | The dismissed goal |
| `dismissed_at` | DATETIME | When it was dismissed |

### `community_goal_links` Table

Links goals to language communities (many-to-many relationship).

| Column | Type | Description |
|--------|------|-------------|
| `id` | INTEGER | Primary key |
| `goal_id` | INTEGER | Reference to community_goals |
| `community_id` | INTEGER | Reference to communities |
| `created_at` | DATETIME | When the link was created |

**Note:** When an admin creates a goal:
- If `target_language` is specified, the goal is automatically linked to that language's community
- If `target_language` is not specified, the goal is automatically linked to ALL language communities

## API Endpoints

### Admin Endpoints

#### Create Goal
```
POST /api/admin/community-goals
```

**Request Body:**
```json
{
  "title": "Translate 50 French marine terms",
  "description": "Help us reach our monthly French translation target",
  "goal_type": "translation_count",
  "target_count": 50,
  "target_language": "fr",
  "is_recurring": true,
  "recurrence_type": "monthly",
  "start_date": "2024-02-01",
  "end_date": "2024-02-29"
}
```

#### List All Goals
```
GET /api/admin/community-goals
```

Returns all goals with creator information and collection details.

#### Update Goal
```
PUT /api/admin/community-goals/:id
```

Update any field of an existing goal.

#### Delete Goal
```
DELETE /api/admin/community-goals/:id
```

Permanently deletes a goal and all associated dismissals.

### User Endpoints

#### Get Active Goals
```
GET /api/community-goals
```

Returns active goals from communities the user is a member of, optionally filtered by user's language preferences. Includes dismissal status.

**Behavior:**
- Only returns goals from communities where the user is a member
- Further filters by user's language preferences if set
- Shows goals without a target language to all community members
- Excludes dismissed goals

#### Get Goal Progress
```
GET /api/community-goals/:id/progress
```

**Response:**
```json
{
  "goal_id": 1,
  "current_count": 25,
  "target_count": 50,
  "progress_percentage": 50,
  "is_complete": false
}
```

#### Dismiss Goal
```
POST /api/community-goals/:id/dismiss
```

Marks a goal as dismissed for the current user.

## Goal Types

### 1. Translation Count Goals

Goals based on the number of approved translations.

**Example:**
- Title: "50 French Translations This Month"
- Type: `translation_count`
- Target: 50
- Language: `fr`

**Progress Calculation:** Counts all approved translations in the specified language within the goal's date range.

### 2. Collection Goals

Goals based on translating an entire collection/source.

**Example:**
- Title: "Complete Marine Biology Terms"
- Type: `collection`
- Collection ID: 5
- Language: `nl`

**Progress Calculation:** Counts term fields with approved translations in the collection.

## Recurring Goals

Goals can be set to recur on a schedule:

- **Daily**: Goal resets every day
- **Weekly**: Goal resets every week
- **Monthly**: Goal resets every month

When a recurring goal reaches its end date, admins can create a new instance for the next period.

## Frontend Components

### CommunityGoalWidget

A persistent widget that appears in the bottom-right corner of every page for authenticated users.

**Features:**
- Shows active goals relevant to user's languages
- Real-time progress bars
- Dismissable per goal
- Auto-updates
- Responsive design

**Location:** `/frontend/components/CommunityGoalWidget.tsx`

### AdminCommunityGoals

Admin interface for managing goals.

**Features:**
- Create/edit/delete goals
- Form validation
- Real-time progress tracking
- Filtering and sorting
- Bulk management

**Location:** `/frontend/pages/admin/AdminCommunityGoals.tsx`

**Route:** `/admin/community-goals`

## Usage Examples

### Creating a Simple Translation Goal

1. Navigate to `/admin/community-goals`
2. Click "New Goal"
3. Fill in the form:
   - Title: "100 Dutch translations this week"
   - Goal Type: Translation Count
   - Target Count: 100
   - Target Language: nl
   - Start Date: Today
   - End Date: 7 days from now
4. Click "Create Goal"

### Creating a Recurring Monthly Goal

1. Navigate to `/admin/community-goals`
2. Click "New Goal"
3. Fill in the form:
   - Title: "50 French translations per month"
   - Goal Type: Translation Count
   - Target Count: 50
   - Target Language: fr
   - Is Recurring: ✓
   - Recurrence Type: Monthly
   - Start Date: First day of current month
   - End Date: Last day of current month
4. Click "Create Goal"

### Creating a Collection Goal

1. Navigate to `/admin/community-goals`
2. Click "New Goal"
3. Fill in the form:
   - Title: "Translate Marine Biology collection"
   - Goal Type: Collection
   - Collection ID: [source_id from sources table]
   - Target Language: de
   - Start Date: Today
   - End Date: 30 days from now
4. Click "Create Goal"

## Language Filtering

Goals are automatically filtered based on user language preferences:

1. If a goal has a `target_language`, it's only shown to users who can translate to that language
2. If a goal has no `target_language`, it's shown to all users
3. Users can update their language preferences in Settings

## Progress Calculation

### For Translation Count Goals

```sql
SELECT COUNT(*) as count
FROM translations
WHERE status = 'approved'
  AND created_at >= goal.start_date
  AND (goal.end_date IS NULL OR created_at <= goal.end_date)
  AND (goal.target_language IS NULL OR language = goal.target_language)
```

### For Collection Goals

```sql
SELECT COUNT(DISTINCT tf.id) as count
FROM term_fields tf
INNER JOIN terms t ON tf.term_id = t.id
INNER JOIN translations tr ON tf.id = tr.term_field_id
WHERE t.source_id = goal.collection_id
  AND tr.status = 'approved'
  AND tr.created_at >= goal.start_date
  AND (goal.end_date IS NULL OR tr.created_at <= goal.end_date)
  AND (goal.target_language IS NULL OR tr.language = goal.target_language)
```

## Best Practices

### For Administrators

1. **Set Realistic Goals**: Start with achievable targets to build momentum
2. **Use Recurring Goals**: For consistent engagement, use monthly recurring goals
3. **Language-Specific Goals**: Target languages that need more translations
4. **Clear Titles**: Use descriptive titles that motivate (e.g., "Help us reach 100 French translations!")
5. **Monitor Progress**: Check the admin dashboard regularly to adjust goals

### For Users

1. **Check Regularly**: The widget updates in real-time, check your progress
2. **Focus on Languages**: Contribute to goals in languages you're proficient in
3. **Dismiss Irrelevant Goals**: Keep your widget clean by dismissing goals you can't contribute to

## Troubleshooting

### Goals Not Showing Up

1. Check that the goal is active (`is_active = 1`)
2. Verify the start date is in the past
3. Check if the goal's language matches your language preferences
4. Ensure you haven't dismissed the goal

### Progress Not Updating

1. Progress only counts `approved` translations
2. Translations must be within the goal's date range
3. For collection goals, verify the source_id matches

### Widget Performance

The widget fetches data on mount and doesn't auto-refresh. Users need to refresh the page to see updated progress.

## Migration

The database migration is included in:
- `backend/src/db/migrations/016_community_goals.sql`
- Added to main schema: `backend/src/db/migrations/schema.sql`

The migration runs automatically on database initialization.

## Future Enhancements

Potential improvements for future versions:

1. **Auto-refresh**: Real-time progress updates via WebSocket
2. **Notifications**: Alert users when goals are near completion
3. **Achievements**: Award badges for completing goals
4. **Leaderboards**: Show top contributors to each goal
5. **Goal Templates**: Pre-defined goal types for quick creation
6. **Analytics**: Detailed statistics and graphs
7. **Team Goals**: Goals assigned to specific user groups
8. **Smart Scheduling**: Automatic recurring goal creation
