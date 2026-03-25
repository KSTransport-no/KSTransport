-- Performance indekser for database-optimalisering
-- Dette skriptet legger til indekser for ofte brukte queries

-- Indekser for skift-tabellen
-- Composite index for sjåfør_id og dato (allerede eksisterer i init.sql, men sjekker)
CREATE INDEX IF NOT EXISTS idx_skift_sjåfør_dato ON skift(sjåfør_id, dato);
CREATE INDEX IF NOT EXISTS idx_skift_dato ON skift(dato);

-- Partial index for fakturert = false (for faktureringsqueries)
CREATE INDEX IF NOT EXISTS idx_skift_fakturert ON skift(fakturert) WHERE fakturert = false;

-- Indeks for godkjent queries
CREATE INDEX IF NOT EXISTS idx_skift_godkjent ON skift(godkjent) WHERE godkjent = false;

-- Indeks for bil_id (for admin queries)
CREATE INDEX IF NOT EXISTS idx_skift_bil_id ON skift(bil_id);

-- Indeks for sone_id (for admin queries)
CREATE INDEX IF NOT EXISTS idx_skift_sone_id ON skift(sone_id);

-- Indeks for registrering_type (for filtering)
CREATE INDEX IF NOT EXISTS idx_skift_registrering_type ON skift(registrering_type);

-- Composite index for fakturering queries (fakturert + registrering_type)
CREATE INDEX IF NOT EXISTS idx_skift_fakturert_type ON skift(fakturert, registrering_type) WHERE fakturert = false AND registrering_type = 'arbeidstid';

-- Indeks for sga_kode_id (for fakturering)
CREATE INDEX IF NOT EXISTS idx_skift_sga_kode_id ON skift(sga_kode_id);

-- Indekser for avvik-tabellen
-- Indeks for dato (for date range queries)
CREATE INDEX IF NOT EXISTS idx_avvik_dato ON avvik(dato);

-- Composite index for sjåfør_id og dato
CREATE INDEX IF NOT EXISTS idx_avvik_sjåfør_dato ON avvik(sjåfør_id, dato);

-- Indeks for status (for filtering)
CREATE INDEX IF NOT EXISTS idx_avvik_status ON avvik(status);

-- Indeks for skift_id (for joins)
CREATE INDEX IF NOT EXISTS idx_avvik_skift_id ON avvik(skift_id);

-- Indeks for admin_id (for admin queries)
CREATE INDEX IF NOT EXISTS idx_avvik_admin_id ON avvik(admin_id);

-- Indekser for avvik_bilder
CREATE INDEX IF NOT EXISTS idx_avvik_bilder_avvik_id ON avvik_bilder(avvik_id);

-- Indekser for forbedringsforslag
-- Composite index for sjåfør_id og status
CREATE INDEX IF NOT EXISTS idx_forbedringsforslag_sjåfør_status ON forbedringsforslag(sjåfør_id, status);

-- Indeks for status (for admin filtering)
CREATE INDEX IF NOT EXISTS idx_forbedringsforslag_status ON forbedringsforslag(status);

-- Indeks for opprettet (for sorting)
CREATE INDEX IF NOT EXISTS idx_forbedringsforslag_opprettet ON forbedringsforslag(opprettet DESC);

-- Indekser for egenmelding_kvoter
-- Composite index for sjåfør_id og år (allerede UNIQUE constraint, men eksplisitt index for performance)
CREATE INDEX IF NOT EXISTS idx_egenmelding_kvoter_sjåfør_år ON egenmelding_kvoter(sjåfør_id, år);

-- Indekser for sjåfører
-- Indeks for epost (allerede UNIQUE, men eksplisitt for performance)
CREATE INDEX IF NOT EXISTS idx_sjåfører_epost ON sjåfører(epost);

-- Indeks for aktiv (for filtering)
CREATE INDEX IF NOT EXISTS idx_sjåfører_aktiv ON sjåfører(aktiv) WHERE aktiv = true;

-- Indekser for biler
-- Indeks for aktiv (for filtering)
CREATE INDEX IF NOT EXISTS idx_biler_aktiv ON biler(aktiv) WHERE aktiv = true;

-- Indekser for soner
-- Indeks for aktiv (for filtering)
CREATE INDEX IF NOT EXISTS idx_soner_aktiv ON soner(aktiv) WHERE aktiv = true;

-- Indekser for sga_koder
-- Indeks for skal_faktureres (for fakturering queries)
CREATE INDEX IF NOT EXISTS idx_sga_koder_skal_faktureres ON sga_koder(skal_faktureres) WHERE skal_faktureres = true;

-- Indeks for aktiv (for filtering)
CREATE INDEX IF NOT EXISTS idx_sga_koder_aktiv ON sga_koder(aktiv) WHERE aktiv = true;

-- Indekser for kommentarer-tabeller
CREATE INDEX IF NOT EXISTS idx_avvik_kommentarer_avvik_id ON avvik_kommentarer(avvik_id);
CREATE INDEX IF NOT EXISTS idx_forbedringsforslag_kommentarer_forslag_id ON forbedringsforslag_kommentarer(forbedringsforslag_id);

-- Indekser for info_kort
CREATE INDEX IF NOT EXISTS idx_info_kort_kategori ON info_kort(kategori);
CREATE INDEX IF NOT EXISTS idx_info_kort_aktiv ON info_kort(aktiv) WHERE aktiv = true;

-- Indekser for oppdrag
CREATE INDEX IF NOT EXISTS idx_oppdrag_aktiv ON oppdrag(aktiv) WHERE aktiv = true;

-- Analyze tables for query planner
ANALYZE skift;
ANALYZE avvik;
ANALYZE forbedringsforslag;
ANALYZE sjåfører;
ANALYZE biler;
ANALYZE soner;
ANALYZE sga_koder;
ANALYZE egenmelding_kvoter;

