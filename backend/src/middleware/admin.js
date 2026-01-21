// Admin middleware - authorization checks for admin operations

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
  
  if (!req.session.user.is_admin) {
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

module.exports = {
  requireAuth,
  requireAdmin,
  requireSuperAdmin,
};
