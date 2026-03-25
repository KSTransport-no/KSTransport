-- Tabell for SGA-koder
CREATE TABLE sga_koder (
    id SERIAL PRIMARY KEY,
    kode VARCHAR(50) UNIQUE NOT NULL,
    beskrivelse TEXT,
    skal_faktureres BOOLEAN DEFAULT false,
    aktiv BOOLEAN DEFAULT true,
    opprettet TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    sist_endret TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
