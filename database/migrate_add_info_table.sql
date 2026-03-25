-- Opprett tabell for info-kort (telefonnumre og koder)
CREATE TABLE info_kort (
    id SERIAL PRIMARY KEY,
    kategori VARCHAR(50) NOT NULL, -- 'telefon' eller 'kode'
    navn VARCHAR(100) NOT NULL,    -- f.eks. 'Kjøre kontor', 'Ola Normann'
    verdi VARCHAR(200) NOT NULL,   -- telefonnummer eller kode
    beskrivelse TEXT,              -- valgfri beskrivelse
    aktiv BOOLEAN DEFAULT true,
    opprettet TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    sist_endret TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Legg til noen eksempel-data
INSERT INTO info_kort (kategori, navn, verdi, beskrivelse) VALUES
('telefon', 'Kjøre kontor', '+47 123 45 678', 'Hovedkontor for kjøreoperasjoner'),
('telefon', 'Sjef', '+47 987 65 432', 'Direktør/leder'),
('telefon', 'Vaktmester', '+47 555 12 34', 'Vaktmester for porter og sikkerhet'),
('kode', 'Ola Normann', '7985', 'Porter-kode for Ola Normann'),
('kode', 'Hovedport', '1234', 'Standard kode for hovedport'),
('kode', 'Sideport', '5678', 'Kode for sideport');
