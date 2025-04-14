import { createClient } from '@supabase/supabase-js'
import config from './config'

// Configuration des en-têtes CORS
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, PUT, DELETE, OPTIONS'
}

// Vérifier que l'URL est accessible
const checkSupabaseUrl = async () => {
  try {
    const response = await fetch(config.supabase.url)
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

export const supabase = createClient(
  config.supabase.url,
  config.supabase.anonKey,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      storageKey: 'supabase.auth.token',
      storage: typeof window !== 'undefined' ? window.localStorage : undefined,
      flowType: 'pkce',
      debug: true
    },
    db: {
      schema: 'public'
    },
    global: {
      headers: {
        'x-application-name': 'photo-gallery',
        ...corsHeaders
      }
    },
    realtime: {
      params: {
        eventsPerSecond: 10
      }
    }
  }
)

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