const express = require('express');
const { body, validationResult } = require('express-validator');
const pool = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const logger = require('../utils/logger');
const { handleError } = require('../utils/errorHandler');

const router = express.Router();

// Hent alle forbedringsforslag for en sjåfør
router.get('/', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT f.*, 
             sj.navn as sjåfør_navn,
             behandler.navn as behandlet_av_navn,
             admin_sj.navn as admin_navn
      FROM forbedringsforslag f
      JOIN sjåfører sj ON f.sjåfør_id = sj.id
      LEFT JOIN sjåfører behandler ON f.behandlet_av = behandler.id
      LEFT JOIN sjåfører admin_sj ON f.admin_id = admin_sj.id
      WHERE f.sjåfør_id = $1
      ORDER BY f.opprettet DESC
    `, [req.sjåfør.id]);

    res.json(result.rows);
  } catch (error) {
    handleError(error, req, res, 'Get improvement suggestions endpoint');
  }
});

// Hent et spesifikt forbedringsforslag
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(`
      SELECT f.*, 
             sj.navn as sjåfør_navn,
             behandler.navn as behandlet_av_navn
      FROM forbedringsforslag f
      JOIN sjåfører sj ON f.sjåfør_id = sj.id
      LEFT JOIN sjåfører behandler ON f.behandlet_av = behandler.id
      WHERE f.id = $1 AND f.sjåfør_id = $2
    `, [id, req.sjåfør.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ feil: 'Forbedringsforslag ikke funnet' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    handleError(error, req, res, 'Get improvement suggestions endpoint');
  }
});

// Opprett nytt forbedringsforslag
router.post('/', authenticateToken, [
  body('tittel').isString().isLength({ min: 1, max: 200 }),
  body('beskrivelse').isString().isLength({ min: 1, max: 2000 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ feil: 'Ugyldig input', detaljer: errors.array() });
    }

    const { tittel, beskrivelse } = req.body;

    const result = await pool.query(`
      INSERT INTO forbedringsforslag (sjåfør_id, tittel, beskrivelse)
      VALUES ($1, $2, $3)
      RETURNING *
    `, [req.sjåfør.id, tittel, beskrivelse]);

    res.status(201).json({
      melding: 'Forbedringsforslag sendt vellykket',
      forbedringsforslag: result.rows[0]
    });
  } catch (error) {
    handleError(error, req, res, 'Create improvement suggestion endpoint');
  }
});

// Oppdater forbedringsforslag (kun tittel og beskrivelse)
router.put('/:id', authenticateToken, [
  body('tittel').optional().isString().isLength({ min: 1, max: 200 }),
  body('beskrivelse').optional().isString().isLength({ min: 1, max: 2000 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ feil: 'Ugyldig input', detaljer: errors.array() });
    }

    const { id } = req.params;
    const updates = req.body;

    // Sjekk at forbedringsforslaget tilhører sjåføren
    const existingForslag = await pool.query(
      'SELECT * FROM forbedringsforslag WHERE id = $1 AND sjåfør_id = $2',
      [id, req.sjåfør.id]
    );

    if (existingForslag.rows.length === 0) {
      return res.status(404).json({ feil: 'Forbedringsforslag ikke funnet' });
    }

    // Sjekk at forslaget ikke allerede er behandlet
    if (existingForslag.rows[0].status !== 'ny') {
      return res.status(400).json({ feil: 'Kan ikke redigere behandlede forslag' });
    }

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

    values.push(id);

    const query = `
      UPDATE forbedringsforslag 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramCount + 1} AND sjåfør_id = $${paramCount + 2}
      RETURNING *
    `;
    values.push(req.sjåfør.id);

    const result = await pool.query(query, values);

    res.json({
      melding: 'Forbedringsforslag oppdatert vellykket',
      forbedringsforslag: result.rows[0]
    });
  } catch (error) {
    handleError(error, req, res, 'Update improvement suggestion endpoint');
  }
});

// Slett forbedringsforslag
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'DELETE FROM forbedringsforslag WHERE id = $1 AND sjåfør_id = $2 RETURNING *',
      [id, req.sjåfør.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ feil: 'Forbedringsforslag ikke funnet' });
    }

    res.json({ melding: 'Forbedringsforslag slettet vellykket' });
  } catch (error) {
    handleError(error, req, res, 'Delete improvement suggestion endpoint');
  }
});

// Hent kommentarer for et forbedringsforslag
router.get('/:id/kommentarer', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(`
      SELECT 
        fk.*,
        s.navn as sjåfør_navn,
        s.admin
      FROM forbedringsforslag_kommentarer fk
      JOIN sjåfører s ON fk.sjåfør_id = s.id
      WHERE fk.forbedringsforslag_id = $1
      ORDER BY fk.opprettet ASC
    `, [id]);
    
    res.json(result.rows);
  } catch (error) {
    handleError(error, req, res, 'Get comments endpoint');
  }
});

// Legg til kommentar til forbedringsforslag
router.post('/:id/kommentarer', authenticateToken, [
  body('kommentar').isString().isLength({ min: 1, max: 1000 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ feil: 'Ugyldig input', detaljer: errors.array() });
    }

    const { id } = req.params;
    const { kommentar } = req.body;

    // Sjekk at forbedringsforslaget eksisterer og at brukeren har tilgang
    const forslagCheck = await pool.query(`
      SELECT f.*, s.navn as sjåfør_navn 
      FROM forbedringsforslag f 
      JOIN sjåfører s ON f.sjåfør_id = s.id 
      WHERE f.id = $1 AND (f.sjåfør_id = $2 OR $3 = true)
    `, [id, req.sjåfør.id, req.sjåfør.admin]);

    if (forslagCheck.rows.length === 0) {
      return res.status(404).json({ feil: 'Forbedringsforslag ikke funnet eller ingen tilgang' });
    }

    const result = await pool.query(`
      INSERT INTO forbedringsforslag_kommentarer (forbedringsforslag_id, sjåfør_id, kommentar)
      VALUES ($1, $2, $3)
      RETURNING *
    `, [id, req.sjåfør.id, kommentar]);

    res.status(201).json({
      melding: 'Kommentar lagt til',
      kommentar: result.rows[0]
    });
  } catch (error) {
    handleError(error, req, res, 'Create comment endpoint');
  }
});

module.exports = router;
