# Browse Page UI - Visual Guide

## Filter Panel Layout

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Browse Terms                                                               │
│  Search and filter the marine vocabulary                                   │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│  [🔍 Search Box]                                            [Search Button] │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────┬─────────────────┬─────────────────┬─────────────────────┐
│  🌍 Language    │  📊 Status      │  🏷️ Property    │  ✅ Active Filters  │
│  ─────────────  │  ─────────────  │  ─────────────  │  ─────────────────  │
│                 │                 │                 │                     │
│  [Has][Missing] │  [Has][Missing] │  prefLabel (5)  │  • nitrogen         │
│  ↑ Toggle btns  │  ↑ Toggle btns  │  definition (5) │  • Dutch (has)      │
│                 │                 │  altLabel (2)   │  • Approved (miss.) │
│  Dutch      (3) │  Draft     (5)  │  broader (1)    │  • prefLabel        │
│  French     (2) │  Review    (3)  │  narrower (1)   │                     │
│  German     (1) │  Approved  (2)  │                 │  [Clear All]        │
│  Spanish    (0) │  Rejected  (0)  │                 │                     │
│  Italian    (0) │  Merged    (0)  │                 │                     │
│  Portuguese (0) │                 │                 │                     │
└─────────────────┴─────────────────┴─────────────────┴─────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│  TERM CARDS GRID (3 columns on large screens)                              │
│                                                                             │
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐                  │
│  │ Term 1        │  │ Term 2        │  │ Term 3        │                  │
│  │ ─────────     │  │ ─────────     │  │ ─────────     │                  │
│  │ Definition... │  │ Definition... │  │ Definition... │                  │
│  │               │  │               │  │               │                  │
│  │ NL FR DE      │  │ NL FR         │  │ NL DE ES      │                  │
│  │ ✓  ✓  ~       │  │ ✓  ~          │  │ ✓  ~  ✓       │                  │
│  └───────────────┘  └───────────────┘  └───────────────┘                  │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│  Showing 1 to 5 of 5 terms                    [Previous] 1 2 3 [Next]      │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Filter Mode Toggles

When a language is selected, toggle buttons appear:

```
┌─────────────────┐
│  🌍 Language    │
│  ─────────────  │
│                 │
│  ┌───┬────────┐ │  ← Toggle buttons (only visible when filter active)
│  │Has│Missing │ │
│  └───┴────────┘ │
│                 │
│  Dutch      (3) │  ← Active language highlighted
│  French     (2) │
│  German     (1) │
└─────────────────┘
```

**Has Mode (default)**:
- Shows terms that HAVE a translation in the selected language
- Example: Select "Dutch" → Shows all terms with Dutch translations

**Missing Mode**:
- Shows terms that are MISSING a translation in the selected language
- Example: Select "Spanish" + "Missing" → Shows all terms WITHOUT Spanish translations
- Useful for finding translation gaps!

## Active Filters Panel

Shows all currently applied filters with mode indicators:

```
┌─────────────────────┐
│  ✅ Active Filters  │
│  ─────────────────  │
│                     │
│  🔍 nitrogen     [×]│  ← Search query
│  🌍 Dutch (has)  [×]│  ← Language filter with mode
│  📊 Approved     [×]│  ← Status filter with mode
│     (missing)       │     
│  🏷️ prefLabel    [×]│  ← Property filter
│                     │
│  [Clear All]        │
└─────────────────────┘
```

## Search Behavior

The search is now comprehensive and searches across:

1. **Translation values** (using FTS5 full-text search)
   - Fast and efficient
   - Matches partial words

2. **Original term values** (using SQL LIKE)
   - Searches field original_value
   - Case-insensitive matching

3. **Term URIs** (using SQL LIKE)
   - Searches the full URI
   - Useful for finding specific terms by code

Example searches:
- "nitrogen" → Finds terms with "nitrogen" in label or translation
- "AAMN" → Finds terms with AAMN in the URI
- "concentration" → Finds all terms about concentration

## Property Filter

Shows translatable fields (properties) with counts:

```
┌─────────────────┐
│  🏷️ Property    │
│  ─────────────  │
│                 │
│  prefLabel  (5) │  ← Most common
│  definition (5) │
│  altLabel   (2) │
│  broader    (1) │
│  narrower   (1) │
│                 │
│  No properties  │  ← Shows when empty
│  available      │
└─────────────────┘
```

Friendly names are extracted from URIs:
- `http://www.w3.org/2004/02/skos/core#prefLabel` → "prefLabel"
- `http://www.w3.org/2004/02/skos/core#definition` → "definition"

Hover over any property to see the full URI in a tooltip.

## Responsive Design

**Desktop (Large screens)**:
- 4-column filter grid
- 3-column term cards
- All panels visible

**Tablet (Medium screens)**:
- 2-column filter grid
- 2-column term cards
- Filters stack in pairs

**Mobile (Small screens)**:
- 1-column layout
- Single column for everything
- Scrollable filter panels

## Color Coding

- **Active filter**: Marine blue background
- **Hover state**: Light gray background
- **Toggle button active**: Marine blue
- **Toggle button inactive**: Gray
- **Filter count badges**: Small gray text
- **Remove filter (×)**: Red on hover
