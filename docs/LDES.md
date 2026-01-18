# LDES Implementation Guide

## Overview

This platform now supports automatic generation and updating of LDES (Linked Data Event Streams) for all sources. Each source produces its own isolated LDES feed that complies with the LDES specification.

## Architecture

### Storage Structure

LDES fragments are stored at:
```
/data/LDES/{source_id}/
```

Each source has:
- Individual fragment files named by **epoch timestamp** (e.g., `1768758532.ttl`)
- A `latest.ttl` file that always points to the most recent fragment

### Fragment Naming Convention

Fragments are named using **Unix epoch timestamps** (seconds since 1970-01-01):
- Fragment timestamp is based on the latest `modified_at` date of included translations
- Next fragment timestamp is current epoch + 1 second
- Example: `1768758532.ttl` → next fragment would be `1768758533.ttl`

This ensures unique, sequential fragment names with minimal gaps between fragments.

### Components

1. **LDES Service** (`backend/src/services/ldes.py`)
   - Python module using py-sema library
   - Handles LDES creation and updates
   - Queries database for translations with status='review'
   - Dynamically renders predicates based on field_uri from translations

2. **LDES Template** (`backend/src/services/ldes_templates/ldes_fragment.ttl`)
   - Jinja2 template for generating LDES-compliant RDF
   - Defines LDES structure with tree:Node and ldes:EventStream
   - **Dynamically renders all predicates** from translation field URIs
   - Preserves language tags from translations

3. **Task Dispatcher Integration** (`backend/src/services/taskDispatcher.service.js`)
   - Executes LDES feed creation tasks
   - Spawns Python process to generate fragments

## Usage

### Manual LDES Generation

Generate or update LDES feed for a source:

```bash
python3 backend/src/services/ldes.py <source_id> <database_path> [prefix_uri]
```

**Parameters:**
- `source_id`: ID of the source (from sources table)
- `database_path`: Path to SQLite database
- `prefix_uri` (optional): Base URI for LDES (default: https://marine-term-translations.github.io)

**Example:**
```bash
python3 backend/src/services/ldes.py 1 /app/backend/data/translations.db
```

### Via Task System

Create an LDES feed task:

```javascript
// Insert a task into the tasks table
INSERT INTO tasks (task_type, source_id, status, metadata)
VALUES ('ldes_feed', 1, 'pending', '{"prefix_uri": "https://example.org"}');
```

The task dispatcher will automatically execute the task.

### Scheduled LDES Updates

Create a scheduler for automatic LDES updates:

```javascript
// Insert a scheduler for hourly LDES updates
INSERT INTO task_schedulers (name, task_type, source_id, schedule_config, enabled)
VALUES (
  'Hourly LDES Update - Source 1',
  'ldes_feed',
  1,
  '{"interval": 3600}',  -- Every hour
  1
);
```

## Behavior

### First-Time Creation

When no LDES feed exists for a source:
1. Queries all translations with status='review'
2. Creates the first fragment
3. Copies fragment to `latest.ttl`

### Updating Existing Feed

When an LDES feed already exists:
1. Parses `latest.ttl` to find the latest modified date
2. Queries for translations newer than this date with status='review'
3. If new translations exist:
   - Creates a new fragment with only the new translations
   - Updates `latest.ttl` to point to the new fragment
4. If no new translations exist:
   - Skips fragment creation (returns status='skipped')

## LDES Compliance

Generated fragments comply with the LDES specification:

- **tree:Node**: Each fragment is a tree:Node
- **tree:member**: Node explicitly declares all member resources via `tree:member` relationships
- **tree:relation**: Links to next fragment using tree:GreaterThanOrEqualToRelation
  - Next fragment timestamp is current epoch + 1 second
  - Ensures minimal gaps between fragment identifiers
- **ldes:EventStream**: Declares the LDES with timestampPath and versionOfPath
- **Members**: Each translation term includes:
  - `dcterms:modified`: Timestamp of modification
  - `dcterms:isVersionOf`: Reference to original concept
  - **Dynamic predicates**: Any predicate from `field_uri` in translations
    - Examples: `skos:prefLabel`, `skos:definition`, `rdfs:label`, `dcterms:description`
    - Language tags are preserved from translation data (e.g., `@nl`, `@fr`, `@de`)

### Fragment Structure

Each fragment follows this structure:

```turtle
<https://example.org/1/1768769839>
    a tree:Node ;
    tree:member <http://vocab.nerc.ac.uk/collection/P02/current/AAAA/> ;
    tree:member <http://vocab.nerc.ac.uk/collection/P02/current/BBBB/> ;
    tree:relation [
        a tree:GreaterThanOrEqualToRelation ;
        tree:node <https://example.org/1/1768769840> ;
        tree:path dcterms:modified ;
        tree:value "2026-01-18T20:57:20Z"^^xsd:dateTime
    ] .
```

### Dynamic Predicate Rendering

The template dynamically renders all predicates based on the `field_uri` values in the database:

```turtle
<http://example.org/concept/123>
    dcterms:isVersionOf <http://example.org/concept/123> ;
    dcterms:modified "2026-01-18T17:48:52.943447"^^xsd:dateTime ;
    <http://www.w3.org/2004/02/skos/core#prefLabel> "Label"@nl ;
    <http://purl.org/dc/terms/description> "Description"@fr ;
    <http://www.w3.org/2000/01/rdf-schema#label> "RDFS Label"@de ;
    .
```

This means any custom vocabularies used in translations will be automatically included in the LDES fragments.

## Configuration

### Environment Variables

- `LDES_BASE_DIR`: Base directory for LDES storage (default: `/data/LDES`)

**Example:**
```bash
export LDES_BASE_DIR=/custom/path/to/ldes
```

## Troubleshooting

### No fragment created when translations exist

Check that translations have `status='review'`. Only reviewed translations are included in LDES feeds.

### Fragment timestamp issues

Fragments are named based on the latest `modified_at` timestamp in the included translations. Ensure translations have proper `modified_at` values.

### Python dependencies missing

Install required packages:
```bash
cd backend
pip install -r requirements.txt
```

## Technical Details

### Dependencies

- **py-sema**: LDES generation library
- **rdflib**: RDF parsing and manipulation
- **Jinja2**: Template rendering (included with py-sema)

### Fragment Naming

Fragments use **Unix epoch timestamp** format: `{epoch}.ttl`

Examples:
- `1768758532.ttl` - Fragment at epoch 1768758532 (2026-01-18 17:48:52 UTC)
- `1768758571.ttl` - Fragment at epoch 1768758571 (2026-01-18 17:49:31 UTC)

The epoch timestamp is derived from the latest `modified_at` value of translations included in the fragment.

### Data Flow

```
Database (translations) 
  → Query (status='review')
  → Prepare LDES data
  → Generate fragment (py-sema/Subyt)
  → Save to /data/LDES/{source_id}/
  → Update latest.ttl
```

## Future Enhancements

Potential improvements:
- Add retention policies for old fragments
- Implement fragment pagination for large datasets
- Add LDES client for consuming feeds
- Support for incremental updates without full regeneration
- Web interface for browsing LDES feeds
