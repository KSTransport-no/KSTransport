/*
  Baseline migration — marks the existing database schema as "migrated".
  
  All tables created by database/init.sql and database/startup-migrations.sql
  are considered the baseline. This migration is a no-op on existing databases
  (tables already exist) and lets new databases bootstrap from scratch.
  
  After this, all schema changes go through node-pg-migrate.
  
  Usage:
    cd backend
    DATABASE_URL=postgresql://... npm run migrate:up
*/

exports.up = (pgm) => {
  // Core tables — all use IF NOT EXISTS so this is safe to run on existing databases
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS sjåfører (
      id SERIAL PRIMARY KEY,
      navn VARCHAR(100) NOT NULL,
      epost VARCHAR(100) UNIQUE NOT NULL,
      passord_hash VARCHAR(255) NOT NULL,
      telefon VARCHAR(20),
      aktiv BOOLEAN DEFAULT true,
      admin BOOLEAN DEFAULT false,
      ansiennitet_dato DATE,
      opprettet TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      sist_endret TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS biler (
      id SERIAL PRIMARY KEY,
      registreringsnummer VARCHAR(20) UNIQUE NOT NULL,
      merke VARCHAR(50),
      modell VARCHAR(50),
      årsmodell INTEGER,
      aktiv BOOLEAN DEFAULT true,
      opprettet TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS soner (
      id SERIAL PRIMARY KEY,
      navn VARCHAR(100) NOT NULL,
      beskrivelse TEXT,
      aktiv BOOLEAN DEFAULT true,
      opprettet TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS sga_koder (
      id SERIAL PRIMARY KEY,
      kode VARCHAR(50) UNIQUE NOT NULL,
      beskrivelse TEXT,
      aktiv BOOLEAN DEFAULT true,
      skal_faktureres BOOLEAN DEFAULT true,
      opprettet TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS skift (
      id SERIAL PRIMARY KEY,
      sjåfør_id INTEGER REFERENCES sjåfører(id) ON DELETE CASCADE,
      bil_id INTEGER REFERENCES biler(id) ON DELETE CASCADE,
      sone_id INTEGER REFERENCES soner(id) ON DELETE CASCADE,
      sone VARCHAR(255),
      dato DATE NOT NULL,
      start_tid TIMESTAMP NOT NULL,
      slutt_tid TIMESTAMP,
      pause_minutter INTEGER DEFAULT 0,
      antall_sendinger INTEGER DEFAULT 0,
      vekt INTEGER DEFAULT 0,
      kommentarer TEXT,
      registrering_type VARCHAR(50) DEFAULT 'arbeidstid',
      bomtur_venting TEXT,
      sga_kode_id INTEGER,
      sga_kode_annet TEXT,
      opprettet TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      sist_endret TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      godkjent BOOLEAN DEFAULT false,
      godkjent_av INTEGER REFERENCES sjåfører(id) ON DELETE SET NULL,
      godkjent_dato TIMESTAMP,
      fakturert BOOLEAN DEFAULT false,
      fakturert_dato TIMESTAMP,
      fakturert_av INTEGER REFERENCES sjåfører(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS avvik (
      id SERIAL PRIMARY KEY,
      sjåfør_id INTEGER REFERENCES sjåfører(id) ON DELETE CASCADE,
      skift_id INTEGER REFERENCES skift(id) ON DELETE CASCADE,
      type VARCHAR(100) NOT NULL,
      beskrivelse TEXT NOT NULL,
      status VARCHAR(50) DEFAULT 'ny',
      admin_kommentar TEXT,
      admin_id INTEGER REFERENCES sjåfører(id) ON DELETE SET NULL,
      bilde_url VARCHAR(500),
      dato TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      opprettet TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS avvik_bilder (
      id SERIAL PRIMARY KEY,
      avvik_id INTEGER REFERENCES avvik(id) ON DELETE CASCADE,
      bilde_url VARCHAR(500) NOT NULL,
      opprettet TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS avvik_kommentarer (
      id SERIAL PRIMARY KEY,
      avvik_id INTEGER REFERENCES avvik(id) ON DELETE CASCADE,
      sjåfør_id INTEGER REFERENCES sjåfører(id) ON DELETE CASCADE,
      kommentar TEXT NOT NULL,
      opprettet TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS forbedringsforslag (
      id SERIAL PRIMARY KEY,
      sjåfør_id INTEGER REFERENCES sjåfører(id) ON DELETE CASCADE,
      tittel VARCHAR(200) NOT NULL,
      beskrivelse TEXT NOT NULL,
      status VARCHAR(50) DEFAULT 'ny',
      admin_kommentar TEXT,
      admin_id INTEGER REFERENCES sjåfører(id) ON DELETE SET NULL,
      opprettet TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      sist_endret TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS forbedringsforslag_kommentarer (
      id SERIAL PRIMARY KEY,
      forslag_id INTEGER REFERENCES forbedringsforslag(id) ON DELETE CASCADE,
      sjåfør_id INTEGER REFERENCES sjåfører(id) ON DELETE CASCADE,
      kommentar TEXT NOT NULL,
      opprettet TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS varslinger (
      id SERIAL PRIMARY KEY,
      sjåfør_id INTEGER REFERENCES sjåfører(id) ON DELETE CASCADE,
      type VARCHAR(50) NOT NULL,
      melding TEXT NOT NULL,
      relatert_id INTEGER,
      relatert_type VARCHAR(50),
      lest BOOLEAN DEFAULT false,
      opprettet TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS egenmelding_kvoter (
      id SERIAL PRIMARY KEY,
      sjåfør_id INTEGER REFERENCES sjåfører(id) ON DELETE CASCADE,
      år INTEGER NOT NULL,
      maks_dager INTEGER DEFAULT 10,
      brukte_dager INTEGER DEFAULT 0,
      opprettet TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(sjåfør_id, år)
    );

    CREATE TABLE IF NOT EXISTS oppdrag (
      id SERIAL PRIMARY KEY,
      sjåfør_id INTEGER REFERENCES sjåfører(id) ON DELETE CASCADE,
      skift_id INTEGER REFERENCES skift(id) ON DELETE SET NULL,
      beskrivelse TEXT,
      status VARCHAR(50) DEFAULT 'aktiv',
      opprettet TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      sist_endret TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS info_kort (
      id SERIAL PRIMARY KEY,
      kategori VARCHAR(50) NOT NULL CHECK (kategori IN ('telefon', 'kode')),
      navn VARCHAR(100) NOT NULL,
      verdi VARCHAR(200) NOT NULL,
      beskrivelse TEXT,
      aktiv BOOLEAN DEFAULT true,
      opprettet TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      sist_endret TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Performance indexes
  pgm.sql(`
    CREATE INDEX IF NOT EXISTS idx_skift_sjafor_dato ON skift(sjåfør_id, dato);
    CREATE INDEX IF NOT EXISTS idx_skift_dato ON skift(dato);
    CREATE INDEX IF NOT EXISTS idx_avvik_sjafor ON avvik(sjåfør_id);
    CREATE INDEX IF NOT EXISTS idx_forbedringsforslag_sjafor ON forbedringsforslag(sjåfør_id);
    CREATE INDEX IF NOT EXISTS idx_varslinger_sjafor_lest ON varslinger(sjåfør_id, lest);
    CREATE INDEX IF NOT EXISTS idx_skift_godkjent ON skift(godkjent);
    CREATE INDEX IF NOT EXISTS idx_skift_fakturert ON skift(fakturert);
  `);
};

exports.down = (pgm) => {
  // Dropping the entire schema is destructive — only use in dev
  pgm.sql(`
    DROP TABLE IF EXISTS info_kort CASCADE;
    DROP TABLE IF EXISTS oppdrag CASCADE;
    DROP TABLE IF EXISTS egenmelding_kvoter CASCADE;
    DROP TABLE IF EXISTS varslinger CASCADE;
    DROP TABLE IF EXISTS forbedringsforslag_kommentarer CASCADE;
    DROP TABLE IF EXISTS forbedringsforslag CASCADE;
    DROP TABLE IF EXISTS avvik_kommentarer CASCADE;
    DROP TABLE IF EXISTS avvik_bilder CASCADE;
    DROP TABLE IF EXISTS avvik CASCADE;
    DROP TABLE IF EXISTS skift CASCADE;
    DROP TABLE IF EXISTS sga_koder CASCADE;
    DROP TABLE IF EXISTS soner CASCADE;
    DROP TABLE IF EXISTS biler CASCADE;
    DROP TABLE IF EXISTS sjåfører CASCADE;
  `);
};
