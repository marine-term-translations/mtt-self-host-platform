# Admin Dashboard & KPI Charts Enhancement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the Admin Dashboard and KPI pages with modern Recharts visualizations: convert the contributions chart into an Activity & Daily Active Users (DAU) area/line chart powered by real activity data, and add an intelligent chart suite with a Chart/Table view toggle on `/admin/kpi`.

**Architecture:** Update `GET /api/stats/contributions-over-time` in `terms.routes.js` to aggregate `user_activity` table data by timeframe. In `AdminDashboard.tsx`, replace the custom SVG with a Recharts `ComposedChart` featuring gradients, DAU tracking, and glassmorphic tooltips. In `AdminKPI.tsx`, introduce a `[ Chart View | Table View ]` toggle and render dedicated Recharts visualizers for each query type.

**Tech Stack:** React 18, Recharts 3.x, Tailwind CSS, Lucide Icons, Express.js, SQLite (`better-sqlite3`).

## Global Constraints
- Target branch: `fix/admin-charts`
- Endpoint: `GET /api/stats/contributions-over-time`
- UI Palette: Marine Theme (`#06b6d4`, `#0d9488`, `#818cf8`, `#10b981`, `#f59e0b`, `#f43f5e`)

---

### Task 1: Backend Activity & DAU Analytics Endpoint

**Files:**
- Modify: `backend/src/routes/terms.routes.js`
- Create: `backend/tests/contributions-over-time.test.js`

**Interfaces:**
- Produces: `GET /api/stats/contributions-over-time?timeframe=...` -> returns `{ timeframe, summary: { totalActions, totalUniqueUsers, peakDate, peakActions }, data: Array<{ date, total_actions, active_users, translations, reviews, discussions }> }`

- [ ] **Step 1: Write failing test in `backend/tests/contributions-over-time.test.js`**

```javascript
// backend/tests/contributions-over-time.test.js
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const testDbPath = path.join(__dirname, 'test_contributions_stats.db');
process.env.SQLITE_DB_PATH = testDbPath;

if (fs.existsSync(testDbPath)) {
  fs.unlinkSync(testDbPath);
}

const { getDatabase } = require('../src/db/database');
const { initializeDatabase } = require('../src/services/dbInit.service');

async function run() {
  console.log("Running contributions over time stats test...");
  initializeDatabase();
  const db = getDatabase();

  // Setup mock users and activity
  db.prepare("INSERT INTO users (id, username) VALUES (1, 'alice')").run();
  db.prepare("INSERT INTO users (id, username) VALUES (2, 'bob')").run();

  // Insert mock activities
  db.prepare(`
    INSERT INTO user_activity (user_id, action, created_at)
    VALUES 
      (1, 'translation_created', datetime('now', '-2 days')),
      (1, 'translation_reviewed', datetime('now', '-2 days')),
      (2, 'translation_discussion', datetime('now', '-2 days')),
      (2, 'translation_created', datetime('now', '-1 days'))
  `).run();

  // Test the route handler
  const termsRoutes = require('../src/routes/terms.routes');
  const routeLayer = termsRoutes.stack.find(s => s.route && s.route.path === '/stats/contributions-over-time');
  assert.notStrictEqual(routeLayer, undefined, "Route /stats/contributions-over-time should exist");

  const handler = routeLayer.route.stack[routeLayer.route.stack.length - 1].handle;
  const req = { query: { timeframe: 'last_7_days' } };
  let resJson = null;
  const res = {
    json: (d) => { resJson = d; return res; },
    status: (code) => ({ json: (d) => { resJson = { status: code, ...d }; } })
  };

  handler(req, res);

  assert.strictEqual(resJson.timeframe, 'last_7_days');
  assert.strictEqual(resJson.summary.totalActions, 4, "Total actions should be 4");
  assert.strictEqual(resJson.summary.totalUniqueUsers, 2, "Unique users should be 2");
  assert.strictEqual(resJson.data.length >= 2, true, "Should contain at least 2 date entries");

  const twoDaysAgo = resJson.data.find(d => d.total_actions === 3);
  assert.notStrictEqual(twoDaysAgo, undefined, "Should have entry with 3 actions");
  assert.strictEqual(twoDaysAgo.active_users, 2, "Two days ago had 2 active users");
  assert.strictEqual(twoDaysAgo.translations, 1);
  assert.strictEqual(twoDaysAgo.reviews, 1);
  assert.strictEqual(twoDaysAgo.discussions, 1);

  console.log("✓ Contributions over time backend tests passed!");
  db.close();
  if (fs.existsSync(testDbPath)) {
    fs.unlinkSync(testDbPath);
  }
}

run().catch(err => {
  console.error("Test Failed:", err.message);
  process.exit(1);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node backend/tests/contributions-over-time.test.js`
Expected: FAIL (missing new response properties or structure)

- [ ] **Step 3: Update `terms.routes.js` to query `user_activity` and compute summaries**

In `backend/src/routes/terms.routes.js`, update `GET /stats/contributions-over-time`:
```javascript
router.get("/stats/contributions-over-time", apiLimiter, (req, res) => {
  try {
    const db = getDatabase();
    const timeframe = req.query.timeframe || 'last_14_days';
    
    let groupByFormat = "date(created_at)";
    const whereConditions = [];
    const queryParams = [];
    
    const now = new Date();
    let startDate;
    
    const addDateCondition = (hoursBack) => {
      startDate = new Date(now.getTime() - hoursBack * 60 * 60 * 1000);
      whereConditions.push('created_at >= ?');
      queryParams.push(startDate.toISOString());
    };
    
    switch (timeframe) {
      case 'last_hour':
        groupByFormat = "datetime(created_at, 'start of hour')";
        addDateCondition(1);
        break;
      case 'last_week':
        addDateCondition(7 * 24);
        break;
      case 'last_14_days':
        addDateCondition(14 * 24);
        break;
      case 'last_month':
        addDateCondition(30 * 24);
        break;
      case 'all_time':
        break;
      default:
        addDateCondition(14 * 24);
    }
    
    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
    
    const query = `
      SELECT 
        ${groupByFormat} as date,
        COUNT(*) as total_actions,
        COUNT(DISTINCT user_id) as active_users,
        SUM(CASE WHEN action IN ('translation_created', 'translation_edited') THEN 1 ELSE 0 END) as translations,
        SUM(CASE WHEN action IN ('translation_reviewed', 'translation_status_changed') THEN 1 ELSE 0 END) as reviews,
        SUM(CASE WHEN action = 'translation_discussion' THEN 1 ELSE 0 END) as discussions
      FROM user_activity
      ${whereClause}
      GROUP BY ${groupByFormat}
      ORDER BY date ASC
    `;
    
    const results = db.prepare(query).all(...queryParams);
    
    // Calculate summary statistics
    let totalActions = 0;
    let peakActions = 0;
    let peakDate = null;
    
    const allUsersQuery = `
      SELECT COUNT(DISTINCT user_id) as unique_users 
      FROM user_activity 
      ${whereClause}
    `;
    const totalUniqueUsers = db.prepare(allUsersQuery).get(...queryParams)?.unique_users || 0;
    
    const formattedData = results.map(row => {
      totalActions += row.total_actions;
      if (row.total_actions > peakActions) {
        peakActions = row.total_actions;
        peakDate = row.date;
      }
      return {
        date: row.date,
        total_actions: row.total_actions,
        active_users: row.active_users,
        translations: row.translations,
        reviews: row.reviews,
        discussions: row.discussions
      };
    });
    
    res.json({
      timeframe,
      summary: {
        totalActions,
        totalUniqueUsers,
        peakDate: peakDate || (formattedData[0]?.date || 'N/A'),
        peakActions
      },
      data: formattedData
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node backend/tests/contributions-over-time.test.js`
Expected: `✓ Contributions over time backend tests passed!`

- [ ] **Step 5: Commit**

```bash
git add backend/src/routes/terms.routes.js backend/tests/contributions-over-time.test.js
git commit -m "feat(api): update contributions-over-time to provide activity and DAU analytics"
```

---

### Task 2: Admin Dashboard Activity & DAU Recharts Modernization

**Files:**
- Modify: `frontend/pages/AdminDashboard.tsx`

**Interfaces:**
- Consumes: `GET /api/stats/contributions-over-time` (updated payload)
- Uses: Recharts components (`ResponsiveContainer`, `ComposedChart`, `Area`, `Line`, `XAxis`, `YAxis`, `Tooltip`, `Legend`, `CartesianGrid`)

- [ ] **Step 1: Replace custom SVG chart with Recharts `ComposedChart` in `AdminDashboard.tsx`**

1. Import Recharts components at top of `AdminDashboard.tsx`:
```tsx
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid
} from 'recharts';
```
2. Update state and types for `historyGraphData` and `summaryStats`.
3. Add top metric badges (Total Actions, Active Users, Peak Day, Daily Avg).
4. Implement custom Glassmorphic Tooltip showing:
   - Date header
   - Total Actions badge
   - Active Users count
   - Action breakdown pills: Translations, Reviews, Discussions
5. Render `ComposedChart`:
   - `<defs>` with linear gradient for Area (`actionsGradient` from `#06b6d4` to `#0d9488`).
   - `<Area yAxisId="actions" dataKey="total_actions" name="Daily Actions" fill="url(#actionsGradient)" stroke="#06b6d4" strokeWidth={2} />`
   - `<Line yAxisId="users" dataKey="active_users" name="Active Contributors" stroke="#818cf8" strokeWidth={2.5} dot={{ fill: '#818cf8', r: 3 }} activeDot={{ r: 6 }} />`
   - `<XAxis>` and dual `<YAxis yAxisId="actions">` and `<YAxis yAxisId="users" orientation="right">`.

- [ ] **Step 2: Verify frontend compilation**

Run: `npm run build` in `frontend/`
Expected: Build succeeds with 0 TypeScript/bundling errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/pages/AdminDashboard.tsx
git commit -m "feat(admin): modernize contributions chart with Recharts, DAU tracking, and glassmorphic tooltips"
```

---

### Task 3: Admin KPI Visualization Suite

**Files:**
- Modify: `frontend/pages/admin/AdminKPI.tsx`

**Interfaces:**
- Consumes: `GET /kpi/queries`, `POST /kpi/execute`
- Uses: Recharts (`BarChart`, `Bar`, `AreaChart`, `Area`, `PieChart`, `Pie`, `Cell`, `ResponsiveContainer`, `XAxis`, `YAxis`, `Tooltip`, `Legend`, `CartesianGrid`)

- [ ] **Step 1: Implement view toggle and query-specific charts in `AdminKPI.tsx`**

1. Add state `viewMode: 'chart' | 'table'` (default: `'chart'`).
2. Add view toggle in header:
```tsx
<div className="flex items-center bg-slate-800 rounded-lg p-1 border border-slate-700">
  <button
    onClick={() => setViewMode('chart')}
    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
      viewMode === 'chart' ? 'bg-marine-600 text-white' : 'text-slate-400 hover:text-white'
    }`}
  >
    <BarChart3 size={14} /> Chart View
  </button>
  <button
    onClick={() => setViewMode('table')}
    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
      viewMode === 'table' ? 'bg-marine-600 text-white' : 'text-slate-400 hover:text-white'
    }`}
  >
    <TableIcon size={14} /> Table View
  </button>
</div>
```
3. Implement `renderChartView(results)` with specialized handlers:
   - `translation_status_by_month`: Transform rows to pivot on `month` with status columns; render stacked `<BarChart>`.
   - `user_behavior_statistics`: Pivot on `month` for `ban`, `appeal`, `report`; render multi-bar `<BarChart>`.
   - `triplestore_named_graphs`: Horizontal `<BarChart>` or formatted cards.
   - `user_translation_statistics`: Top metric cards (Mean, Median, Std Dev, Total) + Top 15 Contributors `<BarChart>`.
   - `genericFallback`: Dynamic chart mapping string column to XAxis and numeric values to Bars.

- [ ] **Step 2: Verify frontend compilation**

Run: `npm run build` in `frontend/`
Expected: Build succeeds with 0 TypeScript/bundling errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/pages/admin/AdminKPI.tsx
git commit -m "feat(admin-kpi): add interactive Recharts visualizations and Chart/Table view toggle"
```

---

### Task 4: Full Platform Verification & Polish

**Files:**
- Test all backend and frontend suites.

- [ ] **Step 1: Run full backend test suite**

Run: `npm test` in `backend/`
Expected: All tests pass.

- [ ] **Step 2: Run frontend production build**

Run: `npm run build` in `frontend/`
Expected: Build passes cleanly.

- [ ] **Step 3: Commit final updates if any**

```bash
git status
```
