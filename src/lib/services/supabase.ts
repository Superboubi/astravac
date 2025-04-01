import { supabase, type Database } from '../supabase'

type User = Database['public']['Tables']['users']['Row']
type Folder = Database['public']['Tables']['folders']['Row']
type Photo = Database['public']['Tables']['photos']['Row']

export const userService = {
  async getUsers() {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error
    return data
  },

  async getUserById(id: string) {
    const { data, error } = await supabase
      .from('users')
      .select(`
        *,
        folders:folders(*)
      `)
      .eq('id', id)
      .single()

    if (error) throw error
    return data
  },

  async createUser(user: Omit<User, 'id' | 'created_at'>) {
    const { data, error } = await supabase
      .from('users')
      .insert([user])
      .select()
      .single()

    if (error) throw error
    return data
  },

  async updateUser(id: string, updates: Partial<User>) {
    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
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
    const { data, error } = await supabase
      .from('folders')
      .select(`
        *,
        photos:photos(*)
      `)
      .eq('user_id', userId)
      .order('last_modified', { ascending: false })

    if (error) throw error
    return data
  },

  async createFolder(folder: Omit<Folder, 'id' | 'created_at'>) {
    const { data, error } = await supabase
      .from('folders')
      .insert([folder])
      .select()
      .single()

    if (error) throw error
    return data
  },

  async updateFolder(id: string, updates: Partial<Folder>) {
    const { data, error } = await supabase
      .from('folders')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  },

  async deleteFolder(id: string) {
    const { error } = await supabase
      .from('folders')
      .delete()
      .eq('id', id)

    if (error) throw error
  }
}

export const photoService = {
  async getPhotosByFolderId(folderId: string) {
    const { data, error } = await supabase
      .from('photos')
      .select('*')
      .eq('folder_id', folderId)
      .order('uploaded_at', { ascending: false })

    if (error) throw error
    return data
  },

  async uploadPhoto(photo: Omit<Photo, 'id' | 'uploaded_at'>) {
    const { data, error } = await supabase
      .from('photos')
      .insert([photo])
      .select()
      .single()

    if (error) throw error
    return data
  },

  async deletePhoto(id: string) {
    const { error } = await supabase
      .from('photos')
      .delete()
      .eq('id', id)

    if (error) throw error
  },

  async deletePhotos(ids: string[]) {
    const { error } = await supabase
      .from('photos')
      .delete()
      .in('id', ids)

    if (error) throw error
  }
} 