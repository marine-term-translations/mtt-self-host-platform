const fs = require("fs");
const path = require("path");
const { getDatabase } = require("../db/database");
const crypto = require("crypto");

function ensureEventsTable() {
  const db = getDatabase();
  const hasEventsTable = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='events'").get();
  if (!hasEventsTable) {
    const migrationSql = fs.readFileSync(path.join(__dirname, "../db/migrations/035_events.sql"), "utf8");
    db.exec(migrationSql);
  }
}

function getAllEvents() {
  ensureEventsTable();
  const db = getDatabase();
  return db.prepare("SELECT * FROM events ORDER BY start_date DESC").all();
}

function getEventById(eventId) {
  ensureEventsTable();
  const db = getDatabase();
  const event = db.prepare("SELECT * FROM events WHERE id = ?").get(eventId);
  if (!event) return null;

  const teams = db.prepare(`
    SELECT t.*, 
           COUNT(DISTINCT m.user_id) as member_count,
           COALESCE(SUM(c.points), 0) as total_points
    FROM event_teams t
    LEFT JOIN event_memberships m ON t.id = m.team_id AND m.is_active = 1
    LEFT JOIN event_contributions c ON t.id = c.team_id
    WHERE t.event_id = ?
    GROUP BY t.id
    ORDER BY total_points DESC
  `).all(eventId);

  return { ...event, teams };
}

function createTeam(eventId, name, imageUrl, createdByUserId) {
  ensureEventsTable();
  const db = getDatabase();
  const id = `team_${crypto.randomUUID()}`;
  const cleanName = name.replace(/[^a-zA-Z0-9]/g, "").substring(0, 4).toUpperCase() || "TEAM";
  const joinCode = `TM-${cleanName}-${Math.floor(1000 + Math.random() * 9000)}`;
  
  db.prepare(`
    INSERT INTO event_teams (id, event_id, name, image_url, join_code, created_by)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(id, eventId, name, imageUrl || null, joinCode, createdByUserId || null);

  return db.prepare("SELECT * FROM event_teams WHERE id = ?").get(id);
}

function joinTeam(eventId, identifier, userId) {
  ensureEventsTable();
  const db = getDatabase();
  
  // Find team by team_id or join_code
  let team = db.prepare("SELECT * FROM event_teams WHERE event_id = ? AND (id = ? OR join_code = ?)").get(eventId, identifier, identifier);
  if (!team) throw new Error("Team not found");

  // Deactivate any existing team membership for this user in this event
  db.prepare("UPDATE event_memberships SET is_active = 0 WHERE event_id = ? AND user_id = ?").run(eventId, userId);

  // Insert new active membership
  const membershipId = `mem_${crypto.randomUUID()}`;
  db.prepare(`
    INSERT INTO event_memberships (id, event_id, team_id, user_id, is_active)
    VALUES (?, ?, ?, ?, 1)
  `).run(membershipId, eventId, team.id, userId);

  return { success: true, teamId: team.id, teamName: team.name };
}

function createEvent({ title, description, startDate, endDate, targetCategory, rewardTitle }) {
  ensureEventsTable();
  const db = getDatabase();
  const id = `evt_${crypto.randomUUID()}`;

  // Determine initial status based on start_date
  const now = new Date().toISOString();
  let status = "UPCOMING";
  if (startDate <= now && endDate >= now) {
    status = "ACTIVE";
  } else if (endDate < now) {
    status = "ENDED";
  }

  db.prepare(`
    INSERT INTO events (id, title, description, start_date, end_date, target_category, status)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(id, title, description || "", startDate, endDate, targetCategory || "ALL", status);

  // If a custom reward title name was provided, create an event_rewards entry
  if (rewardTitle) {
    const rewardId = `rew_${crypto.randomUUID()}`;
    db.prepare(`
      INSERT INTO event_rewards (id, event_id, reward_type, name)
      VALUES (?, ?, 'TITLE', ?)
    `).run(rewardId, id, rewardTitle);
  }

  return getEventById(id);
}

function updateEventStatus(eventId, status) {
  ensureEventsTable();
  const db = getDatabase();
  db.prepare("UPDATE events SET status = ? WHERE id = ?").run(status, eventId);
  return getEventById(eventId);
}

module.exports = {
  getAllEvents,
  getEventById,
  createEvent,
  updateEventStatus,
  createTeam,
  joinTeam
};
