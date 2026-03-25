const express = require('express');
const { body, validationResult } = require('express-validator');
const pool = require('../config/database');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const logger = require('../utils/logger');
const { handleError } = require('../utils/errorHandler');
const cache = require('../utils/cache');

const router = express.Router();

// English alias for drivers (to avoid URL encoding issues)
router.get('/drivers', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM sjåfører ORDER BY navn');
    res.json(result.rows);
  } catch (error) {
    handleError(error, req, res, 'CRUD: Get drivers endpoint');
  }
});

router.post('/drivers', authenticateToken, requireAdmin, [
  body('navn').notEmpty().isLength({ min: 2, max: 100 }),
  body('epost').isEmail(),
  body('passord').isLength({ min: 6 }),
  body('telefon').optional().isLength({ max: 20 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ feil: 'Ugyldig input', detaljer: errors.array() });
    }

    const { navn, epost, passord, telefon, aktiv = true, admin = false } = req.body;
    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash(passord, 10);

    const result = await pool.query(
      'INSERT INTO sjåfører (navn, epost, passord_hash, telefon, aktiv, admin) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [navn, epost, hashedPassword, telefon, aktiv, admin]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    handleError(error, req, res, 'CRUD: Create driver endpoint');
  }
});

router.put('/drivers/:id', authenticateToken, requireAdmin, [
  body('navn').optional().isLength({ min: 2, max: 100 }),
  body('epost').optional().isEmail(),
  body('passord').optional().custom((value) => {
    if (value && value.length < 6) {
      throw new Error('Passord må være minst 6 tegn');
    }
    return true;
  }),
  body('telefon').optional().isLength({ max: 20 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ feil: 'Ugyldig input', detaljer: errors.array() });
    }

    const { id } = req.params;
    const { navn, epost, passord, telefon, aktiv, admin } = req.body;
    
    let updateFields = [];
    let values = [];
    let paramIndex = 1;

    if (navn !== undefined) {
      updateFields.push(`navn = $${paramIndex++}`);
      values.push(navn);
    }
    if (epost !== undefined) {
      updateFields.push(`epost = $${paramIndex++}`);
      values.push(epost);
    }
    if (passord !== undefined && passord.trim() !== '') {
      const bcrypt = require('bcryptjs');
      const hashedPassword = await bcrypt.hash(passord, 10);
      updateFields.push(`passord_hash = $${paramIndex++}`);
      values.push(hashedPassword);
    }
    if (telefon !== undefined) {
      updateFields.push(`telefon = $${paramIndex++}`);
      values.push(telefon);
    }
    if (aktiv !== undefined) {
      updateFields.push(`aktiv = $${paramIndex++}`);
      values.push(aktiv);
    }
    if (admin !== undefined) {
      updateFields.push(`admin = $${paramIndex++}`);
      values.push(admin);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ feil: 'Ingen felter å oppdatere' });
    }

    values.push(id);
    const result = await pool.query(
      `UPDATE sjåfører SET ${updateFields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ feil: 'Sjåfør ikke funnet' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    handleError(error, req, res, 'CRUD: Update driver endpoint');
  }
});

router.delete('/drivers/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM sjåfører WHERE id = $1 RETURNING id', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ feil: 'Sjåfør ikke funnet' });
    }

    res.json({ melding: 'Sjåfør slettet' });
  } catch (error) {
    handleError(error, req, res, 'CRUD: Delete driver endpoint');
  }
});

// CRUD for Sjåfører (Norwegian routes)
router.get('/sjåfører', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM sjåfører ORDER BY navn');
    res.json(result.rows);
  } catch (error) {
    handleError(error, req, res, 'CRUD: Get drivers endpoint');
  }
});

router.post('/sjåfører', authenticateToken, requireAdmin, [
  body('navn').notEmpty().isLength({ min: 2, max: 100 }),
  body('epost').isEmail(),
  body('passord').isLength({ min: 6 }),
  body('telefon').optional().isLength({ max: 20 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ feil: 'Ugyldig input', detaljer: errors.array() });
    }

    const { navn, epost, passord, telefon } = req.body;
    const bcrypt = require('bcryptjs');
    const passord_hash = await bcrypt.hash(passord, 10);

    const result = await pool.query(
      'INSERT INTO sjåfører (navn, epost, passord_hash, telefon) VALUES ($1, $2, $3, $4) RETURNING id, navn, epost, telefon, aktiv',
      [navn, epost, passord_hash, telefon]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    handleError(error, req, res, 'CRUD: Create driver endpoint');
  }
});

router.put('/sjåfører/:id', authenticateToken, requireAdmin, [
  body('navn').optional().isLength({ min: 2, max: 100 }),
  body('epost').optional().isEmail(),
  body('telefon').optional().isLength({ max: 20 }),
  body('aktiv').optional().isBoolean()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ feil: 'Ugyldig input', detaljer: errors.array() });
    }

    const { id } = req.params;
    const { navn, epost, telefon, aktiv } = req.body;
    
    const updates = [];
    const values = [];
    let paramCount = 1;

    if (navn !== undefined) {
      updates.push(`navn = $${paramCount++}`);
      values.push(navn);
    }
    if (epost !== undefined) {
      updates.push(`epost = $${paramCount++}`);
      values.push(epost);
    }
    if (telefon !== undefined) {
      updates.push(`telefon = $${paramCount++}`);
      values.push(telefon);
    }
    if (aktiv !== undefined) {
      updates.push(`aktiv = $${paramCount++}`);
      values.push(aktiv);
    }

    if (updates.length === 0) {
      return res.status(400).json({ feil: 'Ingen endringer spesifisert' });
    }

    updates.push(`sist_endret = CURRENT_TIMESTAMP`);
    values.push(id);

    const result = await pool.query(
      `UPDATE sjåfører SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING id, navn, epost, telefon, aktiv`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ feil: 'Sjåfør ikke funnet' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    handleError(error, req, res, 'CRUD: Update driver endpoint');
  }
});

router.delete('/sjåfører/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM sjåfører WHERE id = $1 RETURNING id', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ feil: 'Sjåfør ikke funnet' });
    }

    res.json({ melding: 'Sjåfør slettet' });
  } catch (error) {
    handleError(error, req, res, 'CRUD: Delete driver endpoint');
  }
});

// CRUD for Biler
router.get('/biler', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM biler ORDER BY registreringsnummer');
    res.json(result.rows);
  } catch (error) {
    handleError(error, req, res, 'CRUD: Get cars endpoint');
  }
});

router.post('/biler', authenticateToken, requireAdmin, [
  body('registreringsnummer').notEmpty().isLength({ min: 2, max: 20 }),
  body('merke').optional().isLength({ max: 50 }),
  body('modell').optional().isLength({ max: 50 }),
  body('årsmodell').optional().isInt({ min: 1900, max: 2030 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ feil: 'Ugyldig input', detaljer: errors.array() });
    }

    const { registreringsnummer, merke, modell, årsmodell } = req.body;

    const result = await pool.query(
      'INSERT INTO biler (registreringsnummer, merke, modell, årsmodell) VALUES ($1, $2, $3, $4) RETURNING *',
      [registreringsnummer, merke, modell, årsmodell]
    );

    // Invalider cache for biler
    cache.delete('data:/api/data/biler:public');
    logger.log('Cache invalidated for biler after POST');

    res.status(201).json(result.rows[0]);
  } catch (error) {
    handleError(error, req, res, 'CRUD: Create car endpoint');
  }
});

router.put('/biler/:id', authenticateToken, requireAdmin, [
  body('registreringsnummer').optional().isLength({ min: 2, max: 20 }),
  body('merke').optional().isLength({ max: 50 }),
  body('modell').optional().isLength({ max: 50 }),
  body('årsmodell').optional().isInt({ min: 1900, max: 2030 }),
  body('aktiv').optional().isBoolean()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ feil: 'Ugyldig input', detaljer: errors.array() });
    }

    const { id } = req.params;
    const { registreringsnummer, merke, modell, årsmodell, aktiv } = req.body;
    
    const updates = [];
    const values = [];
    let paramCount = 1;

    if (registreringsnummer !== undefined) {
      updates.push(`registreringsnummer = $${paramCount++}`);
      values.push(registreringsnummer);
    }
    if (merke !== undefined) {
      updates.push(`merke = $${paramCount++}`);
      values.push(merke);
    }
    if (modell !== undefined) {
      updates.push(`modell = $${paramCount++}`);
      values.push(modell);
    }
    if (årsmodell !== undefined) {
      updates.push(`årsmodell = $${paramCount++}`);
      values.push(årsmodell);
    }
    if (aktiv !== undefined) {
      updates.push(`aktiv = $${paramCount++}`);
      values.push(aktiv);
    }

    if (updates.length === 0) {
      return res.status(400).json({ feil: 'Ingen endringer spesifisert' });
    }

    values.push(id);

    const result = await pool.query(
      `UPDATE biler SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ feil: 'Bil ikke funnet' });
    }

    // Invalider cache for biler
    cache.delete('data:/api/data/biler:public');
    logger.log('Cache invalidated for biler after PUT');

    res.json(result.rows[0]);
  } catch (error) {
    handleError(error, req, res, 'CRUD: Update car endpoint');
  }
});

router.delete('/biler/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM biler WHERE id = $1 RETURNING id', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ feil: 'Bil ikke funnet' });
    }

    // Invalider cache for biler
    cache.delete('data:/api/data/biler:public');
    logger.log('Cache invalidated for biler after DELETE');

    res.json({ melding: 'Bil slettet' });
  } catch (error) {
    handleError(error, req, res, 'CRUD: Delete car endpoint');
  }
});

// CRUD for Soner
router.get('/soner', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM soner ORDER BY navn');
    res.json(result.rows);
  } catch (error) {
    handleError(error, req, res, 'CRUD: Get zones endpoint');
  }
});

router.post('/soner', authenticateToken, requireAdmin, [
  body('navn').notEmpty().isLength({ min: 2, max: 100 }),
  body('beskrivelse').optional().isLength({ max: 500 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ feil: 'Ugyldig input', detaljer: errors.array() });
    }

    const { navn, beskrivelse } = req.body;

    const result = await pool.query(
      'INSERT INTO soner (navn, beskrivelse) VALUES ($1, $2) RETURNING *',
      [navn, beskrivelse]
    );

    // Invalider cache for soner
    cache.delete('data:/api/data/soner:public');
    logger.log('Cache invalidated for soner after POST');

    res.status(201).json(result.rows[0]);
  } catch (error) {
    handleError(error, req, res, 'CRUD: Create zone endpoint');
  }
});

router.put('/soner/:id', authenticateToken, requireAdmin, [
  body('navn').optional().isLength({ min: 2, max: 100 }),
  body('beskrivelse').optional().isLength({ max: 500 }),
  body('aktiv').optional().isBoolean()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ feil: 'Ugyldig input', detaljer: errors.array() });
    }

    const { id } = req.params;
    const { navn, beskrivelse, aktiv } = req.body;
    
    const updates = [];
    const values = [];
    let paramCount = 1;

    if (navn !== undefined) {
      updates.push(`navn = $${paramCount++}`);
      values.push(navn);
    }
    if (beskrivelse !== undefined) {
      updates.push(`beskrivelse = $${paramCount++}`);
      values.push(beskrivelse);
    }
    if (aktiv !== undefined) {
      updates.push(`aktiv = $${paramCount++}`);
      values.push(aktiv);
    }

    if (updates.length === 0) {
      return res.status(400).json({ feil: 'Ingen endringer spesifisert' });
    }

    values.push(id);

    const result = await pool.query(
      `UPDATE soner SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ feil: 'Sone ikke funnet' });
    }

    // Invalider cache for soner
    cache.delete('data:/api/data/soner:public');
    logger.log('Cache invalidated for soner after PUT');

    res.json(result.rows[0]);
  } catch (error) {
    handleError(error, req, res, 'CRUD: Update zone endpoint');
  }
});

router.delete('/soner/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM soner WHERE id = $1 RETURNING id', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ feil: 'Sone ikke funnet' });
    }

    // Invalider cache for soner
    cache.delete('data:/api/data/soner:public');
    logger.log('Cache invalidated for soner after DELETE');

    res.json({ melding: 'Sone slettet' });
  } catch (error) {
    handleError(error, req, res, 'CRUD: Delete zone endpoint');
  }
});

// CRUD for Avvik
router.put('/avvik/:id', authenticateToken, requireAdmin, [
  body('status').optional().isIn(['ny', 'under_behandling', 'løst', 'avvist']),
  body('admin_kommentar').optional().isLength({ max: 1000 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ feil: 'Ugyldig input', detaljer: errors.array() });
    }

    const { id } = req.params;
    const { status, admin_kommentar } = req.body;
    
    const updates = [];
    const values = [];
    let paramCount = 1;

    if (status !== undefined) {
      updates.push(`status = $${paramCount++}`);
      values.push(status);
    }
    if (admin_kommentar !== undefined) {
      updates.push(`admin_kommentar = $${paramCount++}`);
      updates.push(`admin_id = $${paramCount++}`);
      values.push(admin_kommentar);
      values.push(req.sjåfør.id); // Set admin_id to the current admin user
    }

    if (updates.length === 0) {
      return res.status(400).json({ feil: 'Ingen endringer spesifisert' });
    }

    values.push(id);

    const result = await pool.query(
      `UPDATE avvik SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ feil: 'Avvik ikke funnet' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    handleError(error, req, res, 'CRUD: Update incident endpoint');
  }
});

// CRUD for Forbedringsforslag
router.put('/forbedringsforslag/:id', authenticateToken, requireAdmin, [
  body('status').optional().isIn(['ny', 'under behandling', 'besvart']),
  body('admin_kommentar').optional().isLength({ max: 1000 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ feil: 'Ugyldig input', detaljer: errors.array() });
    }

    const { id } = req.params;
    const { status, admin_kommentar } = req.body;
    
    const updates = [];
    const values = [];
    let paramCount = 1;

    if (status !== undefined) {
      updates.push(`status = $${paramCount++}`);
      values.push(status);
    }
    if (admin_kommentar !== undefined) {
      updates.push(`admin_kommentar = $${paramCount++}`);
      updates.push(`admin_id = $${paramCount++}`);
      values.push(admin_kommentar);
      values.push(req.sjåfør.id); // Set admin_id to the current admin user
    }

    if (updates.length === 0) {
      return res.status(400).json({ feil: 'Ingen endringer spesifisert' });
    }

    if (status !== 'ny') {
      updates.push(`behandlet = CURRENT_TIMESTAMP`);
      updates.push(`behandlet_av = $${paramCount++}`);
      values.push(req.sjåfør.id);
    }
    values.push(id);

    const result = await pool.query(
      `UPDATE forbedringsforslag SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ feil: 'Forbedringsforslag ikke funnet' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    handleError(error, req, res, 'CRUD: Update improvement suggestion endpoint');
  }
});

// CRUD for Oppdrag
router.get('/oppdrag', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM oppdrag ORDER BY opprettet DESC');
    res.json(result.rows);
  } catch (error) {
    handleError(error, req, res, 'CRUD: Get assignments endpoint');
  }
});

router.post('/oppdrag', authenticateToken, requireAdmin, [
  body('fra').notEmpty().isLength({ min: 1, max: 255 }),
  body('til').notEmpty().isLength({ min: 1, max: 255 }),
  body('vekt').optional().isInt({ min: 0 }),
  body('volum').optional().isFloat({ min: 0 }),
  body('kommentar').optional().isLength({ max: 1000 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ feil: 'Ugyldig input', detaljer: errors.array() });
    }

    const { fra, til, vekt = 0, volum = 0, kommentar, aktiv = true } = req.body;

    const result = await pool.query(
      'INSERT INTO oppdrag (fra, til, vekt, volum, kommentar, aktiv) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [fra, til, vekt, volum, kommentar || null, aktiv]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    handleError(error, req, res, 'CRUD: Create assignment endpoint');
  }
});

router.put('/oppdrag/:id', authenticateToken, requireAdmin, [
  body('fra').optional().isLength({ min: 1, max: 255 }),
  body('til').optional().isLength({ min: 1, max: 255 }),
  body('vekt').optional().isInt({ min: 0 }),
  body('volum').optional().isFloat({ min: 0 }),
  body('kommentar').optional().isLength({ max: 1000 }),
  body('aktiv').optional().isBoolean()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ feil: 'Ugyldig input', detaljer: errors.array() });
    }

    const { id } = req.params;
    const { fra, til, vekt, volum, kommentar, aktiv } = req.body;
    
    const updates = [];
    const values = [];
    let paramCount = 1;

    if (fra !== undefined) {
      updates.push(`fra = $${paramCount++}`);
      values.push(fra);
    }
    if (til !== undefined) {
      updates.push(`til = $${paramCount++}`);
      values.push(til);
    }
    if (vekt !== undefined) {
      updates.push(`vekt = $${paramCount++}`);
      values.push(vekt);
    }
    if (volum !== undefined) {
      updates.push(`volum = $${paramCount++}`);
      values.push(volum);
    }
    if (kommentar !== undefined) {
      updates.push(`kommentar = $${paramCount++}`);
      values.push(kommentar || null);
    }
    if (aktiv !== undefined) {
      updates.push(`aktiv = $${paramCount++}`);
      values.push(aktiv);
    }

    if (updates.length === 0) {
      return res.status(400).json({ feil: 'Ingen endringer spesifisert' });
    }

    updates.push(`sist_endret = CURRENT_TIMESTAMP`);
    values.push(id);

    const result = await pool.query(
      `UPDATE oppdrag SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ feil: 'Oppdrag ikke funnet' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    handleError(error, req, res, 'CRUD: Update assignment endpoint');
  }
});

router.delete('/oppdrag/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM oppdrag WHERE id = $1 RETURNING id', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ feil: 'Oppdrag ikke funnet' });
    }

    res.json({ melding: 'Oppdrag slettet' });
  } catch (error) {
    handleError(error, req, res, 'CRUD: Delete assignment endpoint');
  }
});

// CRUD for SGA-koder
router.get('/sga-koder', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM sga_koder ORDER BY kode');
    res.json(result.rows);
  } catch (error) {
    handleError(error, req, res, 'CRUD: Get SGA codes endpoint');
  }
});

router.post('/sga-koder', authenticateToken, requireAdmin, [
  body('kode').notEmpty().isLength({ min: 1, max: 50 }),
  body('beskrivelse').optional().isLength({ max: 255 }),
  body('skal_faktureres').optional().isBoolean(),
  body('aktiv').optional().isBoolean()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ feil: 'Ugyldig input', detaljer: errors.array() });
    }

    const { kode, beskrivelse, skal_faktureres = false, aktiv = true } = req.body;

    const result = await pool.query(
      'INSERT INTO sga_koder (kode, beskrivelse, skal_faktureres, aktiv) VALUES ($1, $2, $3, $4) RETURNING *',
      [kode, beskrivelse || null, skal_faktureres, aktiv]
    );

    // Invalider cache for SGA-koder
    cache.delete('data:/api/data/sga-koder:public');
    logger.log('Cache invalidated for SGA-koder after POST');

    res.status(201).json(result.rows[0]);
  } catch (error) {
    if (error.code === '23505') { // Unique violation
      return res.status(400).json({ feil: 'SGA-kode eksisterer allerede' });
    }
    handleError(error, req, res, 'CRUD: Create SGA code endpoint');
  }
});

router.put('/sga-koder/:id', authenticateToken, requireAdmin, [
  body('kode').optional().isLength({ min: 1, max: 50 }),
  body('beskrivelse').optional().isLength({ max: 255 }),
  body('skal_faktureres').optional().isBoolean(),
  body('aktiv').optional().isBoolean()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ feil: 'Ugyldig input', detaljer: errors.array() });
    }

    const { id } = req.params;
    const { kode, beskrivelse, skal_faktureres, aktiv } = req.body;

    const updates = [];
    const values = [];
    let paramCount = 1;

    if (kode !== undefined) {
      updates.push(`kode = $${paramCount++}`);
      values.push(kode);
    }
    if (beskrivelse !== undefined) {
      updates.push(`beskrivelse = $${paramCount++}`);
      values.push(beskrivelse || null);
    }
    if (skal_faktureres !== undefined) {
      updates.push(`skal_faktureres = $${paramCount++}`);
      values.push(skal_faktureres);
    }
    if (aktiv !== undefined) {
      updates.push(`aktiv = $${paramCount++}`);
      values.push(aktiv);
    }

    if (updates.length === 0) {
      return res.status(400).json({ feil: 'Ingen endringer spesifisert' });
    }

    updates.push(`sist_endret = CURRENT_TIMESTAMP`);
    values.push(id);

    const result = await pool.query(
      `UPDATE sga_koder SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ feil: 'SGA-kode ikke funnet' });
    }

    // Invalider cache for SGA-koder
    cache.delete('data:/api/data/sga-koder:public');
    logger.log('Cache invalidated for SGA-koder after PUT');

    res.json(result.rows[0]);
  } catch (error) {
    if (error.code === '23505') { // Unique violation
      return res.status(400).json({ feil: 'SGA-kode eksisterer allerede' });
    }
    handleError(error, req, res, 'CRUD: Update SGA code endpoint');
  }
});

router.delete('/sga-koder/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Sjekk om SGA-koden er i bruk
    const inUse = await pool.query('SELECT COUNT(*) FROM skift WHERE sga_kode_id = $1', [id]);
    if (parseInt(inUse.rows[0].count) > 0) {
      // I stedet for å slette, sett aktiv = false
      const result = await pool.query(
        'UPDATE sga_koder SET aktiv = false, sist_endret = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *',
        [id]
      );
      
      if (result.rows.length === 0) {
        return res.status(404).json({ feil: 'SGA-kode ikke funnet' });
      }
      
      // Invalider cache for SGA-koder
      cache.delete('data:/api/data/sga-koder:public');
      logger.log('Cache invalidated for SGA-koder after DELETE (deactivated)');
      
      return res.json({ melding: 'SGA-kode deaktivert (i bruk i eksisterende skift)', sga_kode: result.rows[0] });
    }
    
    const result = await pool.query('DELETE FROM sga_koder WHERE id = $1 RETURNING id', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ feil: 'SGA-kode ikke funnet' });
    }

    // Invalider cache for SGA-koder
    cache.delete('data:/api/data/sga-koder:public');
    logger.log('Cache invalidated for SGA-koder after DELETE');

    res.json({ melding: 'SGA-kode slettet' });
  } catch (error) {
    handleError(error, req, res, 'CRUD: Delete SGA code endpoint');
  }
});

module.exports = router;
