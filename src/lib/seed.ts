import { supabase } from './supabase'
import { ArrowLeft, FolderPlus, Upload, Edit2, Trash2, Image as ImageIcon, Folder, Download, X } from 'lucide-react'

async function seedDatabase() {
  try {
    // Créer un utilisateur admin
    const { data: adminUser, error: adminError } = await supabase
      .from('users')
      .insert([
        {
          name: 'Admin',
          email: 'admin@example.com',
          role: 'admin'
        }
      ])
      .select()
      .single()

    if (adminError) throw adminError
    console.log('Admin user created:', adminUser)

    // Créer un utilisateur normal
    const { data: normalUser, error: userError } = await supabase
      .from('users')
      .insert([
        {
          name: 'John Doe',
          email: 'john@example.com',
          role: 'user'
        }
      ])
      .select()
      .single()

    if (userError) throw userError
    console.log('Normal user created:', normalUser)

    // Créer des dossiers pour l'utilisateur normal
    const { data: folders, error: foldersError } = await supabase
      .from('folders')
      .insert([
        {
          name: 'Vacances',
          user_id: normalUser.id,
          photo_count: 0
        },
        {
          name: 'Famille',
          user_id: normalUser.id,
          photo_count: 0
        }
      ])
      .select()

    if (foldersError) throw foldersError
    console.log('Folders created:', folders)

    // Créer quelques photos dans le dossier Vacances
    const { data: photos, error: photosError } = await supabase
      .from('photos')
      .insert([
        {
          url: 'https://picsum.photos/800/600',
          name: 'Photo 1',
          size: 1024,
          folder_id: folders[0].id
        },
        {
          url: 'https://picsum.photos/800/600',
          name: 'Photo 2',
          size: 2048,
          folder_id: folders[0].id
        }
      ])
      .select()

    if (photosError) throw photosError
    console.log('Photos created:', photos)

    console.log('Database seeded successfully!')
  } catch (error) {
    console.error('Error seeding database:', error)
  }
}

// Exécuter le script
seedDatabase() 