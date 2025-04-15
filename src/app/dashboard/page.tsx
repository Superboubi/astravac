'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState, useCallback } from 'react'
import { Navbar } from '@/components/ui/navbar'
import { supabase } from '@/lib/supabase'
import { PhotoPreview } from '@/components/ui/photo-preview'
import Image from 'next/image'
import { PencilIcon, TrashIcon } from '@heroicons/react/24/outline'

interface Folder {
  id: string
  name: string
  photoCount: number
  lastModified: string
  photos: PhotoPreview[]
  created_at: string
  updated_at: string
}

interface PhotoPreview {
  id: string
  name: string
  url: string
  uploaded_at: string
  mime_type: string
}

export default function DashboardPage() {
  const router = useRouter()
  const [folders, setFolders] = useState<Folder[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isCreatingFolder, setIsCreatingFolder] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [renamingFolderId, setRenamingFolderId] = useState<string | null>(null)
  const [renamingFolderName, setRenamingFolderName] = useState('')
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [folderToDelete, setFolderToDelete] = useState<Folder | null>(null)
  const [isRenaming, setIsRenaming] = useState(false)
  const [folderToRename, setFolderToRename] = useState<Folder | null>(null)
  const [newFolderNameInput, setNewFolderNameInput] = useState('')

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

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString)
      if (isNaN(date.getTime())) {
        return 'Date inconnue'
      }
      return date.toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      })
    } catch (error) {
      console.error('Erreur de formatage de la date:', error)
      return 'Date inconnue'
    }
  }

  const fetchFolders = async (userId: string) => {
    try {
      console.log('Début du chargement des dossiers pour l\'utilisateur:', userId)

      // Récupérer les dossiers avec une requête plus simple
      const { data: folders, error: foldersError } = await supabase
        .from('folders')
        .select('*')
        .eq('user_id', userId)

      if (foldersError) {
        console.error('Erreur lors de la récupération des dossiers:', foldersError)
        throw foldersError
      }

      console.log('Dossiers récupérés:', folders)

      if (!folders || folders.length === 0) {
        setFolders([])
        setIsLoading(false)
        return
      }

      // Pour chaque dossier, récupérer uniquement les 3 premières photos
      const foldersWithPhotos = await Promise.all(
        folders.map(async (folder) => {
          try {
            console.log(`Chargement des photos pour le dossier ${folder.id}`)

            // Récupérer les photos avec une requête plus simple
            const { data: photos, error: photosError } = await supabase
              .from('photos')
              .select('*')
              .eq('folder_id', folder.id)
              .limit(3)

            if (photosError) {
              console.error(`Erreur lors du chargement des photos pour le dossier ${folder.id}:`, photosError)
              throw photosError
            }

            console.log(`Photos récupérées pour le dossier ${folder.id}:`, photos)

            return {
              ...folder,
              photoCount: photos?.length || 0,
              lastModified: formatDate(folder.updated_at),
              photos: photos || []
            }
          } catch (error) {
            console.error(`Erreur lors du traitement du dossier ${folder.id}:`, error)
            return {
              ...folder,
              photoCount: 0,
              lastModified: formatDate(folder.updated_at),
              photos: []
            }
          }
        })
      )

      console.log('Dossiers avec photos:', foldersWithPhotos)
      setFolders(foldersWithPhotos)
    } catch (error: any) {
      console.error('Erreur lors du chargement des dossiers:', error)
      setError('Erreur lors du chargement des dossiers')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return

    setIsCreating(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const { data: folderData, error: insertError } = await supabase
        .from('folders')
        .insert({
          name: newFolderName.trim(),
          user_id: session.user.id
        })
        .select()
        .single()

      if (insertError) throw insertError

      if (folderData) {
        setFolders(prev => [{
          id: folderData.id,
          name: folderData.name,
          photos: [],
          photoCount: 0,
          lastModified: new Date(folderData.created_at).toLocaleDateString(),
          created_at: folderData.created_at,
          updated_at: folderData.updated_at
        }, ...prev])
        setIsCreateModalOpen(false)
        setNewFolderName('')
      }
    } catch (err) {
      console.error('Erreur lors de la création du dossier:', err)
      setError('Erreur lors de la création du dossier')
    } finally {
      setIsCreating(false)
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
    if (!e.target.files?.length) return

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/auth/login')
        return
      }

      const imageFiles = Array.from(e.target.files).filter(file => 
        file.type.startsWith('image/')
      )

      for (const file of imageFiles) {
        // Vérifier la taille du fichier (10MB max)
        if (file.size > 10 * 1024 * 1024) {
          alert(`Le fichier ${file.name} dépasse la taille maximale de 10MB`)
          continue
        }

        // Convertir le fichier en base64
        const reader = new FileReader()
        reader.readAsDataURL(file)
        
        reader.onload = async () => {
          // Extraire uniquement la partie base64 de la chaîne
          const base64Data = (reader.result as string).split(',')[1]
          
          // Créer l'entrée dans la table photos
          const { error: dbError } = await supabase
            .from('photos')
            .insert([
              {
                name: file.name,
                size: file.size,
                folder_id: selectedFolder,
                user_id: session.user.id,
                image_data: base64Data,
                mime_type: file.type,
                uploaded_at: new Date().toISOString()
              }
            ])

          if (dbError) {
            console.error('Erreur base de données:', dbError)
            throw new Error(`Erreur lors de l'enregistrement de ${file.name}: ${dbError.message}`)
          }
        }

        reader.onerror = (error) => {
          console.error('Erreur lors de la lecture du fichier:', error)
          throw new Error(`Erreur lors de la lecture de ${file.name}`)
        }
      }

      // Rafraîchir les dossiers
      fetchFolders(session.user.id)
    } catch (error: any) {
      console.error('Erreur détaillée lors de l\'upload des photos:', error)
      setError(error.message || 'Erreur lors de l\'upload des photos')
    }
  }

  const handleDeletePhoto = async (photoId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette photo ?')) return

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

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

  const handleRenameFolder = async (folderId: string) => {
    if (!renamingFolderName.trim()) return

    try {
      const { error: updateError } = await supabase
        .from('folders')
        .update({ name: renamingFolderName.trim() })
        .eq('id', folderId)

      if (updateError) throw updateError

      setFolders((prevFolders) =>
        prevFolders.map((folder) =>
          folder.id === folderId
            ? { ...folder, name: renamingFolderName.trim() }
            : folder
        )
      )
      setRenamingFolderId(null)
      setRenamingFolderName('')
    } catch (err) {
      setError('Erreur lors du renommage du dossier')
    }
  }

  const handleDeleteFolder = async () => {
    if (!folderToDelete) return

    try {
      // Supprimer d'abord toutes les photos du dossier
      const { error: photosError } = await supabase
        .from('photos')
        .delete()
        .eq('folder_id', folderToDelete.id)

      if (photosError) throw photosError

      // Puis supprimer le dossier
      const { error: folderError } = await supabase
        .from('folders')
        .delete()
        .eq('id', folderToDelete.id)

      if (folderError) throw folderError

      // Mettre à jour l'état local
      setFolders(prev => prev.filter(folder => folder.id !== folderToDelete.id))
      setIsDeleteModalOpen(false)
      setFolderToDelete(null)
    } catch (err) {
      console.error('Erreur lors de la suppression du dossier:', err)
      setError('Erreur lors de la suppression du dossier')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#50AFC9]/10 to-[#3F8BA1]/10 p-4 md:p-8">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Mes dossiers</h1>
          <p className="mt-2 text-gray-600">Gérez vos photos et dossiers</p>
        </div>

        {error && (
          <div className="mb-4 rounded-md bg-red-50 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Erreur</h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>{error}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="mb-6 flex justify-between items-center">
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-[#50AFC9] hover:bg-[#3F8BA1] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#50AFC9]"
          >
            Nouveau dossier
          </button>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#50AFC9]"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {folders.map((folder) => (
              <div
                key={folder.id}
                className="bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-300"
              >
                <div className="p-4">
                  {renamingFolderId === folder.id ? (
                    <input
                      type="text"
                      value={renamingFolderName}
                      onChange={(e) => setRenamingFolderName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleRenameFolder(folder.id)
                        } else if (e.key === 'Escape') {
                          setRenamingFolderId(null)
                          setRenamingFolderName('')
                        }
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#50AFC9] focus:border-transparent bg-white text-gray-900"
                      autoFocus
                    />
                  ) : (
                    <div className="flex justify-between items-start">
                      <h3 className="text-lg font-medium text-gray-900">{folder.name}</h3>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => {
                            setRenamingFolderId(folder.id)
                            setRenamingFolderName(folder.name)
                          }}
                          className="text-[#50AFC9] hover:text-[#3F8BA1]"
                        >
                          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => {
                            setFolderToDelete(folder)
                            setIsDeleteModalOpen(true)
                          }}
                          className="text-red-600 hover:text-red-800"
                        >
                          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  )}
                  <p className="mt-2 text-sm text-gray-500">
                    {folder.photoCount} photo{folder.photoCount !== 1 ? 's' : ''}
                  </p>
                </div>
                <div className="px-6 py-4 bg-gray-50">
                  <button
                    onClick={() => router.push(`/dashboard/${folder.id}`)}
                    className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-[#50AFC9] hover:bg-[#3F8BA1] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#50AFC9] transition-colors duration-200"
                  >
                    Voir les photos
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {isCreateModalOpen && (
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center">
            <div className="bg-white rounded-lg p-6 max-w-md w-full">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Créer un nouveau dossier</h2>
              <input
                type="text"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleCreateFolder()
                  } else if (e.key === 'Escape') {
                    setIsCreateModalOpen(false)
                    setNewFolderName('')
                  }
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#50AFC9] focus:border-transparent"
                placeholder="Nom du dossier"
                autoFocus
              />
              <div className="mt-4 flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setIsCreateModalOpen(false)
                    setNewFolderName('')
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#50AFC9]"
                >
                  Annuler
                </button>
                <button
                  onClick={handleCreateFolder}
                  disabled={isCreating}
                  className="px-4 py-2 text-sm font-medium text-white bg-[#50AFC9] rounded-md hover:bg-[#3F8BA1] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#50AFC9] disabled:opacity-50"
                >
                  {isCreating ? 'Création...' : 'Créer'}
                </button>
              </div>
            </div>
          </div>
        )}

        {isDeleteModalOpen && folderToDelete && (
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center">
            <div className="bg-white rounded-lg p-6 max-w-md w-full">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Supprimer le dossier</h2>
              <p className="text-gray-600 mb-4">
                Êtes-vous sûr de vouloir supprimer le dossier "{folderToDelete.name}" ? Cette action est irréversible.
              </p>
              <div className="mt-4 flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setIsDeleteModalOpen(false)
                    setFolderToDelete(null)
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#50AFC9]"
                >
                  Annuler
                </button>
                <button
                  onClick={handleDeleteFolder}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                  Supprimer
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
} 