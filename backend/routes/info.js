const express = require('express');
// express-validator available if validation middleware is added
const pool = require('../config/database');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const logger = require('../utils/logger');
const { handleError } = require('../utils/errorHandler');

const router = express.Router();

// Hent alle info-kort (kun admin)
router.get('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM info_kort WHERE aktiv = true ORDER BY kategori, navn'
    );
    res.json(result.rows);
  } catch (error) {
    handleError(error, req, res, 'Get info cards endpoint');
  }
});

// Hent alle info-kort (alle autentiserte brukere - kun visning)
router.get('/public', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT kategori, navn, verdi, beskrivelse FROM info_kort WHERE aktiv = true ORDER BY kategori, navn'
    );
    res.json(result.rows);
  } catch (error) {
    handleError(error, req, res, 'Get info cards endpoint');
  }
});

// Opprett nytt info-kort (kun admin)
router.post('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    logger.debug('Info-kort POST request', { kategori: req.body.kategori, navn: req.body.navn });
    
    const { kategori, navn, verdi, beskrivelse } = req.body;
    
    // Enkel validering
    if (!kategori || !['telefon', 'kode'].includes(kategori)) {
      return res.status(400).json({ feil: 'Kategori må være "telefon" eller "kode"' });
    }
    if (!navn || navn.length < 1 || navn.length > 100) {
      return res.status(400).json({ feil: 'Navn er påkrevd (max 100 tegn)' });
    }
    if (!verdi || verdi.length < 1 || verdi.length > 200) {
      return res.status(400).json({ feil: 'Verdi er påkrevd (max 200 tegn)' });
    }
    if (beskrivelse && beskrivelse.length > 500) {
      return res.status(400).json({ feil: 'Beskrivelse kan maksimalt være 500 tegn' });
    }

    const result = await pool.query(
      'INSERT INTO info_kort (kategori, navn, verdi, beskrivelse) VALUES ($1, $2, $3, $4) RETURNING *',
      [kategori, navn, verdi, beskrivelse || null]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    handleError(error, req, res, 'Create info card endpoint');
  }
});

// Oppdater info-kort (kun admin)
router.put('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Bygg dynamisk UPDATE query
    const updateFields = [];
    const values = [];
    let paramCount = 0;

    Object.keys(updates).forEach(key => {
      if (updates[key] !== undefined) {
        paramCount++;
        updateFields.push(`${key} = $${paramCount}`);
        values.push(updates[key]);
      }
    });

    if (updateFields.length === 0) {
      return res.status(400).json({ feil: 'Ingen oppdateringer oppgitt' });
    }

    updateFields.push(`sist_endret = CURRENT_TIMESTAMP`);
    values.push(id);

    const query = `
      UPDATE info_kort 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramCount + 1}
      RETURNING *
    `;

    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ feil: 'Info-kort ikke funnet' });
    }

    res.json({
      melding: 'Info-kort oppdatert vellykket',
      info_kort: result.rows[0]
    });
  } catch (error) {
    handleError(error, req, res, 'Update info card endpoint');
  }
});

// Slett info-kort (kun admin)
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'UPDATE info_kort SET aktiv = false WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ feil: 'Info-kort ikke funnet' });
    }

    res.json({
      melding: 'Info-kort slettet vellykket',
      info_kort: result.rows[0]
    });
  } catch (error) {
    handleError(error, req, res, 'Delete info card endpoint');
  }
});

module.exports = router;
