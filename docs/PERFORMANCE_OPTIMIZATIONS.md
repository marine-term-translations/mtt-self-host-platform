# Performance Optimizations for Large Datasets

This document describes the performance optimizations implemented to handle large datasets efficiently.

## Problem Statement

The original implementation had several performance bottlenecks when working with large term datasets:

1. **Term Page Timeouts**: When viewing a specific term page, the frontend made multiple sequential API calls:
   - Paginated through ALL terms to find one by URI (up to 10+ requests for 1000+ terms)
   - Fetched ALL appeals in the system, then filtered client-side
   - Made individual API calls for each appeal's messages

2. **Dashboard Performance**: Limited to first 100 terms for building lookup maps, causing incorrect labels for terms beyond #100

3. **History View Timeouts**: Made unbounded `getTerms()` call to fetch entire dataset for term label resolution

4. **Incomplete Admin Stats**: Statistics only calculated from first 100 terms, not entire dataset

## Solutions Implemented

### Backend Optimizations

#### 1. Direct Term Lookup by URI
**Endpoint**: `GET /api/term-by-uri?uri={termUri}`

Replaces the pagination loop with a direct database query using query parameter:
```javascript
// Before: Multiple paginated requests
// After: Single query with URI as query parameter
const term = db.prepare("SELECT * FROM terms WHERE uri = ?").get(uri);
```

**Usage**:
```typescript
const term = await backendApi.getTermByUri('http://vocab.nerc.ac.uk/collection/P02/current/GP013/');
// Internally calls: GET /api/term-by-uri?uri=http://vocab.nerc.ac.uk/collection/P02/current/GP013/
```

**Note**: Changed from path parameter (`/terms/by-uri/:encodedUri`) to query parameter (`/term-by-uri?uri=...`) to avoid routing issues with complex URIs containing encoded slashes.

#### 2. Batch Term Retrieval
**Endpoint**: `POST /api/terms/by-ids`

Fetches multiple terms in a single request:
```javascript
// Request body
{ "ids": [1, 5, 10, 25] }

// Returns terms with label fields only for efficiency
```

**Usage**:
```typescript
const termIds = activities.map(a => a.term_id).filter(Boolean);
const terms = await backendApi.getTermsByIds(termIds);
```

#### 3. Term-Filtered Appeals
**Endpoint**: `GET /api/appeals/by-term/:termId`

Returns only appeals related to a specific term using efficient JOIN:
```sql
SELECT DISTINCT a.*
FROM appeals a
JOIN translations t ON a.translation_id = t.id
JOIN term_fields tf ON t.term_field_id = tf.id
WHERE tf.term_id = ?
```

**Usage**:
```typescript
const appeals = await backendApi.getAppealsByTerm(termId);
```

#### 4. Efficient Statistics Calculation
**Endpoint**: `GET /api/stats`

Uses SQL aggregation instead of client-side computation:
```sql
SELECT language, status, COUNT(*) as count
FROM translations
GROUP BY language, status
```

Returns complete statistics across ALL data:
```json
{
  "totalTerms": 1523,
  "totalTranslations": 4569,
  "byLanguage": {
    "nl": { "total": 852, "byStatus": { "draft": 300, "approved": 552 } },
    "fr": { "total": 789, "byStatus": { "draft": 250, "approved": 539 } }
  },
  "byStatus": {
    "draft": 1250,
    "approved": 2890,
    "rejected": 429
  },
  "byUser": {
    "user1": 234,
    "user2": 189
  }
}
```

**Usage**:
```typescript
const stats = await backendApi.getStats();
```

### Frontend Optimizations

#### TermDetail.tsx
**Before**: 100+ API calls for large datasets
```typescript
// Pagination loop to find term
const term = await getTermByUri(uri); // 10+ requests

// Fetch ALL appeals
const appeals = await getAppeals(); // 1 request for everything

// Fetch messages for each appeal
for (const appeal of appeals) {
  await getAppealMessages(appeal.id); // N requests
}
```

**After**: 3 API calls
```typescript
// Direct lookup
const term = await getTermByUri(uri); // 1 request

// Filtered appeals with messages
const appeals = await getAppealsByTerm(term.id); // 1 request

// Fetch messages for term's appeals only
for (const appeal of appeals) {
  await getAppealMessages(appeal.id); // M requests (M << N)
}
```

#### Dashboard.tsx & History.tsx
**Before**: Load all terms or limited subset
```typescript
// Load first 100 terms (incomplete)
const termsResponse = await getTerms(100, 0);

// OR load all terms (timeout risk)
const termsResponse = await getTerms();
```

**After**: Load only needed terms
```typescript
// Extract unique term IDs from activities
const termIds = activities
  .map(a => a.term_id)
  .filter(Boolean);

// Fetch only those specific terms
const terms = await getTermsByIds(termIds);
```

#### AdminDashboard.tsx & Leaderboard.tsx
**Before**: Incomplete statistics
```typescript
// Only processes first page of terms
const termsResponse = await getTerms();
termsResponse.terms.forEach(term => {
  // Calculate stats client-side
});
```

**After**: Complete statistics
```typescript
// Server-side aggregation across all data
const stats = await getStats();
// Includes: totalTerms, totalTranslations, byLanguage, byStatus, byUser
```

## Performance Impact

| Scenario | Before | After | Improvement |
|----------|--------|-------|-------------|
| **View term #500 (1000 terms)** | ~15 requests | 3 requests | 80% reduction |
| **Dashboard with 20 activities** | 1 request (100 terms) | 2 requests (20 terms) | Accurate + faster |
| **History with 50 activities** | 1 request (all terms) | 2 requests (50 terms) | No timeouts |
| **Admin stats (10,000 terms)** | Client-side calc (incomplete) | SQL aggregation (complete) | Accurate + instant |

## Database Schema Notes

No schema changes were required. The optimizations use existing tables:
- `terms` (id, uri)
- `term_fields` (id, term_id, field_role, field_term)
- `translations` (id, term_field_id, language, status)
- `appeals` (id, translation_id)

Existing indexes on these tables provide good query performance.

## Backward Compatibility

All changes are backward compatible:
- Old endpoints still work
- New endpoints are additions, not replacements
- Frontend gracefully handles both old and new data structures
- No breaking changes to API contracts

## Migration Notes

No migration is needed. Simply deploy the updated code:
1. Backend automatically exposes new endpoints
2. Frontend immediately uses optimized endpoints
3. No database changes required

## Future Enhancements

Consider these additional optimizations for very large datasets (100,000+ terms):

1. **Pagination for batch retrieval**: Add limits to `/api/terms/by-ids`
2. **Caching layer**: Add Redis for frequently accessed terms
3. **Indexed search**: Add full-text search indexes on term URIs
4. **Database migration**: Consider PostgreSQL for better concurrent query performance
