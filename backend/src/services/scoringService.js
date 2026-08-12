const { getDatabase } = require("../db/database");
const crypto = require("crypto");

function recordEventContribution(userId, translationId, actionType, category = 'ALL') {
  const db = getDatabase();

  // Find all active events matching the category
  const activeEvents = db.prepare(`
    SELECT e.id as event_id, m.team_id
    FROM events e
    JOIN event_memberships m ON e.id = m.event_id AND m.user_id = ? AND m.is_active = 1
    WHERE e.status = 'ACTIVE'
      AND (e.target_category = 'ALL' OR e.target_category = ? OR ? = 'ALL')
  `).all(userId, category, category);

  const inserted = [];
  const stmt = db.prepare(`
    INSERT INTO event_contributions (id, event_id, team_id, user_id, translation_id, action_type, points)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const pointsMap = {
    'TRANSLATION_APPROVED': 10,
    'TRANSLATION_CREATED': 5,
    'VOTE_CAST': 2
  };
  const points = pointsMap[actionType] || 1;

  for (const ev of activeEvents) {
    const id = `cnt_${crypto.randomUUID()}`;
    stmt.run(id, ev.event_id, ev.team_id, userId, translationId || null, actionType, points);
    inserted.push({ id, event_id: ev.event_id, team_id: ev.team_id, points });
  }

  return inserted;
}

module.exports = {
  recordEventContribution
};
