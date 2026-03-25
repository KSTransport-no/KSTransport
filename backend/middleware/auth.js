const jwt = require('jsonwebtoken');
const pool = require('../config/database');
const logger = require('../utils/logger');

const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ feil: 'Tilgangstoken mangler' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Verifiser at brukeren fortsatt eksisterer
    const result = await pool.query(
      'SELECT id, navn, epost, telefon, aktiv, admin FROM sjåfører WHERE id = $1 AND aktiv = true',
      [decoded.sjåførId]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ feil: 'Ugyldig token' });
    }

    req.sjåfør = result.rows[0];
    next();
  } catch (error) {
    return res.status(403).json({ feil: 'Ugyldig token' });
  }
};

const requireAdmin = async (req, res, next) => {
  logger.log('requireAdmin check:', { sjåfør: req.sjåfør, admin: req.sjåfør?.admin });
  if (!req.sjåfør || !req.sjåfør.admin) {
    return res.status(403).json({ feil: 'Admin-tilgang påkrevd' });
  }
  next();
};

module.exports = { authenticateToken, requireAdmin };
