# Backend Harvest Functionality

## Overview

The backend now includes Python-based term harvesting functionality that allows you to populate the translations database from SKOS collections available via SPARQL endpoints.

This feature was adapted from the [setup-harvest-action](https://github.com/marine-term-translations/setup-harvest-action) GitHub action and integrated directly into the backend API.

## Features

- **SPARQL Integration**: Queries NERC vocabulary collections via SPARQL endpoint
- **Batch Processing**: Handles large collections with automatic batching (1000 terms per batch)
- **Retry Logic**: Exponential backoff for transient network errors
- **Data Preservation**: Updates existing terms without affecting translations or user data
- **REST API**: Simple HTTP endpoint for triggering harvests

## API Endpoint

### POST /api/harvest

Triggers a harvest operation for a SKOS collection.

**Request:**
```json
{
  "collectionUri": "http://vocab.nerc.ac.uk/collection/P01/current/"
}
```

**Response (Success):**
```json
{
  "success": true,
  "termsInserted": 42,
  "termsUpdated": 158,
  "fieldsInserted": 623,
  "message": "Harvest completed: 42 terms inserted, 158 terms updated, 623 fields inserted"
}
```

**Response (Error):**
```json
{
  "error": "Harvest failed",
  "details": "SPARQL count query failed: ..."
}
```

**Authentication:** Requires an authenticated session (ORCID login).

**Rate Limiting:** Subject to write rate limits.

## Usage Examples

### Using cURL

```bash
curl -X POST http://localhost:5000/api/harvest \
  -H "Content-Type: application/json" \
  -H "Cookie: mtt.sid=<your-session-cookie>" \
  -d '{
    "collectionUri": "http://vocab.nerc.ac.uk/collection/P01/current/"
  }'
```

### Using JavaScript (Frontend)

```javascript
const response = await fetch('/api/harvest', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  credentials: 'include', // Include session cookie
  body: JSON.stringify({
    collectionUri: 'http://vocab.nerc.ac.uk/collection/P01/current/'
  })
});

const result = await response.json();
console.log(`Harvested ${result.termsInserted} new terms`);
```

## How It Works

1. **API Receives Request**: The `/api/harvest` endpoint receives a collection URI
2. **URI Validation**: The URI is validated and sanitized for security
3. **Python Script Execution**: A Python subprocess is spawned to run the harvest script
4. **SPARQL Queries**: The script queries the SPARQL endpoint for term counts and data
5. **Database Updates**: Terms and fields are inserted/updated in the SQLite database
6. **Response**: Statistics are parsed and returned to the client

## Database Schema

The harvest process populates these tables:

### `terms`
- Stores the URI of each SKOS concept
- Automatically timestamps creation and updates

### `term_fields`
- Stores properties for each term (prefLabel, definition, etc.)
- Links to parent term via foreign key
- Prevents duplicates via UNIQUE constraint

### Field Mappings

The following SKOS properties are harvested:

| SPARQL Variable | Field URI | Field Term |
|----------------|-----------|------------|
| prefLabel | `skos:prefLabel` | Preferred label |
| altLabel | `skos:altLabel` | Alternative label |
| definition | `skos:definition` | Definition |
| notation | `skos:notation` | Notation |
| broader | `skos:broader` | Broader concept |
| narrower | `skos:narrower` | Narrower concept |
| related | `skos:related` | Related concept |

## Dependencies

### Python
- Python 3.11+
- SPARQLWrapper 2.0.0
- rdflib 7.4.0

### Node.js
- child_process (built-in)
- express
- better-sqlite3

## Installation

Python dependencies are automatically installed during Docker build via `requirements.txt`:

```bash
# In Dockerfile
pip3 install --no-cache-dir -r /app/requirements.txt
```

## Error Handling

The harvest script handles various error conditions:

- **Invalid URI**: Validates format and rejects malformed URIs
- **Missing Database**: Checks database file exists before connecting
- **Schema Validation**: Verifies required tables exist
- **SPARQL Errors**: Retries failed queries with exponential backoff (3 attempts)
- **Network Issues**: Gracefully handles timeouts and connection errors

## Security

- **URI Sanitization**: Validates URIs and prevents command injection
- **Authentication Required**: Only authenticated users can trigger harvests
- **Rate Limiting**: Write operations are rate-limited
- **Input Validation**: All parameters are validated before processing

## Monitoring

Harvest operations produce detailed console logs:

```
[Harvest] Starting harvest for collection: http://vocab.nerc.ac.uk/collection/P01/current/
[Harvest] Database path: /app/translations-data/translations.db
[Harvest] Python script: /app/src/services/harvest.py
[Harvest] Querying SPARQL endpoint for collection: http://vocab.nerc.ac.uk/collection/P01/current/ LIMIT=1000 OFFSET=0
[Harvest] Processing 1000 results...
[Harvest] Harvest summary:
[Harvest]   - New terms inserted: 42
[Harvest]   - Existing terms updated: 958
[Harvest]   - New term fields inserted: 623
[Harvest] Harvest completed successfully!
```

## Limitations

- Only supports NERC SPARQL endpoint (`http://vocab.nerc.ac.uk/sparql/`)
- Harvests are synchronous (blocks until complete)
- Large collections may take several minutes to process
- Network connectivity required to SPARQL endpoint

## Future Improvements

Potential enhancements:

- [ ] Support for additional SPARQL endpoints
- [ ] Asynchronous harvest with progress updates
- [ ] Scheduled/automated harvests
- [ ] Harvest history and audit log
- [ ] Partial/incremental harvests
- [ ] Webhook notifications on completion

## Troubleshooting

### "Database file does not exist"
Ensure the database has been initialized by the backend on startup.

### "Database schema not initialized"
The database exists but the schema hasn't been applied. Check database initialization logs.

### "Collection URI contains invalid characters"
The URI contains potentially dangerous characters. Use a clean HTTP/HTTPS URL.

### "SPARQL query failed"
Network connectivity issue or SPARQL endpoint is down. Check network access and endpoint status.

### "Harvest failed: No address associated with hostname"
DNS resolution failed. Verify network connectivity and DNS configuration.

## Related Documentation

- [setup-harvest-action GitHub Repository](https://github.com/marine-term-translations/setup-harvest-action)
- [NERC Vocabulary Server](http://vocab.nerc.ac.uk/)
- [SKOS Specification](https://www.w3.org/2004/02/skos/)
