import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Les variables d\'environnement Supabase ne sont pas définies')
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function initDatabase() {
  try {
    // Créer la table users
    const { error: usersError } = await supabase.rpc('create_users_table')
    if (usersError) throw usersError

    // Créer la table folders
    const { error: foldersError } = await supabase.rpc('create_folders_table')
    if (foldersError) throw foldersError

    // Créer la table photos
    const { error: photosError } = await supabase.rpc('create_photos_table')
    if (photosError) throw photosError

    console.log('Base de données initialisée avec succès !')
  } catch (error) {
    console.error('Erreur lors de l\'initialisation de la base de données:', error)
  }
}

initDatabase() 