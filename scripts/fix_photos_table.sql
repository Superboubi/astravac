-- Supprimer les politiques existantes
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON photos;
DROP POLICY IF EXISTS "Users can manage their own photos" ON photos;
DROP POLICY IF EXISTS "Users can view their own photos" ON photos;

-- Ajouter la colonne user_id si elle n'existe pas
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'photos' 
        AND column_name = 'user_id'
    ) THEN
        ALTER TABLE photos ADD COLUMN user_id UUID REFERENCES auth.users(id);
    END IF;
END $$;

-- Mettre à jour les permissions
GRANT ALL ON photos TO authenticated;
GRANT ALL ON photos TO anon;

-- Activer RLS
ALTER TABLE photos ENABLE ROW LEVEL SECURITY;

-- Créer une politique simple pour les utilisateurs authentifiés
CREATE POLICY "Users can manage their own photos"
ON photos
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id); 