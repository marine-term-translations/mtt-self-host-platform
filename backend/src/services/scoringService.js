const { getDatabase } = require("../db/database");
const crypto = require("crypto");

function recordEventContribution(userId, translationId, actionType, category = 'ALL') {
  const db = getDatabase();

  let termSourceId = null;
  if (translationId) {
    const row = db.prepare(`
      SELECT t.source_id 
      FROM translations tr
      JOIN term_fields tf ON tr.term_field_id = tf.id
      JOIN terms t ON tf.term_id = t.id
      WHERE tr.id = ?
    `).get(translationId);
    if (row) termSourceId = row.source_id;
  }

  const sId = termSourceId !== undefined && termSourceId !== null ? termSourceId : null;
  const activeEvents = db.prepare(`
    SELECT e.id as event_id, m.team_id
    FROM events e
    JOIN event_memberships m ON e.id = m.event_id AND m.user_id = ? AND m.is_active = 1
    WHERE e.status = 'ACTIVE'
      AND (e.source_id IS NULL OR ? IS NULL OR e.source_id = ?)
  `).all(userId, sId, sId);




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
