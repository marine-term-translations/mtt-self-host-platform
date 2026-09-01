# Admin Dashboard & KPI Charts Enhancement Design Specification

**Date:** 2026-08-18  
**Status:** Approved  
**Branch:** `fix/admin-charts`  
**Author:** Pair Programming Session

---

## 1. Executive Summary & Goals

The administrative dashboards in Marine Term Translations (MTT) currently present analytical and KPI data in basic or manual formats:
- The **Contributions Over Time** chart on `/admin` uses a manual, rigid SVG renderer with distorted coordinate calculations, no gradient aesthetics, and basic status-only filtering.
- The **/admin/kpi** page displays all query results exclusively in raw, unformatted HTML `<table>` elements without visual representations.

This feature modernizes both areas:
1. **Redesign the Admin Dashboard Activity Chart:** Replaces the manual SVG with a responsive, gradient-filled Recharts `ComposedChart` measuring **Daily Actions** and **Daily Active Users (DAU)** powered by a revised backend endpoint querying `user_activity`.
2. **Interactive KPI Visualizations:** Adds an auto-detecting chart suite with a `[ 📊 Chart View | 📋 Table View ]` toggle on `/admin/kpi`, providing tailored stacked bars, multi-series comparisons, and statistical KPI distribution cards.

---

## 2. Backend Enhancements: Activity & DAU Metrics

### 2.1 Endpoint: `GET /api/stats/contributions-over-time`
Location: `backend/src/routes/terms.routes.js`

#### Parameters:
- `timeframe`: `'last_hour'`, `'last_week'`, `'last_14_days'`, `'last_month'`, `'all_time'` (default: `'last_14_days'`).

#### Database Aggregation (`user_activity`):
```sql
SELECT 
  date(created_at) as date,
  COUNT(*) as total_actions,
  COUNT(DISTINCT user_id) as active_users,
  SUM(CASE WHEN action IN ('translation_created', 'translation_edited') THEN 1 ELSE 0 END) as translations,
  SUM(CASE WHEN action IN ('translation_reviewed', 'translation_status_changed') THEN 1 ELSE 0 END) as reviews,
  SUM(CASE WHEN action = 'translation_discussion' THEN 1 ELSE 0 END) as discussions
FROM user_activity
WHERE created_at >= ?
GROUP BY date(created_at)
ORDER BY date ASC;
```

#### Response Format:
```json
{
  "timeframe": "last_14_days",
  "summary": {
    "totalActions": 342,
    "totalUniqueUsers": 28,
    "peakDate": "2026-08-15",
    "peakActions": 64
  },
  "data": [
    {
      "date": "2026-08-05",
      "total_actions": 18,
      "active_users": 5,
      "translations": 10,
      "reviews": 6,
      "discussions": 2
    }
  ]
}
```

---

## 3. Frontend: Admin Dashboard Contributions Chart

### 3.1 Component Architecture
Location: `frontend/pages/AdminDashboard.tsx`

- **Library:** Recharts (`ResponsiveContainer`, `ComposedChart`, `Area`, `Line`, `XAxis`, `YAxis`, `Tooltip`, `Legend`, `CartesianGrid`).
- **Key Visual Elements:**
  - **Summary Metric Row:** Cards displaying Total Actions, Active Contributors, Peak Day, and Average Actions/Day.
  - **Timeframe Selector:** Buttons for 24h, 7d, 14d, 30d, All time.
  - **Area Series (Left Y-Axis):** Total Actions with linear gradient (`#06b6d4` to `#0d9488`).
  - **Line Series (Right Y-Axis):** Active Contributors with glowing Indigo line (`#818cf8`) and active dots.
  - **Glassmorphism Tooltip:** Dark semi-transparent card showing detailed breakdown of actions and users for the hovered date.
  - **Interactive Legend:** Toggle series visibility on click.

---

## 4. Frontend: Admin KPI Visualizations Suite

### 4.1 Component Architecture
Location: `frontend/pages/admin/AdminKPI.tsx`

- **View Toggle:** `[ 📊 Chart View | 📋 Table View ]` switcher.
- **Query-Specific Visualizations:**
  1. **`translation_status_by_month`**:
     - Stacked Bar Chart by month with color-coded status breakdown (Approved: Green, Review: Sky, Rejected: Rose, Discussion: Amber).
  2. **`user_behavior_statistics`**:
     - Multi-bar Chart comparing monthly bans, appeals, and reports over time.
  3. **`triplestore_named_graphs`**:
     - Horizontal Bar Chart showing RDF triple counts per named graph with human-readable formatting (`1.2M triples`).
  4. **`user_translation_statistics`**:
     - Top Summary Stat Cards: Mean, Median, Standard Deviation, Total Contributors.
     - Top 15 Contributors Bar Chart.
  5. **Generic Fallback Chart:**
     - For arbitrary SQL/SPARQL queries, dynamically maps string categories to X-axis and numeric columns to Bar series.

---

## 5. Verification & Testing

1. **Backend Tests:**
   - Update and add tests in `backend/tests/` verifying `/api/stats/contributions-over-time` returns `total_actions`, `active_users`, and action breakdowns.
2. **Frontend Build & Render Tests:**
   - Verify `npm run build` in `frontend/` succeeds without TypeScript or Vite bundling errors.
   - Verify responsive rendering and theme compatibility across light and dark modes.
