# Term Discussion System - Implementation Guide

## Overview
This document describes the term-level discussion system that was integrated into the Marine Term Translations platform.

## Features

### User Capabilities
- **Start Discussions**: Any authenticated user can create a new discussion on a term
- **Reply to Discussions**: Participate in ongoing discussions with threaded messages
- **Close/Reopen**: Discussion starters can close or reopen their discussions
- **View History**: See all messages and timestamps in chronological order

### UI Components

#### Discussion Section Location
- Located at the bottom of the Term Detail page
- Spans full width below the translation workspace
- Collapsible section with discussion count in header

#### Create Discussion Form
```
Title: [Text input for discussion title]
Message: [Textarea for initial message]
[Create Discussion] button
```

#### Discussion Thread Display
```
Discussion Title
Started by username • YYYY-MM-DD • X messages • [open/closed badge]

Messages:
  └─ username • timestamp
     message content
  └─ username • timestamp  
     message content

[Reply input] [Send button]
```

## API Endpoints

### Get Discussions for a Term
```
GET /api/terms/:termId/discussions
Response: Array of discussions with message counts
```

### Create New Discussion
```
POST /api/terms/:termId/discussions
Body: { title: string, message: string }
Response: Created discussion object
```

### Update Discussion Status
```
PATCH /api/discussions/:id
Body: { status: 'open' | 'closed' }
Response: Updated discussion object
```

### Get Discussion Messages
```
GET /api/discussions/:id/messages
Response: Array of messages with author info
```

### Add Message to Discussion
```
POST /api/discussions/:id/messages
Body: { message: string }
Response: Created message object
```

## Database Schema

### term_discussions
- `id`: Primary key
- `term_id`: Foreign key to terms table
- `started_by_id`: Foreign key to users table
- `title`: Discussion title
- `status`: 'open' or 'closed'
- `created_at`, `updated_at`: Timestamps

### term_discussion_messages
- `id`: Primary key
- `discussion_id`: Foreign key to term_discussions
- `author_id`: Foreign key to users table
- `message`: Message content
- `created_at`: Timestamp

### term_discussion_participants
- `id`: Primary key
- `discussion_id`: Foreign key to term_discussions
- `user_id`: Foreign key to users table
- `first_message_at`, `last_message_at`: Timestamps
- Unique constraint on (discussion_id, user_id)

## Security Considerations

### Authentication
- All write operations (POST, PATCH) require valid session
- Session user ID is extracted from `req.session.user`
- User identity verified before allowing actions

### Authorization
- Only discussion starters can close/reopen their discussions
- All authenticated users can view discussions
- All authenticated users can reply to open discussions
- Closed discussions cannot receive new messages

### Input Validation
- Title and message are required for new discussions
- Empty messages are rejected
- User ID validation before all database operations

## Usage Example

### Creating a Discussion
1. Navigate to any term detail page
2. Scroll to "Discussions" section
3. Click "Show" if collapsed
4. Fill in title and message
5. Click "Create Discussion"

### Replying to a Discussion
1. Find the discussion in the list
2. Type reply in the input field at bottom of discussion
3. Press Enter or click Send button

### Closing a Discussion
1. Find your discussion in the list
2. Click "Close" button (only visible to discussion starter)
3. Discussion status changes to "closed"
4. No new replies can be added

## Integration Points

### Frontend Files Modified
- `frontend/types.ts`: Added discussion types
- `frontend/services/api.ts`: Added API methods
- `frontend/pages/TermDetail.tsx`: Added UI components

### Backend Files Created/Modified
- `backend/src/routes/term-discussions.routes.js`: New route handler
- `backend/src/app.js`: Registered new routes
- `backend/src/db/migrations/027_term_discussions.sql`: Database migration
- `backend/src/db/migrations/schema.sql`: Updated schema

## Future Enhancements (Out of Scope)
- Notifications for discussion replies
- Rich text formatting for messages
- Discussion search and filtering
- @mentions for users
- Reaction/voting on messages
- Discussion categories/tags
