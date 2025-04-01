-- Désactiver RLS sur toutes les tables concernées
ALTER TABLE storage.objects DISABLE ROW LEVEL SECURITY;
ALTER TABLE photos DISABLE ROW LEVEL SECURITY;
ALTER TABLE folders DISABLE ROW LEVEL SECURITY;
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- Supprimer toutes les politiques existantes
DROP POLICY IF EXISTS "Allow authenticated users to upload photos" ON storage.objects;
DROP POLICY IF EXISTS "Allow public to read photos" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to delete their photos" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to insert photos" ON photos;
DROP POLICY IF EXISTS "Allow authenticated users to read photos" ON photos;
DROP POLICY IF EXISTS "Allow authenticated users to delete their photos" ON photos;
DROP POLICY IF EXISTS "Allow authenticated users to update their photos" ON photos;
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON storage.objects;
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON photos;

-- Configurer le bucket photos comme public
UPDATE storage.buckets
SET public = true
WHERE id = 'photos';

-- Donner tous les droits aux utilisateurs authentifiés
GRANT ALL ON storage.objects TO authenticated;
GRANT ALL ON photos TO authenticated;
GRANT ALL ON folders TO authenticated;
GRANT ALL ON users TO authenticated;

-- Donner tous les droits aux utilisateurs anon
GRANT ALL ON storage.objects TO anon;
GRANT ALL ON photos TO anon;
GRANT ALL ON folders TO anon;
GRANT ALL ON users TO anon; 