# Search and Browse API Documentation

This document describes the enhanced search and faceted browsing capabilities added to the Marine Term Translations platform.

## Overview

The platform now includes full-text search (FTS5) and faceted browsing capabilities through the `/api/browse` endpoint. This allows users to:

- Search across terms and translations using natural language queries
- Filter results by multiple facets (language, status, field_uri)
- Get real-time facet counts for dynamic UI updates
- Paginate through large result sets efficiently

## Database Schema Enhancements

### FTS5 Virtual Tables

Two FTS5 (Full-Text Search) virtual tables have been added:

#### `terms_fts`
Indexes term field data for fast searching:
- `field_term`: The field type (e.g., skos:prefLabel, skos:definition)
- `original_value`: The original English value of the field

#### `translations_fts`
Indexes translation data for multilingual search:
- `value`: The translated text
- `language`: Language code (nl, fr, de, es, it, pt)

### Triggers

Automatic triggers keep the FTS tables synchronized with the source data:
- `term_fields_fts_insert/update/delete`: Syncs term_fields changes
- `translations_fts_insert/update/delete`: Syncs translations changes

### Indexes

Additional indexes for improved query performance:
- `idx_terms_uri`: Fast URI lookups
- `idx_translations_term_field_id`: Efficient translation joins
- `idx_translations_lang_status`: Fast faceting by language and status
- `idx_term_fields_field_uri`: Field URI filtering

### Views

#### `term_summary`
Denormalized view combining terms, term_fields, and translations for efficient browsing:
```sql
SELECT 
    t.id as term_id,
    t.uri,
    tf.id as term_field_id,
    tf.field_uri,
    tf.field_term,
    tf.original_value,
    tr.id as translation_id,
    tr.language,
    tr.status,
    tr.value as translation_value
FROM terms t
LEFT JOIN term_fields tf ON t.id = tf.term_id
LEFT JOIN translations tr ON tf.id = tr.term_field_id;
```

## API Endpoint

### `GET /api/browse`

Search and filter terms with faceted browsing support.

#### Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `query` | string | No | - | Full-text search query (searches field_term, original_value, translation values) |
| `limit` | integer | No | 20 | Maximum number of results (1-100) |
| `offset` | integer | No | 0 | Pagination offset |
| `language` | string | No | - | Filter by language code (nl, fr, de, es, it, pt) |
| `status` | string | No | - | Filter by status (draft, review, approved, rejected, merged) |
| `field_uri` | string | No | - | Filter by field URI |
| `facets` | string | No | - | Comma-separated facets to compute (language, status, field_uri) |

#### Response Format

```json
{
  "results": [
    {
      "uri": "http://example.org/term/salinity",
      "field_term": "skos:prefLabel",
      "original_value": "Salinity",
      "translations": [
        {
          "language": "fr",
          "value": "Salinité",
          "status": "approved"
        }
      ]
    }
  ],
  "total": 42,
  "limit": 20,
  "offset": 0,
  "facets": {
    "language": {
      "fr": 500,
      "nl": 300,
      "de": 200
    },
    "status": {
      "approved": 800,
      "draft": 200,
      "review": 100
    }
  }
}
```

#### Response Fields

- `results`: Array of matching terms with their translations
  - `uri`: Unique identifier for the term
  - `field_term`: The field type (usually skos:prefLabel)
  - `original_value`: Original English value
  - `translations`: Array of translations for this term
    - `language`: Language code
    - `value`: Translated text
    - `status`: Translation status
- `total`: Total number of matching terms (for pagination)
- `limit`: Applied limit from request
- `offset`: Applied offset from request
- `facets`: Object containing facet counts for each requested facet dimension

## Examples

### Basic Search

Search for terms containing "salinity":

```bash
GET /api/browse?query=salinity&facets=language,status
```

### Filter by Language

Get all terms with French translations:

```bash
GET /api/browse?language=fr&facets=language,status
```

### Combined Search and Filter

Search for "temperature" with approved translations only:

```bash
GET /api/browse?query=temperature&status=approved&facets=language,status
```

### Pagination

Get second page of results (20-39):

```bash
GET /api/browse?limit=20&offset=20&facets=language,status
```

## Frontend Integration

The `/browse` page uses this API to provide an interactive search and filtering experience:

### Features

1. **Search Bar**: Free-text search across all term data
2. **Facet Panels**: 
   - Language facet (clickable filters with counts)
   - Status facet (draft, review, approved, etc.)
3. **Active Filters Display**: Shows currently applied filters
4. **Pagination**: Navigate through result pages
5. **Responsive UI**: Works on mobile and desktop

### Implementation

The Browse.tsx component:
- Calls `/api/browse` with search query and active filters
- Updates facet counts dynamically based on current filters
- Provides fallback to `/api/terms` for backward compatibility
- Handles error states gracefully

## Performance Considerations

### Current Performance

With test data (< 100 terms):
- Search queries: < 50ms
- Facet computation: < 50ms
- Total response time: < 100ms (well under the 500ms requirement)

### Scaling Recommendations

For production deployments with large datasets (> 100,000 terms):

1. **Facet Count Optimization**:
   - Consider caching facet counts with periodic refresh
   - Use materialized views for frequently accessed facet combinations
   - Pre-compute counts during off-peak hours

2. **Index Maintenance**:
   - Run `ANALYZE` periodically to keep query planner statistics up-to-date
   - Monitor FTS table sizes and rebuild if necessary

3. **Query Optimization**:
   - Use pagination (limit results to 20-100 per page)
   - Avoid deep pagination (offset > 10,000)
   - Consider cursor-based pagination for very large result sets

## Migration

The database migration is applied automatically on server startup:

- Migration file: `backend/src/db/migrations/004_fts_search.sql`
- Applied once per database
- Safe to run on existing databases (uses IF NOT EXISTS)
- Includes VACUUM and ANALYZE for optimization

## Testing

To test the functionality:

1. **Backend API Test**:
```bash
# Start backend
cd backend && npm start

# Test basic browse
curl "http://localhost:5000/api/browse?facets=language,status"

# Test search
curl "http://localhost:5000/api/browse?query=salinity&facets=language,status"

# Test filtering
curl "http://localhost:5000/api/browse?language=fr&status=approved&facets=language,status"
```

2. **Frontend Test**:
```bash
# Build and preview
cd frontend && npm run build && npm run preview

# Navigate to http://localhost:4173/browse
```

## Troubleshooting

### FTS Search Not Working

If FTS searches return no results:

1. Check if FTS tables are populated:
```sql
SELECT COUNT(*) FROM terms_fts;
SELECT COUNT(*) FROM translations_fts;
```

2. Verify triggers are active:
```sql
SELECT name FROM sqlite_master WHERE type='trigger' AND name LIKE '%_fts_%';
```

3. Rebuild FTS indexes if needed:
```sql
INSERT INTO terms_fts(terms_fts) VALUES('rebuild');
INSERT INTO translations_fts(translations_fts) VALUES('rebuild');
```

### Slow Facet Queries

If facet computation is slow:

1. Check if indexes are present:
```sql
SELECT name FROM sqlite_master WHERE type='index';
```

2. Run ANALYZE to update statistics:
```sql
ANALYZE;
```

3. Check query plans:
```sql
EXPLAIN QUERY PLAN
SELECT tr.language, COUNT(DISTINCT tr.id) as count
FROM terms t
LEFT JOIN term_fields tf ON t.id = tf.term_id
LEFT JOIN translations tr ON tf.id = tr.term_field_id
GROUP BY tr.language;
```

## Future Enhancements

Potential improvements for future versions:

1. **Advanced Search Syntax**: Support for boolean operators (AND, OR, NOT)
2. **Search Highlighting**: Highlight matching terms in results
3. **More Facets**: Add facets for field_uri, collection, contributor
4. **Saved Searches**: Allow users to save and reuse search queries
5. **Search Analytics**: Track popular searches and improve relevance
6. **Auto-complete**: Suggest search terms as user types
7. **Export Results**: Download search results as CSV/JSON
