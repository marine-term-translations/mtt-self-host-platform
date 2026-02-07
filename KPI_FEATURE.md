# KPI Feature Implementation

## Overview

The KPI (Key Performance Indicators) feature consolidates the Database Query Tool and Triplestore SPARQL interfaces into a single, unified analytics page. This page provides predefined queries focused on key metrics for monitoring system health and user activity.

## Changes Made

### Backend Changes

1. **New Route**: `backend/src/routes/kpi.routes.js`
   - Unified endpoint for both SQL and SPARQL queries
   - Four predefined KPI queries:
     - **Triplestore Named Graphs**: All named graphs with triple counts
     - **Translation Status by Month**: Translation statuses per language monthly
     - **User Translation Statistics**: User translation counts with statistical distribution
     - **User Behavior Statistics**: Bans, appeals, and reports per month
   
2. **New Endpoints**:
   - `GET /api/kpi/queries` - List all available KPI queries
   - `POST /api/kpi/execute` - Execute a specific KPI query
   - `POST /api/kpi/download` - Download query results as CSV
   - `POST /api/kpi/download-report` - Download all KPI queries as a ZIP file

3. **Dependencies**:
   - Added `archiver` package for ZIP file generation

### Frontend Changes

1. **New Page**: `frontend/pages/admin/AdminKPI.tsx`
   - Unified interface for KPI queries
   - Dropdown to select predefined queries
   - Execute button to run queries
   - CSV download for individual queries
   - "Download KPI Report" button for complete ZIP file

2. **Updated Dashboard**: `frontend/pages/AdminDashboard.tsx`
   - Replaced two separate cards (Database Query and Triplestore SPARQL)
   - Single "KPI's" card linking to `/admin/kpi`
   - Changed grid layout from 6 to 5 columns

3. **Updated Routing**: `frontend/App.tsx`
   - Removed routes: `/admin/query` and `/admin/triplestore`
   - Added route: `/admin/kpi`

## KPI Queries Details

### 1. Triplestore Named Graphs
- **Type**: SPARQL
- **Description**: Lists all named graphs in the triplestore with their triple counts
- **Use Case**: Monitor RDF data ingestion and graph distribution

### 2. Translation Status by Month
- **Type**: SQL
- **Description**: Shows translation counts grouped by month, language, and status
- **Use Case**: Track translation progress over time per language

### 3. User Translation Statistics
- **Type**: SQL
- **Description**: User-level translation statistics with mean, median, and z-scores
- **Use Case**: Identify top contributors and distribution patterns

### 4. User Behavior Statistics
- **Type**: SQL
- **Description**: Monthly counts of bans, appeals, and reports
- **Use Case**: Monitor community moderation trends

## Features

1. **Predefined Queries Only**: No custom query input to ensure data security
2. **CSV Export**: Download individual query results as CSV files
3. **ZIP Report**: Download all KPI queries at once as a ZIP archive
4. **Dual Query Support**: Seamlessly handles both SQL and SPARQL queries
5. **Admin Only**: All endpoints require admin authentication

## Security

- All endpoints require admin privileges (`requireAdmin` middleware)
- No custom query execution - only predefined queries
- Read-only operations - no data modification possible

## Usage

1. Navigate to Admin Dashboard
2. Click on "KPI's" card or go to `/admin/kpi`
3. Select a KPI query from the dropdown
4. Click "Execute Query" to view results
5. Click "CSV" to download individual results
6. Click "Download KPI Report" to get all queries as a ZIP file

## Notes

- The old AdminQuery and AdminTriplestore components are no longer used but remain in the codebase
- The KPI queries can be extended by adding to the `KPI_QUERIES` object in `kpi.routes.js`
- GraphDB must be running and accessible for SPARQL queries to work
