-- Script for å sjekke og fikse database
-- Kjør dette for å sjekke om tabellene eksisterer

-- Sjekk om skift-tabellen eksisterer
SELECT EXISTS (
   SELECT FROM information_schema.tables 
   WHERE table_schema = 'public' 
   AND table_name = 'skift'
) AS skift_exists;

-- Hvis tabellen ikke eksisterer, opprett den
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
    sga_kode_id INTEGER REFERENCES sga_koder(id) ON DELETE SET NULL,
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

-- Opprett indekser hvis de ikke eksisterer
CREATE INDEX IF NOT EXISTS idx_skift_sjåfør_dato ON skift(sjåfør_id, dato);
CREATE INDEX IF NOT EXISTS idx_skift_dato ON skift(dato);
CREATE INDEX IF NOT EXISTS idx_skift_fakturert ON skift(fakturert) WHERE fakturert = false;
CREATE INDEX IF NOT EXISTS idx_skift_godkjent ON skift(godkjent) WHERE godkjent = false;
CREATE INDEX IF NOT EXISTS idx_skift_bil_id ON skift(bil_id);
CREATE INDEX IF NOT EXISTS idx_skift_sone_id ON skift(sone_id);
CREATE INDEX IF NOT EXISTS idx_skift_registrering_type ON skift(registrering_type);
CREATE INDEX IF NOT EXISTS idx_skift_sga_kode_id ON skift(sga_kode_id);

-- Sjekk alle tabeller
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

