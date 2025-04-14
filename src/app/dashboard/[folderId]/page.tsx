'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/Navbar'
import PhotoPreview from '@/components/PhotoPreview'
import { supabase } from '@/lib/supabase'
import { ImagePreview } from '@/components/ui/image-preview'

interface Photo {
  id: string
  name: string
  mime_type: string
  image_data: string
  uploaded_at: string
  size: number
  url: string
}

interface Folder {
  id: string
  name: string
  photos: Photo[]
}

export default function FolderPage({ params }: { params: { folderId: string } }) {
  const router = useRouter()
  const [folder, setFolder] = useState<Folder | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [selectedPhotos, setSelectedPhotos] = useState<string[]>([])
  const [isRenaming, setIsRenaming] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null)
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false)
  const [photoToDelete, setPhotoToDelete] = useState<string | null>(null)

  useEffect(() => {
    const fetchFolder = async () => {
      try {
        const { data: folderData, error: folderError } = await supabase
          .from('folders')
          .select('*, photos(*)')
          .eq('id', params.folderId)
          .single()

        if (folderError) throw folderError

        setFolder(folderData)
      } catch (err) {
        setError('Erreur lors du chargement du dossier')
        console.error(err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchFolder()
  }, [params.folderId])

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    const files = Array.from(e.dataTransfer.files)
    await handleFileUpload(files[0])
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files)
      await handleFileUpload(files[0])
    }
  }

  const handleFileUpload = async (file: File) => {
    try {
      const session = await supabase.auth.getSession()
      const userId = session.data.session?.user.id

      if (!userId) {
        throw new Error('Utilisateur non connecté')
      }

      // Vérifier le type de fichier
      if (!file.type.startsWith('image/')) {
        throw new Error('Seuls les fichiers image sont acceptés')
      }

      // Vérifier la taille du fichier (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        throw new Error('La taille maximale du fichier est de 5MB')
      }

      // Convertir le fichier en base64
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = async () => {
        const base64Data = reader.result as string
        const base64Content = base64Data.split(',')[1]

        // Insérer la photo dans la base de données
        const { data: photoData, error: insertError } = await supabase
          .from('photos')
          .insert({
            name: file.name,
            mime_type: file.type,
            image_data: base64Content,
            folder_id: params.folderId,
            user_id: userId,
            size: file.size
          })
          .select()
          .single()

        if (insertError) throw insertError

        // Mettre à jour l'état des photos immédiatement
        if (photoData && folder) {
          setFolder({
            ...folder,
            photos: [...folder.photos, {
              id: photoData.id,
              name: photoData.name,
              mime_type: photoData.mime_type,
              image_data: photoData.image_data,
              uploaded_at: photoData.created_at,
              size: photoData.size,
              url: `data:${photoData.mime_type};base64,${photoData.image_data}`
            }]
          })
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de l\'ajout de la photo')
      console.error(err)
    }
  }

  const handlePhotoClick = (photo: Photo, event: React.MouseEvent) => {
    // Si on est en mode sélection, on ne prévisualise pas
    if (selectedPhotos.length > 0) {
      handlePhotoSelect(photo.id)
      return
    }
    setSelectedPhoto(photo)
  }

  const handleDeleteClick = (photoId: string) => {
    setPhotoToDelete(photoId)
    setIsDeleteConfirmOpen(true)
  }

  const handleDeletePhoto = async (photoId: string) => {
    try {
      const { error } = await supabase
        .from('photos')
        .delete()
        .eq('id', photoId)

      if (error) throw error

      setFolder((prev) => {
        if (!prev) return null
        return {
          ...prev,
          photos: prev.photos.filter((photo) => photo.id !== photoId),
        }
      })
    } catch (error) {
      console.error('Erreur lors de la suppression:', error)
    } finally {
      setIsDeleteConfirmOpen(false)
      setPhotoToDelete(null)
    }
  }

  const handlePhotoSelect = (photoId: string) => {
    setSelectedPhotos((prev) => {
      if (prev.includes(photoId)) {
        return prev.filter((id) => id !== photoId)
      }
      return [...prev, photoId]
    })
  }

  const handleDeleteSelected = async () => {
    if (selectedPhotos.length === 0) return

    try {
      const { error } = await supabase
        .from('photos')
        .delete()
        .in('id', selectedPhotos)

      if (error) throw error

      setFolder((prev) => {
        if (!prev) return null
        return {
          ...prev,
          photos: prev.photos.filter((photo) => !selectedPhotos.includes(photo.id)),
        }
      })
      setSelectedPhotos([])
    } catch (error) {
      console.error('Erreur lors de la suppression:', error)
    }
  }

  const handleRenameFolder = async () => {
    if (!newFolderName.trim()) return

    try {
      const { error: updateError } = await supabase
        .from('folders')
        .update({ name: newFolderName.trim() })
        .eq('id', params.folderId)

      if (updateError) throw updateError

      setFolder((prevFolder) => {
        if (!prevFolder) return null
        return { ...prevFolder, name: newFolderName.trim() }
      })
      setIsRenaming(false)
    } catch (err) {
      setError('Erreur lors du renommage du dossier')
      console.error(err)
    }
  }

  const handleClosePreview = () => {
    setSelectedPhoto(null)
  }

  const handleRenamePhoto = (newName: string) => {
    if (selectedPhoto && folder) {
      setFolder({
        ...folder,
        photos: folder.photos.map((photo) =>
          photo.id === selectedPhoto.id ? { ...photo, name: newName } : photo
        ),
      })
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">Chargement...</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center text-red-600">{error}</div>
        </div>
      </div>
    )
  }

  if (!folder) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">Dossier non trouvé</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8 flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => router.back()}
              className="text-gray-500 hover:text-gray-700"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 19l-7-7m0 0l7-7m-7 7h18"
                />
              </svg>
            </button>
            {isRenaming ? (
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  className="px-3 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleRenameFolder()
                    if (e.key === 'Escape') {
                      setIsRenaming(false)
                      setNewFolderName('')
                    }
                  }}
                />
                <button
                  onClick={handleRenameFolder}
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
                  onClick={() => {
                    setIsRenaming(false)
                    setNewFolderName('')
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
                <h1 className="text-3xl font-bold text-gray-900">{folder?.name}</h1>
                <button
                  onClick={() => {
                    setNewFolderName(folder?.name || '')
                    setIsRenaming(true)
                  }}
                  className="text-gray-500 hover:text-gray-700"
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
              </div>
            )}
          </div>
          <div className="flex items-center space-x-4">
            {selectedPhotos.length > 0 ? (
              <>
                <span className="text-sm text-gray-500">
                  {selectedPhotos.length} photo{selectedPhotos.length > 1 ? 's' : ''} sélectionnée{selectedPhotos.length > 1 ? 's' : ''}
                </span>
                <button
                  onClick={handleDeleteSelected}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                  <svg
                    className="-ml-1 mr-2 h-5 w-5"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Supprimer
                </button>
              </>
            ) : (
              <button
                onClick={() => setSelectedPhotos([])}
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
                    d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
                    clipRule="evenodd"
                  />
                </svg>
                Sélectionner
              </button>
            )}
            <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
              {folder.photos.length} photos
            </span>
          </div>
        </div>

        <div className="mb-8">
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-all duration-200 ${
              isDragging
                ? 'border-[#50AFC9] bg-[#E6F4F8] scale-105'
                : 'border-gray-300 hover:border-[#50AFC9] hover:bg-gray-50'
            }`}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
            <input
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
              id="file-upload"
            />
            <label
              htmlFor="file-upload"
              className="cursor-pointer block"
            >
              <div className="flex flex-col items-center">
                <div className="w-16 h-16 mb-4 flex items-center justify-center rounded-full bg-blue-50">
                  <svg
                    className="w-8 h-8 text-blue-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                    />
                  </svg>
                </div>
                <p className="text-lg font-medium text-gray-900 mb-2">
                  {isDragging ? 'Déposez vos photos ici' : 'Ajoutez des photos'}
                </p>
                <p className="text-sm text-gray-500 mb-2">
                  Glissez-déposez vos photos ou{' '}
                  <span className="text-blue-500 font-medium">cliquez pour sélectionner</span>
                </p>
                <p className="text-xs text-gray-400">
                  Formats acceptés : PNG, JPG, GIF • Max 5MB par photo
                </p>
              </div>
            </label>
          </div>
        </div>

        {folder.photos.length > 0 ? (
          <div className="mt-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-4">
              {folder.photos.map((photo) => (
                <div
                  key={photo.id}
                  className={`relative group rounded-lg overflow-hidden bg-white shadow-sm hover:shadow-md transition-shadow ${
                    selectedPhotos.includes(photo.id) ? 'ring-2 ring-[#50AFC9]' : ''
                  }`}
                  onClick={(e) => handlePhotoClick(photo, e)}
                >
                  <PhotoPreview
                    url={`data:${photo.mime_type};base64,${photo.image_data}`}
                    name={photo.name}
                    uploaded_at={photo.uploaded_at}
                    onDelete={() => handleDeleteClick(photo.id)}
                  />
                  {selectedPhotos.includes(photo.id) && (
                    <div className="absolute top-2 right-2 bg-[#50AFC9] text-white rounded-full p-1">
                      <svg
                        className="h-4 w-4"
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
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="mt-8 text-center py-12 bg-gray-50 rounded-lg">
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
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <p className="text-lg font-medium text-gray-900 mb-2">
              Aucune photo dans ce dossier
            </p>
            <p className="text-sm text-gray-500">
              Commencez par ajouter des photos en utilisant la zone de dépôt ci-dessus
            </p>
          </div>
        )}

        {selectedPhoto && (
          <ImagePreview
            photo={selectedPhoto}
            onClose={handleClosePreview}
            onRename={handleRenamePhoto}
          />
        )}

        {/* Modal de confirmation de suppression */}
        {isDeleteConfirmOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Confirmer la suppression
              </h3>
              <p className="text-gray-500 mb-6">
                Êtes-vous sûr de vouloir supprimer cette photo ? Cette action est irréversible.
              </p>
              <div className="flex justify-end space-x-4">
                <button
                  onClick={() => {
                    setIsDeleteConfirmOpen(false)
                    setPhotoToDelete(null)
                  }}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                >
                  Annuler
                </button>
                <button
                  onClick={() => photoToDelete && handleDeletePhoto(photoToDelete)}
                  className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
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