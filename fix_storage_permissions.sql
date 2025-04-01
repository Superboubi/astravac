-- Désactiver temporairement RLS pour le bucket photos
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Créer une politique pour permettre l'upload de fichiers
CREATE POLICY "Allow authenticated users to upload photos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'photos' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Créer une politique pour permettre la lecture des fichiers
CREATE POLICY "Allow public to read photos"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'photos');

-- Créer une politique pour permettre la suppression des fichiers
CREATE POLICY "Allow authenticated users to delete their photos"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'photos' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Configurer le bucket photos comme public
UPDATE storage.buckets
SET public = true
WHERE id = 'photos';

-- Activer RLS sur la table photos
ALTER TABLE photos ENABLE ROW LEVEL SECURITY;

-- Créer une politique pour permettre l'insertion de photos
CREATE POLICY "Allow authenticated users to insert photos"
ON photos
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Créer une politique pour permettre la lecture des photos
CREATE POLICY "Allow authenticated users to read photos"
ON photos
FOR SELECT
TO authenticated
USING (true);

-- Créer une politique pour permettre la suppression des photos
CREATE POLICY "Allow authenticated users to delete their photos"
ON photos
FOR DELETE
TO authenticated
USING (true);

-- Créer une politique pour permettre la mise à jour des photos
CREATE POLICY "Allow authenticated users to update their photos"
ON photos
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true); 