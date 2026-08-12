# Admin Event Management, Homepage Active Event Showcase, and Points System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable event and team deletion in Admin views, showcase active events dynamically on the homepage hero grid (replacing the Interoperable card), and fix the points system by hooking up event contribution scoring and synchronizing user reputation with stats points.

**Architecture:** 
1. `backend/src/services/eventService.js` and `backend/src/controllers/eventController.js` add `deleteEvent` and `deleteTeam` with foreign key clean-up while retaining translation entities.
2. `backend/src/services/reputation.service.js` & `gamification.service.js` synchronize `users.reputation` and `user_stats.points`, while `flow.service.js` & `terms.routes.js` invoke `recordEventContribution(...)` on translation and review events.
3. `frontend/pages/Landing.tsx` checks for active events and system toggle flag to render a highlighted Active Event card in place of the Interoperable card slot.

**Tech Stack:** Node.js, Express, SQLite (`better-sqlite3`), React, TypeScript, Tailwind CSS, Lucide Icons.

## Global Constraints
- Preserve existing database schema and translation entities when deleting competition metadata.
- Maintain existing API response formats and error handling patterns.
- Do not mutate global arrays or DOM elements directly in frontend.

---

### Task 1: Backend Event & Team Deletion Service & Routes

**Files:**
- Modify: `backend/src/services/eventService.js`
- Modify: `backend/src/controllers/eventController.js`
- Modify: `backend/src/routes/eventRoutes.js`
- Test: `backend/tests/event_deletion.test.js`

**Interfaces:**
- Produces: `eventService.deleteEvent(eventId)`, `eventService.deleteTeam(eventId, teamId)`
- Produces: `DELETE /api/events/:id`, `DELETE /api/events/:eventId/teams/:teamId`

- [ ] **Step 1: Write failing deletion test**

Create `backend/tests/event_deletion.test.js`:
```js
const assert = require("assert");
const { getDatabase } = require("../src/db/database");
const eventService = require("../src/services/eventService");

function testEventDeletion() {
  const db = getDatabase();
  const evt = eventService.createEvent({
    title: "Test Delete Evt",
    startDate: "2026-01-01",
    endDate: "2026-12-31"
  });
  const team = eventService.createTeam(evt.id, "TestTeam", null, 1);

  // Assert event and team exist
  assert.ok(eventService.getEventById(evt.id));

  // Test team deletion
  const teamDeleted = eventService.deleteTeam(evt.id, team.id);
  assert.strictEqual(teamDeleted.success, true);
  const reloadedEvt = eventService.getEventById(evt.id);
  assert.strictEqual(reloadedEvt.teams.length, 0);

  // Test event deletion
  const evtDeleted = eventService.deleteEvent(evt.id);
  assert.strictEqual(evtDeleted.success, true);
  assert.strictEqual(eventService.getEventById(evt.id), null);
  console.log("✅ Event deletion tests passed");
}

testEventDeletion();
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node backend/tests/event_deletion.test.js`
Expected: FAIL with `eventService.deleteTeam is not a function`

- [ ] **Step 3: Implement deleteEvent and deleteTeam in eventService.js**

Modify `backend/src/services/eventService.js`:
```js
function deleteTeam(eventId, teamId) {
  ensureEventsTable();
  const db = getDatabase();
  db.prepare("DELETE FROM event_contributions WHERE team_id = ?").run(teamId);
  db.prepare("DELETE FROM event_memberships WHERE team_id = ?").run(teamId);
  const result = db.prepare("DELETE FROM event_teams WHERE id = ? AND event_id = ?").run(teamId, eventId);
  return { success: result.changes > 0 };
}

function deleteEvent(eventId) {
  ensureEventsTable();
  const db = getDatabase();
  db.prepare("DELETE FROM event_rewards WHERE event_id = ?").run(eventId);
  db.prepare("DELETE FROM event_contributions WHERE event_id = ?").run(eventId);
  db.prepare("DELETE FROM event_memberships WHERE event_id = ?").run(eventId);
  db.prepare("DELETE FROM event_teams WHERE event_id = ?").run(eventId);
  const result = db.prepare("DELETE FROM events WHERE id = ?").run(eventId);
  return { success: result.changes > 0 };
}

module.exports = {
  getEventSources,
  getAllEvents,
  getEventById,
  createEvent,
  updateEventStatus,
  createTeam,
  joinTeam,
  deleteTeam,
  deleteEvent
};
```

- [ ] **Step 4: Add controller actions and express routes**

In `backend/src/controllers/eventController.js`:
```js
async function deleteEvent(req, res) {
  try {
    const result = eventService.deleteEvent(req.params.id);
    if (!result.success) return res.status(404).json({ error: "Event not found" });
    res.json({ success: true, message: "Event deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function deleteTeam(req, res) {
  try {
    const result = eventService.deleteTeam(req.params.eventId || req.params.id, req.params.teamId);
    if (!result.success) return res.status(404).json({ error: "Team not found" });
    res.json({ success: true, message: "Team deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
```

In `backend/src/routes/eventRoutes.js`:
```js
addRoute("delete", "/events/:id", eventController.deleteEvent);
addRoute("delete", "/events/:eventId/teams/:teamId", eventController.deleteTeam);
```

- [ ] **Step 5: Run tests and verify they pass**

Run: `node backend/tests/event_deletion.test.js`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add backend/src/services/eventService.js backend/src/controllers/eventController.js backend/src/routes/eventRoutes.js backend/tests/event_deletion.test.js
git commit -m "feat: add delete event and delete team endpoints with database cascade clean-up"
```

---

### Task 2: Points & Reputation Synchronization and Event Contribution Hooks

**Files:**
- Modify: `backend/src/services/reputation.service.js`
- Modify: `backend/src/services/gamification.service.js`
- Modify: `backend/src/routes/terms.routes.js`
- Modify: `backend/src/services/flow.service.js`
- Test: `backend/tests/points_sync.test.js`

**Interfaces:**
- Consumes: `scoringService.recordEventContribution(userId, translationId, actionType)`
- Produces: Synced `users.reputation` and `user_stats.points`

- [ ] **Step 1: Write failing test for points sync and event scoring**

Create `backend/tests/points_sync.test.js`:
```js
const assert = require("assert");
const { getDatabase } = require("../src/db/database");
const { applyReputationChange } = require("../src/services/reputation.service");

function testPointsSync() {
  const db = getDatabase();
  
  // Test reputation and user_stats sync
  applyReputationChange(1, 10, "test_reward");
  const user = db.prepare("SELECT reputation FROM users WHERE id = 1").get();
  const stats = db.prepare("SELECT points FROM user_stats WHERE user_id = 1").get();
  
  if (user && stats) {
    assert.strictEqual(stats.points, user.reputation);
    console.log("✅ Reputation & user_stats points synchronization test passed");
  }
}

testPointsSync();
```

- [ ] **Step 2: Run test to verify status**

Run: `node backend/tests/points_sync.test.js`

- [ ] **Step 3: Update reputation.service.js & gamification.service.js to synchronize user_stats.points**

In `backend/src/services/reputation.service.js` (`applyReputationChange`):
```js
  // Update user reputation
  db.prepare(
    "UPDATE users SET reputation = MAX(0, reputation + ?) WHERE id = ?"
  ).run(delta, userId);

  // Synchronize user_stats.points
  db.prepare(`
    INSERT INTO user_stats (user_id, points, daily_streak, longest_streak)
    VALUES (?, MAX(0, ?), 0, 0)
    ON CONFLICT(user_id) DO UPDATE SET points = MAX(0, points + ?), updated_at = CURRENT_TIMESTAMP
  `).run(userId, Math.max(0, delta), delta);
```

- [ ] **Step 4: Hook recordEventContribution into terms.routes.js and flow.service.js**

In `backend/src/routes/terms.routes.js` (after creation reward):
```js
const { recordEventContribution } = require("../services/scoringService");
// Hook event scoring contribution for creation
try {
  recordEventContribution(createdByUserId, translationResult.lastInsertRowid, "TRANSLATION_CREATED");
} catch (e) {
  console.log("Could not record event contribution:", e.message);
}
```

In `backend/src/services/flow.service.js` (inside review action status change and voting):
```js
const { recordEventContribution } = require("./scoringService");

// Inside submitReview action handling when approved/merged or review vote cast:
if (nextStatus === 'approved' || nextStatus === 'merged') {
  try {
    recordEventContribution(resolvedUserId, translationId, 'TRANSLATION_APPROVED');
  } catch (e) {
    console.log("Could not record approval event contribution:", e.message);
  }
} else if (action === 'approve' || action === 'reject') {
  try {
    recordEventContribution(resolvedUserId, translationId, 'VOTE_CAST');
  } catch (e) {
    console.log("Could not record vote event contribution:", e.message);
  }
}
```

- [ ] **Step 5: Run tests and verify they pass**

Run: `node backend/tests/points_sync.test.js`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add backend/src/services/reputation.service.js backend/src/services/gamification.service.js backend/src/routes/terms.routes.js backend/src/services/flow.service.js backend/tests/points_sync.test.js
git commit -m "fix: synchronize user reputation with stats points and hook recordEventContribution for event scoring"
```

---

### Task 3: Landing Page Featured Active Event Card & System Toggle Flag

**Files:**
- Modify: `frontend/services/api.ts`
- Modify: `frontend/services/eventApi.ts`
- Modify: `frontend/pages/Landing.tsx`

**Interfaces:**
- Consumes: `GET /api/events`
- Produces: Landing page dynamic Active Event Hero Card (replacing *Interoperable* card slot when active)

- [ ] **Step 1: Update API service helper in eventApi.ts**

In `frontend/services/eventApi.ts`:
```ts
export const deleteEvent = (eventId: string) => {
  return backendApi.delete<{ success: boolean; message: string }>(`/events/${eventId}`);
};

export const deleteTeam = (eventId: string, teamId: string) => {
  return backendApi.delete<{ success: boolean; message: string }>(`/events/${eventId}/teams/${teamId}`);
};
```

- [ ] **Step 2: Update Landing.tsx to fetch active events and conditionally replace Interoperable card slot**

In `frontend/pages/Landing.tsx`:
Add state and effect to fetch events:
```tsx
const [activeEvent, setActiveEvent] = useState<Event | null>(null);

useEffect(() => {
  const fetchActiveEvent = async () => {
    try {
      const events = await getEvents();
      const currentActive = events.find(e => e.status === 'ACTIVE') || null;
      setActiveEvent(currentActive);
    } catch (e) {
      console.error("Failed to load active events for landing", e);
    }
  };
  fetchActiveEvent();
}, []);
```

In the hero grid of `Landing.tsx`:
Replace the second column's top card (the *Interoperable* slot) with conditional active event rendering:

```tsx
<div className="space-y-4">
    {activeEvent ? (
        <Link 
            to={`/events/${activeEvent.id}`} 
            className="block bg-gradient-to-br from-cyan-900/80 via-marine-800/90 to-emerald-900/80 backdrop-blur-md p-6 rounded-2xl border-2 border-cyan-400/60 shadow-[0_0_25px_rgba(6,182,212,0.35)] hover:border-cyan-300 hover:scale-[1.02] transition-all cursor-pointer group relative z-30 pointer-events-auto overflow-hidden"
        >
            <div className="flex items-center justify-between mb-3">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/20 border border-cyan-400/40 text-cyan-200 text-xs font-bold tracking-wide uppercase">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                    Live Event
                </span>
                <Trophy className="text-amber-300 group-hover:rotate-12 transition-transform" size={24} />
            </div>
            <h3 className="font-bold text-lg text-white mb-1 truncate">{activeEvent.title}</h3>
            <p className="text-xs text-cyan-100/80 line-clamp-2 mb-3">{activeEvent.description || "Active translation competition ongoing!"}</p>
            <div className="flex items-center justify-between text-xs text-cyan-200 font-medium pt-2 border-t border-white/10">
                <span>{activeEvent.teams?.length || 0} Teams Competing</span>
                <span className="flex items-center gap-1 text-emerald-300 font-bold group-hover:translate-x-1 transition-transform">
                    Join Event <ArrowRight size={14} />
                </span>
            </div>
        </Link>
    ) : (
        <div className="bg-white/10 backdrop-blur-md p-6 rounded-2xl border border-white/20">
            <Share2 className="text-purple-300 mb-3" size={32} />
            <h3 className="font-bold text-lg mb-1">Interoperable</h3>
            <p className="text-sm text-slate-300">FAIR data powered by LDES technology.</p>
        </div>
    )}
    
    <Link to="/ldes" className="block bg-white/10 backdrop-blur-md p-6 rounded-2xl border border-white/20 hover:bg-white/20 hover:border-white/30 transition-all cursor-pointer group relative z-30 pointer-events-auto">
        <Database className="text-amber-300 mb-3 group-hover:scale-110 transition-transform" size={32} />
        <h3 className="font-bold text-lg mb-1">
          {loading ? <span>Loading...</span> : <span>{ldesFeedCount} LDES Feed{ldesFeedCount !== 1 ? 's' : ''}</span>}
        </h3>
        <p className="text-sm text-slate-300">Published and harvestable data streams.</p>
    </Link>
</div>
```

- [ ] **Step 3: Commit**

```bash
git add frontend/services/eventApi.ts frontend/pages/Landing.tsx
git commit -m "feat: display dynamic standout Active Event card on landing page when competition is running"
```

---

### Task 4: Frontend Admin Delete Controls & UI Polish

**Files:**
- Modify: `frontend/pages/AdminDashboard.tsx`
- Modify: `frontend/pages/EventDetailPage.tsx`

**Interfaces:**
- Produces: Delete event and delete team action triggers with confirmation modals.

- [ ] **Step 1: Add Delete Event and Delete Team triggers in AdminDashboard.tsx & EventDetailPage.tsx**

In `AdminDashboard.tsx` & `EventDetailPage.tsx`:
Add handleEventDelete and handleTeamDelete functions with confirmation dialogs:

```tsx
const handleDeleteEvent = async (eventId: string, title: string) => {
  if (!confirm(`Are you sure you want to delete event "${title}"? All competition rankings and teams for this event will be removed.`)) {
    return;
  }
  try {
    await deleteEvent(eventId);
    toast.success('Event deleted successfully');
    // Refresh event list
    fetchEvents();
  } catch (error) {
    toast.error('Failed to delete event');
  }
};

const handleDeleteTeam = async (eventId: string, teamId: string, teamName: string) => {
  if (!confirm(`Are you sure you want to delete team "${teamName}"?`)) {
    return;
  }
  try {
    await deleteTeam(eventId, teamId);
    toast.success('Team deleted successfully');
    // Refresh event details
    fetchEventDetails();
  } catch (error) {
    toast.error('Failed to delete team');
  }
};
```

Render red trash/delete icon buttons alongside event cards and team list rows in both components.

- [ ] **Step 2: Build frontend bundle and verify build passes**

Run: `npm --prefix frontend run build` or `npx tsc --noEmit`
Expected: Success with 0 type errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/pages/AdminDashboard.tsx frontend/pages/EventDetailPage.tsx
git commit -m "feat: add delete event and delete team action controls with confirm dialogs in Admin UI"
```
