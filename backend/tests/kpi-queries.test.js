// backend/tests/kpi-queries.test.js
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const testDbPath = path.join(__dirname, 'test_kpi_queries.db');
process.env.SQLITE_DB_PATH = testDbPath;

if (fs.existsSync(testDbPath)) {
  fs.unlinkSync(testDbPath);
}

const { getDatabase } = require('../src/db/database');
const { initializeDatabase } = require('../src/services/dbInit.service');

async function run() {
  console.log("Running comprehensive KPI queries validation test...");
  initializeDatabase();
  const db = getDatabase();

  // Test SQL queries defined in kpi.routes.js
  const kpiRoutes = require('../src/routes/kpi.routes');
  
  // We can test each SQL query directly by reading them or executing them through the database
  const queriesToTest = [
    {
      id: 'language_coverage_overview',
      sql: `
        WITH total_fields AS (
          SELECT COUNT(*) as total FROM term_fields
        ),
        lang_counts AS (
          SELECT 
            l.code as language_code,
            l.name as language_name,
            COUNT(DISTINCT t.term_field_id) as translated_count,
            SUM(CASE WHEN t.status IN ('approved', 'merged') THEN 1 ELSE 0 END) as approved_count,
            SUM(CASE WHEN t.status = 'review' THEN 1 ELSE 0 END) as review_count,
            SUM(CASE WHEN t.status = 'draft' THEN 1 ELSE 0 END) as draft_count,
            SUM(CASE WHEN t.status = 'rejected' THEN 1 ELSE 0 END) as rejected_count
          FROM languages l
          LEFT JOIN translations t ON t.language = l.code
          GROUP BY l.code, l.name
          HAVING translated_count > 0
        )
        SELECT 
          lc.language_code,
          lc.language_name,
          lc.translated_count,
          lc.approved_count,
          lc.review_count,
          lc.draft_count,
          lc.rejected_count,
          ROUND((CAST(lc.approved_count AS FLOAT) / MAX(1, tf.total)) * 100, 2) as coverage_percent,
          tf.total as total_fields
        FROM lang_counts lc
        CROSS JOIN total_fields tf
        ORDER BY lc.translated_count DESC;
      `
    },
    {
      id: 'review_turnaround_time',
      sql: `
        SELECT 
          language,
          COUNT(*) as sample_size,
          ROUND(AVG(julianday(updated_at) - julianday(created_at)), 2) as avg_days_to_decision,
          ROUND(MIN(julianday(updated_at) - julianday(created_at)), 2) as min_days,
          ROUND(MAX(julianday(updated_at) - julianday(created_at)), 2) as max_days
        FROM translations
        WHERE status IN ('approved', 'merged', 'rejected') 
          AND updated_at > created_at
        GROUP BY language
        ORDER BY sample_size DESC;
      `
    },
    {
      id: 'reputation_tier_demographics',
      sql: `
        SELECT 
          CASE 
            WHEN reputation < 50 THEN 'Novice (<50)'
            WHEN reputation >= 50 AND reputation < 200 THEN 'Contributor (50-199)'
            WHEN reputation >= 200 AND reputation < 500 THEN 'Expert (200-499)'
            WHEN reputation >= 500 AND reputation < 1000 THEN 'Master (500-999)'
            ELSE 'Legend (1000+)'
          END as tier,
          COUNT(*) as user_count,
          ROUND(AVG(reputation), 1) as avg_reputation,
          MIN(reputation) as min_reputation,
          MAX(reputation) as max_reputation
        FROM users
        GROUP BY tier
        ORDER BY min_reputation ASC;
      `
    },
    {
      id: 'appeals_resolution_metrics',
      sql: `
        SELECT 
          status,
          COUNT(*) as total_appeals,
          ROUND(AVG(CASE WHEN closed_at IS NOT NULL AND closed_at > opened_at THEN julianday(closed_at) - julianday(opened_at) ELSE NULL END), 2) as avg_resolution_days
        FROM appeals
        GROUP BY status
        ORDER BY total_appeals DESC;
      `
    },
    {
      id: 'creature_achievements_distribution',
      sql: `
        SELECT 
          a.name as achievement_name,
          a.category,
          COUNT(ua.id) as unlock_count,
          COUNT(DISTINCT ua.user_id) as unique_users
        FROM user_achievements ua
        JOIN achievements a ON a.id = ua.achievement_id
        GROUP BY a.id, a.name, a.category
        ORDER BY unlock_count DESC;
      `
    },
    {
      id: 'daily_goals_streak_distribution',
      sql: `
        SELECT 
          u.username,
          COUNT(*) as days_active,
          SUM(udg.completed) as days_goal_completed,
          SUM(udg.current_count) as total_actions_logged,
          ROUND(AVG(udg.current_count), 1) as avg_daily_actions
        FROM user_daily_goals udg
        JOIN users u ON u.id = udg.user_id
        GROUP BY u.id, u.username
        ORDER BY days_goal_completed DESC, total_actions_logged DESC
        LIMIT 20;
      `
    },
    {
      id: 'debated_terms_leaderboard',
      sql: `
        SELECT 
          t.id as term_id,
          t.uri as term_uri,
          td.title as discussion_title,
          COUNT(m.id) as message_count,
          COUNT(DISTINCT m.author_id) as participant_count,
          td.status as discussion_status,
          td.created_at
        FROM term_discussions td
        JOIN terms t ON t.id = td.term_id
        LEFT JOIN term_discussion_messages m ON m.discussion_id = td.id
        GROUP BY td.id, t.id, t.uri, td.title, td.status, td.created_at
        ORDER BY message_count DESC, td.created_at DESC
        LIMIT 20;
      `
    },
    {
      id: 'vocabulary_requests_demand',
      sql: `
        SELECT 
          vr.id,
          vr.title,
          vr.source_uri,
          vr.status,
          u.username as requested_by,
          vr.created_at
        FROM vocabulary_requests vr
        JOIN users u ON u.id = vr.requested_by_id
        ORDER BY vr.created_at DESC
        LIMIT 25;
      `
    },
    {
      id: 'review_votes_consensus',
      sql: `
        SELECT 
          action,
          COALESCE(rejection_reason, 'None (Approved)') as reason,
          COUNT(*) as count
        FROM translation_reviews
        GROUP BY action, rejection_reason
        ORDER BY count DESC;
      `
    }
  ];

  for (const q of queriesToTest) {
    try {
      const results = db.prepare(q.sql).all();
      assert.strictEqual(Array.isArray(results), true);
      console.log(`✓ Query '${q.id}' executed successfully (${results.length} rows returned)`);
    } catch (err) {
      console.error(`✗ Query '${q.id}' failed:`, err.message);
      throw err;
    }
  }

  console.log("✓ All KPI queries verified successfully!");
  db.close();
  if (fs.existsSync(testDbPath)) {
    fs.unlinkSync(testDbPath);
  }
}

run().catch(err => {
  console.error("KPI Queries Test Failed:", err.message);
  process.exit(1);
});
