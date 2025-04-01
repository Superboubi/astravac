import { createClient } from '@supabase/supabase-js'
import { config } from './config.ts'

export const supabase = createClient(
  config.supabase.url,
  config.supabase.anonKey
)

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
          url: string
          name: string
          size: number
          folder_id: string
          uploaded_at: string
        }
        Insert: {
          id?: string
          url: string
          name: string
          size: number
          folder_id: string
          uploaded_at?: string
        }
        Update: {
          id?: string
          url?: string
          name?: string
          size?: number
          folder_id?: string
          uploaded_at?: string
        }
      }
    }
  }
} 