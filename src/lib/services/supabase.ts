import { supabase } from '../supabase'
import { z } from 'zod'
import type { Database } from '../supabase'

// Types
type User = Database['public']['Tables']['users']['Row']
type Folder = Database['public']['Tables']['folders']['Row']
type Photo = Database['public']['Tables']['photos']['Row']

// Schemas de validation
const userSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2),
  password: z.string().min(6)
})

const folderSchema = z.object({
  name: z.string().min(1),
  user_id: z.string().uuid()
})

const photoSchema = z.object({
  name: z.string().min(1),
  size: z.number().min(0),
  folder_id: z.string().uuid(),
  image_data: z.string(),
  mime_type: z.string()
})

// Gestionnaire d'erreurs
class SupabaseError extends Error {
  constructor(message: string, public code?: string) {
    super(message)
    this.name = 'SupabaseError'
  }
}

export const userService = {
  async getUsers() {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw new SupabaseError(error.message, error.code)
      return data
    } catch (error) {
      console.error('Erreur lors de la récupération des utilisateurs:', error)
      throw error
    }
  },

  async getUserById(id: string) {
    try {
      const { data, error } = await supabase
        .from('users')
        .select(`
          *,
          folders:folders(*)
        `)
        .eq('id', id)
        .single()

      if (error) throw new SupabaseError(error.message, error.code)
      return data
    } catch (error) {
      console.error(`Erreur lors de la récupération de l'utilisateur ${id}:`, error)
      throw error
    }
  },

  async createUser(user: Omit<User, 'id' | 'created_at'>) {
    try {
      // Validation des données
      const validatedUser = userSchema.parse(user)

      const { data, error } = await supabase
        .from('users')
        .insert([validatedUser])
        .select()
        .single()

      if (error) throw new SupabaseError(error.message, error.code)
      return data
    } catch (error) {
      console.error('Erreur lors de la création de l\'utilisateur:', error)
      throw error
    }
  },

  async updateUser(id: string, updates: Partial<User>) {
    try {
      const { data, error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) throw new SupabaseError(error.message, error.code)
      return data
    } catch (error) {
      console.error(`Erreur lors de la mise à jour de l'utilisateur ${id}:`, error)
      throw error
    }
  },

  async deleteUser(id: string) {
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', id)

    if (error) throw error
  }
}

export const folderService = {
  async getFoldersByUserId(userId: string) {
    try {
      const { data, error } = await supabase
        .from('folders')
        .select(`
          *,
          photos:photos(*)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (error) throw new SupabaseError(error.message, error.code)
      return data
    } catch (error) {
      console.error(`Erreur lors de la récupération des dossiers pour l'utilisateur ${userId}:`, error)
      throw error
    }
  },

  async createFolder(folder: Omit<Folder, 'id' | 'created_at'>) {
    try {
      // Validation des données
      const validatedFolder = folderSchema.parse(folder)

      const { data, error } = await supabase
        .from('folders')
        .insert([validatedFolder])
        .select()
        .single()

      if (error) throw new SupabaseError(error.message, error.code)
      return data
    } catch (error) {
      console.error('Erreur lors de la création du dossier:', error)
      throw error
    }
  },

  async updateFolder(id: string, updates: Partial<Folder>) {
    try {
      const { data, error } = await supabase
        .from('folders')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) throw new SupabaseError(error.message, error.code)
      return data
    } catch (error) {
      console.error(`Erreur lors de la mise à jour du dossier ${id}:`, error)
      throw error
    }
  },

  async deleteFolder(id: string) {
    try {
      const { error } = await supabase
        .from('folders')
        .delete()
        .eq('id', id)

      if (error) throw new SupabaseError(error.message, error.code)
    } catch (error) {
      console.error(`Erreur lors de la suppression du dossier ${id}:`, error)
      throw error
    }
  }
}

export const photoService = {
  async getPhotosByFolderId(folderId: string) {
    try {
      const { data, error } = await supabase
        .from('photos')
        .select('*')
        .eq('folder_id', folderId)
        .order('uploaded_at', { ascending: false })

      if (error) throw new SupabaseError(error.message, error.code)
      return data
    } catch (error) {
      console.error(`Erreur lors de la récupération des photos pour le dossier ${folderId}:`, error)
      throw error
    }
  },

  async uploadPhoto(photo: Omit<Photo, 'id' | 'uploaded_at'>) {
    try {
      // Validation des données
      const validatedPhoto = photoSchema.parse(photo)

      const { data, error } = await supabase
        .from('photos')
        .insert([validatedPhoto])
        .select()
        .single()

      if (error) throw new SupabaseError(error.message, error.code)
      return data
    } catch (error) {
      console.error('Erreur lors de l\'upload de la photo:', error)
      throw error
    }
  },

  async deletePhoto(id: string) {
    try {
      const { error } = await supabase
        .from('photos')
        .delete()
        .eq('id', id)

      if (error) throw new SupabaseError(error.message, error.code)
    } catch (error) {
      console.error(`Erreur lors de la suppression de la photo ${id}:`, error)
      throw error
    }
  },

  async deletePhotos(ids: string[]) {
    const { error } = await supabase
      .from('photos')
      .delete()
      .in('id', ids)

    if (error) throw error
  }
} 