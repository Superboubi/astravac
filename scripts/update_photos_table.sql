-- Supprimer la colonne url existante
ALTER TABLE photos DROP COLUMN IF EXISTS url;

-- Ajouter la colonne image_data pour stocker les images en base64
ALTER TABLE photos ADD COLUMN image_data TEXT;

-- Ajouter une colonne mime_type pour stocker le type de l'image
ALTER TABLE photos ADD COLUMN mime_type VARCHAR(100);

-- Mettre à jour les permissions
GRANT ALL ON photos TO authenticated;
GRANT ALL ON photos TO anon;

-- Activer RLS
ALTER TABLE photos ENABLE ROW LEVEL SECURITY;

-- Créer une politique simple pour les utilisateurs authentifiés
CREATE POLICY "Enable all access for authenticated users"
ON photos
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true); 