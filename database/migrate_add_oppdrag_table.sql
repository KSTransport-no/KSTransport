-- Migrasjon: Legg til oppdrag tabell
-- Dato: 2025-11-16
-- Kjør denne filen direkte i databasen hvis tabellen mangler

-- Opprett oppdrag tabell
CREATE TABLE IF NOT EXISTS oppdrag (
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

-- Sjekk om trigger-funksjonen eksisterer, hvis ikke opprett den
-- (Funksjonen skal allerede eksistere fra init.sql)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_sist_endret') THEN
        EXECUTE 'CREATE OR REPLACE FUNCTION update_sist_endret()
        RETURNS TRIGGER AS $func$
        BEGIN
            NEW.sist_endret = CURRENT_TIMESTAMP;
            RETURN NEW;
        END;
        $func$ language ''plpgsql''';
    END IF;
END $$;

-- Legg til trigger for oppdrag (hvis den ikke eksisterer)
DROP TRIGGER IF EXISTS update_oppdrag_sist_endret ON oppdrag;
CREATE TRIGGER update_oppdrag_sist_endret 
BEFORE UPDATE ON oppdrag
FOR EACH ROW EXECUTE FUNCTION update_sist_endret();

-- Registrer migrasjonen (hvis migrations-tabellen eksisterer)
INSERT INTO migrations (name) 
SELECT 'add_oppdrag_table' 
WHERE NOT EXISTS (SELECT 1 FROM migrations WHERE name = 'add_oppdrag_table');
