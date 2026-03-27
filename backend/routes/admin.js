const express = require('express');
const { body, validationResult } = require('express-validator');
const pool = require('../config/database');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const logger = require('../utils/logger');
const { handleError } = require('../utils/errorHandler');

const router = express.Router();

// Hent alle sjåfører (admin)
router.get('/sjåfører', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, navn, epost, telefon, aktiv, admin FROM sjåfører ORDER BY navn'
    );
    res.json(result.rows);
  } catch (error) {
    handleError(error, req, res, 'Admin: Get drivers endpoint');
  }
});

// Hent alle biler (admin)
router.get('/biler', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, registreringsnummer, merke, modell, årsmodell, aktiv FROM biler ORDER BY registreringsnummer'
    );
    res.json(result.rows);
  } catch (error) {
    handleError(error, req, res, 'Admin: Get cars endpoint');
  }
});

// Hent alle soner (admin)
router.get('/soner', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, navn, beskrivelse, aktiv FROM soner ORDER BY navn'
    );
    res.json(result.rows);
  } catch (error) {
    handleError(error, req, res, 'Admin: Get zones endpoint');
  }
});

// Hent alle skift (admin)
router.get('/skift', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT s.*, 
             sj.navn as sjåfør_navn,
             b.registreringsnummer as bil_registreringsnummer,
             b.merke as bil_merke,
             b.modell as bil_modell,
             COALESCE(s.sone, so.navn) as sone_navn,
             godkjent_sj.navn as godkjent_av_navn
      FROM skift s
      LEFT JOIN sjåfører sj ON s.sjåfør_id = sj.id
      LEFT JOIN biler b ON s.bil_id = b.id
      LEFT JOIN soner so ON s.sone_id = so.id
      LEFT JOIN sjåfører godkjent_sj ON s.godkjent_av = godkjent_sj.id
      ORDER BY s.dato DESC, s.start_tid DESC
    `);
    res.json(result.rows);
  } catch (error) {
    handleError(error, req, res, 'Admin: Get shifts endpoint');
  }
});

// Godkjenn/avgodkjenn skift (admin)
router.put('/skift/:id/godkjenn', authenticateToken, requireAdmin, [
  body('godkjent').isBoolean()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ feil: 'Ugyldig input', detaljer: errors.array() });
    }

    const { id } = req.params;
    const { godkjent } = req.body;

    const result = await pool.query(`
      UPDATE skift 
      SET godkjent = $1,
          godkjent_av = $2,
          godkjent_dato = CASE WHEN $1 = true THEN CURRENT_TIMESTAMP ELSE NULL END,
          sist_endret = CURRENT_TIMESTAMP
      WHERE id = $3
      RETURNING *
    `, [godkjent, req.sjåfør.id, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ feil: 'Skift ikke funnet' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    handleError(error, req, res, 'Admin: Approve shift endpoint');
  }
});

// Bulk godkjenn/avgodkjenn skift (admin)
router.put('/skift/bulk-godkjenn', authenticateToken, requireAdmin, [
  body('skift_ids').isArray().notEmpty(),
  body('godkjent').isBoolean()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ feil: 'Ugyldig input', detaljer: errors.array() });
    }

    const { skift_ids, godkjent } = req.body;

    // Valider at alle IDs er tall
    const validIds = skift_ids.filter(id => Number.isInteger(Number(id))).map(id => parseInt(id, 10));
    
    if (validIds.length === 0) {
      return res.status(400).json({ feil: 'Ingen gyldige skift-IDer' });
    }

    const result = await pool.query(`
      UPDATE skift 
      SET godkjent = $1,
          godkjent_av = $2,
          godkjent_dato = CASE WHEN $1 = true THEN CURRENT_TIMESTAMP ELSE NULL END,
          sist_endret = CURRENT_TIMESTAMP
      WHERE id = ANY($3)
      RETURNING id, godkjent, godkjent_dato
    `, [godkjent, req.sjåfør.id, validIds]);

    res.json({
      melding: `${result.rows.length} skift ${godkjent ? 'godkjent' : 'avgodkjent'}`,
      antall: result.rows.length,
      skift: result.rows
    });
  } catch (error) {
    handleError(error, req, res, 'Admin: Bulk approve shifts endpoint');
  }
});

// Hent alle avvik (admin)
router.get('/avvik', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT a.*, 
             sj.navn as sjåfør_navn,
             s.dato as skift_dato,
             b.registreringsnummer as bil_registreringsnummer,
             admin_sj.navn as admin_navn
      FROM avvik a
      JOIN sjåfører sj ON a.sjåfør_id = sj.id
      LEFT JOIN skift s ON a.skift_id = s.id
      LEFT JOIN biler b ON s.bil_id = b.id
      LEFT JOIN sjåfører admin_sj ON a.admin_id = admin_sj.id
      ORDER BY a.dato DESC
    `);
    res.json(result.rows);
  } catch (error) {
    handleError(error, req, res, 'Admin: Get incidents endpoint');
  }
});

// Hent alle forbedringsforslag (admin)
router.get('/forbedringsforslag', authenticateToken, requireAdmin, async (req, res) => {
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
      ORDER BY f.opprettet DESC
    `);
    res.json(result.rows);
  } catch (error) {
    handleError(error, req, res, 'Admin: Get improvement suggestions endpoint');
  }
});


// Hent alle registreringer (admin)
router.get('/registreringer', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { sjåfør_id, bil_id, sone_id, fra_dato, til_dato, side = 1, limit = 50 } = req.query;
    
    let query = `
      SELECT s.*, 
             sj.navn as sjåfør_navn,
             sj.epost as sjåfør_epost,
             b.registreringsnummer,
             b.merke,
             b.modell,
             COALESCE(s.sone, so.navn) as sone_navn
      FROM skift s
      LEFT JOIN sjåfører sj ON s.sjåfør_id = sj.id
      LEFT JOIN biler b ON s.bil_id = b.id
      LEFT JOIN soner so ON s.sone_id = so.id
      WHERE 1=1
    `;
    
    const params = [];
    let paramCount = 0;

    if (sjåfør_id) {
      paramCount++;
      query += ` AND s.sjåfør_id = $${paramCount}`;
      params.push(sjåfør_id);
    }

    if (bil_id) {
      paramCount++;
      query += ` AND s.bil_id = $${paramCount}`;
      params.push(bil_id);
    }

    if (sone_id) {
      paramCount++;
      query += ` AND (s.sone = $${paramCount} OR s.sone_id = $${paramCount})`;
      params.push(sone_id);
    }

    if (fra_dato) {
      paramCount++;
      query += ` AND s.dato >= $${paramCount}`;
      params.push(fra_dato);
    }

    if (til_dato) {
      paramCount++;
      query += ` AND s.dato <= $${paramCount}`;
      params.push(til_dato);
    }

    // Paginering
    const offset = (parseInt(side) - 1) * parseInt(limit);
    paramCount++;
    query += ` ORDER BY s.dato DESC, s.start_tid DESC LIMIT $${paramCount}`;
    params.push(parseInt(limit));
    
    paramCount++;
    query += ` OFFSET $${paramCount}`;
    params.push(offset);

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    handleError(error, req, res, 'Admin: Get registrations endpoint');
  }
});

// Hent alle avvik (admin)
router.get('/avvik', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { sjåfør_id, fra_dato, til_dato } = req.query;
    
    let query = `
      SELECT a.*, 
             sj.navn as sjåfør_navn,
             sj.epost as sjåfør_epost,
             s.dato as skift_dato,
             b.registreringsnummer,
             admin_sj.navn as admin_navn
      FROM avvik a
      JOIN sjåfører sj ON a.sjåfør_id = sj.id
      LEFT JOIN skift s ON a.skift_id = s.id
      LEFT JOIN biler b ON s.bil_id = b.id
      LEFT JOIN sjåfører admin_sj ON a.admin_id = admin_sj.id
      WHERE 1=1
    `;
    
    const params = [];
    let paramCount = 0;

    if (sjåfør_id) {
      paramCount++;
      query += ` AND a.sjåfør_id = $${paramCount}`;
      params.push(sjåfør_id);
    }

    if (fra_dato) {
      paramCount++;
      query += ` AND DATE(a.dato) >= $${paramCount}`;
      params.push(fra_dato);
    }

    if (til_dato) {
      paramCount++;
      query += ` AND DATE(a.dato) <= $${paramCount}`;
      params.push(til_dato);
    }

    query += ' ORDER BY a.dato DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    handleError(error, req, res, 'Admin: Get incidents endpoint');
  }
});

// Hent alle forbedringsforslag (admin)
router.get('/forbedringsforslag', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { status } = req.query;
    
    let query = `
      SELECT f.*, 
             sj.navn as sjåfør_navn,
             sj.epost as sjåfør_epost,
             behandler.navn as behandlet_av_navn,
             admin_sj.navn as admin_navn
      FROM forbedringsforslag f
      JOIN sjåfører sj ON f.sjåfør_id = sj.id
      LEFT JOIN sjåfører behandler ON f.behandlet_av = behandler.id
      LEFT JOIN sjåfører admin_sj ON f.admin_id = admin_sj.id
      WHERE 1=1
    `;
    
    const params = [];
    let paramCount = 0;

    if (status) {
      paramCount++;
      query += ` AND f.status = $${paramCount}`;
      params.push(status);
    }

    query += ' ORDER BY f.opprettet DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    handleError(error, req, res, 'Admin: Get improvement suggestions endpoint');
  }
});

// Oppdater status på forbedringsforslag (admin)
router.put('/forbedringsforslag/:id/status', authenticateToken, requireAdmin, [
  body('status').isIn(['ny', 'under behandling', 'besvart']),
  body('kommentar').optional().isString().isLength({ max: 1000 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ feil: 'Ugyldig input', detaljer: errors.array() });
    }

    const { id } = req.params;
    const { status } = req.body;

    const result = await pool.query(`
      UPDATE forbedringsforslag 
      SET status = $1, 
          behandlet = CURRENT_TIMESTAMP,
          behandlet_av = $2
      WHERE id = $3
      RETURNING *
    `, [status, req.sjåfør.id, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ feil: 'Forbedringsforslag ikke funnet' });
    }

    res.json({
      melding: 'Status oppdatert vellykket',
      forbedringsforslag: result.rows[0]
    });
  } catch (error) {
    handleError(error, req, res, 'Admin: Update status endpoint');
  }
});

// Eksporter data til CSV (admin)
router.get('/export/:type', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { type } = req.params;
    const { sjåfør_id, fra_dato, til_dato } = req.query;
    
    let query;
    let filename;
    
    if (type === 'skift') {
      filename = `skift_${fra_dato || 'alle'}_${til_dato || 'alle'}.csv`;
              query = `
                SELECT s.dato,
                       s.start_tid,
                       s.slutt_tid,
                       s.pause_minutter,
                       s.antall_sendinger,
                       s.kommentarer,
                       sj.navn as sjåfør_navn,
                       sj.epost as sjåfør_epost,
                       b.registreringsnummer,
                       b.merke,
                       b.modell,
                       COALESCE(s.sone, so.navn) as sone_navn
                FROM skift s
                JOIN sjåfører sj ON s.sjåfør_id = sj.id
                JOIN biler b ON s.bil_id = b.id
                LEFT JOIN soner so ON s.sone_id = so.id
                WHERE 1=1
              `;
    } else if (type === 'avvik') {
      filename = `avvik_${fra_dato || 'alle'}_${til_dato || 'alle'}.csv`;
      query = `
        SELECT a.dato,
               a.type,
               a.beskrivelse,
               a.status,
               a.admin_kommentar,
               sj.navn as sjåfør_navn,
               sj.epost as sjåfør_epost,
               s.dato as skift_dato,
               b.registreringsnummer,
               admin_sj.navn as admin_navn
        FROM avvik a
        JOIN sjåfører sj ON a.sjåfør_id = sj.id
        LEFT JOIN skift s ON a.skift_id = s.id
        LEFT JOIN biler b ON s.bil_id = b.id
        LEFT JOIN sjåfører admin_sj ON a.admin_id = admin_sj.id
        WHERE 1=1
      `;
    } else if (type === 'forbedringsforslag') {
      filename = `forbedringsforslag_${fra_dato || 'alle'}_${til_dato || 'alle'}.csv`;
      query = `
        SELECT f.opprettet,
               f.tittel,
               f.beskrivelse,
               f.status,
               f.admin_kommentar,
               sj.navn as sjåfør_navn,
               sj.epost as sjåfør_epost,
               admin_sj.navn as admin_navn
        FROM forbedringsforslag f
        JOIN sjåfører sj ON f.sjåfør_id = sj.id
        LEFT JOIN sjåfører admin_sj ON f.admin_id = admin_sj.id
        WHERE 1=1
      `;
    } else {
      return res.status(400).json({ feil: 'Ugyldig eksporttype' });
    }
    
    const params = [];
    let paramCount = 0;

    if (sjåfør_id) {
      paramCount++;
      query += ` AND ${type === 'skift' ? 's' : 'a'}.sjåfør_id = $${paramCount}`;
      params.push(sjåfør_id);
    }

    if (fra_dato) {
      paramCount++;
      query += ` AND DATE(${type === 'skift' ? 's' : 'a'}.dato) >= $${paramCount}`;
      params.push(fra_dato);
    }

    if (til_dato) {
      paramCount++;
      query += ` AND DATE(${type === 'skift' ? 's' : 'a'}.dato) <= $${paramCount}`;
      params.push(til_dato);
    }

    query += ` ORDER BY ${type === 'skift' ? 's' : 'a'}.dato DESC`;

    const result = await pool.query(query, params);
    
    // Konverter til CSV
    if (result.rows.length === 0) {
      return res.status(404).json({ feil: 'Ingen data funnet for eksport' });
    }

    const headers = Object.keys(result.rows[0]);
    const csvContent = [
      headers.join(','),
      ...result.rows.map(row => 
        headers.map(header => `"${row[header] || ''}"`).join(',')
      )
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csvContent);
  } catch (error) {
    handleError(error, req, res, 'Admin: Export endpoint');
  }
});

// Hent skift som skal faktureres (har SGA-kode med skal_faktureres = true eller sga_kode_annet)
router.get('/fakturering', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        s.id,
        s.sjåfør_id,
        s.bil_id,
        s.sone_id,
        s.dato,
        s.start_tid,
        s.slutt_tid,
        s.pause_minutter,
        s.antall_sendinger,
        s.vekt,
        s.kommentarer,
        s.registrering_type,
        s.bomtur_venting,
        s.sga_kode_id,
        s.sga_kode_annet,
        s.opprettet,
        s.sist_endret,
        s.fakturert,
        s.fakturert_dato,
        s.fakturert_av,
        sj.navn as sjåfør_navn,
        b.registreringsnummer as bil_registreringsnummer,
        b.merke as bil_merke,
        b.modell as bil_modell,
        COALESCE(s.sone, so.navn) as sone_navn,
        sga.kode as sga_kode,
        sga.beskrivelse as sga_beskrivelse,
        sga.skal_faktureres as sga_skal_faktureres,
        fakturert_sj.navn as fakturert_av_navn
      FROM skift s
      LEFT JOIN sjåfører sj ON s.sjåfør_id = sj.id
      LEFT JOIN biler b ON s.bil_id = b.id
      LEFT JOIN soner so ON s.sone_id = so.id
      LEFT JOIN sga_koder sga ON s.sga_kode_id = sga.id
      LEFT JOIN sjåfører fakturert_sj ON s.fakturert_av = fakturert_sj.id
      WHERE (sga.skal_faktureres = true OR s.sga_kode_annet IS NOT NULL)
        AND s.registrering_type = 'arbeidstid'
      ORDER BY s.dato DESC, s.start_tid DESC
    `);
    res.json(result.rows);
  } catch (error) {
    handleError(error, req, res, 'Admin: Get invoicing shifts endpoint');
  }
});

// Marker skift som fakturert
router.put('/skift/:id/fakturer', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { fakturert } = req.body;
    const sjåførId = req.sjåfør.id;
    const { id } = req.params;

    if (typeof fakturert !== 'boolean') {
      return res.status(400).json({ feil: 'fakturert må være en boolean' });
    }

    // Sørg for at sjåførId er et tall
    const sjåførIdInt = parseInt(sjåførId, 10);
    if (isNaN(sjåførIdInt)) {
      return res.status(400).json({ feil: 'Ugyldig sjåfør ID' });
    }

    let result;
    if (fakturert) {
      result = await pool.query(
        `UPDATE skift 
         SET fakturert = true, 
             fakturert_dato = CURRENT_TIMESTAMP, 
             fakturert_av = $1,
             sist_endret = CURRENT_TIMESTAMP
         WHERE id = $2
         RETURNING *`,
        [sjåførIdInt, parseInt(id, 10)]
      );
    } else {
      result = await pool.query(
        `UPDATE skift 
         SET fakturert = false, 
             fakturert_dato = NULL, 
             fakturert_av = NULL,
             sist_endret = CURRENT_TIMESTAMP
         WHERE id = $1
         RETURNING *`,
        [parseInt(id, 10)]
      );
    }

    if (result.rows.length === 0) {
      return res.status(404).json({ feil: 'Skift ikke funnet' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    handleError(error, req, res, 'Admin: Update invoicing endpoint');
  }
});

// Create time registration on behalf of a driver (admin only)
router.post('/tidregistrering', authenticateToken, requireAdmin, [
  body('sjåfør_id').isInt({ min: 1 }),
  body('dato').isISO8601(),
  body('registrering_type').optional().isIn(['arbeidstid', 'ferie', 'sykemelding', 'egenmelding', 'egenmelding_barn']),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ feil: 'Ugyldig input', detaljer: errors.array() });
    }

    const { sjåfør_id, bil_id, sone, sendinger, vekt, pause, kommentarer, dato, start_tid, slutt_tid, registrering_type, bomtur_venting, sga_kode_id, sga_kode_annet } = req.body;

    const type = registrering_type || 'arbeidstid';

    let skiftDato = dato;
    if (!skiftDato && start_tid) {
      skiftDato = new Date(start_tid).toISOString().split('T')[0];
    }
    if (!skiftDato) {
      skiftDato = new Date().toISOString().split('T')[0];
    }

    const result = await pool.query(`
      INSERT INTO skift (
        sjåfør_id, bil_id, sone, dato, start_tid, slutt_tid, 
        pause_minutter, antall_sendinger, vekt, kommentarer, registrering_type, bomtur_venting, sga_kode_id, sga_kode_annet
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *
    `, [
      sjåfør_id,
      bil_id || null,
      sone || null,
      skiftDato,
      start_tid,
      slutt_tid,
      pause || 0,
      sendinger || 0,
      vekt || 0,
      kommentarer || '',
      type,
      bomtur_venting || null,
      sga_kode_id || null,
      sga_kode_annet || null
    ]);

    logger.info('Admin created shift for driver', { admin: req.sjåfør.navn, driverId: sjåfør_id });
    res.status(201).json({ melding: 'Tidregistrering lagret!', skift: result.rows[0] });
  } catch (error) {
    handleError(error, req, res, 'Admin: Create time registration on behalf endpoint');
  }
});

// Get current backend log level
router.get('/log-level', authenticateToken, requireAdmin, (req, res) => {
  res.json({ level: logger.getLevel(), levels: logger.VALID_LEVELS });
});

// Set backend log level at runtime
router.put('/log-level', authenticateToken, requireAdmin, [
  body('level').isIn(['debug', 'info', 'warn', 'error']),
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ feil: 'Ugyldig lognivå', detaljer: errors.array() });
  }

  const { level } = req.body;
  logger.setLevel(level);
  logger.info(`Log level changed to '${level}' by ${req.sjåfør.navn}`);
  res.json({ level: logger.getLevel() });
});

module.exports = router;
