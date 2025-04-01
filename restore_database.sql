-- Désactiver toutes les politiques de sécurité
ALTER TABLE photos DISABLE ROW LEVEL SECURITY;
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE folders DISABLE ROW LEVEL SECURITY;

-- Supprimer toutes les politiques existantes
DROP POLICY IF EXISTS "Enable all access for admins" ON photos;
DROP POLICY IF EXISTS "Enable all access for admins" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own photos" ON photos;
DROP POLICY IF EXISTS "Users can view their own data" ON users;
DROP POLICY IF EXISTS "Enable all access for admins" ON folders;

-- Supprimer la colonne role si elle existe
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name = 'role'
    ) THEN
        ALTER TABLE users DROP COLUMN role;
    END IF;
END $$;

-- Réinitialiser les permissions du bucket photos
UPDATE storage.buckets
SET public = true
WHERE id = 'photos';

-- Réinitialiser les permissions des tables
GRANT ALL ON photos TO authenticated;
GRANT ALL ON users TO authenticated;
GRANT ALL ON folders TO authenticated;

-- Réinitialiser les séquences si nécessaire
SELECT setval('photos_id_seq', (SELECT COALESCE(MAX(id), 0) + 1 FROM photos));
SELECT setval('users_id_seq', (SELECT COALESCE(MAX(id), 0) + 1 FROM users));
SELECT setval('folders_id_seq', (SELECT COALESCE(MAX(id), 0) + 1 FROM folders)); 