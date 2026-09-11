const { readDB } = require('../db/database');

/**
 * Authentication Middleware: Extract current user from header or session
 */
function authMiddleware(req, res, next) {
  const userId = req.headers['x-user-id'] || req.query.userId || req.body.userId;
  const db = readDB();

  if (userId) {
    const user = db.users.find(u => u.id === userId || u.email === userId);
    if (user) {
      req.user = user;
      return next();
    }
  }

  // Default fallback user for demo browsing: Dr. Rajesh Sharma (Organizer)
  const defaultUser = db.users.find(u => u.id === 'usr_sharma') || db.users[0];
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
    error: 'Access Denied: Institutional Admin privileges are restricted to authorized administrators (Aditya & Arun).',
    requiredRole: 'admin',
    userRole: user.role
  });
}

module.exports = {
  authMiddleware,
  requireAdmin
};
