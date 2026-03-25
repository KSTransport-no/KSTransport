const express = require('express');
const { body, validationResult } = require('express-validator');
const pool = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const logger = require('../utils/logger');
const { handleError } = require('../utils/errorHandler');

const router = express.Router();

// Hent alle avvik for en sjåfør
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { dato, måned, år } = req.query;
    
    let query = `
      SELECT a.*, 
             sj.navn as sjåfør_navn,
             s.dato as skift_dato,
             b.registreringsnummer,
             admin_sj.navn as admin_navn,
             COALESCE(
               json_agg(
                 json_build_object(
                   'id', ab.id,
                   'url', ab.bilde_url,
                   'navn', ab.bilde_navn,
                   'størrelse', ab.bilde_størrelse
                 )
               ) FILTER (WHERE ab.id IS NOT NULL), 
               '[]'::json
             ) as bilder
      FROM avvik a
      JOIN sjåfører sj ON a.sjåfør_id = sj.id
      LEFT JOIN skift s ON a.skift_id = s.id
      LEFT JOIN biler b ON s.bil_id = b.id
      LEFT JOIN sjåfører admin_sj ON a.admin_id = admin_sj.id
      LEFT JOIN avvik_bilder ab ON a.id = ab.avvik_id
      WHERE a.sjåfør_id = $1
      GROUP BY a.id, sj.navn, s.dato, b.registreringsnummer, admin_sj.navn
    `;
    
    const params = [req.sjåfør.id];
    let paramCount = 1;

    if (dato) {
      paramCount++;
      query += ` AND DATE(a.dato) = $${paramCount}`;
      params.push(dato);
    } else if (måned && år) {
      paramCount++;
      query += ` AND EXTRACT(MONTH FROM a.dato) = $${paramCount}`;
      params.push(måned);
      paramCount++;
      query += ` AND EXTRACT(YEAR FROM a.dato) = $${paramCount}`;
      params.push(år);
    }

    query += ' ORDER BY a.dato DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    handleError(error, req, res, 'Get incidents endpoint');
  }
});

// Hent et spesifikt avvik
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(`
      SELECT a.*, 
             sj.navn as sjåfør_navn,
             s.dato as skift_dato,
             b.registreringsnummer
      FROM avvik a
      JOIN sjåfører sj ON a.sjåfør_id = sj.id
      LEFT JOIN skift s ON a.skift_id = s.id
      LEFT JOIN biler b ON s.bil_id = b.id
      WHERE a.id = $1 AND a.sjåfør_id = $2
    `, [id, req.sjåfør.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ feil: 'Avvik ikke funnet' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    handleError(error, req, res, 'Get incidents endpoint');
  }
});

// Opprett nytt avvik
router.post('/', authenticateToken, [
  body('type').isString().isLength({ min: 1, max: 100 }),
  body('beskrivelse').isString().isLength({ min: 1, max: 1000 }),
  body('skift_id').optional().isInt({ min: 1 }),
  body('bilde_url').optional().custom((value) => {
    if (value === null || value === undefined || value === '') {
      return true; // Tillat null, undefined og tom streng
    }
    return typeof value === 'string' && value.length <= 500;
  }),
  body('bilder').optional().isArray()
], async (req, res) => {
  try {
    logger.log('Avvik POST request:', req.body)
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.log('Validation errors:', errors.array())
      return res.status(400).json({ feil: 'Ugyldig input', detaljer: errors.array() });
    }

    const { type, beskrivelse, skift_id, bilde_url, bilder } = req.body;

    // Verifiser at skiftet tilhører sjåføren hvis oppgitt
    if (skift_id) {
      const skiftResult = await pool.query(
        'SELECT id FROM skift WHERE id = $1 AND sjåfør_id = $2',
        [skift_id, req.sjåfør.id]
      );
      if (skiftResult.rows.length === 0) {
        return res.status(400).json({ feil: 'Ugyldig skift' });
      }
    }

    // Start transaksjon
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Opprett avvik
      const result = await client.query(`
        INSERT INTO avvik (sjåfør_id, skift_id, type, beskrivelse, bilde_url)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `, [req.sjåfør.id, skift_id, type, beskrivelse, bilde_url]);

      const avvik = result.rows[0];

      // Legg til bilder hvis de finnes
      if (bilder && bilder.length > 0) {
        // Bulk insert av bilder (forhindrer N+1 queries)
        if (bilder && bilder.length > 0) {
          const bilderValues = bilder.map((bilde, index) => {
            const baseIndex = index * 4;
            return `($${baseIndex + 1}, $${baseIndex + 2}, $${baseIndex + 3}, $${baseIndex + 4})`;
          }).join(', ');
          
          const bilderParams = bilder.flatMap(bilde => [
            avvik.id,
            bilde.url,
            bilde.originalname,
            bilde.size
          ]);
          
          await client.query(`
            INSERT INTO avvik_bilder (avvik_id, bilde_url, bilde_navn, bilde_størrelse)
            VALUES ${bilderValues}
          `, bilderParams);
        }
      }

      await client.query('COMMIT');
      logger.log('Avvik created:', avvik)

      res.status(201).json({
        melding: 'Avvik registrert vellykket',
        avvik: avvik
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    handleError(error, req, res, 'Create incident endpoint');
  }
});

// Oppdater avvik
router.put('/:id', authenticateToken, [
  body('type').optional().isString().isLength({ min: 1, max: 100 }),
  body('beskrivelse').optional().isString().isLength({ min: 1, max: 1000 })
], async (req, res) => {
  try {
    logger.log('=== AVVIK UPDATE DEBUG ===');
    logger.log('Request params:', req.params);
    logger.log('Request body:', req.body);
    logger.log('User ID:', req.sjåfør?.id);
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.log('Validation errors:', errors.array());
      return res.status(400).json({ feil: 'Ugyldig input', detaljer: errors.array() });
    }

    const { id } = req.params;
    const updates = req.body;

    logger.log('Looking for avvik with ID:', id, 'and sjåfør_id:', req.sjåfør.id);

    // Sjekk at avviket tilhører sjåføren
    const existingAvvik = await pool.query(
      'SELECT * FROM avvik WHERE id = $1 AND sjåfør_id = $2',
      [id, req.sjåfør.id]
    );

    logger.log('Existing avvik query result:', existingAvvik.rows);

    if (existingAvvik.rows.length === 0) {
      logger.log('Avvik not found');
      return res.status(404).json({ feil: 'Avvik ikke funnet' });
    }

    logger.log('Found avvik:', existingAvvik.rows[0]);
    logger.log('Current status:', existingAvvik.rows[0].status);

    // Tillat redigering kun når status = 'ny'
    if (existingAvvik.rows[0].status !== 'ny') {
      logger.log('Avvik cannot be edited - status is not "ny"');
      return res.status(403).json({ feil: 'Avvik kan kun redigeres når status er ny' });
    }

    // Bygg dynamisk UPDATE query
    const updateFields = [];
    const values = [];
    let paramCount = 0;

    logger.log('Building update query...');
    Object.keys(updates).forEach(key => {
      if (updates[key] !== undefined) {
        paramCount++;
        updateFields.push(`${key} = $${paramCount}`);
        values.push(updates[key]);
        logger.log(`Adding field: ${key} = ${updates[key]}`);
      }
    });

    logger.log('Update fields:', updateFields);
    logger.log('Values array:', values);
    logger.log('Param count:', paramCount);

    if (updateFields.length === 0) {
      logger.log('No fields to update');
      return res.status(400).json({ feil: 'Ingen oppdateringer oppgitt' });
    }

    values.push(id, req.sjåfør.id);
    logger.log('Final values array:', values);

    const query = `
      UPDATE avvik 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramCount + 1} AND sjåfør_id = $${paramCount + 2}
      RETURNING *
    `;

    logger.log('Final SQL query:', query);
    logger.log('Query parameters:', values);

    const result = await pool.query(query, values);

    logger.log('Update result:', result.rows);

    res.json({
      melding: 'Avvik oppdatert vellykket',
      avvik: result.rows[0]
    });
  } catch (error) {
    handleError(error, req, res, 'Update incident endpoint');
  }
});

// Hent kommentarer for et avvik
router.get('/:id/kommentarer', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(`
      SELECT 
        ak.*,
        s.navn as sjåfør_navn,
        s.admin
      FROM avvik_kommentarer ak
      JOIN sjåfører s ON ak.sjåfør_id = s.id
      WHERE ak.avvik_id = $1
      ORDER BY ak.opprettet ASC
    `, [id]);
    
    res.json(result.rows);
  } catch (error) {
    handleError(error, req, res, 'Get comments endpoint');
  }
});

// Legg til kommentar til avvik
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

    // Sjekk at avviket eksisterer og at brukeren har tilgang
    const avvikCheck = await pool.query(`
      SELECT a.*, s.navn as sjåfør_navn 
      FROM avvik a 
      JOIN sjåfører s ON a.sjåfør_id = s.id 
      WHERE a.id = $1 AND (a.sjåfør_id = $2 OR $3 = true)
    `, [id, req.sjåfør.id, req.sjåfør.admin]);

    if (avvikCheck.rows.length === 0) {
      return res.status(404).json({ feil: 'Avvik ikke funnet eller ingen tilgang' });
    }

    const result = await pool.query(`
      INSERT INTO avvik_kommentarer (avvik_id, sjåfør_id, kommentar)
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
