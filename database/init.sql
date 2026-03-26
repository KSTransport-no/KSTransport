-- KSTransport Database Schema
-- Tidregistreringsløsning for sjåfører

-- Tabell for sjåfører
CREATE TABLE sjåfører (
    id SERIAL PRIMARY KEY,
    navn VARCHAR(100) NOT NULL,
    epost VARCHAR(100) UNIQUE NOT NULL,
    passord_hash VARCHAR(255) NOT NULL,
    telefon VARCHAR(20),
    aktiv BOOLEAN DEFAULT true,
    admin BOOLEAN DEFAULT false,
    opprettet TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    sist_endret TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabell for egenmelding kvoter
CREATE TABLE egenmelding_kvoter (
    id SERIAL PRIMARY KEY,
    sjåfør_id INTEGER REFERENCES sjåfører(id) ON DELETE CASCADE,
    år INTEGER NOT NULL,
    egenmelding_dager INTEGER DEFAULT 4,
    egenmelding_barn_dager INTEGER DEFAULT 10,
    brukt_egenmelding INTEGER DEFAULT 0,
    brukt_egenmelding_barn INTEGER DEFAULT 0,
    opprettet TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    sist_endret TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(sjåfør_id, år)
);

-- Tabell for biler
CREATE TABLE biler (
    id SERIAL PRIMARY KEY,
    registreringsnummer VARCHAR(20) UNIQUE NOT NULL,
    merke VARCHAR(50),
    modell VARCHAR(50),
    årsmodell INTEGER,
    aktiv BOOLEAN DEFAULT true,
    opprettet TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabell for soner
CREATE TABLE soner (
    id SERIAL PRIMARY KEY,
    navn VARCHAR(100) NOT NULL,
    beskrivelse TEXT,
    aktiv BOOLEAN DEFAULT true,
    opprettet TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabell for oppdrag
CREATE TABLE oppdrag (
    id SERIAL PRIMARY KEY,
    fra VARCHAR(255) NOT NULL,
    til VARCHAR(255) NOT NULL,
    vekt INTEGER DEFAULT 0,
    volum DECIMAL(10, 2) DEFAULT 0,
    kommentar TEXT,
    aktiv BOOLEAN DEFAULT true,
    opprettet TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    sist_endret TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabell for SGA-koder (må opprettes før skift-tabellen)
CREATE TABLE sga_koder (
    id SERIAL PRIMARY KEY,
    kode VARCHAR(50) UNIQUE NOT NULL,
    beskrivelse TEXT,
    skal_faktureres BOOLEAN DEFAULT false,
    aktiv BOOLEAN DEFAULT true,
    opprettet TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    sist_endret TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabell for skift/timeføringer
CREATE TABLE skift (
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
    registrering_type VARCHAR(50) DEFAULT 'arbeidstid', -- arbeidstid, ferie, sykemelding, egenmelding, egenmelding_barn
    bomtur_venting TEXT,
    sga_kode_id INTEGER REFERENCES sga_koder(id) ON DELETE SET NULL,
    sga_kode_annet TEXT, -- For "annet"-alternativ hvor man skriver inn egen SGA-kode
    opprettet TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    sist_endret TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    godkjent BOOLEAN DEFAULT false,
    godkjent_av INTEGER REFERENCES sjåfører(id) ON DELETE SET NULL,
    godkjent_dato TIMESTAMP,
    fakturert BOOLEAN DEFAULT false,
    fakturert_dato TIMESTAMP,
    fakturert_av INTEGER REFERENCES sjåfører(id) ON DELETE SET NULL
);

-- Tabell for avvik
CREATE TABLE avvik (
    id SERIAL PRIMARY KEY,
    sjåfør_id INTEGER REFERENCES sjåfører(id) ON DELETE CASCADE,
    skift_id INTEGER REFERENCES skift(id) ON DELETE CASCADE,
    type VARCHAR(100) NOT NULL,
    beskrivelse TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'ny',
    admin_kommentar TEXT,
    admin_id INTEGER REFERENCES sjåfører(id) ON DELETE SET NULL,
    bilde_url VARCHAR(500), -- Deprecated - bruk avvik_bilder tabell i stedet
    dato TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    opprettet TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabell for avvik-bilder (støtter flere bilder per avvik)
CREATE TABLE avvik_bilder (
    id SERIAL PRIMARY KEY,
    avvik_id INTEGER REFERENCES avvik(id) ON DELETE CASCADE,
    bilde_url VARCHAR(500) NOT NULL,
    bilde_navn VARCHAR(255),
    bilde_størrelse INTEGER,
    opprettet TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabell for forbedringsforslag
CREATE TABLE forbedringsforslag (
    id SERIAL PRIMARY KEY,
    sjåfør_id INTEGER REFERENCES sjåfører(id) ON DELETE CASCADE,
    tittel VARCHAR(200) NOT NULL,
    beskrivelse TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'ny',
    admin_kommentar TEXT,
    admin_id INTEGER REFERENCES sjåfører(id) ON DELETE SET NULL,
    opprettet TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    behandlet TIMESTAMP,
    behandlet_av INTEGER REFERENCES sjåfører(id)
);

-- Indekser for bedre ytelse
CREATE INDEX idx_skift_sjåfør_dato ON skift(sjåfør_id, dato);
CREATE INDEX idx_skift_dato ON skift(dato);
CREATE INDEX idx_avvik_sjåfør ON avvik(sjåfør_id);
CREATE INDEX idx_forbedringsforslag_sjåfør ON forbedringsforslag(sjåfør_id);

-- Innsetting av eksempeldata
-- Passord for alle test-brukere: password123
-- Passord for sindre@au11no.com: Cetla123
-- Hashes generated with bcryptjs (Node.js) for compatibility
INSERT INTO sjåfører (navn, epost, passord_hash, telefon, admin) VALUES
('Ole Hansen', 'ole.hansen@kstransport.no', '$2a$10$1TJH4t/7o1pix.KEsfVQCeM91gyvqc4HdbneCh2APA3MPXPLp7Rya', '+47 123 45 678', false),
('Kari Nordmann', 'kari.nordmann@kstransport.no', '$2a$10$1TJH4t/7o1pix.KEsfVQCeM91gyvqc4HdbneCh2APA3MPXPLp7Rya', '+47 987 65 432', false),
('Lars Andersen', 'lars.andersen@kstransport.no', '$2a$10$1TJH4t/7o1pix.KEsfVQCeM91gyvqc4HdbneCh2APA3MPXPLp7Rya', '+47 555 12 345', false),
('Admin Bruker', 'admin@kstransport.no', '$2a$10$1TJH4t/7o1pix.KEsfVQCeM91gyvqc4HdbneCh2APA3MPXPLp7Rya', '+47 000 00 000', true),
('Sindre', 'sindre@au11no.com', '$2a$10$rb8G9WFKIOr3Da0IWiHhDelvVfsImCkBG.MOfdDccq/pebrmQsKQ2', '+47 000 00 001', false)
ON CONFLICT (epost) DO NOTHING;

INSERT INTO biler (registreringsnummer, merke, modell, årsmodell) VALUES
('AB12345', 'Volvo', 'FH16', 2020),
('CD67890', 'Scania', 'R500', 2021),
('EF11111', 'MAN', 'TGX', 2019),
('GH22222', 'Mercedes', 'Actros', 2022)
ON CONFLICT (registreringsnummer) DO NOTHING;

INSERT INTO soner (navn, beskrivelse) 
SELECT * FROM (VALUES
    ('Oslo Sentrum', 'Leveringer i Oslo sentrum'),
    ('Akershus', 'Leveringer i Akershus fylke'),
    ('Vestfold', 'Leveringer i Vestfold'),
    ('Østfold', 'Leveringer i Østfold'),
    ('Telemark', 'Leveringer i Telemark')
) AS v(navn, beskrivelse)
WHERE NOT EXISTS (SELECT 1 FROM soner WHERE soner.navn = v.navn);

-- Eksempel SGA-koder (kan administreres av admin senere)
INSERT INTO sga_koder (kode, beskrivelse, skal_faktureres) VALUES
('SGA001', 'Oslo Sentrum - Standard levering', true),
('SGA002', 'Akershus - Standard levering', true),
('SGA003', 'Vestfold - Standard levering', true),
('SGA004', 'Intern kjøring - Ikke fakturerbar', false),
('SGA005', 'Vedlikehold/Service - Ikke fakturerbar', false),
('SGA006', 'Testkjøring - Ikke fakturerbar', false)
ON CONFLICT (kode) DO NOTHING;

-- Tabell for info-kort (telefonnumre og koder)
CREATE TABLE IF NOT EXISTS info_kort (
    id SERIAL PRIMARY KEY,
    kategori VARCHAR(50) NOT NULL, -- 'telefon' eller 'kode'
    navn VARCHAR(100) NOT NULL,    -- f.eks. 'Kjøre kontor', 'Ola Normann'
    verdi VARCHAR(200) NOT NULL,   -- telefonnummer eller kode
    beskrivelse TEXT,              -- valgfri beskrivelse
    aktiv BOOLEAN DEFAULT true,
    opprettet TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    sist_endret TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabell for avvik kommentarer
CREATE TABLE IF NOT EXISTS avvik_kommentarer (
    id SERIAL PRIMARY KEY,
    avvik_id INTEGER REFERENCES avvik(id) ON DELETE CASCADE,
    sjåfør_id INTEGER REFERENCES sjåfører(id) ON DELETE CASCADE,
    kommentar TEXT NOT NULL,
    opprettet TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabell for forbedringsforslag kommentarer
CREATE TABLE IF NOT EXISTS forbedringsforslag_kommentarer (
    id SERIAL PRIMARY KEY,
    forbedringsforslag_id INTEGER REFERENCES forbedringsforslag(id) ON DELETE CASCADE,
    sjåfør_id INTEGER REFERENCES sjåfører(id) ON DELETE CASCADE,
    kommentar TEXT NOT NULL,
    opprettet TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Legg til noen eksempel-data for info-kort (kun hvis tabellen er tom)
INSERT INTO info_kort (kategori, navn, verdi, beskrivelse) 
SELECT * FROM (VALUES
    ('telefon', 'Kjøre kontor', '+47 123 45 678', 'Hovedkontor for kjøreoperasjoner'),
    ('telefon', 'Sjef', '+47 987 65 432', 'Direktør/leder'),
    ('telefon', 'Vaktmester', '+47 555 12 34', 'Vaktmester for porter og sikkerhet'),
    ('kode', 'Ola Normann', '7985', 'Porter-kode for Ola Normann'),
    ('kode', 'Hovedport', '1234', 'Standard kode for hovedport'),
    ('kode', 'Sideport', '5678', 'Kode for sideport')
) AS v(kategori, navn, verdi, beskrivelse)
WHERE NOT EXISTS (SELECT 1 FROM info_kort LIMIT 1);

-- Legg til eksempel-data for egenmelding kvoter (kun hvis tabellen er tom)
INSERT INTO egenmelding_kvoter (sjåfør_id, år, egenmelding_dager, egenmelding_barn_dager, brukt_egenmelding, brukt_egenmelding_barn)
SELECT sj.id, EXTRACT(YEAR FROM CURRENT_DATE), 4, 10, 0, 0
FROM sjåfører sj
WHERE NOT EXISTS (SELECT 1 FROM egenmelding_kvoter WHERE sjåfør_id = sj.id AND år = EXTRACT(YEAR FROM CURRENT_DATE));

-- Trigger for å oppdatere sist_endret
CREATE OR REPLACE FUNCTION update_sist_endret()
RETURNS TRIGGER AS $$
BEGIN
    NEW.sist_endret = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_sjåfører_sist_endret BEFORE UPDATE ON sjåfører
    FOR EACH ROW EXECUTE FUNCTION update_sist_endret();

CREATE TRIGGER update_skift_sist_endret BEFORE UPDATE ON skift
    FOR EACH ROW EXECUTE FUNCTION update_sist_endret();

CREATE TRIGGER update_info_kort_sist_endret BEFORE UPDATE ON info_kort
    FOR EACH ROW EXECUTE FUNCTION update_sist_endret();

CREATE TRIGGER update_sga_koder_sist_endret BEFORE UPDATE ON sga_koder
    FOR EACH ROW EXECUTE FUNCTION update_sist_endret();

CREATE TRIGGER update_oppdrag_sist_endret BEFORE UPDATE ON oppdrag
    FOR EACH ROW EXECUTE FUNCTION update_sist_endret();
