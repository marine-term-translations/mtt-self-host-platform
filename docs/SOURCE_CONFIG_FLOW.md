# Source Configuration Flow Documentation

## Overview

The **Source Configuration Flow** is a step-by-step wizard that guides administrators through configuring RDF data sources for translation. It enables:
- Selection of RDF types from triplestore data
- Optional filtering of triples for subsetting data
- Selection of predicates to translate
- Assignment of field roles (label, reference, translatable)

## Table of Contents

- [Features](#features)
- [Architecture](#architecture)
- [Configuration Flow Steps](#configuration-flow-steps)
- [Filtering System](#filtering-system)
- [API Endpoints](#api-endpoints)
- [Frontend Components](#frontend-components)
- [Usage](#usage)

---

## Features

### Core Functionality

- **Step-by-step Wizard**: Guided 5-step configuration process
- **RDF Type Selection**: Choose from available types in the source graph
- **Predicate Discovery**: Automatic detection of predicates with counts
- **Triple Filtering**: Subset data using class-based or regex filters
- **Dynamic Updates**: Predicate counts update based on applied filters
- **Field Role Assignment**: Assign label, reference, and translatable roles
- **Language Tag Support**: Per-field language tag configuration

### Filtering Capabilities

- **Class Filters**: For predicates with < 50 unique values
  - Select from a list of unique values
  - Multiple value selection
- **Regex Filters**: For predicates with >= 50 unique values
  - Pattern-based filtering
  - Case-insensitive matching
- **Multiple Filters**: Apply multiple filters to narrow results

---

## Architecture

### Backend Structure

```
backend/src/routes/
├── source-detail.routes.js
│   ├── GET /sources/:id/types          # Get RDF types
│   ├── GET /sources/:id/predicates      # Get predicates for type
│   ├── GET /sources/:id/filter-values   # Get unique values for filtering (NEW)
│   ├── GET /sources/:id/predicates-filtered  # Get predicates with filters applied (NEW)
│   ├── PUT /sources/:id/config          # Save configuration
│   └── POST /sources/:id/sync-terms     # Sync terms with filters (UPDATED)
```

### Frontend Structure

```
frontend/
├── components/
│   └── SourceConfigWizard.tsx         # Main wizard component (NEW)
└── pages/admin/
    └── AdminSourceDetail.tsx          # Source detail page (UPDATED)
```

---

## Configuration Flow Steps

### Step 1: Select RDF Type

**Purpose**: Choose the RDF type that contains the terms to translate

**UI Elements**:
- List of available RDF types with instance counts
- Type URI displayed with last segment highlighted
- Selection indicator

**Backend**: `GET /sources/:id/types`

**Example**:
```
http://www.w3.org/2004/02/skos/core#Concept (150 instances)
```

---

### Step 2: Preview Predicates

**Purpose**: Show all available predicates before filtering

**UI Elements**:
- List of all predicates with counts
- Type indicator (Literal vs URI)
- Language tag display for multilingual predicates

**Backend**: `GET /sources/:id/predicates?type={rdfType}`

**Example**:
```
skos:prefLabel (150 values) [Literal] @en, @nl, @fr
skos:definition (140 values) [Literal] @en
```

---

### Step 3: Configure Filters (Optional)

**Purpose**: Apply filters to select a subset of triples

#### Class Filter (< 50 unique values)

**UI**:
- Dropdown to select predicate
- Checkbox list of unique values with counts
- "Add Class Filter" button

**Example**:
```
Predicate: skos:inScheme
Values:
☑ http://vocab.nerc.ac.uk/scheme/P01 (120)
☐ http://vocab.nerc.ac.uk/scheme/P02 (30)
```

#### Regex Filter (>= 50 unique values)

**UI**:
- Dropdown to select predicate
- Text input for regex pattern
- "Add Regex Filter" button

**Example**:
```
Predicate: skos:notation
Pattern: ^P01.*
```

#### Active Filters Display

Shows all applied filters with ability to remove them:
```
✓ skos:inScheme • Values: http://vocab.nerc.ac.uk/scheme/P01
✓ skos:notation • Pattern: ^P01.*
```

**Backend**: 
- `GET /sources/:id/filter-values?type={type}&predicate={predicate}`
- `GET /sources/:id/predicates-filtered?type={type}&filters={json}`

---

### Step 4: Select Translatable Predicates

**Purpose**: Choose which predicates to translate

**UI Elements**:
- List of predicates (filtered if filters applied)
- Updated counts reflecting filters
- Selection with checkmark
- Selected paths summary panel

**Behavior**:
- Only literal predicates shown
- Click to add to selection
- Remove from selected panel

**Example**:
```
Selected Paths (3)
- skos:prefLabel
- skos:definition
- skos:altLabel
```

---

### Step 5: Assign Roles

**Purpose**: Configure field roles for each selected predicate

**Roles**:
- **Label**: Primary identifier for the term (required, one only)
- **Reference**: Additional information for translators (optional, multiple)
- **Translatable**: Fields to be translated (default for all)

**UI Elements**:
- List of selected paths
- "Set as Label" button
- "Mark as Reference" toggle
- Language selector (if multiple languages detected)
- Role badges

**Example**:
```
skos:prefLabel [LABEL] [TRANSLATABLE]
  Language: @en

skos:definition [REFERENCE] [TRANSLATABLE]
  Language: @en

skos:altLabel [TRANSLATABLE]
```

---

## Filtering System

### Filter Configuration Format

Filters are stored in the `translation_config` as part of the type configuration:

```json
{
  "types": [{
    "type": "http://www.w3.org/2004/02/skos/core#Concept",
    "paths": [...],
    "filters": [
      {
        "predicate": "http://www.w3.org/2004/02/skos/core#inScheme",
        "type": "class",
        "values": ["http://vocab.nerc.ac.uk/scheme/P01"]
      },
      {
        "predicate": "http://www.w3.org/2004/02/skos/core#notation",
        "type": "regex",
        "pattern": "^P01.*"
      }
    ]
  }],
  "labelField": "http://www.w3.org/2004/02/skos/core#prefLabel",
  "referenceFields": ["http://www.w3.org/2004/02/skos/core#definition"],
  "translatableFields": [...]
}
```

### Filter Application in SPARQL

Filters are applied when querying the triplestore:

#### Class Filter Example:
```sparql
PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
PREFIX skos: <http://www.w3.org/2004/02/skos/core#>

SELECT DISTINCT ?subject
WHERE {
  GRAPH <http://example.org/graph> {
    ?subject rdf:type skos:Concept .
    ?subject skos:inScheme ?filter0 .
    FILTER(?filter0 IN ("http://vocab.nerc.ac.uk/scheme/P01"))
  }
}
```

#### Regex Filter Example:
```sparql
PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
PREFIX skos: <http://www.w3.org/2004/02/skos/core#>

SELECT DISTINCT ?subject
WHERE {
  GRAPH <http://example.org/graph> {
    ?subject rdf:type skos:Concept .
    ?subject skos:notation ?filter0 .
    FILTER(REGEX(STR(?filter0), "^P01.*", "i"))
  }
}
```

---

## API Endpoints

### New Endpoints

#### `GET /sources/:id/filter-values`

Get unique literal values for a predicate to enable filtering.

**Parameters**:
- `type`: RDF type URI
- `predicate`: Predicate URI
- `limit`: Maximum values to return (default: 100)

**Response**:
```json
{
  "source_id": 1,
  "rdf_type": "http://www.w3.org/2004/02/skos/core#Concept",
  "predicate": "http://www.w3.org/2004/02/skos/core#inScheme",
  "values": [
    { "value": "http://vocab.nerc.ac.uk/scheme/P01", "count": 120 },
    { "value": "http://vocab.nerc.ac.uk/scheme/P02", "count": 30 }
  ],
  "totalCount": 2,
  "hasMore": false
}
```

#### `GET /sources/:id/predicates-filtered`

Get predicates with filters applied to see updated counts.

**Parameters**:
- `type`: RDF type URI
- `filters`: JSON array of filter rules

**Response**:
```json
{
  "source_id": 1,
  "rdf_type": "http://www.w3.org/2004/02/skos/core#Concept",
  "predicates": [
    {
      "predicate": "http://www.w3.org/2004/02/skos/core#prefLabel",
      "count": 120,
      "sampleValue": "Ocean temperature",
      "sampleType": "literal",
      "languages": ["en", "nl"]
    }
  ],
  "filters": [...]
}
```

### Updated Endpoints

#### `POST /sources/:id/sync-terms`

Now respects filters when synchronizing terms from the triplestore.

**Behavior**:
- Reads `filters` from `translation_config.types[0].filters`
- Applies SPARQL filters when querying subjects
- Only syncs terms matching the filter criteria

---

## Frontend Components

### SourceConfigWizard

**Props**:
- `sourceId`: Source database ID
- `graphName`: GraphDB graph name
- `existingConfig`: Pre-populated configuration (optional)
- `onConfigSaved`: Callback when configuration is saved

**State Management**:
- Maintains wizard step (1-5)
- Stores RDF types, predicates, filter rules
- Manages selected paths and role assignments
- Handles loading states

**Key Features**:
- Progress indicator with step numbers
- Navigation buttons (Back/Next/Save)
- Error and success message display
- Dynamic predicate reloading on filter changes

---

## Usage

### For Administrators

#### Initial Configuration

1. **Navigate to Source**: Go to Admin → Sources → Select a source
2. **Automatic Wizard Launch**: If no configuration exists, wizard appears
3. **Follow Steps**:
   - Step 1: Choose RDF type
   - Step 2: Review predicates
   - Step 3: (Optional) Add filters
   - Step 4: Select predicates to translate
   - Step 5: Assign roles
4. **Save Configuration**: Click "Save Configuration"
5. **Sync Terms**: Click "Sync Terms" to populate database

#### Reconfiguring an Existing Source

1. **Navigate to Source Detail Page**
2. **Click "Reconfigure" Button**
3. **Wizard Loads with Existing Config**
4. **Make Changes and Save**

### For Developers

#### Adding Filter Support for New Predicate Types

The filtering system automatically detects literal predicates. No code changes needed for standard RDF predicates.

#### Customizing Filter Thresholds

Edit `SourceConfigWizard.tsx`:

```typescript
// Change the threshold for class vs regex filters
filterValuesTotal < 50 ? (
  // Class filter UI
) : (
  // Regex filter UI
)
```

Current threshold: 50 unique values

---

## Testing

### Manual Testing Workflow

1. **Upload RDF File**: 
   - Admin → Sources → Upload File
   - Use a SKOS vocabulary or similar RDF dataset

2. **Configure Source**:
   - Select source → Wizard appears
   - Choose type (e.g., `skos:Concept`)
   - Review predicates

3. **Test Class Filter**:
   - Select a predicate with few values (e.g., `skos:inScheme`)
   - Verify unique values appear
   - Select values and add filter
   - Proceed to next step
   - Verify predicate counts updated

4. **Test Regex Filter**:
   - Go back to filter step
   - Select a predicate with many values (e.g., `skos:notation`)
   - Enter regex pattern
   - Add filter
   - Verify counts update

5. **Complete Configuration**:
   - Select predicates to translate
   - Assign label role to one field
   - Mark reference fields if desired
   - Save configuration

6. **Sync Terms**:
   - Click "Sync Terms"
   - Monitor task status
   - Verify only filtered terms are created

### Backend Testing

```bash
# Test filter values endpoint
curl "http://localhost:5000/api/sources/1/filter-values?type=http://www.w3.org/2004/02/skos/core%23Concept&predicate=http://www.w3.org/2004/02/skos/core%23inScheme"

# Test filtered predicates endpoint
curl "http://localhost:5000/api/sources/1/predicates-filtered?type=http://www.w3.org/2004/02/skos/core%23Concept&filters=%5B%7B%22predicate%22%3A%22http%3A%2F%2Fwww.w3.org%2F2004%2F02%2Fskos%2Fcore%23inScheme%22%2C%22type%22%3A%22class%22%2C%22values%22%3A%5B%22http%3A%2F%2Fvocab.nerc.ac.uk%2Fscheme%2FP01%22%5D%7D%5D"
```

---

## Database Schema

### Updated Configuration Storage

The `translation_config` column in the `sources` table now supports filters:

```sql
-- Example stored config
{
  "types": [{
    "type": "http://www.w3.org/2004/02/skos/core#Concept",
    "paths": [...],
    "filters": [
      {
        "predicate": "http://www.w3.org/2004/02/skos/core#inScheme",
        "type": "class",
        "values": ["http://vocab.nerc.ac.uk/scheme/P01"]
      }
    ]
  }],
  "labelField": "...",
  "referenceFields": [...],
  "translatableFields": [...]
}
```

No schema migration required - uses existing `TEXT` column.

---

## Security Considerations

### SPARQL Injection Prevention

All filter values are properly escaped:

```javascript
// String escaping for SPARQL
const valueList = rule.values.map(v => `"${v.replace(/"/g, '\\"')}"`).join(', ');

// Regex pattern escaping
FILTER(REGEX(STR(?filter), "${rule.pattern.replace(/"/g, '\\"')}", "i"))
```

### Input Validation

- Source ID validated as integer
- RDF type URI validated on backend
- Predicate URIs validated
- Filter rules validated before processing

---

## Future Enhancements

### Planned Features

- [ ] Filter preview showing sample results
- [ ] Complex filter combinations (AND/OR logic)
- [ ] Saved filter templates
- [ ] Filter import/export
- [ ] Batch configuration for multiple sources
- [ ] Configuration versioning

### Performance Optimizations

- [ ] Cache filter values
- [ ] Lazy load predicate details
- [ ] Optimize SPARQL query generation
- [ ] Add query timeout handling

---

## Support

For issues or questions:
- Check the [main README](../README.md)
- Review [ARCHITECTURE.md](../ARCHITECTURE.md)
- Open an issue on GitHub

---

## License

MIT
