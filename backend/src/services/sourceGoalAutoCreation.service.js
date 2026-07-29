// Service to automatically create collection community goals per language for sources

const { getDatabase } = require("../db/database");

/**
 * Ensure collection community goals exist for all target languages for a specific source
 * @param {number|object} sourceOrId - Source ID or Source Object
 * @returns {object} { success: boolean, createdGoalsCount: number }
 */
function ensureCollectionGoalsForSource(sourceOrId) {
  const db = getDatabase();
  
  try {
    let source;
    if (typeof sourceOrId === 'object' && sourceOrId !== null) {
      source = sourceOrId;
    } else {
      source = db.prepare("SELECT * FROM sources WHERE source_id = ?").get(sourceOrId);
    }
    
    if (!source) {
      console.warn(`[Source Goal Auto-Creation] Source not found:`, sourceOrId);
      return { success: false, error: 'Source not found', createdGoalsCount: 0 };
    }
    
    const sourceId = source.source_id;
    
    // Determine source display name/identifier for goal title
    let sourceName = source.description;
    if (!sourceName && source.source_path) {
      const match = source.source_path.match(/\/collection\/([A-Z0-9]+)\//i);
      sourceName = match ? `${match[1]} Collection` : source.source_path;
    }
    if (!sourceName) {
      sourceName = `Collection #${sourceId}`;
    }
    
    // Get target languages (exclude English 'en')
    const languages = db.prepare("SELECT code, name FROM languages WHERE code != 'en'").all();
    
    // Find system admin user to attribute goal creation to
    const adminUser = db.prepare("SELECT id FROM users WHERE is_admin = 1 OR id = 1 LIMIT 1").get();
    const createdById = adminUser ? adminUser.id : 1;
    
    let createdGoalsCount = 0;
    
    for (const lang of languages) {
      // Check if a collection goal already exists for this source and target language
      const existing = db.prepare(`
        SELECT id FROM community_goals 
        WHERE collection_id = ? AND target_language = ? AND goal_type = 'collection'
      `).get(sourceId, lang.code);
      
      if (!existing) {
        const title = `Translate ${sourceName} to ${lang.name}`;
        const description = `Community collection translation goal for ${sourceName} in ${lang.name}`;
        const now = new Date().toISOString();
        
        const stmt = db.prepare(`
          INSERT INTO community_goals (
            title, description, goal_type, target_count, target_language,
            collection_id, is_recurring, recurrence_type, start_date, end_date,
            is_active, created_by_id, created_at, updated_at
          ) VALUES (?, ?, 'collection', NULL, ?, ?, 0, NULL, ?, NULL, 1, ?, ?, ?)
        `);
        
        const info = stmt.run(title, description, lang.code, sourceId, now, createdById, now, now);
        const goalId = info.lastInsertRowid;
        createdGoalsCount++;
        
        // Link goal to the language community
        const langCommunity = db.prepare(
          "SELECT id FROM communities WHERE type = 'language' AND language_code = ?"
        ).get(lang.code);
        
        if (langCommunity) {
          db.prepare(`
            INSERT INTO community_goal_links (goal_id, community_id)
            VALUES (?, ?)
            ON CONFLICT(goal_id, community_id) DO NOTHING
          `).run(goalId, langCommunity.id);
        }
      }
    }
    
    console.log(`[Source Goal Auto-Creation] Created ${createdGoalsCount} collection goals for source ${sourceId} (${sourceName})`);
    return { success: true, createdGoalsCount };
  } catch (err) {
    console.error(`[Source Goal Auto-Creation] Error creating collection goals for source:`, err);
    return { success: false, error: err.message, createdGoalsCount: 0 };
  }
}

/**
 * Ensure collection community goals exist for all target languages for ALL sources in database
 * @returns {object} { success: boolean, totalCreatedGoalsCount: number }
 */
function ensureCollectionGoalsForAllSources() {
  const db = getDatabase();
  
  try {
    const sources = db.prepare("SELECT source_id FROM sources").all();
    let totalCreatedGoalsCount = 0;
    
    for (const source of sources) {
      const res = ensureCollectionGoalsForSource(source.source_id);
      if (res.success) {
        totalCreatedGoalsCount += res.createdGoalsCount;
      }
    }
    
    console.log(`[Source Goal Auto-Creation] Processed ${sources.length} sources, created ${totalCreatedGoalsCount} new collection goals.`);
    return { success: true, totalCreatedGoalsCount };
  } catch (err) {
    console.error(`[Source Goal Auto-Creation] Error processing all sources:`, err);
    return { success: false, error: err.message, totalCreatedGoalsCount: 0 };
  }
}

module.exports = {
  ensureCollectionGoalsForSource,
  ensureCollectionGoalsForAllSources,
};
