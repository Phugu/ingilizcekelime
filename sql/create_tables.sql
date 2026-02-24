-- quiz_results tablosuna created_at sütunu ekle
ALTER TABLE quiz_results 
ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

-- Mevcut kayıtlar için created_at değerini güncelle
UPDATE quiz_results 
SET created_at = CURRENT_TIMESTAMP 
WHERE created_at IS NULL;

-- created_at sütununu NOT NULL yap
ALTER TABLE quiz_results 
ALTER COLUMN created_at SET NOT NULL; 