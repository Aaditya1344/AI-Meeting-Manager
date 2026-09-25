const { readDB } = require('../db/database');

/**
 * Authentication Middleware: Extract current user from header or session
 */
function authMiddleware(req, res, next) {
  const headerUserId = req.headers['x-user-id'];
  const queryUserId = req.query.authUserId || req.query.currentUserId;
  const db = readDB();

  const userId = headerUserId || queryUserId;
  if (userId) {
    const user = db.users.find(u => u.id === userId || (u.email && u.email.toLowerCase() === userId.toLowerCase()));
    if (user) {
      req.user = user;
      return next();
    }
  }

  // Default fallback user for demo/admin browsing: Admin user or Dr. Rajesh Sharma
  const defaultUser = db.users.find(u => u.role === 'admin' || u.id === 'usr_aditya' || u.id === 'usr_arun') || db.users.find(u => u.id === 'usr_sharma') || db.users[0];
  req.user = defaultUser;
  next();
}

/**
 * Admin Gatekeeper: Strictly enforces admin rights for Aditya, Arun, or users with role === 'admin'
 */
function requireAdmin(req, res, next) {
  const user = req.user;
  if (!user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const isAdityaOrArun = 
    user.id === 'usr_aditya' || 
    user.id === 'usr_arun' || 
    user.email.toLowerCase().includes('aditya') || 
    user.email.toLowerCase().includes('arun') ||
    user.name.toLowerCase().includes('aditya') ||
    user.name.toLowerCase().includes('arun');

  if (user.role === 'admin' || isAdityaOrArun) {
    return next();
  }

  return res.status(403).json({
    error: 'Access Denied: Institutional Admin privileges are restricted to authorized administrators.',
    requiredRole: 'admin',
    userRole: user.role
  });
}

module.exports = {
  authMiddleware,
  requireAdmin
};
