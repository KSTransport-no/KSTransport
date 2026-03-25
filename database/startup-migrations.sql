-- Startup migrasjoner som kjører automatisk ved container-start
-- Dette skriptet kjører hver gang postgres-containeren starter

-- Opprett migrations-tabell for å holde styr på kjørede migrasjoner
CREATE TABLE IF NOT EXISTS migrations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL,
    executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- KRITISK: Opprett grunnleggende tabeller FØRST (uten å sjekke migrations-tabellen)
-- Dette sikrer at tabellene alltid eksisterer, selv om migrasjoner ikke har kjørt
DO $$
BEGIN
    -- Opprett sjåfører tabell hvis den ikke eksisterer
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'sjåfører') THEN
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
        RAISE NOTICE 'Tabell sjåfører opprettet';
    END IF;
    
    -- Opprett biler tabell hvis den ikke eksisterer
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'biler') THEN
        CREATE TABLE biler (
            id SERIAL PRIMARY KEY,
            registreringsnummer VARCHAR(20) UNIQUE NOT NULL,
            merke VARCHAR(50),
            modell VARCHAR(50),
            årsmodell INTEGER,
            aktiv BOOLEAN DEFAULT true,
            opprettet TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        RAISE NOTICE 'Tabell biler opprettet';
    END IF;
    
    -- Opprett soner tabell hvis den ikke eksisterer
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'soner') THEN
        CREATE TABLE soner (
            id SERIAL PRIMARY KEY,
            navn VARCHAR(100) NOT NULL,
            beskrivelse TEXT,
            aktiv BOOLEAN DEFAULT true,
            opprettet TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        RAISE NOTICE 'Tabell soner opprettet';
    END IF;
    
    -- Opprett skift tabell hvis den ikke eksisterer (KRITISK!)
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'skift') THEN
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
        RAISE NOTICE 'Tabell skift opprettet';
    END IF;
END $$;

-- Migrasjon: Sjekk og opprett alle grunnleggende tabeller hvis de mangler
DO $$
BEGIN
    -- Sjekk om migrasjonen allerede er kjørt
    IF NOT EXISTS (SELECT 1 FROM migrations WHERE name = 'ensure_base_tables') THEN
        
        -- Opprett sjåfører tabell hvis den ikke eksisterer
        IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'sjåfører') THEN
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
            RAISE NOTICE 'Tabell sjåfører opprettet';
        END IF;
        
        -- Opprett biler tabell hvis den ikke eksisterer
        IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'biler') THEN
            CREATE TABLE biler (
                id SERIAL PRIMARY KEY,
                registreringsnummer VARCHAR(20) UNIQUE NOT NULL,
                merke VARCHAR(50),
                modell VARCHAR(50),
                årsmodell INTEGER,
                aktiv BOOLEAN DEFAULT true,
                opprettet TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            RAISE NOTICE 'Tabell biler opprettet';
        END IF;
        
        -- Opprett soner tabell hvis den ikke eksisterer
        IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'soner') THEN
            CREATE TABLE soner (
                id SERIAL PRIMARY KEY,
                navn VARCHAR(100) NOT NULL,
                beskrivelse TEXT,
                aktiv BOOLEAN DEFAULT true,
                opprettet TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            RAISE NOTICE 'Tabell soner opprettet';
        END IF;
        
        -- Opprett skift tabell hvis den ikke eksisterer
        IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'skift') THEN
            -- Opprett skift uten sga_kode_id foreign key først (sga_koder kan ikke eksistere ennå)
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
            RAISE NOTICE 'Tabell skift opprettet';
            
            -- Legg til foreign key constraint for sga_kode_id hvis sga_koder tabellen eksisterer
            IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'sga_koder') THEN
                -- Sjekk om constraint allerede eksisterer
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.table_constraints 
                    WHERE constraint_name = 'skift_sga_kode_id_fkey' 
                    AND table_name = 'skift'
                ) THEN
                    ALTER TABLE skift 
                    ADD CONSTRAINT skift_sga_kode_id_fkey 
                    FOREIGN KEY (sga_kode_id) REFERENCES sga_koder(id) ON DELETE SET NULL;
                END IF;
            END IF;
        END IF;
        
        -- Opprett avvik tabell hvis den ikke eksisterer
        IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'avvik') THEN
            CREATE TABLE avvik (
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
            RAISE NOTICE 'Tabell avvik opprettet';
        END IF;
        
        -- Opprett avvik_bilder tabell hvis den ikke eksisterer
        IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'avvik_bilder') THEN
            CREATE TABLE avvik_bilder (
                id SERIAL PRIMARY KEY,
                avvik_id INTEGER REFERENCES avvik(id) ON DELETE CASCADE,
                bilde_url VARCHAR(500) NOT NULL,
                bilde_navn VARCHAR(255),
                bilde_størrelse INTEGER,
                opprettet TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            RAISE NOTICE 'Tabell avvik_bilder opprettet';
        END IF;
        
        -- Opprett forbedringsforslag tabell hvis den ikke eksisterer
        IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'forbedringsforslag') THEN
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
            RAISE NOTICE 'Tabell forbedringsforslag opprettet';
        END IF;
        
        -- Opprett egenmelding_kvoter tabell hvis den ikke eksisterer
        IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'egenmelding_kvoter') THEN
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
            RAISE NOTICE 'Tabell egenmelding_kvoter opprettet';
        END IF;
        
        -- Opprett oppdrag tabell hvis den ikke eksisterer
        IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'oppdrag') THEN
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
            RAISE NOTICE 'Tabell oppdrag opprettet';
        END IF;
        
        -- Opprett avvik_kommentarer tabell hvis den ikke eksisterer
        IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'avvik_kommentarer') THEN
            CREATE TABLE avvik_kommentarer (
                id SERIAL PRIMARY KEY,
                avvik_id INTEGER REFERENCES avvik(id) ON DELETE CASCADE,
                sjåfør_id INTEGER REFERENCES sjåfører(id) ON DELETE CASCADE,
                kommentar TEXT NOT NULL,
                opprettet TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            RAISE NOTICE 'Tabell avvik_kommentarer opprettet';
        END IF;
        
        -- Opprett forbedringsforslag_kommentarer tabell hvis den ikke eksisterer
        IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'forbedringsforslag_kommentarer') THEN
            CREATE TABLE forbedringsforslag_kommentarer (
                id SERIAL PRIMARY KEY,
                forbedringsforslag_id INTEGER REFERENCES forbedringsforslag(id) ON DELETE CASCADE,
                sjåfør_id INTEGER REFERENCES sjåfører(id) ON DELETE CASCADE,
                kommentar TEXT NOT NULL,
                opprettet TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            RAISE NOTICE 'Tabell forbedringsforslag_kommentarer opprettet';
        END IF;
        
        -- Registrer migrasjonen
        INSERT INTO migrations (name) VALUES ('ensure_base_tables');
        
        RAISE NOTICE 'Migrasjon ensure_base_tables fullført';
    ELSE
        RAISE NOTICE 'Migrasjon ensure_base_tables allerede kjørt';
    END IF;
END $$;

-- Opprett update_sist_endret funksjon (må være utenfor DO-blokk)
CREATE OR REPLACE FUNCTION update_sist_endret()
RETURNS TRIGGER AS $$
BEGIN
    NEW.sist_endret = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Migrasjon: Legg til sone kolonne i skift tabell
DO $$
BEGIN
    -- Sjekk om migrasjonen allerede er kjørt
    IF NOT EXISTS (SELECT 1 FROM migrations WHERE name = 'add_sone_column') THEN
        
        -- Legg til sone kolonne
        ALTER TABLE skift ADD COLUMN IF NOT EXISTS sone VARCHAR(255);
        
        -- Oppdater eksisterende data - flytt sone fra kommentarer til sone kolonne
        UPDATE skift 
        SET sone = SUBSTRING(kommentarer FROM 'Sone: ([^\n]+)')
        WHERE kommentarer LIKE 'Sone: %' AND sone IS NULL;
        
        -- Rydd opp i kommentarer - fjern "Sone: ..." delen
        UPDATE skift 
        SET kommentarer = TRIM(SUBSTRING(kommentarer FROM '\n\nKommentarer: (.+)$'))
        WHERE kommentarer LIKE 'Sone: %\n\nKommentarer: %';
        
        -- For kommentarer som bare har "Sone: ..." uten kommentarer, sett kommentarer til tom
        UPDATE skift 
        SET kommentarer = ''
        WHERE kommentarer LIKE 'Sone: %' AND kommentarer NOT LIKE '%\n\nKommentarer: %';
        
        -- Registrer migrasjonen
        INSERT INTO migrations (name) VALUES ('add_sone_column');
        
        RAISE NOTICE 'Migrasjon add_sone_column fullført';
    ELSE
        RAISE NOTICE 'Migrasjon add_sone_column allerede kjørt';
    END IF;
END $$;

-- Migrasjon: Legg til vekt kolonne i skift tabell
DO $$
BEGIN
    -- Sjekk om migrasjonen allerede er kjørt
    IF NOT EXISTS (SELECT 1 FROM migrations WHERE name = 'add_vekt_column') THEN
        
        -- Legg til vekt kolonne i skift tabell
        ALTER TABLE skift ADD COLUMN IF NOT EXISTS vekt INTEGER DEFAULT 0;
        
        -- Legg til kommentar
        COMMENT ON COLUMN skift.vekt IS 'Total vekt i kg for alle sendinger i dette skiftet';
        
        -- Oppdater eksisterende records med standard vekt (25kg per sending)
        UPDATE skift 
        SET vekt = antall_sendinger * 25 
        WHERE vekt = 0 AND antall_sendinger > 0;
        
        -- Registrer migrasjonen
        INSERT INTO migrations (name) VALUES ('add_vekt_column');
        
        RAISE NOTICE 'Migrasjon add_vekt_column fullført';
    ELSE
        RAISE NOTICE 'Migrasjon add_vekt_column allerede kjørt';
    END IF;
END $$;

-- Migrasjon: Legg til bilde_url kolonne i avvik tabell
DO $$
BEGIN
    -- Sjekk om migrasjonen allerede er kjørt
    IF NOT EXISTS (SELECT 1 FROM migrations WHERE name = 'add_bilde_url_column') THEN
        
        -- Legg til bilde_url kolonne i avvik tabell
        ALTER TABLE avvik ADD COLUMN IF NOT EXISTS bilde_url VARCHAR(500);
        
        -- Legg til kommentar
        COMMENT ON COLUMN avvik.bilde_url IS 'URL til bilde vedlagt avvik-rapport';
        
        -- Registrer migrasjonen
        INSERT INTO migrations (name) VALUES ('add_bilde_url_column');
        
        RAISE NOTICE 'Migrasjon add_bilde_url_column fullført';
    ELSE
        RAISE NOTICE 'Migrasjon add_bilde_url_column allerede kjørt';
    END IF;
END $$;

-- Migrasjon: Legg til info_kort tabell
DO $$
BEGIN
    -- Sjekk om migrasjonen allerede er kjørt
    IF NOT EXISTS (SELECT 1 FROM migrations WHERE name = 'add_info_kort_table') THEN
        
        -- Opprett info_kort tabell
        CREATE TABLE IF NOT EXISTS info_kort (
            id SERIAL PRIMARY KEY,
            kategori VARCHAR(50) NOT NULL,
            navn VARCHAR(100) NOT NULL,
            verdi VARCHAR(200) NOT NULL,
            beskrivelse TEXT,
            aktiv BOOLEAN DEFAULT true,
            opprettet TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            sist_endret TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        -- Legg til eksempel-data (kun hvis tabellen er tom)
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

        -- Legg til trigger for info_kort (hvis den ikke eksisterer)
        IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_info_kort_sist_endret') THEN
            CREATE TRIGGER update_info_kort_sist_endret 
            BEFORE UPDATE ON info_kort
            FOR EACH ROW EXECUTE FUNCTION update_sist_endret();
        END IF;

        -- Registrer migrasjonen
        INSERT INTO migrations (name) VALUES ('add_info_kort_table');
        
        RAISE NOTICE 'Migrasjon add_info_kort_table fullført';
    ELSE
        RAISE NOTICE 'Migrasjon add_info_kort_table allerede kjørt';
    END IF;
END $$;

-- Migrasjon: Legg til admin_id kolonne i avvik tabell
DO $$
BEGIN
    -- Sjekk om migrasjonen allerede er kjørt
    IF NOT EXISTS (SELECT 1 FROM migrations WHERE name = 'add_admin_id_column') THEN
        
        -- Legg til admin_id kolonne i avvik tabell
        ALTER TABLE avvik ADD COLUMN IF NOT EXISTS admin_id INTEGER REFERENCES sjåfører(id) ON DELETE SET NULL;
        
        -- Registrer migrasjonen
        INSERT INTO migrations (name) VALUES ('add_admin_id_column');
        
        RAISE NOTICE 'Migrasjon add_admin_id_column fullført';
    ELSE
        RAISE NOTICE 'Migrasjon add_admin_id_column allerede kjørt';
    END IF;
END $$;

-- Migrasjon: Legg til admin_id kolonne i forbedringsforslag tabell
DO $$
BEGIN
    -- Sjekk om migrasjonen allerede er kjørt
    IF NOT EXISTS (SELECT 1 FROM migrations WHERE name = 'add_admin_id_column_forbedringsforslag') THEN
        
        -- Legg til admin_id kolonne i forbedringsforslag tabell
        ALTER TABLE forbedringsforslag ADD COLUMN IF NOT EXISTS admin_id INTEGER REFERENCES sjåfører(id) ON DELETE SET NULL;
        
        -- Registrer migrasjonen
        INSERT INTO migrations (name) VALUES ('add_admin_id_column_forbedringsforslag');
        
        RAISE NOTICE 'Migrasjon add_admin_id_column_forbedringsforslag fullført';
    ELSE
        RAISE NOTICE 'Migrasjon add_admin_id_column_forbedringsforslag allerede kjørt';
    END IF;
END $$;

-- Migrasjon: Legg til registrering_type kolonne i skift tabell
DO $$
BEGIN
    -- Sjekk om migrasjonen allerede er kjørt
    IF NOT EXISTS (SELECT 1 FROM migrations WHERE name = 'add_registrering_type_column') THEN
        
        -- Legg til registrering_type kolonne
        ALTER TABLE skift ADD COLUMN IF NOT EXISTS registrering_type VARCHAR(50) DEFAULT 'arbeidstid';
        
        -- Registrer migrasjonen
        INSERT INTO migrations (name) VALUES ('add_registrering_type_column');
        
        RAISE NOTICE 'Migrasjon add_registrering_type_column fullført';
    ELSE
        RAISE NOTICE 'Migrasjon add_registrering_type_column allerede kjørt';
    END IF;
END $$;

-- Migrasjon: Opprett egenmelding_kvoter tabell
DO $$
BEGIN
    -- Sjekk om migrasjonen allerede er kjørt
    IF NOT EXISTS (SELECT 1 FROM migrations WHERE name = 'add_egenmelding_kvoter_table') THEN
        
        -- Opprett egenmelding_kvoter tabell
        CREATE TABLE IF NOT EXISTS egenmelding_kvoter (
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
        
        -- Legg til eksempel-data for egenmelding kvoter (kun hvis tabellen er tom)
        INSERT INTO egenmelding_kvoter (sjåfør_id, år, egenmelding_dager, egenmelding_barn_dager, brukt_egenmelding, brukt_egenmelding_barn)
        SELECT sj.id, EXTRACT(YEAR FROM CURRENT_DATE), 4, 10, 0, 0
        FROM sjåfører sj
        WHERE NOT EXISTS (SELECT 1 FROM egenmelding_kvoter WHERE sjåfør_id = sj.id AND år = EXTRACT(YEAR FROM CURRENT_DATE));
        
        -- Registrer migrasjonen
        INSERT INTO migrations (name) VALUES ('add_egenmelding_kvoter_table');
        
        RAISE NOTICE 'Migrasjon add_egenmelding_kvoter_table fullført';
    ELSE
        RAISE NOTICE 'Migrasjon add_egenmelding_kvoter_table allerede kjørt';
    END IF;
END $$;

-- Migrasjon: Legg til bomtur_venting kolonne
DO $$
BEGIN
    -- Sjekk om migrasjonen allerede er kjørt
    IF NOT EXISTS (SELECT 1 FROM migrations WHERE name = 'add_bomtur_venting_column') THEN
        
        -- Legg til bomtur_venting kolonne i skift tabell
        ALTER TABLE skift ADD COLUMN IF NOT EXISTS bomtur_venting TEXT;
        
        -- Registrer migrasjonen
        INSERT INTO migrations (name) VALUES ('add_bomtur_venting_column');
        
        RAISE NOTICE 'Migrasjon add_bomtur_venting_column fullført';
    ELSE
        RAISE NOTICE 'Migrasjon add_bomtur_venting_column allerede kjørt';
    END IF;
END $$;


-- Migrasjon: Opprett SGA-koder tabell
DO $$
BEGIN
    -- Sjekk om migrasjonen allerede er kjørt
    IF NOT EXISTS (SELECT 1 FROM migrations WHERE name = 'add_sga_koder_table') THEN

        -- Opprett sga_koder tabell
        CREATE TABLE IF NOT EXISTS sga_koder (
            id SERIAL PRIMARY KEY,
            kode VARCHAR(50) UNIQUE NOT NULL,
            beskrivelse TEXT,
            skal_faktureres BOOLEAN DEFAULT false,
            aktiv BOOLEAN DEFAULT true,
            opprettet TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            sist_endret TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        -- Registrer migrasjonen
        INSERT INTO migrations (name) VALUES ('add_sga_koder_table');

        RAISE NOTICE 'Migrasjon add_sga_koder_table fullført';
    ELSE
        RAISE NOTICE 'Migrasjon add_sga_koder_table allerede kjørt';
    END IF;
END $$;

-- Migrasjon: Legg til SGA-kode kolonner i skift tabell
DO $$
BEGIN
    -- Sjekk om migrasjonen allerede er kjørt
    IF NOT EXISTS (SELECT 1 FROM migrations WHERE name = 'add_sga_kode_columns_to_skift') THEN
        
        -- Legg til sga_kode_id kolonne i skift tabell
        ALTER TABLE skift ADD COLUMN IF NOT EXISTS sga_kode_id INTEGER REFERENCES sga_koder(id) ON DELETE SET NULL;
        
        -- Legg til sga_kode_annet kolonne i skift tabell
        ALTER TABLE skift ADD COLUMN IF NOT EXISTS sga_kode_annet TEXT;
        
        -- Registrer migrasjonen
        INSERT INTO migrations (name) VALUES ('add_sga_kode_columns_to_skift');
        
        RAISE NOTICE 'Migrasjon add_sga_kode_columns_to_skift fullført';
    ELSE
        RAISE NOTICE 'Migrasjon add_sga_kode_columns_to_skift allerede kjørt';
    END IF;
END $$;

-- Migrasjon: Opprett oppdrag tabell
DO $$
BEGIN
    -- Sjekk om migrasjonen allerede er kjørt
    IF NOT EXISTS (SELECT 1 FROM migrations WHERE name = 'add_oppdrag_table') THEN

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

        -- Legg til trigger for oppdrag (hvis den ikke eksisterer)
        -- Funksjonen update_sist_endret() skal allerede eksistere fra init.sql
        IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_oppdrag_sist_endret') THEN
            CREATE TRIGGER update_oppdrag_sist_endret 
            BEFORE UPDATE ON oppdrag
            FOR EACH ROW EXECUTE FUNCTION update_sist_endret();
        END IF;

        -- Registrer migrasjonen
        INSERT INTO migrations (name) VALUES ('add_oppdrag_table');

        RAISE NOTICE 'Migrasjon add_oppdrag_table fullført';
    ELSE
        RAISE NOTICE 'Migrasjon add_oppdrag_table allerede kjørt';
    END IF;
END $$;

-- Migrasjon: Legg til godkjent-felter i skift tabell
DO $$
BEGIN
    -- Sjekk om migrasjonen allerede er kjørt
    IF NOT EXISTS (SELECT 1 FROM migrations WHERE name = 'add_godkjent_fields') THEN
        
        -- Legg til godkjent-felter i skift tabell
        ALTER TABLE skift ADD COLUMN IF NOT EXISTS godkjent BOOLEAN DEFAULT false;
        ALTER TABLE skift ADD COLUMN IF NOT EXISTS godkjent_av INTEGER REFERENCES sjåfører(id) ON DELETE SET NULL;
        ALTER TABLE skift ADD COLUMN IF NOT EXISTS godkjent_dato TIMESTAMP;
        
        -- Registrer migrasjonen
        INSERT INTO migrations (name) VALUES ('add_godkjent_fields');
        
        RAISE NOTICE 'Migrasjon add_godkjent_fields fullført';
    ELSE
        RAISE NOTICE 'Migrasjon add_godkjent_fields allerede kjørt';
    END IF;
END $$;

-- Migrasjon: Legg til fakturert kolonne i skift tabell
DO $$
BEGIN
    -- Sjekk om migrasjonen allerede er kjørt
    IF NOT EXISTS (SELECT 1 FROM migrations WHERE name = 'add_fakturert_column') THEN
        
        -- Legg til fakturert kolonne i skift tabell
        ALTER TABLE skift ADD COLUMN IF NOT EXISTS fakturert BOOLEAN DEFAULT false;
        ALTER TABLE skift ADD COLUMN IF NOT EXISTS fakturert_dato TIMESTAMP;
        ALTER TABLE skift ADD COLUMN IF NOT EXISTS fakturert_av INTEGER REFERENCES sjåfører(id) ON DELETE SET NULL;
        
        -- Registrer migrasjonen
        INSERT INTO migrations (name) VALUES ('add_fakturert_column');
        
        RAISE NOTICE 'Migrasjon add_fakturert_column fullført';
    ELSE
        RAISE NOTICE 'Migrasjon add_fakturert_column allerede kjørt';
    END IF;
END $$;

-- Migrasjon: Aktiver pg_stat_statements extension (for query analysis)
DO $$
BEGIN
    -- Sjekk om migrasjonen allerede er kjørt
    IF NOT EXISTS (SELECT 1 FROM migrations WHERE name = 'enable_pg_stat_statements') THEN
        
        -- Aktiver extension (krever superuser, så kan feile i noen miljøer)
        BEGIN
            CREATE EXTENSION IF NOT EXISTS pg_stat_statements;
            INSERT INTO migrations (name) VALUES ('enable_pg_stat_statements');
            RAISE NOTICE 'Migrasjon enable_pg_stat_statements fullført';
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Kunne ikke aktivere pg_stat_statements (krever superuser): %', SQLERRM;
        END;
    ELSE
        RAISE NOTICE 'Migrasjon enable_pg_stat_statements allerede kjørt';
    END IF;
END $$;

-- Migrasjon: Legg til performance indekser
DO $$
BEGIN
    -- Sjekk om migrasjonen allerede er kjørt
    IF NOT EXISTS (SELECT 1 FROM migrations WHERE name = 'add_performance_indexes') THEN
        
        -- Kjør performance indekser script
        -- Dette vil kjøre alle CREATE INDEX IF NOT EXISTS statements
        -- Vi inkluderer dem direkte her for å sikre at de kjører
        
        -- Skift indekser (sjekk at tabellen eksisterer)
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'skift') THEN
            CREATE INDEX IF NOT EXISTS idx_skift_fakturert ON skift(fakturert) WHERE fakturert = false;
            CREATE INDEX IF NOT EXISTS idx_skift_godkjent ON skift(godkjent) WHERE godkjent = false;
            CREATE INDEX IF NOT EXISTS idx_skift_bil_id ON skift(bil_id);
            CREATE INDEX IF NOT EXISTS idx_skift_sone_id ON skift(sone_id);
            CREATE INDEX IF NOT EXISTS idx_skift_registrering_type ON skift(registrering_type);
            CREATE INDEX IF NOT EXISTS idx_skift_fakturert_type ON skift(fakturert, registrering_type) WHERE fakturert = false AND registrering_type = 'arbeidstid';
            CREATE INDEX IF NOT EXISTS idx_skift_sga_kode_id ON skift(sga_kode_id);
        END IF;
        
        -- Avvik indekser
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'avvik') THEN
            CREATE INDEX IF NOT EXISTS idx_avvik_dato ON avvik(dato);
            CREATE INDEX IF NOT EXISTS idx_avvik_sjåfør_dato ON avvik(sjåfør_id, dato);
            CREATE INDEX IF NOT EXISTS idx_avvik_status ON avvik(status);
            CREATE INDEX IF NOT EXISTS idx_avvik_skift_id ON avvik(skift_id);
            CREATE INDEX IF NOT EXISTS idx_avvik_admin_id ON avvik(admin_id);
        END IF;
        
        -- Avvik bilder indekser
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'avvik_bilder') THEN
            CREATE INDEX IF NOT EXISTS idx_avvik_bilder_avvik_id ON avvik_bilder(avvik_id);
        END IF;
        
        -- Forbedringsforslag indekser
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'forbedringsforslag') THEN
            CREATE INDEX IF NOT EXISTS idx_forbedringsforslag_sjåfør_status ON forbedringsforslag(sjåfør_id, status);
            CREATE INDEX IF NOT EXISTS idx_forbedringsforslag_status ON forbedringsforslag(status);
            CREATE INDEX IF NOT EXISTS idx_forbedringsforslag_opprettet ON forbedringsforslag(opprettet DESC);
        END IF;
        
        -- Andre indekser
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'egenmelding_kvoter') THEN
            CREATE INDEX IF NOT EXISTS idx_egenmelding_kvoter_sjåfør_år ON egenmelding_kvoter(sjåfør_id, år);
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'sjåfører') THEN
            CREATE INDEX IF NOT EXISTS idx_sjåfører_epost ON sjåfører(epost);
            CREATE INDEX IF NOT EXISTS idx_sjåfører_aktiv ON sjåfører(aktiv) WHERE aktiv = true;
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'biler') THEN
            CREATE INDEX IF NOT EXISTS idx_biler_aktiv ON biler(aktiv) WHERE aktiv = true;
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'soner') THEN
            CREATE INDEX IF NOT EXISTS idx_soner_aktiv ON soner(aktiv) WHERE aktiv = true;
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'sga_koder') THEN
            CREATE INDEX IF NOT EXISTS idx_sga_koder_skal_faktureres ON sga_koder(skal_faktureres) WHERE skal_faktureres = true;
            CREATE INDEX IF NOT EXISTS idx_sga_koder_aktiv ON sga_koder(aktiv) WHERE aktiv = true;
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'avvik_kommentarer') THEN
            CREATE INDEX IF NOT EXISTS idx_avvik_kommentarer_avvik_id ON avvik_kommentarer(avvik_id);
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'forbedringsforslag_kommentarer') THEN
            CREATE INDEX IF NOT EXISTS idx_forbedringsforslag_kommentarer_forslag_id ON forbedringsforslag_kommentarer(forbedringsforslag_id);
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'info_kort') THEN
            CREATE INDEX IF NOT EXISTS idx_info_kort_kategori ON info_kort(kategori);
            CREATE INDEX IF NOT EXISTS idx_info_kort_aktiv ON info_kort(aktiv) WHERE aktiv = true;
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'oppdrag') THEN
            CREATE INDEX IF NOT EXISTS idx_oppdrag_aktiv ON oppdrag(aktiv) WHERE aktiv = true;
        END IF;
        
        -- Analyze tables (kun hvis de eksisterer)
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'skift') THEN
            ANALYZE skift;
        END IF;
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'avvik') THEN
            ANALYZE avvik;
        END IF;
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'forbedringsforslag') THEN
            ANALYZE forbedringsforslag;
        END IF;
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'sjåfører') THEN
            ANALYZE sjåfører;
        END IF;
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'biler') THEN
            ANALYZE biler;
        END IF;
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'soner') THEN
            ANALYZE soner;
        END IF;
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'sga_koder') THEN
            ANALYZE sga_koder;
        END IF;
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'egenmelding_kvoter') THEN
            ANALYZE egenmelding_kvoter;
        END IF;
        
        -- Registrer migrasjonen
        INSERT INTO migrations (name) VALUES ('add_performance_indexes');
        
        RAISE NOTICE 'Migrasjon add_performance_indexes fullført';
    ELSE
        RAISE NOTICE 'Migrasjon add_performance_indexes allerede kjørt';
    END IF;
END $$;

-- Migrasjon: Legg til dummy-data hvis de mangler
DO $$
BEGIN
    -- Sjekk om migrasjonen allerede er kjørt
    IF NOT EXISTS (SELECT 1 FROM migrations WHERE name = 'ensure_dummy_data') THEN
        
        -- Sjekk at tabellene eksisterer før vi setter inn data
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'sjåfører') THEN
            -- Legg til test-brukere hvis de mangler
            INSERT INTO sjåfører (navn, epost, passord_hash, telefon, admin) VALUES
            ('Ole Hansen', 'ole.hansen@kstransport.no', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '+47 123 45 678', false),
            ('Kari Nordmann', 'kari.nordmann@kstransport.no', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '+47 987 65 432', false),
            ('Lars Andersen', 'lars.andersen@kstransport.no', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '+47 555 12 345', false),
            ('Admin Bruker', 'admin@kstransport.no', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '+47 000 00 000', true),
            ('Sindre', 'sindre@au11no.com', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', '+47 000 00 001', false)
            ON CONFLICT (epost) DO NOTHING;
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'biler') THEN
            -- Legg til biler hvis de mangler
            INSERT INTO biler (registreringsnummer, merke, modell, årsmodell) VALUES
            ('AB12345', 'Volvo', 'FH16', 2020),
            ('CD67890', 'Scania', 'R500', 2021),
            ('EF11111', 'MAN', 'TGX', 2019),
            ('GH22222', 'Mercedes', 'Actros', 2022)
            ON CONFLICT (registreringsnummer) DO NOTHING;
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'soner') THEN
            -- Legg til soner hvis de mangler
            INSERT INTO soner (navn, beskrivelse) 
            SELECT * FROM (VALUES
                ('Oslo Sentrum', 'Leveringer i Oslo sentrum'),
                ('Akershus', 'Leveringer i Akershus fylke'),
                ('Vestfold', 'Leveringer i Vestfold'),
                ('Østfold', 'Leveringer i Østfold'),
                ('Telemark', 'Leveringer i Telemark')
            ) AS v(navn, beskrivelse)
            WHERE NOT EXISTS (SELECT 1 FROM soner WHERE soner.navn = v.navn);
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'sga_koder') THEN
            -- Legg til SGA-koder hvis de mangler
            INSERT INTO sga_koder (kode, beskrivelse, skal_faktureres) VALUES
            ('SGA001', 'Oslo Sentrum - Standard levering', true),
            ('SGA002', 'Akershus - Standard levering', true),
            ('SGA003', 'Vestfold - Standard levering', true),
            ('SGA004', 'Intern kjøring - Ikke fakturerbar', false),
            ('SGA005', 'Vedlikehold/Service - Ikke fakturerbar', false),
            ('SGA006', 'Testkjøring - Ikke fakturerbar', false)
            ON CONFLICT (kode) DO NOTHING;
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'info_kort') THEN
            -- Legg til info-kort hvis de mangler
            INSERT INTO info_kort (kategori, navn, verdi, beskrivelse) 
            SELECT * FROM (VALUES
                ('telefon', 'Kjøre kontor', '+47 123 45 678', 'Hovedkontor for kjøreoperasjoner'),
                ('telefon', 'Sjef', '+47 987 65 432', 'Direktør/leder'),
                ('telefon', 'Vaktmester', '+47 555 12 34', 'Vaktmester for porter og sikkerhet'),
                ('kode', 'Ola Normann', '7985', 'Porter-kode for Ola Normann'),
                ('kode', 'Hovedport', '1234', 'Standard kode for hovedport'),
                ('kode', 'Sideport', '5678', 'Kode for sideport')
            ) AS v(kategori, navn, verdi, beskrivelse)
            WHERE NOT EXISTS (SELECT 1 FROM info_kort WHERE kategori = v.kategori AND navn = v.navn);
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'egenmelding_kvoter') THEN
            -- Legg til egenmelding kvoter for alle sjåfører
            INSERT INTO egenmelding_kvoter (sjåfør_id, år, egenmelding_dager, egenmelding_barn_dager, brukt_egenmelding, brukt_egenmelding_barn)
            SELECT sj.id, EXTRACT(YEAR FROM CURRENT_DATE), 4, 10, 0, 0
            FROM sjåfører sj
            WHERE NOT EXISTS (SELECT 1 FROM egenmelding_kvoter WHERE sjåfør_id = sj.id AND år = EXTRACT(YEAR FROM CURRENT_DATE));
        END IF;
        
        -- Registrer migrasjonen
        INSERT INTO migrations (name) VALUES ('ensure_dummy_data');
        
        RAISE NOTICE 'Migrasjon ensure_dummy_data fullført';
    ELSE
        RAISE NOTICE 'Migrasjon ensure_dummy_data allerede kjørt';
    END IF;
END $$;

-- Verifiser at alle kritiske tabeller eksisterer
DO $$
DECLARE
    missing_tables TEXT[] := ARRAY[]::TEXT[];
    required_tables TEXT[] := ARRAY['sjåfører', 'biler', 'soner', 'skift', 'avvik', 'forbedringsforslag', 'egenmelding_kvoter'];
    tbl TEXT;
BEGIN
    -- Sjekk hver påkrevd tabell
    FOREACH tbl IN ARRAY required_tables
    LOOP
        IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = tbl) THEN
            missing_tables := array_append(missing_tables, tbl);
        END IF;
    END LOOP;
    
    -- Hvis noen tabeller mangler, logg en advarsel
    IF array_length(missing_tables, 1) > 0 THEN
        RAISE WARNING 'Manglende tabeller funnet: %', array_to_string(missing_tables, ', ');
        RAISE WARNING 'Prøver å opprette manglende tabeller...';
        
        -- Prøv å opprette manglende tabeller (fallback)
        FOREACH tbl IN ARRAY missing_tables
        LOOP
            BEGIN
                IF tbl = 'sjåfører' THEN
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
                    RAISE NOTICE 'Tabell sjåfører opprettet (fallback)';
                ELSIF tbl = 'biler' THEN
                    CREATE TABLE biler (
                        id SERIAL PRIMARY KEY,
                        registreringsnummer VARCHAR(20) UNIQUE NOT NULL,
                        merke VARCHAR(50),
                        modell VARCHAR(50),
                        årsmodell INTEGER,
                        aktiv BOOLEAN DEFAULT true,
                        opprettet TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    );
                    RAISE NOTICE 'Tabell biler opprettet (fallback)';
                ELSIF tbl = 'soner' THEN
                    CREATE TABLE soner (
                        id SERIAL PRIMARY KEY,
                        navn VARCHAR(100) NOT NULL,
                        beskrivelse TEXT,
                        aktiv BOOLEAN DEFAULT true,
                        opprettet TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    );
                    RAISE NOTICE 'Tabell soner opprettet (fallback)';
                ELSIF tbl = 'skift' THEN
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
                    RAISE NOTICE 'Tabell skift opprettet (fallback)';
                END IF;
            EXCEPTION WHEN OTHERS THEN
                RAISE WARNING 'Kunne ikke opprette tabell %: %', tbl, SQLERRM;
            END;
        END LOOP;
    ELSE
        RAISE NOTICE '✅ Alle kritiske tabeller eksisterer!';
    END IF;
END $$;