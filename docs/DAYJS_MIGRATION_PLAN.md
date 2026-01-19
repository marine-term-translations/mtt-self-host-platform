# Platform-Wide DateTime Standardization with dayjs

## Overview

This document outlines the complete migration plan to standardize all datetime handling across the Marine Term Translations platform using dayjs and ISO-8601 format with timezone support.

## Goals

1. **Eliminate timezone confusion** by using ISO-8601 format everywhere
2. **Consistent datetime operations** across backend and frontend
3. **Type safety** for datetime handling in TypeScript frontend
4. **Database compatibility** while maintaining ISO-8601 standards

## Infrastructure (Already Implemented)

### ✅ Backend Utility
- **File**: `/backend/src/utils/datetime.js`
- **Functions**: `now()`, `parse()`, `toISO()`, `toXSDDateTime()`, `format()`, `add()`, `subtract()`, `isBefore()`, `isAfter()`, `diff()`
- **Default**: UTC timezone

### ✅ Frontend Utility
- **File**: `/frontend/src/utils/datetime.ts`
- **Functions**: Same as backend + `fromNow()` for relative time
- **Type**: TypeScript with type safety

### ✅ Dependencies
- `dayjs@^1.11.13` added to both `backend/package.json` and `frontend/package.json`

---

## Migration Tasks

### Phase 1: Backend Services (Priority: High)

#### 1.1 Authentication Service
**File**: `/backend/src/routes/auth.routes.js`

**Current Issues**:
- Uses `new Date()` for session expiry calculation
- Uses `Date.now()` for timestamp generation
- Uses `.toISOString()` for date serialization

**Changes Required**:
```javascript
// Import datetime utility
const datetime = require('../utils/datetime');

// Replace:
const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
// With:
const expiresAt = datetime.add(datetime.now(), 7, 'day');

// Replace:
some_timestamp: new Date().toISOString()
// With:
some_timestamp: datetime.toISO(datetime.now())
```

**Lines to Update**: ~5-8 occurrences
**Risk**: Medium (affects authentication sessions)
**Testing Required**: Login/logout flows, session expiry

---

#### 1.2 Task Dispatcher Service
**File**: `/backend/src/services/taskDispatcher.service.js`

**Current Issues**:
- Uses `new Date()` for task scheduling
- Uses `.toISOString()` for timestamp serialization
- Date comparisons for task execution timing

**Changes Required**:
```javascript
const datetime = require('../utils/datetime');

// Replace date creation:
const now = new Date();
// With:
const now = datetime.now();

// Replace date serialization:
created_at: new Date().toISOString()
// With:
created_at: datetime.toISO(datetime.now())

// Replace date parsing:
const taskDate = new Date(task.scheduled_time);
// With:
const taskDate = datetime.parse(task.scheduled_time);

// Replace date comparisons:
if (taskDate <= now)
// With:
if (datetime.isBefore(taskDate, now) || taskDate.isSame(now))
```

**Lines to Update**: ~12-15 occurrences
**Risk**: High (affects task scheduling)
**Testing Required**: Task creation, execution, scheduling

---

#### 1.3 Task Schedulers Routes
**File**: `/backend/src/routes/task-schedulers.routes.js`

**Current Issues**:
- Uses `new Date()` for scheduler creation/updates
- Uses `.toISOString()` for timestamp serialization

**Changes Required**:
```javascript
const datetime = require('../utils/datetime');

// Replace:
created_at: new Date().toISOString(),
updated_at: new Date().toISOString()
// With:
created_at: datetime.toISO(datetime.now()),
updated_at: datetime.toISO(datetime.now())
```

**Lines to Update**: ~4-6 occurrences
**Risk**: Medium (affects scheduler configuration)
**Testing Required**: Scheduler CRUD operations

---

#### 1.4 Gamification Service
**File**: `/backend/src/services/gamification.service.js`

**Current Issues**:
- Uses `new Date()` for reputation/badge timestamps
- Uses `.toISOString()` for date serialization
- Time-based calculations for streak tracking

**Changes Required**:
```javascript
const datetime = require('../utils/datetime');

// Replace:
earned_at: new Date().toISOString()
// With:
earned_at: datetime.toISO(datetime.now())

// Replace streak calculations:
const lastActivity = new Date(user.last_activity);
const daysSince = Math.floor((Date.now() - lastActivity) / (1000 * 60 * 60 * 24));
// With:
const lastActivity = datetime.parse(user.last_activity);
const daysSince = datetime.diff(datetime.now(), lastActivity, 'day');
```

**Lines to Update**: ~8-10 occurrences
**Risk**: Medium (affects user gamification)
**Testing Required**: Badge awarding, streak calculations

---

#### 1.5 Sources Routes
**File**: `/backend/src/routes/sources.routes.js`

**Current Issues**:
- Uses `Date.now()` for source updates

**Changes Required**:
```javascript
const datetime = require('../utils/datetime');

// Replace:
last_harvested_at: Date.now()
// With:
last_harvested_at: datetime.toISO(datetime.now())
```

**Lines to Update**: ~2-3 occurrences
**Risk**: Low (affects source metadata)
**Testing Required**: Source harvesting

---

#### 1.6 Gitea Service
**File**: `/backend/src/services/gitea.service.js`

**Current Issues**:
- Uses `Date.now()` for API interactions

**Changes Required**:
```javascript
const datetime = require('../utils/datetime');

// Replace timestamp generation
```

**Lines to Update**: ~1-2 occurrences
**Risk**: Low (affects Gitea integration)
**Testing Required**: Gitea API calls

---

### Phase 2: Frontend Components (Priority: High)

#### 2.1 Admin Tasks Page
**File**: `/frontend/pages/admin/AdminTasks.tsx`

**Current Issues**:
- Uses `new Date()` for task scheduling
- Uses `Date.now()` for timestamp comparison
- Date formatting for display

**Changes Required**:
```typescript
import { now, parse, toISO, format, add } from '@/utils/datetime';

// Replace:
const scheduledTime = new Date();
// With:
const scheduledTime = now();

// Replace:
scheduled_time: new Date(scheduledTime).toISOString()
// With:
scheduled_time: toISO(scheduledTime)

// Replace date display:
{new Date(task.created_at).toLocaleDateString()}
// With:
{format(parse(task.created_at), 'YYYY-MM-DD')}
```

**Lines to Update**: ~10-15 occurrences
**Risk**: High (affects task management UI)
**Testing Required**: Task creation, scheduling, display

---

#### 2.2 Admin Task Detail Page
**File**: `/frontend/pages/admin/AdminTaskDetail.tsx`

**Current Issues**:
- Date display formatting
- Date comparisons
- Uses `Date.now()` for task execution

**Changes Required**:
```typescript
import { now, parse, format, fromNow } from '@/utils/datetime';

// Replace:
{new Date(task.executed_at).toLocaleString()}
// With:
{format(parse(task.executed_at), 'YYYY-MM-DD HH:mm:ss')}

// Add relative time:
{fromNow(parse(task.executed_at))} // "2 hours ago"
```

**Lines to Update**: ~8-10 occurrences
**Risk**: Medium (affects task detail display)
**Testing Required**: Task detail viewing

---

#### 2.3 Dashboard Page
**File**: `/frontend/pages/Dashboard.tsx`

**Current Issues**:
- Date formatting for recent activity
- Uses `new Date()` for filtering

**Changes Required**:
```typescript
import { parse, format, fromNow } from '@/utils/datetime';

// Replace date displays
```

**Lines to Update**: ~5-7 occurrences
**Risk**: Medium (affects dashboard display)
**Testing Required**: Dashboard data display

---

#### 2.4 User Profile Page
**File**: `/frontend/pages/UserProfile.tsx`

**Current Issues**:
- Date formatting for user registration
- Activity timestamps

**Changes Required**:
```typescript
import { parse, format, fromNow } from '@/utils/datetime';

// Replace:
{new Date(user.created_at).toLocaleDateString()}
// With:
{format(parse(user.created_at), 'MMMM DD, YYYY')}
```

**Lines to Update**: ~3-5 occurrences
**Risk**: Low (affects profile display)
**Testing Required**: Profile page viewing

---

#### 2.5 Term Detail Page
**File**: `/frontend/pages/TermDetail.tsx`

**Current Issues**:
- Translation timestamp display

**Changes Required**:
```typescript
import { parse, format, fromNow } from '@/utils/datetime';
```

**Lines to Update**: ~2-3 occurrences
**Risk**: Low
**Testing Required**: Term detail viewing

---

#### 2.6 History Page
**File**: `/frontend/pages/History.tsx`

**Current Issues**:
- Historical data timestamp display

**Changes Required**:
```typescript
import { parse, format, fromNow } from '@/utils/datetime';
```

**Lines to Update**: ~4-6 occurrences
**Risk**: Medium (affects history display)
**Testing Required**: History page viewing

---

#### 2.7 Admin Sources Page
**File**: `/frontend/pages/admin/AdminSources.tsx`

**Current Issues**:
- Source harvest timestamps

**Changes Required**:
```typescript
import { parse, format, fromNow } from '@/utils/datetime';
```

**Lines to Update**: ~3-5 occurrences
**Risk**: Low
**Testing Required**: Sources management

---

#### 2.8 Admin Source Detail Page
**File**: `/frontend/pages/admin/AdminSourceDetail.tsx`

**Current Issues**:
- Detailed source timestamps

**Changes Required**:
```typescript
import { parse, format, fromNow } from '@/utils/datetime';
```

**Lines to Update**: ~4-6 occurrences
**Risk**: Low
**Testing Required**: Source detail viewing

---

#### 2.9 Admin Users Page
**File**: `/frontend/pages/admin/AdminUsers.tsx`

**Current Issues**:
- User registration dates

**Changes Required**:
```typescript
import { parse, format } from '@/utils/datetime';
```

**Lines to Update**: ~2-3 occurrences
**Risk**: Low
**Testing Required**: User management

---

#### 2.10 Admin Moderation Page
**File**: `/frontend/pages/admin/AdminModeration.tsx`

**Current Issues**:
- Moderation action timestamps

**Changes Required**:
```typescript
import { parse, format, fromNow } from '@/utils/datetime';
```

**Lines to Update**: ~3-5 occurrences
**Risk**: Low
**Testing Required**: Moderation queue

---

#### 2.11 Admin Harvest Page
**File**: `/frontend/pages/admin/AdminHarvest.tsx`

**Current Issues**:
- Harvest operation timestamps

**Changes Required**:
```typescript
import { parse, format, fromNow } from '@/utils/datetime';
```

**Lines to Update**: ~3-4 occurrences
**Risk**: Low
**Testing Required**: Harvest operations

---

#### 2.12 Layout Component
**File**: `/frontend/components/Layout.tsx`

**Current Issues**:
- Session expiry display

**Changes Required**:
```typescript
import { parse, fromNow } from '@/utils/datetime';
```

**Lines to Update**: ~1-2 occurrences
**Risk**: Low
**Testing Required**: Session display

---

#### 2.13 Landing Page
**File**: `/frontend/pages/Landing.tsx`

**Current Issues**:
- Potential date displays

**Changes Required**:
```typescript
import { parse, format } from '@/utils/datetime';
```

**Lines to Update**: ~0-2 occurrences
**Risk**: Low
**Testing Required**: Landing page

---

### Phase 3: Database Schema (Priority: Medium)

#### 3.1 Review Database Columns

**Files to Review**:
- `/backend/src/db/migrations/002_gamification.sql`
- `/backend/src/db/migrations/schema.sql`
- `/backend/src/db/migrations/009_tasks.sql`
- `/backend/src/db/migrations/005_sources.sql`

**Current State**: DATETIME columns (SQLite)

**Decision Required**: 
- SQLite stores DATETIME as TEXT in ISO-8601 format by default
- No schema migration needed if we ensure all inserts/updates use ISO-8601
- Backend utilities already produce ISO-8601 strings

**Action**: 
- ✅ No schema changes required
- ✅ Ensure all datetime.toISO() calls are used for database writes
- ✅ Document that database expects ISO-8601 TEXT format

---

## Implementation Strategy

### Recommended Order:

1. **Backend Services** (Phase 1) - ~3-5 commits
   - Start with low-risk services (gitea, sources routes)
   - Then medium-risk (gamification, task schedulers)
   - Finally high-risk (auth, task dispatcher)
   - Test thoroughly after each service

2. **Frontend Components** (Phase 2) - ~4-6 commits
   - Start with low-risk pages (landing, user profile, history)
   - Then medium-risk (dashboard, admin users, admin sources)
   - Finally high-risk (admin tasks, admin task detail)
   - Test UI after each component batch

3. **Integration Testing** - 1-2 commits
   - Full E2E testing of datetime flows
   - Verify timezone consistency
   - Check database integrity

---

## Testing Checklist

### Backend Tests
- [ ] Authentication: Login, logout, session expiry
- [ ] Task Scheduling: Create, execute, schedule tasks
- [ ] Task Schedulers: CRUD operations
- [ ] Gamification: Badge awarding, streak tracking
- [ ] Sources: Harvest operations, metadata updates
- [ ] Database: Verify ISO-8601 format in all DATETIME columns

### Frontend Tests
- [ ] Admin Tasks: Create, view, schedule, filter tasks
- [ ] Admin Task Detail: View execution logs, timestamps
- [ ] Dashboard: Recent activity display
- [ ] User Profile: Registration date, activity timestamps
- [ ] Term Detail: Translation timestamps
- [ ] History: Historical data display
- [ ] Admin Sources: Harvest timestamps
- [ ] Admin Users: User registration dates
- [ ] Admin Moderation: Action timestamps
- [ ] Layout: Session expiry display

### Integration Tests
- [ ] Create task from UI → verify backend receives ISO-8601
- [ ] Backend creates task → verify UI displays correctly
- [ ] Timezone consistency across system
- [ ] Database stores ISO-8601 format correctly
- [ ] Date arithmetic (add/subtract) works correctly
- [ ] Date comparisons work correctly
- [ ] Relative time ("2 hours ago") displays correctly

---

## Rollback Plan

If issues arise:

1. **Per-Service Rollback**: Git revert individual commits
2. **Full Rollback**: Revert all datetime utility imports, restore `new Date()` usage
3. **Database**: No schema changes means no database rollback needed

---

## Success Metrics

- [ ] Zero timezone-related bugs
- [ ] Consistent datetime format across platform (ISO-8601)
- [ ] All datetime operations use dayjs utilities
- [ ] TypeScript type safety for frontend datetime operations
- [ ] All tests passing
- [ ] No performance degradation

---

## Estimated Effort

- **Backend Migration**: 4-6 hours
- **Frontend Migration**: 6-8 hours  
- **Testing**: 4-6 hours
- **Documentation**: 1-2 hours
- **Total**: 15-22 hours

---

## Files Summary

### Backend (6 files)
1. `/backend/src/routes/auth.routes.js` - ~5-8 changes
2. `/backend/src/services/taskDispatcher.service.js` - ~12-15 changes
3. `/backend/src/routes/task-schedulers.routes.js` - ~4-6 changes
4. `/backend/src/services/gamification.service.js` - ~8-10 changes
5. `/backend/src/routes/sources.routes.js` - ~2-3 changes
6. `/backend/src/services/gitea.service.js` - ~1-2 changes

### Frontend (13 files)
1. `/frontend/pages/admin/AdminTasks.tsx` - ~10-15 changes
2. `/frontend/pages/admin/AdminTaskDetail.tsx` - ~8-10 changes
3. `/frontend/pages/Dashboard.tsx` - ~5-7 changes
4. `/frontend/pages/UserProfile.tsx` - ~3-5 changes
5. `/frontend/pages/TermDetail.tsx` - ~2-3 changes
6. `/frontend/pages/History.tsx` - ~4-6 changes
7. `/frontend/pages/admin/AdminSources.tsx` - ~3-5 changes
8. `/frontend/pages/admin/AdminSourceDetail.tsx` - ~4-6 changes
9. `/frontend/pages/admin/AdminUsers.tsx` - ~2-3 changes
10. `/frontend/pages/admin/AdminModeration.tsx` - ~3-5 changes
11. `/frontend/pages/admin/AdminHarvest.tsx` - ~3-4 changes
12. `/frontend/components/Layout.tsx` - ~1-2 changes
13. `/frontend/pages/Landing.tsx` - ~0-2 changes

### Database (0 migrations needed)
- SQLite already uses ISO-8601 TEXT format for DATETIME
- No schema changes required

---

## Post-Migration Tasks

1. Update developer documentation with dayjs usage guidelines
2. Add ESLint rule to prevent `new Date()` usage (optional)
3. Add TypeScript type guard for ISO-8601 strings (optional)
4. Monitor for timezone-related issues in production

---

## Notes

- Datetime utilities already implemented and ready to use
- Infrastructure is in place (dayjs installed, utilities created)
- This migration eliminates timezone confusion platform-wide
- All changes are backward compatible (ISO-8601 is standard)
- Database already stores ISO-8601 format (SQLite default)

---

**Created**: 2026-01-19  
**Status**: Ready for Implementation  
**Owner**: TBD  
**Estimated Completion**: 2-3 days of focused development
