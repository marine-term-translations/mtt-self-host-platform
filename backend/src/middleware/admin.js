// Admin middleware - authorization checks and sanitization helpers

const config = require('../config');

/**
 * Middleware to require authentication
 */
function requireAuth(req, res, next) {
  if (!req.session || !req.session.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  next();
}

/**
 * Middleware to require admin privileges
 */
function requireAdmin(req, res, next) {
  if (!req.session || !req.session.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  
  const user = req.session.user;
  if (!user.is_admin && !user.is_superadmin && !user.isAdmin) {
    return res.status(403).json({ error: 'Admin privileges required' });
  }
  
  next();
}

/**
 * Middleware to require superadmin privileges
 */
function requireSuperAdmin(req, res, next) {
  if (!req.session || !req.session.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  
  if (!req.session.user.is_superadmin) {
    return res.status(403).json({ error: 'Superadmin privileges required' });
  }
  
  next();
}

/**
 * Middleware to ensure request originated from legitimate browser web context
 */
function requireBrowserContext(req, res, next) {
  if (!req.session || !req.session.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  
  const origin = req.get('origin');
  const secFetchSite = req.get('sec-fetch-site');

  // If origin is present, verify against configured domain
  if (origin && config.frontendUrl && !origin.startsWith(config.frontendUrl.replace(/\/$/, ''))) {
    if (config.isProd) {
      return res.status(403).json({ error: 'Cross-origin browser request rejected' });
    }
  }

  // Reject untrusted cross-site fetches
  if (secFetchSite === 'cross-site') {
    return res.status(403).json({ error: 'Cross-site request blocked' });
  }

  next();
}

/**
 * Sanitize public user objects
 */
function sanitizePublicUser(user) {
  if (!user) return null;
  let parsedExtra = {};
  if (typeof user.extra === 'string') {
    try {
      parsedExtra = JSON.parse(user.extra);
    } catch (e) {
      parsedExtra = {};
    }
  } else if (typeof user.extra === 'object' && user.extra !== null) {
    parsedExtra = user.extra;
  }

  const displayName = parsedExtra.name || user.username;
  const avatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=0ea5e9&color=fff`;

  return {
    id: user.id,
    username: user.username,
    name: displayName,
    reputation: user.reputation || 0,
    joined_at: user.joined_at,
    avatar: user.avatar || avatar,
    extra: JSON.stringify({
      name: displayName,
      nativeLanguage: parsedExtra.nativeLanguage || '',
      translationLanguages: parsedExtra.translationLanguages || [],
      pinnedAchievements: parsedExtra.pinnedAchievements || [],
    })
  };
}

/**
 * Sanitize user profile extra JSON string
 */
function sanitizeUserProfileExtra(extraStrOrObj) {
  let extra = {};
  if (typeof extraStrOrObj === 'string') {
    try {
      extra = JSON.parse(extraStrOrObj);
    } catch (e) {
      extra = {};
    }
  } else if (typeof extraStrOrObj === 'object' && extraStrOrObj !== null) {
    extra = extraStrOrObj;
  }

  const clean = {
    name: extra.name || '',
    nativeLanguage: extra.nativeLanguage || '',
    translationLanguages: extra.translationLanguages || [],
    pinnedAchievements: extra.pinnedAchievements || [],
  };

  return JSON.stringify(clean);
}

module.exports = {
  requireAuth,
  requireAdmin,
  requireSuperAdmin,
  requireBrowserContext,
  sanitizePublicUser,
  sanitizeUserProfileExtra,
};
