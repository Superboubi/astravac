-- Activer RLS sur les tables
ALTER TABLE photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE folders ENABLE ROW LEVEL SECURITY;

-- Politique pour les photos
CREATE POLICY "Users can manage their own photos" ON photos
FOR ALL
TO authenticated
USING (auth.uid() = user_id);

-- Politique pour les dossiers
CREATE POLICY "Users can manage their own folders" ON folders
FOR ALL
TO authenticated
USING (auth.uid() = user_id);

-- Politique pour les utilisateurs
CREATE POLICY "Users can view their own data" ON users
FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- Politique pour le stockage
CREATE POLICY "Users can manage their own photos in storage" ON storage.objects
FOR ALL
TO authenticated
USING (
    bucket_id = 'photos' AND
    (storage.foldername(name))[1] = auth.uid()::text
);

-- Rendre le bucket photos public pour l'accès en lecture
UPDATE storage.buckets
SET public = true
WHERE id = 'photos';

-- Donner les permissions nécessaires
GRANT ALL ON photos TO authenticated;
GRANT ALL ON folders TO authenticated;
GRANT SELECT ON users TO authenticated; 