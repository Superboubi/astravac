import { createClient } from '@supabase/supabase-js'

// Configuration des en-têtes CORS
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, PUT, DELETE, OPTIONS'
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Les variables d\'environnement Supabase ne sont pas définies')
}

// Vérifier que l'URL est accessible
const checkSupabaseUrl = async () => {
  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/`, {
      headers: {
        'apikey': supabaseKey,
        ...corsHeaders
      }
    })
    if (!response.ok) {
      throw new Error(`Supabase URL inaccessible: ${response.status}`)
    }
    console.log('✅ Supabase URL accessible')
  } catch (error) {
    console.error('❌ Erreur lors de la vérification de l\'URL Supabase:', error)
  }
}

// Exécuter la vérification
checkSupabaseUrl()

export { supabaseUrl }
export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
})

// Vérifier la connexion
supabase.auth.onAuthStateChange((event, session) => {
  console.log(`Auth state changed: ${event}`, session)
})

// Exporter les types de la base de données
export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          name: string
          email: string
          role: 'user' | 'admin'
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          email: string
          role?: 'user' | 'admin'
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          email?: string
          role?: 'user' | 'admin'
          created_at?: string
        }
      }
      folders: {
        Row: {
          id: string
          name: string
          user_id: string
          photo_count: number
          last_modified: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          user_id: string
          photo_count?: number
          last_modified?: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          user_id?: string
          photo_count?: number
          last_modified?: string
          created_at?: string
        }
      }
      photos: {
        Row: {
          id: string
          name: string
          size: number
          folder_id: string
          user_id: string
          image_data: string
          mime_type: string
          uploaded_at: string
        }
        Insert: {
          id?: string
          name: string
          size: number
          folder_id: string
          user_id: string
          image_data: string
          mime_type: string
          uploaded_at?: string
        }
        Update: {
          id?: string
          name?: string
          size?: number
          folder_id?: string
          user_id?: string
          image_data?: string
          mime_type?: string
          uploaded_at?: string
        }
      }
    }
  }
}

export interface Photo {
  id: string
  name: string
  url: string
  folder_id: string
  created_at: string
  user_id: string
  mime_type: string
  image_data: string
  size: number
} 