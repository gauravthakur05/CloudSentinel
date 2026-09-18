/**
 * Factory that returns middleware restricting a route to the given roles.
 * Must run after requireAuth, since it depends on req.user.
 *
 * Usage: router.delete('/:id', requireAuth, requireRole('admin'), handler)
 */
function requireRole(...allowedRoles) {
  return function roleCheckMiddleware(req, res, next) {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions for this action' });
    }
    return next();
  };
}

module.exports = { requireRole };
