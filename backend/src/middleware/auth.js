import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'changeme';

export const requireAuth = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (!token) {
      return res.status(401).json({ error: 'Token requerido' });
    }

    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token invalido o expirado' });
  }
};

export const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    const currentRole = String(req.user?.role || '').toLowerCase();
    const normalizedAllowed = allowedRoles.map((role) => String(role).toLowerCase());

    if (!currentRole || !normalizedAllowed.includes(currentRole)) {
      return res.status(403).json({ error: 'No autorizado para este recurso' });
    }

    next();
  };
};
