import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

// Charger les variables d'environnement
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
dotenv.config({ path: `${__dirname}/../.env.local` })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Les variables d\'environnement Supabase ne sont pas définies')
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkConnection() {
  try {
    // Vérifier la connexion en récupérant un utilisateur
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .limit(1)

    if (error) throw error

    console.log('✅ Connexion à Supabase établie avec succès')
    console.log('📊 Nombre d\'utilisateurs:', data?.length || 0)
  } catch (error) {
    console.error('❌ Erreur lors de la connexion à Supabase:', error)
  }
}

checkConnection() 