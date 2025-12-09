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
- **Real-time Progress**: Streaming endpoint provides live updates during harvest

## API Endpoints

### POST /api/harvest

Triggers a harvest operation for a SKOS collection. Returns a single response after completion.

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

### POST /api/harvest/stream

Triggers a harvest operation with **real-time progress updates** using Server-Sent Events (SSE). This is recommended for large collections where you want to show progress to users.

**Request:**
```json
{
  "collectionUri": "http://vocab.nerc.ac.uk/collection/P01/current/"
}
```

**Response:** Server-Sent Events stream with progress updates

**Event Types:**
- `connected` - Initial connection established
- `info` - Informational message (e.g., "Starting harvest")
- `progress` - Progress update from the harvest script
- `warning` - Warning message
- `complete` - Harvest step completed
- `done` - Entire harvest completed successfully with final statistics
- `error` - Error occurred during harvest

**Example SSE Messages:**
```
data: {"type":"connected","message":"Connected to harvest stream"}

data: {"type":"info","message":"Starting harvest for collection: http://vocab.nerc.ac.uk/collection/P01/current/"}

data: {"type":"progress","message":"Querying for member count..."}

data: {"type":"progress","message":"Total members in collection: 200"}

data: {"type":"progress","message":"Fetching batch: OFFSET=0 LIMIT=1000"}

data: {"type":"progress","message":"Processing 200 results..."}

data: {"type":"complete","message":"Harvest completed: 42 terms inserted, 158 terms updated, 623 fields inserted","data":{"termsInserted":42,"termsUpdated":158,"fieldsInserted":623}}

data: {"type":"done","message":"Harvest completed successfully","data":{"success":true,"termsInserted":42,"termsUpdated":158,"fieldsInserted":623}}
```

**Authentication:** Requires an authenticated session (ORCID login).

**Rate Limiting:** Subject to write rate limits.

## Usage Examples

### Standard Harvest (Wait for completion)

#### Using cURL

```bash
curl -X POST http://localhost:5000/api/harvest \
  -H "Content-Type: application/json" \
  -H "Cookie: mtt.sid=<your-session-cookie>" \
  -d '{
    "collectionUri": "http://vocab.nerc.ac.uk/collection/P01/current/"
  }'
```

#### Using JavaScript (Frontend)

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

### Streaming Harvest (Real-time updates)

#### Using JavaScript with Fetch API

```javascript
// Note: EventSource only supports GET requests, but our endpoint requires POST
// with authentication, so we use fetch with streaming instead
async function harvestWithProgress(collectionUri) {
  const response = await fetch('/api/harvest/stream', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify({ collectionUri })
  });

  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value);
    const lines = chunk.split('\n');

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = JSON.parse(line.slice(6));
        
        switch (data.type) {
          case 'connected':
            console.log('✓ Connected to harvest stream');
            break;
          case 'info':
          case 'progress':
            console.log(`⏳ ${data.message}`);
            // Update UI with progress message
            updateProgressUI(data.message);
            break;
          case 'complete':
            console.log(`✓ ${data.message}`);
            break;
          case 'done':
            console.log(`✅ Harvest completed!`);
            console.log(`  - Terms inserted: ${data.data.termsInserted}`);
            console.log(`  - Terms updated: ${data.data.termsUpdated}`);
            console.log(`  - Fields inserted: ${data.data.fieldsInserted}`);
            // Update UI with final results
            showCompletionUI(data.data);
            break;
          case 'error':
            console.error(`❌ Error: ${data.message}`);
            // Show error UI
            showErrorUI(data.message);
            break;
          case 'warning':
            console.warn(`⚠️ Warning: ${data.message}`);
            break;
        }
      }
    }
  }
}

// Usage
harvestWithProgress('http://vocab.nerc.ac.uk/collection/P01/current/');
```

#### Using React with useState

```javascript
function HarvestComponent() {
  const [status, setStatus] = useState('idle');
  const [progress, setProgress] = useState([]);
  const [results, setResults] = useState(null);

  async function startHarvest(collectionUri) {
    setStatus('running');
    setProgress([]);

    const response = await fetch('/api/harvest/stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ collectionUri })
    });

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = JSON.parse(line.slice(6));
          
          if (data.type === 'progress' || data.type === 'info') {
            setProgress(prev => [...prev, data.message]);
          } else if (data.type === 'done') {
            setStatus('completed');
            setResults(data.data);
          } else if (data.type === 'error') {
            setStatus('error');
            setProgress(prev => [...prev, `Error: ${data.message}`]);
          }
        }
      }
    }
  }

  return (
    <div>
      <button onClick={() => startHarvest('http://vocab.nerc.ac.uk/collection/P01/current/')}>
        Start Harvest
      </button>
      
      {status === 'running' && (
        <div className="progress-container">
          <h3>Harvest in Progress...</h3>
          <ul>
            {progress.map((msg, i) => (
              <li key={i}>{msg}</li>
            ))}
          </ul>
        </div>
      )}
      
      {status === 'completed' && results && (
        <div className="results">
          <h3>Harvest Completed!</h3>
          <p>Terms inserted: {results.termsInserted}</p>
          <p>Terms updated: {results.termsUpdated}</p>
          <p>Fields inserted: {results.fieldsInserted}</p>
        </div>
      )}
    </div>
  );
}
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
