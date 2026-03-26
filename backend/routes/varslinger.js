const express = require('express');
const pool = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { handleError } = require('../utils/errorHandler');

const router = express.Router();

// Get notifications for current user
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { lest, limit = 50, offset = 0 } = req.query;

    let query = `
      SELECT * FROM varslinger
      WHERE mottaker_id = $1
    `;
    const params = [req.sjåfør.id];
    let paramCount = 1;

    if (lest !== undefined) {
      paramCount++;
      query += ` AND lest = $${paramCount}`;
      params.push(lest === 'true');
    }

    query += ` ORDER BY opprettet DESC`;

    paramCount++;
    query += ` LIMIT $${paramCount}`;
    params.push(parseInt(limit, 10));

    paramCount++;
    query += ` OFFSET $${paramCount}`;
    params.push(parseInt(offset, 10));

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    handleError(error, req, res, 'Get notifications endpoint');
  }
});

// Get unread notification count
router.get('/ulest', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT COUNT(*) as antall FROM varslinger WHERE mottaker_id = $1 AND lest = false',
      [req.sjåfør.id]
    );
    res.json({ antall: parseInt(result.rows[0].antall, 10) });
  } catch (error) {
    handleError(error, req, res, 'Get unread count endpoint');
  }
});

// Mark single notification as read
router.put('/:id/les', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `UPDATE varslinger SET lest = true, lest_dato = CURRENT_TIMESTAMP
       WHERE id = $1 AND mottaker_id = $2 RETURNING *`,
      [req.params.id, req.sjåfør.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ feil: 'Varsling ikke funnet' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    handleError(error, req, res, 'Mark read endpoint');
  }
});

// Mark all notifications as read
router.put('/les-alle', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `UPDATE varslinger SET lest = true, lest_dato = CURRENT_TIMESTAMP
       WHERE mottaker_id = $1 AND lest = false
       RETURNING id`,
      [req.sjåfør.id]
    );
    res.json({ melding: `${result.rowCount} varsling(er) markert som lest` });
  } catch (error) {
    handleError(error, req, res, 'Mark all read endpoint');
  }
});

// Delete a notification
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM varslinger WHERE id = $1 AND mottaker_id = $2 RETURNING id',
      [req.params.id, req.sjåfør.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ feil: 'Varsling ikke funnet' });
    }

    res.json({ melding: 'Varsling slettet' });
  } catch (error) {
    handleError(error, req, res, 'Delete notification endpoint');
  }
});

module.exports = router;
