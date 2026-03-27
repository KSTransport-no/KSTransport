const express = require('express');
const pool = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const logger = require('../utils/logger');
const { handleError } = require('../utils/errorHandler');
const { cacheMiddleware } = require('../middleware/cacheMiddleware');

const router = express.Router();

// Cache middleware for statiske data (biler, soner, SGA-koder)
// TTL: 1 time, stale-while-revalidate: 24 timer
const staticDataCache = cacheMiddleware({
  ttl: 60 * 60 * 1000, // 1 time
  staleWhileRevalidate: true,
  staleTTL: 24 * 60 * 60 * 1000, // 24 timer
  keyGenerator: (req) => `data:${req.path}:public` // Statiske data er ikke user-specific
});

// Hent alle biler
router.get('/biler', authenticateToken, staticDataCache, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, registreringsnummer, merke, modell, årsmodell, aktiv FROM biler WHERE aktiv = true ORDER BY registreringsnummer'
    );
    res.json(result.rows);
  } catch (error) {
    handleError(error, req, res, 'Data: Get cars endpoint');
  }
});

// Hent alle soner
router.get('/soner', authenticateToken, staticDataCache, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, navn, beskrivelse FROM soner WHERE aktiv = true ORDER BY navn'
    );
    res.json(result.rows);
  } catch (error) {
    handleError(error, req, res, 'Data: Get zones endpoint');
  }
});

// Hent alle SGA-koder
router.get('/sga-koder', authenticateToken, staticDataCache, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, kode, beskrivelse, skal_faktureres FROM sga_koder WHERE aktiv = true ORDER BY kode'
    );
    res.json(result.rows);
  } catch (error) {
    handleError(error, req, res, 'Data: Get SGA codes endpoint');
  }
});

// Hent kalenderdata for en sjåfør (dager med registreringer)
router.get('/kalender', authenticateToken, async (req, res) => {
  try {
    const { år, måned } = req.query;
    
    let query = `
      SELECT DISTINCT DATE(s.dato) as dato, COUNT(*) as antall_skift
      FROM skift s
      WHERE s.sjåfør_id = $1
    `;
    
    const params = [req.sjåfør.id];
    let paramCount = 1;

    if (år && måned) {
      paramCount++;
      query += ` AND EXTRACT(YEAR FROM s.dato) = $${paramCount}`;
      params.push(år);
      paramCount++;
      query += ` AND EXTRACT(MONTH FROM s.dato) = $${paramCount}`;
      params.push(måned);
    }

    query += ' GROUP BY DATE(s.dato) ORDER BY dato DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    handleError(error, req, res, 'Data: Get calendar data endpoint');
  }
});

// Tidregistrering - opprett en tidregistrering
router.post('/tidregistrering', authenticateToken, async (req, res) => {
  try {
    logger.debug('Tidregistrering mottatt', { registrering_type: req.body.registrering_type, dato: req.body.dato });
    const { bil_id, sone, sendinger, vekt, pause, kommentarer, dato, start_tid, slutt_tid, registrering_type, bomtur_venting, sga_kode_id, sga_kode_annet } = req.body;
    
    // Valider registrering_type
    const validTypes = ['arbeidstid', 'ferie', 'sykemelding', 'egenmelding', 'egenmelding_barn'];
    const type = registrering_type || 'arbeidstid';
    
    if (!validTypes.includes(type)) {
      return res.status(400).json({ feil: 'Ugyldig registreringstype' });
    }
    
    // Sjekk egenmelding kvoter hvis det er egenmelding
    if (type === 'egenmelding' || type === 'egenmelding_barn') {
      // Sjekk om sjåfør har vært ansatt i minst 2 måneder
      const sjåførResult = await pool.query(
        'SELECT opprettet FROM sjåfører WHERE id = $1',
        [req.sjåfør.id]
      );
      
      if (sjåførResult.rows.length === 0) {
        return res.status(400).json({ feil: 'Sjåfør ikke funnet' });
      }
      
      const opprettetDato = new Date(sjåførResult.rows[0].opprettet);
      const nå = new Date();
      const toMånederSiden = new Date(nå.getFullYear(), nå.getMonth() - 2, nå.getDate());
      
      if (opprettetDato > toMånederSiden) {
        return res.status(400).json({ 
          feil: 'Du må ha vært ansatt i minst 2 måneder for å kunne bruke egenmelding' 
        });
      }
      
      if (type === 'egenmelding') {
        // Egenmelding: Maks 3 dager per sykefravær, maks 4 sykefravær per år
        const år = nå.getFullYear();
        const årStart = new Date(år, 0, 1);
        
        // Hent alle egenmelding-dager for dette året
        const egenmeldingDagerResult = await pool.query(`
          SELECT DISTINCT dato
          FROM skift 
          WHERE sjåfør_id = $1 
          AND registrering_type = 'egenmelding' 
          AND dato >= $2
          ORDER BY dato
        `, [req.sjåfør.id, årStart.toISOString().split('T')[0]]);
        
        // Grupper sammenhengende dager til sykefravær
        const dager = egenmeldingDagerResult.rows.map(r => new Date(r.dato));
        const sykefravær = [];
        let currentFravær = [];
        
        for (let i = 0; i < dager.length; i++) {
          if (currentFravær.length === 0) {
            currentFravær.push(dager[i]);
          } else {
            const forrigeDag = new Date(currentFravær[currentFravær.length - 1]);
            const diffDager = Math.floor((dager[i] - forrigeDag) / (1000 * 60 * 60 * 24));
            
            if (diffDager === 1) {
              // Sammenhengende dag
              currentFravær.push(dager[i]);
            } else {
              // Nytt sykefravær
              sykefravær.push(currentFravær);
              currentFravær = [dager[i]];
            }
          }
        }
        if (currentFravær.length > 0) {
          sykefravær.push(currentFravær);
        }
        
        // Sjekk om det nye sykefraværet er gyldig
        const nyDato = new Date(dato);
        let erSammenfattetMedEksisterende = false;
        
        // Sjekk om den nye datoen er sammenhengende med et eksisterende sykefravær
        for (const fravær of sykefravær) {
          const førsteDag = new Date(fravær[0]);
          const sisteDag = new Date(fravær[fravær.length - 1]);
          const diffFørste = Math.floor((nyDato - førsteDag) / (1000 * 60 * 60 * 24));
          const diffSiste = Math.floor((nyDato - sisteDag) / (1000 * 60 * 60 * 24));
          
          if (diffFørste === -1 || diffSiste === 1) {
            // Ny dato er sammenhengende med eksisterende sykefravær
            erSammenfattetMedEksisterende = true;
            // Sjekk om det totale antallet dager i dette sykefraværet + ny dag <= 3
            if (fravær.length + 1 > 3) {
              return res.status(400).json({ 
                feil: 'Maks 3 dager per sykefravær' 
              });
            }
            break;
          }
        }
        
        // Hvis det er et nytt sykefravær, sjekk antall sykefravær
        if (!erSammenfattetMedEksisterende) {
          if (sykefravær.length >= 4) {
            return res.status(400).json({ 
              feil: 'Du har allerede brukt alle dine 4 sykefravær for dette året' 
            });
          }
          
          // Sjekk at det nye sykefraværet ikke overstiger 3 dager
          // (Dette håndteres i frontend ved å begrense til 3 dager i date range)
        }
      } else if (type === 'egenmelding_barn') {
        // Egenmelding barn: 10 dager per år (standard), 15 dager ved flere barn
        const år = nå.getFullYear();
        const årStart = new Date(år, 0, 1);
        
        const brukteDagerResult = await pool.query(`
          SELECT COUNT(*) as antall_dager
          FROM skift 
          WHERE sjåfør_id = $1 
          AND registrering_type = 'egenmelding_barn' 
          AND dato >= $2
        `, [req.sjåfør.id, årStart.toISOString().split('T')[0]]);
        
        const bruktDager = parseInt(brukteDagerResult.rows[0].antall_dager);
        const maxDager = 10; // Standard: 10 dager per forelder per år
        
        if (bruktDager >= maxDager) {
          return res.status(400).json({ 
            feil: `Du har allerede brukt alle dine ${maxDager} egenmelding barn dager for dette året` 
          });
        }
      }
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
    
    // Opprett skift med sone som fritekst
    const skiftResult = await pool.query(`
      INSERT INTO skift (
        sjåfør_id, bil_id, sone, dato, start_tid, slutt_tid, 
        pause_minutter, antall_sendinger, vekt, kommentarer, registrering_type, bomtur_venting, sga_kode_id, sga_kode_annet
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *
    `, [
      req.sjåfør.id, 
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

    const skift = skiftResult.rows[0];

    res.status(201).json({ melding: 'Tidregistrering lagret!', skift });
  } catch (error) {
    handleError(error, req, res, 'Data: Time registration endpoint');
  }
});

// Hent egenmelding kvoter for sjåfør
router.get('/egenmelding-kvoter', authenticateToken, async (req, res) => {
  try {
    // Sjekk om sjåfør har vært ansatt i minst 2 måneder
    const sjåførResult = await pool.query(
      'SELECT opprettet FROM sjåfører WHERE id = $1',
      [req.sjåfør.id]
    );
    
    if (sjåførResult.rows.length === 0) {
      return res.status(400).json({ feil: 'Sjåfør ikke funnet' });
    }
    
    const opprettetDato = new Date(sjåførResult.rows[0].opprettet);
    const nå = new Date();
    const toMånederSiden = new Date(nå.getFullYear(), nå.getMonth() - 2, nå.getDate());
    const harAnsiennitet = opprettetDato <= toMånederSiden;
    
    if (!harAnsiennitet) {
      return res.json({
        har_ansiennitet: false,
        kan_bruke_egenmelding: false,
        melding: 'Du må ha vært ansatt i minst 2 måneder for å kunne bruke egenmelding'
      });
    }
    
    const år = nå.getFullYear();
    const årStart = new Date(år, 0, 1);
    
    // Egenmelding: Tell sykefravær (sammenhengende dager)
    const egenmeldingDagerResult = await pool.query(`
      SELECT DISTINCT dato
      FROM skift 
      WHERE sjåfør_id = $1 
      AND registrering_type = 'egenmelding' 
      AND dato >= $2
      ORDER BY dato
    `, [req.sjåfør.id, årStart.toISOString().split('T')[0]]);
    
    // Grupper sammenhengende dager til sykefravær
    const dager = egenmeldingDagerResult.rows.map(r => new Date(r.dato));
    const sykefravær = [];
    let currentFravær = [];
    
    for (let i = 0; i < dager.length; i++) {
      if (currentFravær.length === 0) {
        currentFravær.push(dager[i]);
      } else {
        const forrigeDag = new Date(currentFravær[currentFravær.length - 1]);
        const diffDager = Math.floor((dager[i] - forrigeDag) / (1000 * 60 * 60 * 24));
        
        if (diffDager === 1) {
          currentFravær.push(dager[i]);
        } else {
          sykefravær.push(currentFravær);
          currentFravær = [dager[i]];
        }
      }
    }
    if (currentFravær.length > 0) {
      sykefravær.push(currentFravær);
    }
    
    const antallSykefravær = sykefravær.length;
    const maksSykefravær = 4;
    
    // Egenmelding barn: Tell dager
    const egenmeldingBarnResult = await pool.query(`
      SELECT COUNT(*) as antall_dager
      FROM skift 
      WHERE sjåfør_id = $1 
      AND registrering_type = 'egenmelding_barn' 
      AND dato >= $2
    `, [req.sjåfør.id, årStart.toISOString().split('T')[0]]);
    
    const bruktEgenmeldingBarn = parseInt(egenmeldingBarnResult.rows[0].antall_dager);
    const maksEgenmeldingBarn = 10; // Standard: 10 dager per forelder per år
    
    res.json({
      har_ansiennitet: true,
      kan_bruke_egenmelding: true,
      egenmelding: {
        antall_sykefravær: antallSykefravær,
        maks_sykefravær: maksSykefravær,
        dager_per_fravær: 3,
        periode: 'per år'
      },
      egenmelding_barn: {
        brukt_dager: bruktEgenmeldingBarn,
        maks_dager: maksEgenmeldingBarn,
        periode: 'per år'
      }
    });
  } catch (error) {
    handleError(error, req, res, 'Data: Get self-reporting quotas endpoint');
  }
});

// Opprett oppdrag (for sjåfører)
router.post('/oppdrag', authenticateToken, async (req, res) => {
  try {
    const { fra, til, vekt, volum, kommentar } = req.body;
    
    if (!fra || !til) {
      return res.status(400).json({ feil: 'Fra og Til er påkrevde felt' });
    }

    const result = await pool.query(
      'INSERT INTO oppdrag (fra, til, vekt, volum, kommentar, aktiv) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [fra, til, vekt || 0, volum || 0, kommentar || null, true]
    );

    res.status(201).json({ melding: 'Oppdrag opprettet!', oppdrag: result.rows[0] });
  } catch (error) {
    handleError(error, req, res, 'Data: Create assignment endpoint');
  }
});

// Oppdater eksisterende skift
router.put('/tidregistrering/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { bil_id, sone, sendinger, vekt, pause, kommentarer, dato, start_tid, slutt_tid, registrering_type, bomtur_venting, sga_kode_id, sga_kode_annet } = req.body;
    
    // Valider registrering_type
    const validTypes = ['arbeidstid', 'ferie', 'sykemelding', 'egenmelding', 'egenmelding_barn'];
    const type = registrering_type || 'arbeidstid';
    
    if (!validTypes.includes(type)) {
      return res.status(400).json({ feil: 'Ugyldig registreringstype' });
    }
    
    // Sjekk at skiftet tilhører sjåføren
    const skiftCheck = await pool.query(
      'SELECT * FROM skift WHERE id = $1 AND sjåfør_id = $2',
      [id, req.sjåfør.id]
    );
    
    if (skiftCheck.rows.length === 0) {
      return res.status(404).json({ feil: 'Skift ikke funnet eller ingen tilgang' });
    }
    
    // Ekstraher dato fra start_tid hvis dato ikke er satt
    let skiftDato = dato;
    if (!skiftDato && start_tid) {
      const startDate = new Date(start_tid);
      skiftDato = startDate.toISOString().split('T')[0]; // YYYY-MM-DD format
    }
    
    // Hvis dato fortsatt ikke er satt, bruk eksisterende dato fra databasen
    if (!skiftDato) {
      skiftDato = skiftCheck.rows[0].dato;
    }
    
    // Oppdater skiftet
    const result = await pool.query(`
      UPDATE skift SET
        bil_id = $1,
        sone = $2,
        dato = $3,
        start_tid = $4,
        slutt_tid = $5,
        pause_minutter = $6,
        antall_sendinger = $7,
        vekt = $8,
        kommentarer = $9,
        registrering_type = $10,
        bomtur_venting = $11,
        sga_kode_id = $12,
        sga_kode_annet = $13,
        sist_endret = CURRENT_TIMESTAMP
      WHERE id = $14 AND sjåfør_id = $15
      RETURNING *
    `, [
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
      sga_kode_annet || null,
      id,
      req.sjåfør.id
    ]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ feil: 'Skift ikke funnet' });
    }
    
    res.json({ melding: 'Skift oppdatert!', skift: result.rows[0] });
  } catch (error) {
    handleError(error, req, res, 'Data: Update shift endpoint');
  }
});

module.exports = router;
