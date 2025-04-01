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

-- Ajouter la colonne role à la table users
ALTER TABLE users ADD COLUMN IF NOT EXISTS role text DEFAULT 'user';

-- Mettre à jour les rôles des utilisateurs existants
UPDATE users 
SET role = 'admin' 
WHERE email = 'saillour@gmail.com';

-- Mettre à jour les autres utilisateurs en tant qu'utilisateurs normaux
UPDATE users 
SET role = 'user' 
WHERE role IS NULL;

-- Créer une politique pour les administrateurs sur les photos
CREATE POLICY "Admins can do everything" ON photos
FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM users
        WHERE users.id = auth.uid()
        AND users.role = 'admin'
    )
);

-- Créer une politique pour les administrateurs sur les dossiers
CREATE POLICY "Admins can do everything" ON folders
FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM users
        WHERE users.id = auth.uid()
        AND users.role = 'admin'
    )
);

-- Créer une politique pour les administrateurs sur le stockage
CREATE POLICY "Admins can do everything" ON storage.objects
FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM users
        WHERE users.id = auth.uid()
        AND users.role = 'admin'
    )
);

-- Créer une politique simple pour les utilisateurs
CREATE POLICY "Users can view their own data" ON users
FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- Créer une politique pour permettre aux utilisateurs de mettre à jour leur propre nom
CREATE POLICY "Users can update their own name" ON users
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Créer une politique pour permettre aux utilisateurs de gérer leurs propres photos
CREATE POLICY "Users can manage their own photos" ON photos
FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Créer une politique pour permettre aux utilisateurs de gérer leurs propres dossiers
CREATE POLICY "Users can manage their own folders" ON folders
FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Créer une politique pour permettre aux utilisateurs de gérer leurs propres photos dans le stockage
CREATE POLICY "Users can manage their own photos in storage" ON storage.objects
FOR ALL
TO authenticated
USING (
    bucket_id = 'photos' AND
    (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
    bucket_id = 'photos' AND
    (storage.foldername(name))[1] = auth.uid()::text
);

-- Activer RLS sur toutes les tables
ALTER TABLE photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY; 