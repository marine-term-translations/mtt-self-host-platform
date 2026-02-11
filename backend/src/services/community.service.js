// Community service - handles community-related operations

const { getDatabase } = require("../db/database");

/**
 * Sync user's language community memberships based on their language preferences
 * @param {number} userId - User ID
 * @param {string[]} preferredLanguages - Array of language codes the user prefers
 */
function syncUserLanguageCommunities(userId, preferredLanguages) {
  const db = getDatabase();
  
  try {
    // Get all language communities
    const languageCommunities = db.prepare(
      'SELECT id, language_code FROM communities WHERE type = ?'
    ).all('language');
    
    // Create a map of language_code to community_id
    const languageToCommunityMap = {};
    languageCommunities.forEach(c => {
      if (c.language_code) {
        languageToCommunityMap[c.language_code] = c.id;
      }
    });
    
    // Get user's current language community memberships
    const currentMemberships = db.prepare(`
      SELECT cm.community_id, c.language_code
      FROM community_members cm
      JOIN communities c ON cm.community_id = c.id
      WHERE cm.user_id = ? AND c.type = 'language'
    `).all(userId);
    
    const currentLanguages = currentMemberships.map(m => m.language_code);
    const currentCommunityIds = currentMemberships.map(m => m.community_id);
    
    // Determine which languages to add and remove
    const languagesToAdd = preferredLanguages.filter(lang => 
      !currentLanguages.includes(lang) && languageToCommunityMap[lang]
    );
    
    const languagesToRemove = currentLanguages.filter(lang =>
      !preferredLanguages.includes(lang)
    );
    
    // Add user to new language communities
    for (const langCode of languagesToAdd) {
      const communityId = languageToCommunityMap[langCode];
      if (communityId) {
        try {
          db.prepare(`
            INSERT INTO community_members (community_id, user_id, role)
            VALUES (?, ?, 'member')
            ON CONFLICT(community_id, user_id) DO NOTHING
          `).run(communityId, userId);
          
          console.log(`[Community Service] Added user ${userId} to language community ${langCode} (ID: ${communityId})`);
        } catch (err) {
          console.error(`[Community Service] Error adding user to language community ${langCode}:`, err);
        }
      }
    }
    
    // Remove user from language communities they no longer prefer
    for (const langCode of languagesToRemove) {
      const membership = currentMemberships.find(m => m.language_code === langCode);
      if (membership) {
        try {
          db.prepare(
            'DELETE FROM community_members WHERE community_id = ? AND user_id = ?'
          ).run(membership.community_id, userId);
          
          console.log(`[Community Service] Removed user ${userId} from language community ${langCode} (ID: ${membership.community_id})`);
        } catch (err) {
          console.error(`[Community Service] Error removing user from language community ${langCode}:`, err);
        }
      }
    }
    
    // Update member counts for affected communities
    const affectedCommunityIds = [
      ...languagesToAdd.map(lang => languageToCommunityMap[lang]),
      ...currentCommunityIds.filter(id => {
        const membership = currentMemberships.find(m => m.community_id === id);
        return membership && languagesToRemove.includes(membership.language_code);
      })
    ].filter(id => id !== undefined);
    
    for (const communityId of affectedCommunityIds) {
      try {
        db.prepare(`
          UPDATE communities 
          SET member_count = (SELECT COUNT(*) FROM community_members WHERE community_id = ?)
          WHERE id = ?
        `).run(communityId, communityId);
      } catch (err) {
        console.error(`[Community Service] Error updating member count for community ${communityId}:`, err);
      }
    }
    
    return {
      success: true,
      added: languagesToAdd.length,
      removed: languagesToRemove.length
    };
  } catch (err) {
    console.error('[Community Service] Error syncing language communities:', err);
    return {
      success: false,
      error: err.message
    };
  }
}

/**
 * Initialize language communities for all existing languages
 * Creates communities for all languages in the languages table if they don't exist
 */
function initializeLanguageCommunities() {
  const db = getDatabase();
  
  try {
    // Get all languages
    const languages = db.prepare('SELECT code, name FROM languages').all();
    
    let createdCount = 0;
    
    for (const lang of languages) {
      // Check if language community already exists
      const existing = db.prepare(
        'SELECT id FROM communities WHERE type = ? AND language_code = ?'
      ).get('language', lang.code);
      
      if (!existing) {
        try {
          db.prepare(`
            INSERT INTO communities (name, description, type, access_type, language_code, owner_id)
            VALUES (?, ?, 'language', 'open', ?, NULL)
          `).run(
            `${lang.name} Community`,
            `Community for ${lang.name} language translators`,
            lang.code
          );
          
          createdCount++;
          console.log(`[Community Service] Created language community for ${lang.name} (${lang.code})`);
        } catch (err) {
          console.error(`[Community Service] Error creating language community for ${lang.code}:`, err);
        }
      }
    }
    
    console.log(`[Community Service] Initialized ${createdCount} new language communities`);
    
    return {
      success: true,
      created: createdCount
    };
  } catch (err) {
    console.error('[Community Service] Error initializing language communities:', err);
    return {
      success: false,
      error: err.message
    };
  }
}

/**
 * Sync all users' language community memberships
 * Useful for initial setup or bulk updates
 */
function syncAllUsersLanguageCommunities() {
  const db = getDatabase();
  
  try {
    // Get all users with their preferred languages
    const users = db.prepare(`
      SELECT 
        u.id,
        up.preferred_languages
      FROM users u
      LEFT JOIN user_preferences up ON u.id = up.user_id
    `).all();
    
    let syncedCount = 0;
    
    for (const user of users) {
      let preferredLanguages = [];
      
      if (user.preferred_languages) {
        try {
          preferredLanguages = JSON.parse(user.preferred_languages);
        } catch (err) {
          console.error(`[Community Service] Error parsing preferred languages for user ${user.id}:`, err);
          preferredLanguages = ['en']; // Default to English
        }
      } else {
        preferredLanguages = ['en']; // Default to English
      }
      
      syncUserLanguageCommunities(user.id, preferredLanguages);
      syncedCount++;
    }
    
    console.log(`[Community Service] Synced ${syncedCount} users to language communities`);
    
    return {
      success: true,
      synced: syncedCount
    };
  } catch (err) {
    console.error('[Community Service] Error syncing all users:', err);
    return {
      success: false,
      error: err.message
    };
  }
}

module.exports = {
  syncUserLanguageCommunities,
  initializeLanguageCommunities,
  syncAllUsersLanguageCommunities
};
