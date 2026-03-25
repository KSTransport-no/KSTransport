-- Migrasjon: Legg til sone kolonne i skift tabellen
-- Dette scriptet legger til en sone kolonne for fri tekst

-- Legg til sone kolonne
ALTER TABLE skift ADD COLUMN sone VARCHAR(255);

-- Oppdater eksisterende data - flytt sone fra kommentarer til sone kolonne
UPDATE skift 
SET sone = SUBSTRING(kommentarer FROM 'Sone: ([^\n]+)')
WHERE kommentarer LIKE 'Sone: %';

-- Rydd opp i kommentarer - fjern "Sone: ..." delen
UPDATE skift 
SET kommentarer = TRIM(SUBSTRING(kommentarer FROM '\n\nKommentarer: (.+)$'))
WHERE kommentarer LIKE 'Sone: %\n\nKommentarer: %';

-- For kommentarer som bare har "Sone: ..." uten kommentarer, sett kommentarer til tom
UPDATE skift 
SET kommentarer = ''
WHERE kommentarer LIKE 'Sone: %' AND kommentarer NOT LIKE '%\n\nKommentarer: %';
