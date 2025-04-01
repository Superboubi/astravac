-- Vérifier si la colonne role existe dans la table users
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name = 'role'
    ) THEN
        ALTER TABLE users ADD COLUMN role text DEFAULT 'user';
    END IF;
END $$;

-- Mettre à jour le rôle de l'utilisateur admin
UPDATE users 
SET role = 'admin' 
WHERE email = 'saillour@gmail.com';

-- Supprimer les politiques existantes pour éviter les conflits
DROP POLICY IF EXISTS "Enable all access for admins" ON photos;
DROP POLICY IF EXISTS "Enable all access for admins" ON storage.objects;

-- Créer la politique pour la table photos
CREATE POLICY "Enable all access for admins" ON photos
FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM users
        WHERE users.id = auth.uid()
        AND users.role = 'admin'
    )
);

-- Créer la politique pour le bucket photos
CREATE POLICY "Enable all access for admins" ON storage.objects
FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM users
        WHERE users.id = auth.uid()
        AND users.role = 'admin'
    )
);

-- Activer RLS sur les tables
ALTER TABLE photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Créer une politique pour que les utilisateurs puissent voir leurs propres photos
CREATE POLICY "Users can view their own photos" ON photos
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Créer une politique pour que les utilisateurs puissent voir leurs propres informations
CREATE POLICY "Users can view their own data" ON users
FOR SELECT
TO authenticated
USING (auth.uid() = id); 