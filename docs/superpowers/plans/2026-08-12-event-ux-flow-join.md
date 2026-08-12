# Event Join UX, Event-Scoped Translation Flow, Community Goals Widget, and Admin Toggle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enhance event team join UX by auto-scrolling & highlighting target team cards, automatically scope the translation flow for event members with a top banner, feature active events at the top of the Community Goals widget, and add per-event homepage featured radio toggles for admins.

**Architecture:**
1. Update `backend/src/services/eventService.js` and `eventController.js` to support column `is_featured_homepage` and route `PATCH /api/events/:id/featured`.
2. Update `frontend/pages/EventDetailPage.tsx` to handle `joinTeamId` / `joinCode` query params with smooth-scroll, glowing CSS highlights, direct on-card "Join Team" CTAs, and a prominent "Start Competition Flow →" button for members.
3. Scopes `frontend/pages/TranslationFlow.tsx` to active event target vocabulary (`source_id`) and language (`target_language`), showing a competition mode banner.
4. Render active competition cards at the top of `frontend/components/CommunityGoalWidget.tsx` and add a per-event featured radio toggle in `frontend/pages/admin/AdminEvents.tsx`.

**Tech Stack:** Node.js, Express, SQLite (`better-sqlite3`), React, TypeScript, Tailwind CSS, Lucide Icons.

## Global Constraints
- Preserve existing database schema and auto-run migration for `is_featured_homepage`.
- Maintain clean TypeScript types and smooth animation transitions.
- Do not break existing public endpoints or translation workflows.

---

### Task 1: Backend Featured Event Endpoint & Database Migration

**Files:**
- Modify: `backend/src/services/eventService.js`
- Modify: `backend/src/controllers/eventController.js`
- Modify: `backend/src/routes/eventRoutes.js`
- Test: `backend/tests/event_featured.test.js`

**Interfaces:**
- Produces: `eventService.setFeaturedHomepageEvent(eventId)`
- Produces: `PATCH /api/events/:id/featured`

- [ ] **Step 1: Write failing test for featured event toggle**

Create `backend/tests/event_featured.test.js`:
```js
const assert = require("assert");
const { getDatabase, applySchema, isDatabaseInitialized } = require("../src/db/database");
const eventService = require("../src/services/eventService");

function testFeaturedEvent() {
  if (!isDatabaseInitialized()) {
    applySchema();
  }
  const db = getDatabase();
  const evt1 = eventService.createEvent({ title: "Evt 1", startDate: "2026-01-01", endDate: "2026-12-31" });
  const evt2 = eventService.createEvent({ title: "Evt 2", startDate: "2026-01-01", endDate: "2026-12-31" });

  // Set evt1 as featured
  eventService.setFeaturedHomepageEvent(evt1.id);
  let loaded1 = eventService.getEventById(evt1.id);
  assert.strictEqual(loaded1.is_featured_homepage, 1);

  // Set evt2 as featured - evt1 should un-feature
  eventService.setFeaturedHomepageEvent(evt2.id);
  loaded1 = eventService.getEventById(evt1.id);
  let loaded2 = eventService.getEventById(evt2.id);
  assert.strictEqual(loaded1.is_featured_homepage, 0);
  assert.strictEqual(loaded2.is_featured_homepage, 1);

  console.log("✅ Featured homepage event test passed!");
}

try {
  testFeaturedEvent();
} catch (err) {
  console.error("FAIL:", err.message);
  process.exit(1);
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node backend/tests/event_featured.test.js`
Expected: FAIL with `eventService.setFeaturedHomepageEvent is not a function`

- [ ] **Step 3: Implement setFeaturedHomepageEvent and column check in eventService.js**

In `backend/src/services/eventService.js`:
```js
// Inside ensureEventsTable():
if (!colNames.includes("is_featured_homepage")) {
  try { db.prepare("ALTER TABLE events ADD COLUMN is_featured_homepage INTEGER DEFAULT 0").run(); } catch(e){}
}

function setFeaturedHomepageEvent(eventId) {
  ensureEventsTable();
  const db = getDatabase();
  db.prepare("UPDATE events SET is_featured_homepage = 0").run();
  if (eventId) {
    db.prepare("UPDATE events SET is_featured_homepage = 1 WHERE id = ?").run(eventId);
  }
  return getEventById(eventId);
}
```

- [ ] **Step 4: Add controller and route for PATCH /api/events/:id/featured**

In `backend/src/controllers/eventController.js`:
```js
async function setFeatured(req, res) {
  try {
    const { isFeatured } = req.body;
    const event = eventService.setFeaturedHomepageEvent(isFeatured ? req.params.id : null);
    res.json({ success: true, event });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
```

In `backend/src/routes/eventRoutes.js`:
```js
addRoute("patch", "/events/:id/featured", eventController.setFeatured);
```

- [ ] **Step 5: Run tests to verify pass**

Run: `node backend/tests/event_featured.test.js`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add backend/src/services/eventService.js backend/src/controllers/eventController.js backend/src/routes/eventRoutes.js backend/tests/event_featured.test.js
git commit -m "feat: add is_featured_homepage column and PATCH /api/events/:id/featured endpoint"
```

---

### Task 2: QR Code Team Highlighting & Direct Join UX

**Files:**
- Modify: `frontend/services/eventApi.ts`
- Modify: `frontend/pages/EventDetailPage.tsx`

**Interfaces:**
- Produces: Smooth-scrolling, animated glowing highlight around target team card, direct on-card "Join [Team Name]" button.

- [ ] **Step 1: Update eventApi.ts with setFeaturedEvent helper**

In `frontend/services/eventApi.ts`:
```ts
export async function setFeaturedEvent(eventId: string, isFeatured: boolean): Promise<{ success: boolean; event: Event }> {
  return backendApi.patch<{ success: boolean; event: Event }>(`/events/${eventId}/featured`, { isFeatured });
}
```

- [ ] **Step 2: Update EventDetailPage.tsx for team highlighting & direct join button**

In `frontend/pages/EventDetailPage.tsx`:
Extract query parameters: `joinTeamId` or `joinCode`.
Add `useEffect` to scroll to the target team element:

```tsx
const [targetTeamId, setTargetTeamId] = useState<string | null>(null);

useEffect(() => {
  const params = new URLSearchParams(window.location.search);
  const qTeamId = params.get("joinTeamId") || params.get("teamId");
  const qCode = params.get("joinCode");

  if (qTeamId) {
    setTargetTeamId(qTeamId);
  } else if (qCode && event?.teams) {
    const matched = event.teams.find(t => t.join_code === qCode);
    if (matched) setTargetTeamId(matched.id);
  }
}, [window.location.search, event]);

useEffect(() => {
  if (targetTeamId) {
    const el = document.getElementById(`team-card-${targetTeamId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }
}, [targetTeamId, loading]);
```

Render on-card **"Join [Team Name]"** button on team cards with glowing border styling when `targetTeamId === team.id`.

- [ ] **Step 3: Commit**

```bash
git add frontend/services/eventApi.ts frontend/pages/EventDetailPage.tsx
git commit -m "feat: implement team card QR highlight, auto-scroll, and direct on-card join action"
```

---

### Task 3: Event-Scoped Translation Flow & Member Hero CTA

**Files:**
- Modify: `frontend/pages/EventDetailPage.tsx`
- Modify: `frontend/pages/TranslationFlow.tsx`

**Interfaces:**
- Produces: Member CTA "Start Competition Flow →", competition mode banner, and auto-filtered translation tasks.

- [ ] **Step 1: Add "Start Competition Flow →" button on Event Detail Page**

In `frontend/pages/EventDetailPage.tsx`:
Check if user is in any team of current event:
```tsx
const userTeam = event?.teams?.find(t => t.id === currentMembershipTeamId || userJoined);
```
If `userTeam` exists, render prominent button:
```tsx
<Link
  to={`/flow?eventId=${event.id}`}
  className="px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-white font-bold rounded-xl shadow-lg shadow-cyan-500/25 flex items-center gap-2 transition"
>
  ⚡ Start Competition Flow &rarr;
</Link>
```

- [ ] **Step 2: Update TranslationFlow.tsx to filter tasks by event scope**

In `frontend/pages/TranslationFlow.tsx`:
Check for query param `eventId` or active user event membership:
```tsx
const [eventMode, setEventMode] = useState<Event | null>(null);

useEffect(() => {
  const params = new URLSearchParams(window.location.search);
  const qEvtId = params.get('eventId');
  if (qEvtId) {
    fetchEventDetails(qEvtId).then(setEventMode).catch(() => {});
  }
}, [window.location.search]);
```
Pass `sourceId: eventMode?.source_id` and `language: eventMode?.target_language` to translation task fetcher.
Render top Competition Mode Banner with `Switch to Standard Flow` toggle button.

- [ ] **Step 3: Commit**

```bash
git add frontend/pages/EventDetailPage.tsx frontend/pages/TranslationFlow.tsx
git commit -m "feat: add member event flow CTA and competition-scoped translation flow"
```

---

### Task 4: Community Goals Widget Active Event Card & Admin Radio Toggle

**Files:**
- Modify: `frontend/components/CommunityGoalWidget.tsx`
- Modify: `frontend/pages/admin/AdminEvents.tsx`
- Modify: `frontend/pages/Landing.tsx`

**Interfaces:**
- Produces: Active Competition card at top of Community Goals widget and per-event featured homepage radio selector in Admin.

- [ ] **Step 1: Add Active Competition Featured Card to CommunityGoalWidget.tsx**

In `frontend/components/CommunityGoalWidget.tsx`:
Fetch user's active event membership.
Render a featured top card inside the widget body (above community goals list):
```tsx
{activeUserEvent && (
  <div className="p-4 bg-gradient-to-br from-cyan-900/90 via-marine-900/90 to-emerald-900/90 border-b border-cyan-500/40 text-white">
    <div className="flex items-center justify-between mb-1.5">
      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-cyan-500/30 text-cyan-200 border border-cyan-400/40">
        🏆 Active Competition
      </span>
      <span className="text-xs text-emerald-300 font-bold font-mono">Team: {activeUserEvent.userTeamName}</span>
    </div>
    <h4 className="font-bold text-sm text-white mb-1 truncate">{activeUserEvent.title}</h4>
    <div className="flex items-center justify-between text-xs text-cyan-200 mb-2">
      <span>Standings: #{activeUserEvent.teamRank}</span>
      <span className="font-mono font-bold text-emerald-400">{activeUserEvent.teamPoints} pts</span>
    </div>
    <Link
      to={`/flow?eventId=${activeUserEvent.id}`}
      className="block w-full py-1.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs text-center rounded-lg shadow transition"
    >
      Start Translating &rarr;
    </Link>
  </div>
)}
```

- [ ] **Step 2: Add Featured Homepage Radio Selector in AdminEvents.tsx**

In `frontend/pages/admin/AdminEvents.tsx`:
Render radio toggle on each event card:
```tsx
<label className="flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer">
  <input
    type="radio"
    name="featured_event"
    checked={!!evt.is_featured_homepage}
    onChange={() => handleSetFeatured(evt.id, !evt.is_featured_homepage)}
    className="accent-cyan-500"
  />
  Featured on Homepage
</label>
```

Update `Landing.tsx` to prioritize event where `is_featured_homepage === 1`.

- [ ] **Step 3: Commit**

```bash
git add frontend/components/CommunityGoalWidget.tsx frontend/pages/admin/AdminEvents.tsx frontend/pages/Landing.tsx
git commit -m "feat: add top featured active event card in CommunityGoalWidget and admin homepage radio selector"
```
