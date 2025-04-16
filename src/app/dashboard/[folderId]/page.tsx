'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/Navbar'
import { PhotoPreview } from '@/components/ui/photo-preview'
import { ImagePreview } from '@/components/ui/image-preview'
import { supabase } from '@/lib/supabase'
import { Photo } from '@/types'
import { PhotoPreviewProps } from '@/types/photo-preview'
import Image from 'next/image'
import { Session } from '@supabase/supabase-js'

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
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({})
  const [uploadingFiles, setUploadingFiles] = useState<string[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const photosPerPage = 12
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [isSelectionMode, setIsSelectionMode] = useState(false)
  const [editingPhoto, setEditingPhoto] = useState<{ id: string; name: string } | null>(null)
  const [session, setSession] = useState<Session | null>(null)

  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setSession(session)
    }
    getSession()
  }, [])

  useEffect(() => {
    const fetchFolder = async () => {
      try {
        setIsLoading(true)
        setError(null)

        const { data: folderData, error: folderError } = await supabase
          .from('folders')
          .select('*')
          .eq('id', params.folderId)
          .single()

        if (folderError) throw folderError

        const { data: photosData, error: photosError } = await supabase
          .from('photos')
          .select('*')
          .eq('folder_id', params.folderId)
          .order('uploaded_at', { ascending: false })
          .range((currentPage - 1) * photosPerPage, currentPage * photosPerPage - 1)

        if (photosError) throw photosError

        setFolder({
          ...folderData,
          photos: photosData || []
        })
      } catch (error: any) {
        console.error('Erreur lors du chargement du dossier:', error)
        setError('Erreur lors du chargement du dossier')
      } finally {
        setIsLoading(false)
      }
    }

    fetchFolder()
  }, [params.folderId, currentPage])

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
      for (const file of files) {
        await handleFileUpload(file)
      }
    }
  }

  const compressImage = async (file: File): Promise<File> => {
    return new Promise<File>((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = (event) => {
        const img = document.createElement('img')
        img.src = event.target?.result as string
        img.onload = () => {
          const canvas = document.createElement('canvas')
          let width = img.naturalWidth
          let height = img.naturalHeight

          // Calculer les nouvelles dimensions pour ne pas dépasser 1920px
          const MAX_SIZE = 1920
          if (width > height && width > MAX_SIZE) {
            height = Math.round((height * MAX_SIZE) / width)
            width = MAX_SIZE
          } else if (height > MAX_SIZE) {
            width = Math.round((width * MAX_SIZE) / height)
            height = MAX_SIZE
          }

          canvas.width = width
          canvas.height = height
          const ctx = canvas.getContext('2d')
          if (!ctx) {
            reject(new Error('Impossible de créer le contexte canvas'))
            return
          }

          // Utiliser une meilleure qualité de rendu
          ctx.imageSmoothingEnabled = true
          ctx.imageSmoothingQuality = 'high'
          ctx.drawImage(img, 0, 0, width, height)

          // Convertir en JPEG avec une qualité de 0.8
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error('Impossible de compresser l\'image'))
                return
              }
              const compressedFile = new File([blob], file.name, {
                type: 'image/jpeg',
                lastModified: Date.now(),
              })
              resolve(compressedFile)
            },
            'image/jpeg',
            0.8
          )
        }
        img.onerror = () => reject(new Error('Erreur lors du chargement de l\'image'))
      }
      reader.onerror = () => reject(new Error('Erreur lors de la lecture du fichier'))
    })
  }

  const handleFileUpload = async (file: File) => {
    if (!session?.user?.id) {
      console.error('Utilisateur non connecté')
      return
    }

    try {
      const userId = session.user.id
      const timestamp = new Date().getTime()
      const randomString = Math.random().toString(36).substring(2, 15)
      const uniqueFileName = `${userId}/${params.folderId}/${timestamp}-${randomString}-${file.name}`

      // Compression de l'image
      const compressedImage = await compressImage(file)
      if (!compressedImage) {
        throw new Error('Erreur lors de la compression de l\'image')
      }

      // Vérification des permissions du bucket
      const { data: bucketData, error: bucketError } = await supabase
        .storage
        .from('photos')
        .list(userId)

      if (bucketError && bucketError.message !== 'The resource was not found') {
        throw bucketError
      }

      // Upload de l'image compressée avec cache optimisé
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('photos')
        .upload(uniqueFileName, compressedImage, {
          cacheControl: '31536000',
          upsert: false
        })

      if (uploadError) throw uploadError

      // Récupération de l'URL publique
      const { data: { publicUrl } } = supabase.storage
        .from('photos')
        .getPublicUrl(uniqueFileName)

      // Insertion dans la base de données
      const { data: photoData, error: insertError } = await supabase
        .from('photos')
        .insert({
          name: file.name,
          url: publicUrl,
          size: compressedImage.size,
          folder_id: params.folderId,
          user_id: userId,
          uploaded_at: new Date().toISOString()
        })
        .select()
        .single()

      if (insertError) throw insertError

      if (photoData) {
        setFolder((prev) => {
          if (!prev) return null
          const sortedPhotos = [...prev.photos, photoData].sort(
            (a, b) => new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime()
          )
          return {
            ...prev,
            photos: sortedPhotos,
          }
        })
      }
    } catch (error) {
      console.error('Erreur lors de l\'upload:', error)
    }
  }

  const handleSelectionModeToggle = () => {
    setIsSelectionMode(!isSelectionMode)
    if (!isSelectionMode) {
      setSelectedPhotos([])
    }
  }

  const handlePhotoClick = (photo: Photo, event: React.MouseEvent) => {
    event.stopPropagation()
    
    if (isSelectionMode) {
      handlePhotoSelect(photo.id)
      return
    }
    
    setSelectedPhoto(photo)
  }

  const handleDownloadPhoto = async (photo: Photo) => {
    try {
      const response = await fetch(photo.url)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = photo.name
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('Erreur lors du téléchargement:', error)
      setError('Erreur lors du téléchargement de la photo')
    }
  }

  const handleDeleteClick = (photoId: string) => {
    setPhotoToDelete(photoId)
    setIsDeleteConfirmOpen(true)
  }

  const handleDeletePhoto = async (photoId: string) => {
    try {
      // Récupérer d'abord les informations de la photo
      const { data: photoData, error: fetchError } = await supabase
        .from('photos')
        .select('*')
        .eq('id', photoId)
        .single()

      if (fetchError) throw fetchError

      if (photoData) {
        // Extraire le chemin du fichier de l'URL
        const fileUrl = new URL(photoData.url)
        const filePath = fileUrl.pathname.split('/photos/')[1]

        // Supprimer le fichier du bucket
        const { error: storageError } = await supabase.storage
          .from('photos')
          .remove([filePath])

        if (storageError) {
          console.error('Erreur lors de la suppression du fichier:', storageError)
        }

        // Supprimer l'entrée de la base de données
        const { error: dbError } = await supabase
          .from('photos')
          .delete()
          .eq('id', photoId)

        if (dbError) throw dbError

        setFolder((prev) => {
          if (!prev) return null
          const sortedPhotos = [...prev.photos]
            .filter(p => p.id !== photoId)
            .sort((a, b) => new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime())
          return {
            ...prev,
            photos: sortedPhotos,
          }
        })
      }
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
      // Récupérer les informations des photos sélectionnées
      const { data: photosData, error: fetchError } = await supabase
        .from('photos')
        .select('*')
        .in('id', selectedPhotos)

      if (fetchError) throw fetchError

      if (photosData) {
        // Supprimer les fichiers du bucket
        const filePaths = photosData.map(photo => {
          const fileUrl = new URL(photo.url)
          return fileUrl.pathname.split('/photos/')[1]
        })

        const { error: storageError } = await supabase.storage
          .from('photos')
          .remove(filePaths)

        if (storageError) {
          console.error('Erreur lors de la suppression des fichiers:', storageError)
        }

        // Supprimer les entrées de la base de données
        const { error: dbError } = await supabase
          .from('photos')
          .delete()
          .in('id', selectedPhotos)

        if (dbError) throw dbError

        setFolder((prev) => {
          if (!prev) return null
          return {
            ...prev,
            photos: prev.photos.filter((photo) => !selectedPhotos.includes(photo.id)),
          }
        })
        setSelectedPhotos([])
      }
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

  const handleRenamePhoto = async (photoId: string, newName: string) => {
    try {
      const { error } = await supabase
        .from('photos')
        .update({ name: newName })
        .eq('id', photoId)

      if (error) throw error

      setFolder((prev) => {
        if (!prev) return null
        return {
          ...prev,
          photos: prev.photos.map((photo) =>
            photo.id === photoId ? { ...photo, name: newName } : photo
          ),
        }
      })
      setEditingPhoto(null)
    } catch (error) {
      console.error('Erreur lors du renommage:', error)
      setError('Erreur lors du renommage de la photo')
    }
  }

  const handleScroll = useCallback(() => {
    if (
      window.innerHeight + document.documentElement.scrollTop >=
      document.documentElement.scrollHeight - 100 &&
      !isLoadingMore &&
      folder?.photos.length &&
      currentPage * photosPerPage < folder.photos.length
    ) {
      setIsLoadingMore(true)
      setCurrentPage((prev) => prev + 1)
      setIsLoadingMore(false)
    }
  }, [currentPage, isLoadingMore, folder?.photos.length])

  useEffect(() => {
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [handleScroll])

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
                onClick={handleSelectionModeToggle}
                className={`inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
                  isSelectionMode ? 'bg-[#50AFC9] hover:bg-[#3F8BA1]' : 'bg-gray-600 hover:bg-gray-700'
                } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#50AFC9]`}
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
                {isSelectionMode ? 'Annuler la sélection' : 'Sélectionner'}
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
              multiple
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
              {folder.photos
                .slice(0, currentPage * photosPerPage)
                .map((photo) => (
                  <div
                    key={photo.id}
                    className={`relative group rounded-lg overflow-hidden bg-white shadow-sm hover:shadow-md transition-shadow cursor-pointer ${
                      selectedPhotos.includes(photo.id) ? 'ring-2 ring-[#50AFC9]' : ''
                    }`}
                    onClick={(e) => handlePhotoClick(photo, e)}
                  >
                    <div className="relative aspect-square">
                      <Image
                        src={photo.url}
                        alt={photo.name}
                        fill
                        sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                        className="object-cover"
                        loading="lazy"
                        quality={80}
                      />
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-opacity duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100">
                        <div className="flex space-x-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDownloadPhoto(photo)
                            }}
                            className="bg-white p-2 rounded-full hover:bg-gray-100 transition-colors"
                            title="Télécharger"
                          >
                            <svg
                              className="w-5 h-5 text-gray-700"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                              />
                            </svg>
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setEditingPhoto({ id: photo.id, name: photo.name })
                            }}
                            className="bg-white p-2 rounded-full hover:bg-gray-100 transition-colors"
                            title="Renommer"
                          >
                            <svg
                              className="w-5 h-5 text-gray-700"
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
                              handleDeleteClick(photo.id)
                            }}
                            className="bg-white p-2 rounded-full hover:bg-gray-100 transition-colors"
                            title="Supprimer"
                          >
                            <svg
                              className="w-5 h-5 text-red-500"
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
                    </div>
                    <div className="p-2">
                      {editingPhoto?.id === photo.id ? (
                        <div className="flex items-center space-x-2">
                          <input
                            type="text"
                            value={editingPhoto.name}
                            onChange={(e) => setEditingPhoto({ ...editingPhoto, name: e.target.value })}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                handleRenamePhoto(photo.id, editingPhoto.name)
                              } else if (e.key === 'Escape') {
                                setEditingPhoto(null)
                              }
                            }}
                            className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#50AFC9] focus:border-transparent"
                            autoFocus
                          />
                          <button
                            onClick={() => handleRenamePhoto(photo.id, editingPhoto.name)}
                            className="text-green-600 hover:text-green-700"
                          >
                            <svg
                              className="w-5 h-5"
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
                            onClick={() => setEditingPhoto(null)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <svg
                              className="w-5 h-5"
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
                        <>
                          <h3 className="text-sm font-medium text-gray-900 truncate">{photo.name}</h3>
                          <p className="text-xs text-gray-500">
                            Ajoutée le {new Date(photo.uploaded_at).toLocaleDateString('fr-FR', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            })}
                          </p>
                        </>
                      )}
                    </div>
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
            {isLoadingMore && (
              <div className="text-center py-4">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-[#50AFC9] border-t-transparent"></div>
              </div>
            )}
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

        {selectedPhoto && !isSelectionMode && (
          <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
            <div className="relative w-full max-w-4xl bg-white rounded-lg overflow-hidden">
              <button
                onClick={() => setSelectedPhoto(null)}
                className="absolute top-4 right-4 z-10 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
                aria-label="Fermer"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M18 6 6 18" />
                  <path d="m6 6 12 12" />
                </svg>
              </button>

              <div className="relative aspect-video w-full">
                <Image
                  src={selectedPhoto.url}
                  alt={selectedPhoto.name}
                  fill
                  className="object-contain"
                  priority
                />
              </div>

              <div className="p-4 bg-white">
                <div className="flex items-center justify-between">
                  {editingPhoto?.id === selectedPhoto.id ? (
                    <div className="flex items-center space-x-2 flex-1">
                      <input
                        type="text"
                        value={editingPhoto.name}
                        onChange={(e) => setEditingPhoto({ ...editingPhoto, name: e.target.value })}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleRenamePhoto(selectedPhoto.id, editingPhoto.name)
                          } else if (e.key === 'Escape') {
                            setEditingPhoto(null)
                          }
                        }}
                        className="flex-1 px-3 py-2 text-lg border border-gray-300 rounded bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#50AFC9] focus:border-transparent"
                        autoFocus
                      />
                      <button
                        onClick={() => handleRenamePhoto(selectedPhoto.id, editingPhoto.name)}
                        className="text-green-600 hover:text-green-700"
                      >
                        <svg
                          className="w-5 h-5"
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
                        onClick={() => setEditingPhoto(null)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <svg
                          className="w-5 h-5"
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
                    <>
                      <h3 className="text-lg font-medium text-gray-900">{selectedPhoto.name}</h3>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => setEditingPhoto({ id: selectedPhoto.id, name: selectedPhoto.name })}
                          className="p-2 text-gray-500 hover:text-gray-700"
                          title="Renommer"
                        >
                          <svg
                            className="w-5 h-5"
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
                          onClick={() => handleDownloadPhoto(selectedPhoto)}
                          className="p-2 text-gray-500 hover:text-gray-700"
                          title="Télécharger"
                        >
                          <svg
                            className="w-5 h-5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                            />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDeleteClick(selectedPhoto.id)}
                          className="p-2 text-red-500 hover:text-red-700"
                          title="Supprimer"
                        >
                          <svg
                            className="w-5 h-5"
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
                    </>
                  )}
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  Ajoutée le {new Date(selectedPhoto.uploaded_at).toLocaleDateString('fr-FR', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
              </div>
            </div>
          </div>
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

        {uploadingFiles.length > 0 && (
          <div className="mt-4 space-y-2">
            {uploadingFiles.map((fileName) => (
              <div key={fileName} className="bg-white rounded-lg shadow p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-900 truncate">
                    {fileName}
                  </span>
                  <span className="text-sm text-gray-500">
                    {uploadProgress[fileName]}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-[#50AFC9] h-2 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress[fileName]}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
} 