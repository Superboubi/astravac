'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState, useCallback } from 'react'
import { Navbar } from '@/components/ui/navbar'
import { supabase } from '@/lib/supabase'
import { PhotoPreview } from '@/components/ui/photo-preview'
import Image from 'next/image'

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
  image_data: string
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

      // Pour chaque dossier, récupérer ses photos
      const foldersWithPhotos = await Promise.all(
        folders.map(async (folder) => {
          const { data: photos, error: photosError } = await supabase
            .from('photos')
            .select('*')
            .eq('folder_id', folder.id)
            .order('uploaded_at', { ascending: false })

          if (photosError) throw photosError

          return {
            ...folder,
            photoCount: photos.length,
            lastModified: new Date(folder.updated_at).toLocaleDateString(),
            photos: photos.map(photo => ({
              ...photo,
              uploaded_at: new Date(photo.uploaded_at).toLocaleDateString()
            }))
          }
        })
      )

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
      console.error(err)
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
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Mes Dossiers</h1>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#50AFC9] hover:bg-[#3F8BA1] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#50AFC9]"
          >
            <svg
              className="-ml-1 mr-2 h-5 w-5"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
                clipRule="evenodd"
              />
            </svg>
            Nouveau dossier
          </button>
        </div>

        {/* Modal de création de dossier */}
        {isCreateModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Créer un nouveau dossier
              </h3>
              <div className="mb-4">
                <label htmlFor="folder-name" className="block text-sm font-medium text-gray-700 mb-1">
                  Nom du dossier
                </label>
                <input
                  type="text"
                  id="folder-name"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#50AFC9] focus:border-transparent"
                  placeholder="Entrez le nom du dossier"
                  autoFocus
                />
              </div>
              <div className="flex justify-end space-x-4">
                <button
                  onClick={() => {
                    setIsCreateModalOpen(false)
                    setNewFolderName('')
                  }}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500"
                >
                  Annuler
                </button>
                <button
                  onClick={handleCreateFolder}
                  disabled={!newFolderName.trim() || isCreating}
                  className="px-4 py-2 bg-[#50AFC9] text-white rounded-md hover:bg-[#3F8BA1] focus:outline-none focus:ring-2 focus:ring-[#50AFC9] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isCreating ? (
                    <div className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Création...
                    </div>
                  ) : (
                    'Créer'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          </div>
        ) : error ? (
          <div className="text-center text-red-600 py-8">{error}</div>
        ) : folders.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <svg
              className="w-12 h-12 mx-auto text-gray-400 mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
              />
            </svg>
            <p className="text-lg font-medium text-gray-900 mb-2">
              Aucun dossier
            </p>
            <p className="text-sm text-gray-500">
              Créez votre premier dossier pour commencer
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {folders.map((folder) => (
              <div
                key={folder.id}
                className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => router.push(`/dashboard/${folder.id}`)}
              >
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    {renamingFolderId === folder.id ? (
                      <div className="flex items-center space-x-2">
                        <input
                          type="text"
                          value={renamingFolderName}
                          onChange={(e) => setRenamingFolderName(e.target.value)}
                          className="px-3 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#50AFC9]"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleRenameFolder(folder.id)
                            if (e.key === 'Escape') {
                              setRenamingFolderId(null)
                              setRenamingFolderName('')
                            }
                          }}
                          onClick={(e) => e.stopPropagation()}
                        />
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleRenameFolder(folder.id)
                          }}
                          className="text-green-600 hover:text-green-700"
                        >
                          <svg
                            className="h-5 w-5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setRenamingFolderId(null)
                            setRenamingFolderName('')
                          }}
                          className="text-red-600 hover:text-red-700"
                        >
                          <svg
                            className="h-5 w-5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M6 18L18 6M6 6l12 12"
                            />
                          </svg>
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <h2 className="text-lg font-medium text-gray-900">
                          {folder.name}
                        </h2>
                        <div className="flex space-x-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setRenamingFolderId(folder.id)
                              setRenamingFolderName(folder.name)
                            }}
                            className="text-gray-500 hover:text-gray-700"
                            title="Renommer"
                          >
                            <svg
                              className="h-5 w-5"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                              />
                            </svg>
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setFolderToDelete(folder)
                              setIsDeleteModalOpen(true)
                            }}
                            className="text-red-500 hover:text-red-700"
                            title="Supprimer"
                          >
                            <svg
                              className="h-5 w-5"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                              />
                            </svg>
                          </button>
                        </div>
                      </div>
                    )}
                    <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                      {folder.photoCount} photos
                    </span>
                  </div>
                  <div className="text-sm text-gray-500 mb-4">
                    Dernière modification : {folder.lastModified}
                  </div>
                  {folder.photos.length > 0 && (
                    <div className="grid grid-cols-3 gap-2">
                      {folder.photos.slice(0, 3).map((photo) => (
                        <div
                          key={photo.id}
                          className="aspect-square relative rounded overflow-hidden"
                        >
                          <img
                            src={`data:${photo.mime_type};base64,${photo.image_data}`}
                            alt={photo.name}
                            className="object-cover w-full h-full"
                          />
                        </div>
                      ))}
                      {folder.photos.length > 3 && (
                        <div className="aspect-square relative rounded overflow-hidden bg-gray-100 flex items-center justify-center">
                          <span className="text-sm text-gray-500">
                            +{folder.photos.length - 3}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Modal de confirmation de suppression */}
        {isDeleteModalOpen && folderToDelete && (
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Confirmer la suppression
              </h3>
              <p className="text-gray-500 mb-6">
                Êtes-vous sûr de vouloir supprimer le dossier "{folderToDelete.name}" ? 
                Cette action supprimera également toutes les photos contenues dans le dossier et est irréversible.
              </p>
              <div className="flex justify-end space-x-4">
                <button
                  onClick={() => {
                    setIsDeleteModalOpen(false)
                    setFolderToDelete(null)
                  }}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500"
                >
                  Annuler
                </button>
                <button
                  onClick={handleDeleteFolder}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
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