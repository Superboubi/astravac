-- Désactiver RLS sur les tables
ALTER TABLE photos DISABLE ROW LEVEL SECURITY;
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- Supprimer toutes les politiques créées
DROP POLICY IF EXISTS "Enable all access for admins" ON photos;
DROP POLICY IF EXISTS "Enable all access for admins" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own photos" ON photos;
DROP POLICY IF EXISTS "Users can view their own data" ON users;

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