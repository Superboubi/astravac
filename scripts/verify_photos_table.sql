-- Vérifier la structure de la table photos
SELECT 
    column_name, 
    data_type, 
    character_maximum_length,
    is_nullable
FROM 
    information_schema.columns
WHERE 
    table_name = 'photos'
ORDER BY 
    ordinal_position;

-- Vérifier les politiques de sécurité
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM 
    pg_policies
WHERE 
    tablename = 'photos'; 