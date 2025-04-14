-- Désactiver RLS sur toutes les tables
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE folders DISABLE ROW LEVEL SECURITY;
ALTER TABLE photos DISABLE ROW LEVEL SECURITY;
ALTER TABLE storage.objects DISABLE ROW LEVEL SECURITY;

-- Supprimer toutes les politiques existantes
DROP POLICY IF EXISTS "Enable all access for admins" ON photos;
DROP POLICY IF EXISTS "Enable all access for admins" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own photos" ON photos;
DROP POLICY IF EXISTS "Users can view their own data" ON users;
DROP POLICY IF EXISTS "Enable all access for admins" ON folders;
DROP POLICY IF EXISTS "Users can manage their own photos" ON photos;
DROP POLICY IF EXISTS "Users can manage their own folders" ON folders;
DROP POLICY IF EXISTS "Users can manage their own photos in storage" ON storage.objects;

-- Donner tous les droits aux utilisateurs authentifiés
GRANT ALL ON users TO authenticated;
GRANT ALL ON folders TO authenticated;
GRANT ALL ON photos TO authenticated;
GRANT ALL ON storage.objects TO authenticated;

-- Donner tous les droits aux utilisateurs anonymes
GRANT ALL ON users TO anon;
GRANT ALL ON folders TO anon;
GRANT ALL ON photos TO anon;
GRANT ALL ON storage.objects TO anon;

-- Configurer le bucket photos comme public
UPDATE storage.buckets
SET public = true
WHERE id = 'photos'; 