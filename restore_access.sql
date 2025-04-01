-- Désactiver RLS sur toutes les tables
ALTER TABLE photos DISABLE ROW LEVEL SECURITY;
ALTER TABLE folders DISABLE ROW LEVEL SECURITY;
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- Supprimer toutes les politiques existantes
DROP POLICY IF EXISTS "Admins can do everything" ON photos;
DROP POLICY IF EXISTS "Admins can do everything" ON folders;
DROP POLICY IF EXISTS "Admins can do everything" ON users;
DROP POLICY IF EXISTS "Admins can do everything" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own data" ON users;
DROP POLICY IF EXISTS "Users can update their own name" ON users;
DROP POLICY IF EXISTS "Users can view their own photos" ON photos;
DROP POLICY IF EXISTS "Users can manage their own photos" ON photos;
DROP POLICY IF EXISTS "Users can manage their own folders" ON folders;
DROP POLICY IF EXISTS "Users can manage their own photos in storage" ON storage.objects;

-- Donner tous les droits aux utilisateurs authentifiés
GRANT ALL ON photos TO authenticated;
GRANT ALL ON folders TO authenticated;
GRANT ALL ON users TO authenticated; 