# Communities Feature

The Communities feature allows users to organize themselves into groups based on languages or shared interests. This document describes the feature, its architecture, and usage.

## Overview

There are two types of communities in the MTT platform:

### 1. Language Communities
- Automatically created for all supported languages
- Users are automatically assigned based on their language preferences
- Cannot be manually deleted or edited (except stats)
- No owner - managed by the system
- Always have "open" access type

### 2. User-Created Communities
- Created and managed by users
- Have an owner who can manage the community
- Can be either "open" (anyone can join) or "invite-only"
- Owner can invite members and remove them
- Can be deleted by the owner

## Features

### For All Users
- **Browse Communities**: View all communities, filter by type (language/user-created)
- **Search Communities**: Search by name or description
- **View Community Details**: See members, stats, goals, and leaderboards
- **Join Open Communities**: Join any community with open access
- **View Community Stats**: See translation activity, top contributors, and progress
- **View Community Goals**: See community-specific translation goals

### For Community Creators/Owners
- **Create Communities**: Create new communities with name, description, and access type
- **Manage Members**: Invite users (for invite-only) or remove members
- **Edit Community**: Update name, description, and access type
- **Delete Community**: Remove the community (all members will be removed)
- **View Invitations**: See all pending/accepted/declined invitations

### For Invited Users
- **View Invitations**: See pending invitations
- **Accept/Decline Invitations**: Respond to community invitations

## Database Schema

### Communities Table
```sql
CREATE TABLE communities (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    name                TEXT NOT NULL,
    description         TEXT,
    type                TEXT NOT NULL CHECK(type IN ('language', 'user_created')),
    access_type         TEXT NOT NULL DEFAULT 'open' CHECK(access_type IN ('open', 'invite_only')),
    language_code       TEXT,  -- For language communities
    owner_id            INTEGER REFERENCES users(id) ON DELETE SET NULL,
    member_count        INTEGER DEFAULT 0,
    created_at          DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at          DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### Community Members Table
```sql
CREATE TABLE community_members (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    community_id        INTEGER NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
    user_id             INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role                TEXT NOT NULL DEFAULT 'member' CHECK(role IN ('creator', 'moderator', 'member')),
    joined_at           DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(community_id, user_id)
);
```

### Community Invitations Table
```sql
CREATE TABLE community_invitations (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    community_id        INTEGER NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
    user_id             INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    invited_by_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status              TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'accepted', 'declined')),
    created_at          DATETIME DEFAULT CURRENT_TIMESTAMP,
    responded_at        DATETIME,
    UNIQUE(community_id, user_id, status)
);
```

## API Endpoints

### Community CRUD

#### GET /api/communities
Get all communities, optionally filtered by type.

**Query Parameters:**
- `type` (optional): Filter by community type ('language', 'user_created', 'all')

**Response:**
```json
[
  {
    "id": 1,
    "name": "French Community",
    "description": "Community for French language translators",
    "type": "language",
    "access_type": "open",
    "language_code": "fr",
    "language_name": "French",
    "owner_id": null,
    "member_count": 25,
    "actual_member_count": 25,
    "created_at": "2026-01-01T00:00:00.000Z",
    "updated_at": "2026-01-01T00:00:00.000Z"
  }
]
```

#### GET /api/communities/:id
Get details of a specific community including members.

**Response:**
```json
{
  "id": 1,
  "name": "Marine Biology Translators",
  "description": "Community for marine biology term translators",
  "type": "user_created",
  "access_type": "open",
  "owner_id": 5,
  "owner_username": "john_doe",
  "member_count": 10,
  "actual_member_count": 10,
  "members": [
    {
      "id": 1,
      "community_id": 1,
      "user_id": 5,
      "username": "john_doe",
      "reputation": 500,
      "role": "creator",
      "joined_at": "2026-01-01T00:00:00.000Z"
    }
  ],
  "user_membership": {
    "id": 1,
    "role": "creator",
    "joined_at": "2026-01-01T00:00:00.000Z"
  }
}
```

#### POST /api/communities
Create a new community (requires authentication).

**Request Body:**
```json
{
  "name": "Marine Biology Translators",
  "description": "Community for marine biology term translators",
  "access_type": "open"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Community created successfully",
  "community_id": 10
}
```

#### PUT /api/communities/:id
Update a community (owner only).

**Request Body:**
```json
{
  "name": "Updated Community Name",
  "description": "Updated description",
  "access_type": "invite_only"
}
```

#### DELETE /api/communities/:id
Delete a community (owner only). Language communities cannot be deleted.

### Membership Management

#### POST /api/communities/:id/join
Join an open community.

**Response:**
```json
{
  "success": true,
  "message": "Successfully joined community"
}
```

#### DELETE /api/communities/:id/leave
Leave a community. Creators cannot leave their own communities. Users cannot manually leave language communities.

#### DELETE /api/communities/:id/members/:userId
Remove a member from the community (owner only).

### Invitations

#### POST /api/communities/:id/invite
Invite a user to a community (owner only).

**Request Body:**
```json
{
  "user_id": 15
}
```
or
```json
{
  "username": "jane_doe"
}
```

#### GET /api/invitations
Get current user's pending invitations.

**Response:**
```json
[
  {
    "id": 1,
    "community_id": 5,
    "community_name": "Advanced Translators",
    "community_description": "For experienced translators",
    "user_id": 10,
    "invited_by_id": 5,
    "invited_by_username": "john_doe",
    "status": "pending",
    "created_at": "2026-02-01T00:00:00.000Z"
  }
]
```

#### POST /api/invitations/:id/accept
Accept a community invitation.

#### POST /api/invitations/:id/decline
Decline a community invitation.

#### GET /api/communities/:id/invitations
Get all invitations for a community (owner only).

### Stats and Leaderboards

#### GET /api/communities/:id/stats
Get community statistics.

**Query Parameters:**
- `period` (optional): Time period ('week', 'month', 'year', 'all'). Default: 'month'

**Response:**
```json
{
  "community_id": 1,
  "community_name": "French Community",
  "period": "month",
  "total_translations": 150,
  "translations_by_status": {
    "approved": 100,
    "merged": 30,
    "review": 15,
    "draft": 5
  },
  "translations_by_language": {
    "fr": 150
  },
  "translations_over_time": [
    {"date": "2026-02-01", "count": 10},
    {"date": "2026-02-02", "count": 15}
  ],
  "top_contributors": [
    {
      "id": 5,
      "username": "john_doe",
      "display_name": "John Doe",
      "reputation": 500,
      "translation_count": 50
    }
  ]
}
```

#### GET /api/communities/:id/leaderboard
Get community leaderboard.

**Query Parameters:**
- `metric` (optional): Metric to rank by ('reputation', 'translations', 'reviews'). Default: 'reputation'
- `limit` (optional): Number of results (1-100). Default: 50

**Response:**
```json
{
  "community_id": 1,
  "community_name": "French Community",
  "metric": "reputation",
  "leaderboard": [
    {
      "rank": 1,
      "id": 5,
      "username": "john_doe",
      "display_name": "John Doe",
      "reputation": 500,
      "role": "creator",
      "joined_at": "2026-01-01T00:00:00.000Z",
      "translation_count": 50,
      "review_count": 20
    }
  ]
}
```

#### GET /api/communities/:id/goals
Get community-specific goals.

#### GET /api/users/:id/communities
Get a user's communities.

**Response:**
```json
{
  "user_id": 5,
  "username": "john_doe",
  "communities": [
    {
      "id": 1,
      "name": "French Community",
      "type": "language",
      "role": "member",
      "joined_at": "2026-01-01T00:00:00.000Z"
    }
  ]
}
```

## Frontend Routes

- `/communities` - List all communities
- `/communities/create` - Create a new community
- `/communities/:id` - View community details
- `/communities/:id/settings` - Manage community (owner only)
- `/communities/:id/invite` - Invite members (owner only)

## Language Community Auto-Assignment

When a user updates their language preferences, they are automatically added or removed from language communities:

1. User updates preferred languages in settings
2. System compares current language communities with new preferences
3. User is added to communities for new languages
4. User is removed from communities for removed languages
5. Member counts are updated automatically

This is handled by the `syncUserLanguageCommunities()` function in `backend/src/services/community.service.js`.

## Community Goals Integration

Communities can have specific goals created by admins. These goals are linked to communities via the `community_id` field in the `community_goals` table.

- Global goals (community_id = NULL) are shown to all users
- Community-specific goals are only shown to community members
- Goals can track translation counts or collections

## Permissions

### Language Communities
- **View**: All users
- **Join**: Automatic based on language preferences
- **Leave**: Cannot manually leave (update language preferences instead)
- **Edit/Delete**: Not allowed (system-managed)

### User-Created Communities

#### Open Communities
- **View**: All users
- **Join**: Any authenticated user
- **Leave**: Any member (except creator)
- **Invite**: Owner only
- **Remove Members**: Owner only
- **Edit**: Owner only
- **Delete**: Owner only

#### Invite-Only Communities
- **View**: All users (but limited details)
- **Join**: By invitation only
- **Leave**: Any member (except creator)
- **Invite**: Owner only
- **Remove Members**: Owner only
- **Edit**: Owner only
- **Delete**: Owner only

## Best Practices

1. **Community Names**: Keep names descriptive and unique
2. **Descriptions**: Provide clear descriptions of the community's purpose
3. **Access Type**: Use invite-only for specialized or curated communities
4. **Member Management**: Regularly review and manage community members
5. **Goals**: Create meaningful goals that encourage participation
6. **Stats**: Review community stats to understand activity patterns

## Future Enhancements

Potential future improvements:
- Community moderator role with limited permissions
- Community banners/avatars
- Community chat/discussions
- Community achievements
- Transfer ownership
- Community categories/tags
- Private communities (not visible to non-members)
- Community-specific translation workflows
- Bulk member management
- Community analytics dashboard
