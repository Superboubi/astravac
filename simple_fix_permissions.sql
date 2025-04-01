-- Désactiver RLS temporairement
ALTER TABLE storage.objects DISABLE ROW LEVEL SECURITY;
ALTER TABLE photos DISABLE ROW LEVEL SECURITY;

-- Supprimer toutes les politiques existantes
DROP POLICY IF EXISTS "Allow authenticated users to upload photos" ON storage.objects;
DROP POLICY IF EXISTS "Allow public to read photos" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to delete their photos" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to insert photos" ON photos;
DROP POLICY IF EXISTS "Allow authenticated users to read photos" ON photos;
DROP POLICY IF EXISTS "Allow authenticated users to delete their photos" ON photos;
DROP POLICY IF EXISTS "Allow authenticated users to update their photos" ON photos;

-- Configurer le bucket photos comme public
UPDATE storage.buckets
SET public = true
WHERE id = 'photos';

-- Donner tous les droits aux utilisateurs authentifiés
GRANT ALL ON storage.objects TO authenticated;
GRANT ALL ON photos TO authenticated;

-- Réactiver RLS avec des politiques simples
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
ALTER TABLE photos ENABLE ROW LEVEL SECURITY;

-- Créer des politiques simples
CREATE POLICY "Enable all access for authenticated users"
ON storage.objects
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Enable all access for authenticated users"
ON photos
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true); 