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

-- Réinitialiser les permissions du bucket photos
UPDATE storage.buckets
SET public = true
WHERE id = 'photos';

-- Réinitialiser les permissions des tables
GRANT ALL ON photos TO authenticated;
GRANT ALL ON users TO authenticated;
GRANT ALL ON folders TO authenticated; 