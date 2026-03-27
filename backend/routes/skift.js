const express = require('express');
const { body, validationResult } = require('express-validator');
const crypto = require('crypto');
const pool = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const logger = require('../utils/logger');
const { handleError } = require('../utils/errorHandler');

const router = express.Router();

// Hent alle skift for en sjåfør
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { dato, måned, år } = req.query;
    
    let query = `
      SELECT s.*, 
             sj.navn as sjåfør_navn,
             b.registreringsnummer as bil_registreringsnummer,
             b.merke as bil_merke,
             b.modell as bil_modell,
             COALESCE(s.sone, so.navn) as sone_navn,
             sga.kode as sga_kode,
             sga.beskrivelse as sga_beskrivelse,
             sga.skal_faktureres as sga_skal_faktureres,
             s.sga_kode_annet,
             godkjent_sj.navn as godkjent_av_navn
      FROM skift s
      JOIN sjåfører sj ON s.sjåfør_id = sj.id
      LEFT JOIN biler b ON s.bil_id = b.id
      LEFT JOIN soner so ON s.sone_id = so.id
      LEFT JOIN sga_koder sga ON s.sga_kode_id = sga.id
      LEFT JOIN sjåfører godkjent_sj ON s.godkjent_av = godkjent_sj.id
      WHERE s.sjåfør_id = $1
    `;
    
    const params = [req.sjåfør.id];
    let paramCount = 1;

    if (dato) {
      paramCount++;
      query += ` AND s.dato = $${paramCount}`;
      params.push(dato);
    } else if (måned && år) {
      paramCount++;
      query += ` AND EXTRACT(MONTH FROM s.dato) = $${paramCount}`;
      params.push(måned);
      paramCount++;
      query += ` AND EXTRACT(YEAR FROM s.dato) = $${paramCount}`;
      params.push(år);
    }

    query += ' ORDER BY s.dato DESC, s.start_tid DESC';

    logger.debug('Skift query', { paramCount: params.length });
    
    const result = await pool.query(query, params);
    logger.debug('Skift result', { rowCount: result.rows.length });
    
    res.json(result.rows);
  } catch (error) {
    logger.error('Feil ved henting av skift:', error);
    
    // Håndter spesifikke database-feil
    if (error.code === '42P01') { // Table does not exist
      logger.error('Tabellen eksisterer ikke. Sjekk at migrasjoner har kjørt.');
      return res.status(503).json({ 
        feil: 'Database er ikke klar. Prøv igjen om et øyeblikk.',
        errorId: crypto.randomBytes(16).toString('hex')
      });
    }
    
    if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
      logger.error('Kan ikke koble til database.');
      return res.status(503).json({ 
        feil: 'Database er ikke tilgjengelig. Prøv igjen om et øyeblikk.',
        errorId: crypto.randomBytes(16).toString('hex')
      });
    }
    
    handleError(error, req, res, 'Get shifts endpoint');
  }
});

// Hent aktivt skift for sjåfør
router.get('/active', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT s.*, 
             b.registreringsnummer,
             b.merke,
             b.modell,
             COALESCE(s.sone, so.navn) as sone_navn,
             sga.kode as sga_kode,
             sga.beskrivelse as sga_beskrivelse,
             sga.skal_faktureres as sga_skal_faktureres,
             s.sga_kode_annet,
             godkjent_sj.navn as godkjent_av_navn
      FROM skift s
      JOIN biler b ON s.bil_id = b.id
      LEFT JOIN soner so ON s.sone_id = so.id
      LEFT JOIN sga_koder sga ON s.sga_kode_id = sga.id
      LEFT JOIN sjåfører godkjent_sj ON s.godkjent_av = godkjent_sj.id
      WHERE s.sjåfør_id = $1 AND s.slutt_tid IS NULL
      ORDER BY s.start_tid DESC
      LIMIT 1
    `, [req.sjåfør.id]);

    if (result.rows.length === 0) {
      return res.json(null);
    }

    res.json(result.rows[0]);
  } catch (error) {
    handleError(error, req, res, 'Get active shift endpoint');
  }
});

// Hent et spesifikt skift
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(`
      SELECT s.*, 
             sj.navn as sjåfør_navn,
             b.registreringsnummer,
             b.merke,
             b.modell,
             COALESCE(s.sone, so.navn) as sone_navn,
             sga.kode as sga_kode,
             sga.beskrivelse as sga_beskrivelse,
             sga.skal_faktureres as sga_skal_faktureres,
             s.sga_kode_annet,
             godkjent_sj.navn as godkjent_av_navn
      FROM skift s
      JOIN sjåfører sj ON s.sjåfør_id = sj.id
      JOIN biler b ON s.bil_id = b.id
      LEFT JOIN soner so ON s.sone_id = so.id
      LEFT JOIN sga_koder sga ON s.sga_kode_id = sga.id
      LEFT JOIN sjåfører godkjent_sj ON s.godkjent_av = godkjent_sj.id
      WHERE s.id = $1 AND s.sjåfør_id = $2
    `, [id, req.sjåfør.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ feil: 'Skift ikke funnet' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    logger.error('Feil ved henting av skift:', error);
    handleError(error, req, res, 'Get shifts endpoint');
  }
});

// Opprett nytt skift
router.post('/', authenticateToken, [
  body('bil_id').isInt({ min: 1 }),
  body('sone_id').isInt({ min: 1 }),
  body('dato').isISO8601().toDate(),
  body('start_tid').isISO8601(),
  body('slutt_tid').optional().isISO8601(),
  body('pause_minutter').optional().isInt({ min: 0 }),
  body('antall_sendinger').optional().isInt({ min: 0 }),
  body('kommentarer').optional().isString().isLength({ max: 1000 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ feil: 'Ugyldig input', detaljer: errors.array() });
    }

    const {
      bil_id,
      sone_id,
      dato,
      start_tid,
      slutt_tid
    } = req.body;

    // Sjekk om sjåføren allerede har et aktivt skift
    const activeShift = await pool.query(
      'SELECT id FROM skift WHERE sjåfør_id = $1 AND slutt_tid IS NULL',
      [req.sjåfør.id]
    );

    if (activeShift.rows.length > 0) {
      return res.status(400).json({ feil: 'Du har allerede et aktivt skift' });
    }

    // Verifiser at bil og sone eksisterer
    const bilResult = await pool.query('SELECT id FROM biler WHERE id = $1 AND aktiv = true', [bil_id]);
    if (bilResult.rows.length === 0) {
      return res.status(400).json({ feil: 'Ugyldig bil' });
    }

    const soneResult = await pool.query('SELECT id FROM soner WHERE id = $1 AND aktiv = true', [sone_id]);
    if (soneResult.rows.length === 0) {
      return res.status(400).json({ feil: 'Ugyldig sone' });
    }

    // Ekstraher dato fra start_tid hvis dato ikke er satt
    let skiftDato = dato;
    if (!skiftDato && start_tid) {
      const startDate = new Date(start_tid);
      skiftDato = startDate.toISOString().split('T')[0]; // YYYY-MM-DD format
    }
    
    // Hvis dato fortsatt ikke er satt, bruk dagens dato
    if (!skiftDato) {
      skiftDato = new Date().toISOString().split('T')[0];
    }

    const result = await pool.query(`
      INSERT INTO skift (
        sjåfør_id, bil_id, sone_id, dato, start_tid, slutt_tid, 
        pause_minutter, antall_sendinger, kommentarer
      ) VALUES ($1, $2, $3, $4, $5, $6, 0, 0, '')
      RETURNING *
    `, [
      req.sjåfør.id, bil_id, sone_id, skiftDato, start_tid, slutt_tid
    ]);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    handleError(error, req, res, 'Create shift endpoint');
  }
});

// Avslutt skift
router.put('/:id/slutt', authenticateToken, [
  body('slutt_tid').isISO8601(),
  body('pause_minutter').optional().isInt({ min: 0 }),
  body('antall_sendinger').optional().isInt({ min: 0 }),
  body('kommentarer').optional().isString().isLength({ max: 1000 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ feil: 'Ugyldig input', detaljer: errors.array() });
    }

    const { id } = req.params;
    const { slutt_tid, pause_minutter, antall_sendinger, kommentarer } = req.body;

    // Sjekk at skiftet tilhører sjåføren og er aktivt
    const existingSkift = await pool.query(
      'SELECT * FROM skift WHERE id = $1 AND sjåfør_id = $2 AND slutt_tid IS NULL',
      [id, req.sjåfør.id]
    );

    if (existingSkift.rows.length === 0) {
      return res.status(404).json({ feil: 'Aktivt skift ikke funnet' });
    }

    const result = await pool.query(`
      UPDATE skift 
      SET slutt_tid = $1, 
          pause_minutter = COALESCE($2, pause_minutter),
          antall_sendinger = COALESCE($3, antall_sendinger),
          kommentarer = COALESCE($4, kommentarer),
          sist_endret = CURRENT_TIMESTAMP
      WHERE id = $5 AND sjåfør_id = $6
      RETURNING *
    `, [slutt_tid, pause_minutter, antall_sendinger, kommentarer, id, req.sjåfør.id]);

    res.json(result.rows[0]);
  } catch (error) {
    handleError(error, req, res, 'End shift endpoint');
  }
});

// Oppdater skift
router.put('/:id', authenticateToken, [
  body('bil_id').optional().isInt({ min: 1 }),
  body('sone_id').optional().isInt({ min: 1 }),
  body('dato').optional().isISO8601().toDate(),
  body('start_tid').optional().isISO8601(),
  body('slutt_tid').optional().isISO8601(),
  body('pause_minutter').optional().isInt({ min: 0 }),
  body('antall_sendinger').optional().isInt({ min: 0 }),
  body('vekt').optional().isInt({ min: 0 }),
  body('kommentarer').optional().isString().isLength({ max: 1000 })
], async (req, res) => {
  try {
    logger.debug('Skift update request', { id: req.params.id, fields: Object.keys(req.body) });
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.debug('Skift update validation failed', errors.array());
      return res.status(400).json({ feil: 'Ugyldig input', detaljer: errors.array() });
    }

    const { id } = req.params;
    const updates = req.body;

    // Sjekk at skiftet tilhører sjåføren
    const existingSkift = await pool.query(
      'SELECT * FROM skift WHERE id = $1 AND sjåfør_id = $2',
      [id, req.sjåfør.id]
    );

    if (existingSkift.rows.length === 0) {
      return res.status(404).json({ feil: 'Skift ikke funnet' });
    }

    // Sjekk om skiftet er godkjent - hvis ja, kan ikke redigeres
    if (existingSkift.rows[0].godkjent) {
      return res.status(403).json({ feil: 'Dette skiftet er godkjent og kan ikke redigeres' });
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

    updateFields.push(`sist_endret = CURRENT_TIMESTAMP`);
    values.push(id);

    const query = `
      UPDATE skift 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramCount + 1} AND sjåfør_id = $${paramCount + 2}
      RETURNING *
    `;
    values.push(req.sjåfør.id);

    const result = await pool.query(query, values);

    res.json(result.rows[0]);
  } catch (error) {
    handleError(error, req, res, 'Update shift endpoint');
  }
});

// Slett skift
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'DELETE FROM skift WHERE id = $1 AND sjåfør_id = $2 RETURNING *',
      [id, req.sjåfør.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ feil: 'Skift ikke funnet' });
    }

    res.json({ melding: 'Skift slettet vellykket' });
  } catch (error) {
    handleError(error, req, res, 'Delete shift endpoint');
  }
});

module.exports = router;
