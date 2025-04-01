'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState, useCallback } from 'react'
import { Navbar } from '@/components/ui/navbar'
import { supabase } from '@/lib/supabase'
import { PhotoPreview } from '@/components/ui/photo-preview'

interface Folder {
  id: string
  name: string
  photoCount: number
  lastModified: string
  photos: Photo[]
  created_at: string
  updated_at: string
}

interface Photo {
  id: string
  url: string
  name: string
  size: number
  uploaded_at: string
  folder_id: string
  user_id: string
}

export default function DashboardPage() {
  const router = useRouter()
  const [folders, setFolders] = useState<Folder[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/auth/login')
        return
      }
      fetchFolders(session.user.id)
    }
    checkAuth()
  }, [router])

  const fetchFolders = async (userId: string) => {
    try {
      // Récupérer les dossiers
      const { data: folders, error: foldersError } = await supabase
        .from('folders')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (foldersError) throw foldersError

      // Récupérer toutes les photos en une seule requête
      const { data: photos, error: photosError } = await supabase
        .from('photos')
        .select('*')
        .eq('user_id', userId)
        .order('uploaded_at', { ascending: false })

      if (photosError) throw photosError

      // Organiser les photos par dossier
      const foldersWithPhotos = folders
        .filter(folder => folder.user_id === userId)
        .map(folder => ({
          ...folder,
          photoCount: photos.filter(photo => 
            photo.folder_id === folder.id && 
            photo.user_id === userId
          ).length,
          lastModified: new Date(folder.updated_at).toLocaleDateString(),
          photos: photos
            .filter(photo => 
              photo.folder_id === folder.id && 
              photo.user_id === userId
            )
            .map(photo => ({
              ...photo,
              uploaded_at: new Date(photo.uploaded_at).toLocaleDateString()
            }))
        }))

      setFolders(foldersWithPhotos)
    } catch (error: any) {
      console.error('Erreur lors du chargement des dossiers:', error)
      setError('Erreur lors du chargement des dossiers')
    } finally {
      setIsLoading(false)
    }
  }

  const createNewFolder = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    const folderName = prompt('Nom du nouveau dossier:')
    if (!folderName) return

    try {
      const { data, error } = await supabase
        .from('folders')
        .insert([
          {
            name: folderName,
            user_id: session.user.id
          }
        ])
        .select()
        .single()

      if (error) throw error

      setFolders(prev => [{
        ...data,
        photoCount: 0,
        lastModified: new Date(data.created_at).toLocaleDateString(),
        photos: []
      }, ...prev])
    } catch (error: any) {
      console.error('Erreur lors de la création du dossier:', error)
      setError('Erreur lors de la création du dossier')
    }
  }

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    if (!selectedFolder) {
      alert('Veuillez sélectionner un dossier avant de déposer des photos')
      return
    }

    const files = Array.from(e.dataTransfer.files)
    const imageFiles = files.filter(file => file.type.startsWith('image/'))

    if (imageFiles.length === 0) {
      alert('Veuillez déposer uniquement des fichiers images')
      return
    }

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      for (const file of imageFiles) {
        // Vérifier la taille du fichier (10MB max)
        if (file.size > 10 * 1024 * 1024) {
          alert(`Le fichier ${file.name} dépasse la taille maximale de 10MB`)
          continue
        }

        // Upload le fichier dans Supabase Storage
        const fileExt = file.name.split('.').pop()
        const fileName = `${Math.random()}.${fileExt}`
        const filePath = `${session.user.id}/${selectedFolder}/${fileName}`

        const { error: uploadError } = await supabase.storage
          .from('photos')
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false,
            contentType: file.type
          })

        if (uploadError) {
          console.error('Erreur d\'upload:', uploadError)
          throw new Error(`Erreur lors de l'upload de ${file.name}: ${uploadError.message}`)
        }

        // Récupérer l'URL publique
        const { data: { publicUrl } } = supabase.storage
          .from('photos')
          .getPublicUrl(filePath)

        // Créer l'entrée dans la table photos
        const { error: dbError } = await supabase
          .from('photos')
          .insert([
            {
              name: file.name,
              url: publicUrl,
              size: file.size,
              folder_id: selectedFolder,
              user_id: session.user.id,
              uploaded_at: new Date().toISOString()
            }
          ])

        if (dbError) {
          console.error('Erreur base de données:', dbError)
          throw new Error(`Erreur lors de l'enregistrement de ${file.name}: ${dbError.message}`)
        }
      }

      // Rafraîchir les dossiers
      fetchFolders(session.user.id)
    } catch (error: any) {
      console.error('Erreur lors de l\'upload des photos:', error)
      setError(error.message || 'Erreur lors de l\'upload des photos')
    }
  }, [selectedFolder])

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedFolder) {
      alert('Veuillez sélectionner un dossier avant d\'ajouter des photos')
      return
    }

    const files = Array.from(e.target.files || [])
    const imageFiles = files.filter(file => file.type.startsWith('image/'))

    if (imageFiles.length === 0) {
      alert('Veuillez sélectionner uniquement des fichiers images')
      return
    }

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      for (const file of imageFiles) {
        // Vérifier la taille du fichier (10MB max)
        if (file.size > 10 * 1024 * 1024) {
          alert(`Le fichier ${file.name} dépasse la taille maximale de 10MB`)
          continue
        }

        // Upload le fichier dans Supabase Storage
        const fileExt = file.name.split('.').pop()
        const fileName = `${Math.random()}.${fileExt}`
        const filePath = `${session.user.id}/${selectedFolder}/${fileName}`

        const { error: uploadError } = await supabase.storage
          .from('photos')
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false,
            contentType: file.type
          })

        if (uploadError) {
          console.error('Erreur d\'upload:', uploadError)
          throw new Error(`Erreur lors de l'upload de ${file.name}: ${uploadError.message}`)
        }

        // Récupérer l'URL publique
        const { data: { publicUrl } } = supabase.storage
          .from('photos')
          .getPublicUrl(filePath)

        // Créer l'entrée dans la table photos
        const { error: dbError } = await supabase
          .from('photos')
          .insert([
            {
              name: file.name,
              url: publicUrl,
              size: file.size,
              folder_id: selectedFolder,
              user_id: session.user.id,
              uploaded_at: new Date().toISOString()
            }
          ])

        if (dbError) {
          console.error('Erreur base de données:', dbError)
          throw new Error(`Erreur lors de l'enregistrement de ${file.name}: ${dbError.message}`)
        }
      }

      // Rafraîchir les dossiers
      fetchFolders(session.user.id)
    } catch (error: any) {
      console.error('Erreur lors de l\'upload des photos:', error)
      setError(error.message || 'Erreur lors de l\'upload des photos')
    }
  }

  const handleDeletePhoto = async (photoId: string, photoUrl: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette photo ?')) return

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      // Extraire le chemin du fichier de l'URL
      const urlParts = photoUrl.split('/')
      const filePath = urlParts.slice(-3).join('/') // Prend les 3 dernières parties de l'URL

      // Supprimer le fichier du stockage
      const { error: storageError } = await supabase.storage
        .from('photos')
        .remove([filePath])

      if (storageError) {
        console.error('Erreur lors de la suppression du fichier:', storageError)
        throw new Error('Erreur lors de la suppression du fichier')
      }

      // Supprimer l'entrée de la base de données
      const { error: dbError } = await supabase
        .from('photos')
        .delete()
        .eq('id', photoId)

      if (dbError) {
        console.error('Erreur lors de la suppression de la photo:', dbError)
        throw new Error('Erreur lors de la suppression de la photo')
      }

      // Rafraîchir les dossiers
      fetchFolders(session.user.id)
    } catch (error: any) {
      console.error('Erreur lors de la suppression:', error)
      setError(error.message || 'Erreur lors de la suppression de la photo')
    }
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar />
      <div className="flex pt-4">
        {/* Sidebar */}
        <div className="w-64 bg-white shadow-lg min-h-[calc(100vh-64px)] sticky top-16">
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Mes Dossiers</h2>
              <button
                onClick={createNewFolder}
                className="bg-blue-500 text-white p-2 rounded-lg hover:bg-blue-600 transition-colors"
                title="Nouveau dossier"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            </div>
            <div className="space-y-2 max-h-[calc(100vh-200px)] overflow-y-auto">
              {folders.map((folder) => (
                <div
                  key={folder.id}
                  className={`p-3 rounded-lg cursor-pointer transition-colors group ${
                    selectedFolder === folder.id
                      ? 'bg-blue-100 text-blue-700'
                      : 'hover:bg-gray-100'
                  }`}
                  onClick={() => setSelectedFolder(folder.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className={`h-5 w-5 ${
                          selectedFolder === folder.id ? 'text-blue-700' : 'text-gray-400'
                        }`}
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M2 6a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1H2V6zm0 3v6a2 2 0 002 2h12a2 2 0 002-2V9H2z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <span className="font-medium truncate">{folder.name}</span>
                    </div>
                    <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                      {folder.photoCount}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Modifié le {folder.lastModified}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 px-8">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-2xl font-bold">Tableau de bord</h1>
              {selectedFolder && (
                <div className="flex items-center space-x-2">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5 text-gray-400"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M2 6a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1H2V6zm0 3v6a2 2 0 002 2h12a2 2 0 002-2V9H2z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span className="text-gray-600">
                    {folders.find(f => f.id === selectedFolder)?.name}
                  </span>
                </div>
              )}
            </div>

            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                {error}
              </div>
            )}

            {isLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
              </div>
            ) : (
              <>
                {/* Zone de dépôt */}
                <div
                  className={`border-2 border-dashed rounded-lg p-8 text-center mb-8 transition-colors ${
                    isDragging
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-300 hover:border-blue-500'
                  }`}
                  onDragEnter={handleDragEnter}
                  onDragLeave={handleDragLeave}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                >
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={handleFileSelect}
                    id="file-upload"
                  />
                  <label
                    htmlFor="file-upload"
                    className="cursor-pointer text-blue-500 hover:text-blue-600"
                  >
                    <div className="text-4xl mb-2">📸</div>
                    <p className="text-lg mb-2">
                      Glissez-déposez vos photos ici ou cliquez pour sélectionner
                    </p>
                    <p className="text-sm text-gray-500">
                      Formats acceptés : JPG, PNG, GIF (max 10MB)
                    </p>
                  </label>
                </div>

                {/* Photos récentes */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {selectedFolder ? (
                    // Afficher les photos du dossier sélectionné
                    folders
                      .find(f => f.id === selectedFolder)
                      ?.photos
                      .sort((a, b) => new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime())
                      .map((photo) => (
                        <PhotoPreview
                          key={photo.id}
                          url={photo.url}
                          name={photo.name}
                          uploaded_at={photo.uploaded_at}
                          onDelete={() => handleDeletePhoto(photo.id, photo.url)}
                        />
                      ))
                  ) : (
                    // Afficher un message si aucun dossier n'est sélectionné
                    <div className="col-span-full text-center py-12">
                      <div className="text-4xl mb-4">📁</div>
                      <p className="text-lg text-gray-600">
                        Sélectionnez un dossier pour voir ses photos
                      </p>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
} 