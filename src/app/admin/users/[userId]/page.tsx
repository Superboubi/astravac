'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState, useCallback } from 'react'
import { AdminNavbar } from '@/components/ui/admin-navbar'
import { supabase } from '@/lib/supabase'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, FolderPlus, Upload, Edit2, Trash2, Image as ImageIcon, Folder, Download, X, ChevronDown, ChevronUp } from 'lucide-react'
import { PhotoGrid } from '@/components/PhotoGrid'
import Image from 'next/image'

interface User {
  id: string
  name: string
  email: string
  role: 'user' | 'admin'
  folders: Folder[]
  created_at: string
  avatar_url?: string
}

interface Folder {
  id: string
  name: string
  user_id: string
  created_at: string
  updated_at: string
  photos: Photo[]
  photoCount: number
  lastModified: string
}

interface Photo {
  id: string
  name: string
  mime_type: string
  image_data: string
  uploaded_at: string
  user_id: string
  folder_id: string
  size: number
  url: string
}

export default function UserDetailsPage({ params }: { params: { userId: string } }) {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isCreatingFolder, setIsCreatingFolder] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [editingFolder, setEditingFolder] = useState<Folder | null>(null)
  const [editedFolderName, setEditedFolderName] = useState('')
  const [uploadingFolder, setUploadingFolder] = useState<Folder | null>(null)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set())
  const [hoveredFolder, setHoveredFolder] = useState<string | null>(null)
  const [isAuthChecked, setIsAuthChecked] = useState(false)

  const fetchUserDetails = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      // 1. Récupérer l'utilisateur
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', params.userId)
        .single()

      if (userError) throw userError
      if (!userData) throw new Error('Utilisateur non trouvé')

      // 2. Récupérer les dossiers avec leurs photos
      const { data: folders, error: foldersError } = await supabase
        .from('folders')
        .select(`
          *,
          photos (
            id,
            name,
            mime_type,
            image_data,
            size,
            uploaded_at,
            folder_id,
            user_id
          )
        `)
        .eq('user_id', params.userId)
        .order('created_at', { ascending: false })

      if (foldersError) throw foldersError

      // 3. Organiser les données
      const foldersWithPhotos = (folders || []).map(folder => ({
        ...folder,
        photos: (folder.photos || []).map((photo: Photo) => ({
          ...photo,
          url: `data:${photo.mime_type};base64,${photo.image_data}`
        })),
        photoCount: (folder.photos || []).length,
        lastModified: folder.photos && folder.photos.length > 0
          ? new Date(Math.max(...folder.photos.map((p: Photo) => new Date(p.uploaded_at).getTime()))).toISOString()
          : folder.updated_at
      }))

      setUser({
        ...userData,
        folders: foldersWithPhotos
      })
    } catch (error: any) {
      console.error('Erreur:', error)
      setError(error.message)
    } finally {
      setIsLoading(false)
    }
  }, [params.userId])

  useEffect(() => {
    const checkAuth = async () => {
      if (isAuthChecked) return

      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/auth/login')
        return
      }

      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('role')
        .eq('id', session.user.id)
        .single()

      if (userError || userData?.role !== 'admin') {
        router.push('/dashboard')
        return
      }

      setIsAuthChecked(true)
      fetchUserDetails()
    }
    checkAuth()
  }, [isAuthChecked, fetchUserDetails])

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) {
      setError('Le nom du dossier ne peut pas être vide')
      return
    }

    try {
      const { data, error } = await supabase
        .from('folders')
        .insert([
          {
            name: newFolderName.trim(),
            user_id: params.userId,
            created_at: new Date().toISOString()
          }
        ])
        .select()
        .single()

      if (error) throw error

      setIsCreatingFolder(false)
      setNewFolderName('')
      fetchUserDetails()
    } catch (error: any) {
      console.error('Erreur lors de la création du dossier:', error)
      setError('Erreur lors de la création du dossier')
    }
  }

  const handleUpdateFolder = async (folderId: string) => {
    if (!editedFolderName.trim()) {
      setError('Le nom du dossier ne peut pas être vide')
      return
    }

    try {
      const { error } = await supabase
        .from('folders')
        .update({
          name: editedFolderName.trim()
        })
        .eq('id', folderId)

      if (error) throw error

      setEditingFolder(null)
      setEditedFolderName('')
      fetchUserDetails()
    } catch (error: any) {
      console.error('Erreur lors de la mise à jour du dossier:', error)
      setError('Erreur lors de la mise à jour du dossier')
    }
  }

  const handleDeleteFolder = async (folderId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce dossier ? Toutes les photos qu\'il contient seront également supprimées.')) {
      return
    }

    try {
      // Supprimer d'abord toutes les photos du dossier
      const { error: photosError } = await supabase
        .from('photos')
        .delete()
        .eq('folder_id', folderId)

      if (photosError) throw photosError

      // Puis supprimer le dossier
      const { error: folderError } = await supabase
        .from('folders')
        .delete()
        .eq('id', folderId)

      if (folderError) throw folderError

      // Mettre à jour l'état local
      setUser(prev => {
        if (!prev) return null
        return {
          ...prev,
          folders: prev.folders.filter(folder => folder.id !== folderId)
        }
      })
    } catch (error: any) {
      console.error('Erreur lors de la suppression du dossier:', error)
      setError('Erreur lors de la suppression du dossier')
    }
  }

  const handleDeletePhoto = async (photoId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette photo ?')) {
      return
    }

    try {
      const photo = user?.folders
        .flatMap(folder => folder.photos)
        .find(photo => photo.id === photoId)

      if (!photo) {
        throw new Error('Photo non trouvée')
      }

      const urlParts = photo.url.split('/')
      const filePath = urlParts.slice(-3).join('/')

      const { error: storageError } = await supabase.storage
        .from('photos')
        .remove([filePath])

      if (storageError) throw storageError

      const { error: dbError } = await supabase
        .from('photos')
        .delete()
        .eq('id', photoId)

      if (dbError) throw dbError

      fetchUserDetails()
    } catch (error: any) {
      console.error('Erreur lors de la suppression de la photo:', error)
      setError('Erreur lors de la suppression de la photo')
    }
  }

  const compressImage = async (file: File): Promise<File> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = (event) => {
        const img = document.createElement('img')
        img.src = event.target?.result as string
        img.onload = () => {
          const canvas = document.createElement('canvas')
          const ctx = canvas.getContext('2d')
          if (!ctx) {
            reject(new Error('Impossible de créer le contexte canvas'))
            return
          }

          // Calculer les nouvelles dimensions
          let width = img.width
          let height = img.height
          const maxDimension = 1920 // Taille maximale en pixels

          if (width > height && width > maxDimension) {
            height = Math.round((height * maxDimension) / width)
            width = maxDimension
          } else if (height > maxDimension) {
            width = Math.round((width * maxDimension) / height)
            height = maxDimension
          }

          canvas.width = width
          canvas.height = height
          ctx.drawImage(img, 0, 0, width, height)

          // Convertir en JPEG avec une qualité de 80%
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error('Impossible de compresser l\'image'))
                return
              }
              resolve(new File([blob], file.name, { type: 'image/jpeg' }))
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

  const handleFileUpload = async (folderId: string, files: FileList) => {
    if (!files.length) return

    try {
      setUploadingFolder(user?.folders.find(f => f.id === folderId) || null)
      setUploadProgress(0)

      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        
        // Vérification du type de fichier
        if (!file.type.startsWith('image/')) {
          throw new Error(`Le fichier ${file.name} n'est pas une image valide`)
        }

        // Vérification de la taille (max 10MB)
        if (file.size > 10 * 1024 * 1024) {
          throw new Error(`Le fichier ${file.name} est trop volumineux (max 10MB)`)
        }

        // Compression de l'image
        const compressedFile = await compressImage(file)
        
        // Conversion en base64
        const reader = new FileReader()
        reader.readAsDataURL(compressedFile)
        
        const base64Data = await new Promise<string>((resolve, reject) => {
          reader.onload = () => resolve(reader.result as string)
          reader.onerror = () => reject(new Error('Erreur lors de la lecture du fichier'))
        })

        // Créer l'entrée dans la table photos
        const { data: photoData, error: dbError } = await supabase
          .from('photos')
          .insert([
            {
              name: file.name,
              mime_type: file.type,
              image_data: base64Data.split(',')[1], // Supprimer le préfixe data:image/jpeg;base64,
              size: compressedFile.size,
              folder_id: folderId,
              user_id: params.userId,
              uploaded_at: new Date().toISOString()
            }
          ])
          .select()
          .single()

        if (dbError) {
          console.error('Erreur DB:', dbError)
          throw new Error(`Erreur lors de l'enregistrement de ${file.name}: ${dbError.message}`)
        }

        if (photoData) {
          // Mettre à jour l'état local avec la nouvelle photo
          setUser(prev => {
            if (!prev) return null
            return {
              ...prev,
              folders: prev.folders.map(folder => {
                if (folder.id === folderId) {
                  return {
                    ...folder,
                    photos: [{
                      ...photoData,
                      url: `data:${photoData.mime_type};base64,${photoData.image_data}`
                    }, ...folder.photos],
                    photoCount: folder.photoCount + 1
                  }
                }
                return folder
              })
            }
          })
        }

        setUploadProgress(((i + 1) / files.length) * 100)
      }
    } catch (error: any) {
      console.error('Erreur lors de l\'upload des photos:', error)
      setError(error.message || 'Erreur lors de l\'upload des photos')
    } finally {
      setUploadingFolder(null)
      setUploadProgress(0)
    }
  }

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString)
      if (isNaN(date.getTime())) return 'Date inconnue'
      return date.toLocaleDateString('fr-FR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    } catch (error) {
      return 'Date inconnue'
    }
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

  const toggleFolder = (folderId: string) => {
    setExpandedFolders(prev => {
      const newSet = new Set(prev)
      if (newSet.has(folderId)) {
        newSet.delete(folderId)
      } else {
        newSet.add(folderId)
      }
      return newSet
    })
  }

  const handleRenamePhoto = async (photoId: string, newName: string) => {
    if (!newName.trim()) {
      setError('Le nom ne peut pas être vide')
      return
    }

    try {
      const { error } = await supabase
        .from('photos')
        .update({ name: newName.trim() })
        .eq('id', photoId)

      if (error) throw error

      // Mettre à jour l'état local
      setUser(prev => {
        if (!prev) return null
        return {
          ...prev,
          folders: prev.folders.map(folder => ({
            ...folder,
            photos: folder.photos.map(photo => 
              photo.id === photoId 
                ? { ...photo, name: newName.trim() }
                : photo
            )
          }))
        }
      })
    } catch (error: any) {
      console.error('Erreur lors du renommage de la photo:', error)
      setError('Erreur lors du renommage de la photo')
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <AdminNavbar />
        <div className="flex items-center justify-center min-h-[calc(100vh-64px)]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      </div>
    )
  }

  if (error || !user) {
    return (
      <div className="min-h-screen bg-gray-50">
        <AdminNavbar />
        <div className="flex items-center justify-center min-h-[calc(100vh-64px)]">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              {error || 'Utilisateur non trouvé'}
            </h2>
            <button
              onClick={() => router.push('/admin/users')}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              <ArrowLeft className="h-5 w-5 mr-2" />
              Retour à la liste des utilisateurs
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNavbar />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push('/admin/users')}
                className="rounded-md p-2 text-gray-400 hover:text-gray-500 hover:bg-gray-100"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <h1 className="text-3xl font-bold text-gray-900">Détails de l'utilisateur</h1>
            </div>
          </div>
        </div>

        {/* Informations de l'utilisateur */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white shadow overflow-hidden sm:rounded-lg mb-8"
        >
          <div className="px-4 py-5 sm:px-6">
            <div className="flex items-center">
              {user.avatar_url && (
                <Image
                  src={user.avatar_url}
                  alt={`Avatar de ${user.name || 'utilisateur'}`}
                  width={100}
                  height={100}
                  className="rounded-full"
                />
              )}
              <div className="ml-6">
                <h3 className="text-2xl font-medium text-gray-900">{user.name}</h3>
                <p className="mt-1 text-sm text-gray-500">{user.email}</p>
                <div className="mt-4 flex items-center space-x-4">
                  <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${
                    user.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                  }`}>
                    {user.role === 'admin' ? 'Administrateur' : 'Utilisateur'}
                  </span>
                  <span className="text-sm text-gray-500">
                    Membre depuis {new Date(user.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Statistiques */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-lg shadow p-6"
          >
            <div className="flex items-center">
              <Folder className="h-8 w-8 text-blue-500" />
              <div className="ml-4">
                <h3 className="text-sm font-medium text-gray-500">Total dossiers</h3>
                <p className="mt-1 text-2xl font-semibold text-gray-900">
                  {user.folders ? user.folders.length : 0}
                </p>
              </div>
            </div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-lg shadow p-6"
          >
            <div className="flex items-center">
              <ImageIcon className="h-8 w-8 text-purple-500" />
              <div className="ml-4">
                <h3 className="text-sm font-medium text-gray-500">Total photos</h3>
                <p className="mt-1 text-2xl font-semibold text-gray-900">
                  {user.folders ? user.folders.reduce((acc, folder) => acc + (folder.photoCount || 0), 0) : 0}
                </p>
              </div>
            </div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-lg shadow p-6"
          >
            <div className="flex items-center">
              <Upload className="h-8 w-8 text-green-500" />
              <div className="ml-4">
                <h3 className="text-sm font-medium text-gray-500">Dernière activité</h3>
                <p className="mt-1 text-2xl font-semibold text-gray-900">
                  {user.folders && user.folders.length > 0
                    ? new Date(Math.max(...user.folders.map(f => new Date(f.lastModified).getTime())))
                        .toLocaleDateString()
                    : 'Aucune'}
                </p>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Liste des dossiers */}
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:px-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-medium text-gray-900">Dossiers</h2>
              <button
                onClick={() => setIsCreatingFolder(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <FolderPlus className="h-5 w-5 mr-2" />
                Nouveau dossier
              </button>
            </div>

            {/* Formulaire de création de dossier */}
            <AnimatePresence>
              {isCreatingFolder && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-4"
                >
                  <div className="flex items-center space-x-4">
                    <input
                      type="text"
                      value={newFolderName}
                      onChange={(e) => setNewFolderName(e.target.value)}
                      placeholder="Nom du dossier"
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    />
                    <button
                      onClick={handleCreateFolder}
                      className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                    >
                      Créer
                    </button>
                    <button
                      onClick={() => {
                        setIsCreatingFolder(false)
                        setNewFolderName('')
                      }}
                      className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      Annuler
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="mt-6 space-y-4">
              {user?.folders.map((folder) => (
                <motion.div
                  key={folder.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className="border rounded-lg p-4 bg-white shadow-sm hover:shadow-md transition-shadow duration-200"
                  onMouseEnter={() => setHoveredFolder(folder.id)}
                  onMouseLeave={() => setHoveredFolder(null)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="relative">
                        <Folder className="h-8 w-8 text-blue-500" />
                        {folder.photoCount > 0 && (
                          <span className="absolute -top-1 -right-1 bg-blue-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                            {folder.photoCount}
                          </span>
                        )}
                      </div>
                      <div>
                        <h3 className="text-lg font-medium text-gray-900">{folder.name}</h3>
                        <p className="text-sm text-gray-500">
                          Dernière modification: {formatDate(folder.lastModified)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => toggleFolder(folder.id)}
                        className="text-gray-500 hover:text-gray-700 transition-colors duration-200"
                        title={expandedFolders.has(folder.id) ? "Réduire" : "Agrandir"}
                      >
                        {expandedFolders.has(folder.id) ? (
                          <ChevronUp className="h-5 w-5" />
                        ) : (
                          <ChevronDown className="h-5 w-5" />
                        )}
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleDeleteFolder(folder.id)}
                        className="text-red-500 hover:text-red-700 transition-colors duration-200"
                        title="Supprimer le dossier"
                      >
                        <Trash2 className="h-5 w-5" />
                      </motion.button>
                      <label className="cursor-pointer">
                        <input
                          type="file"
                          multiple
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => e.target.files && handleFileUpload(folder.id, e.target.files)}
                        />
                        <motion.div
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 transition-colors duration-200"
                        >
                          <Upload className="h-5 w-5 mr-2" />
                          Ajouter des photos
                        </motion.div>
                      </label>
                    </div>
                  </div>

                  <AnimatePresence>
                    {folder.photos.length > 0 && expandedFolders.has(folder.id) && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="mt-4 overflow-hidden"
                      >
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                          {folder.photos.map((photo) => (
                            <motion.div
                              key={photo.id}
                              initial={{ opacity: 0, scale: 0.9 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.9 }}
                              transition={{ duration: 0.2 }}
                              className="relative group"
                            >
                              <img
                                src={`data:${photo.mime_type};base64,${photo.image_data}`}
                                alt={photo.name}
                                className="w-full h-32 object-cover rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200"
                              />
                              <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="absolute inset-0 bg-black bg-opacity-50 rounded-lg group-hover:bg-opacity-70 transition-opacity duration-200"
                              >
                                <div className="flex items-center justify-center h-full space-x-2">
                                  <motion.button
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => {
                                      const newName = prompt('Nouveau nom pour la photo:', photo.name)
                                      if (newName && newName !== photo.name) {
                                        handleRenamePhoto(photo.id, newName)
                                      }
                                    }}
                                    className="text-white hover:text-blue-500 transition-colors duration-200"
                                    title="Renommer"
                                  >
                                    <Edit2 className="h-6 w-6" />
                                  </motion.button>
                                  <motion.button
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => handleDeletePhoto(photo.id)}
                                    className="text-white hover:text-red-500 transition-colors duration-200"
                                    title="Supprimer"
                                  >
                                    <Trash2 className="h-6 w-6" />
                                  </motion.button>
                                </div>
                              </motion.div>
                            </motion.div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Modal de prévisualisation */}
      <AnimatePresence>
        {isPreviewOpen && selectedPhoto && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 overflow-y-auto"
            aria-labelledby="modal-title"
            role="dialog"
            aria-modal="true"
          >
            <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black bg-opacity-90 transition-opacity"
                aria-hidden="true"
              />

              <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="inline-block align-bottom text-left overflow-hidden transform transition-all sm:my-8 sm:align-middle sm:max-w-5xl sm:w-full"
              >
                <div className="relative">
                  <img
                    src={selectedPhoto.url}
                    alt={selectedPhoto.name}
                    className="w-full h-auto max-h-[80vh] object-contain"
                  />
                  <div className="absolute top-4 right-4 flex space-x-2">
                    <button
                      onClick={() => handleDownloadPhoto(selectedPhoto)}
                      className="text-white bg-black bg-opacity-50 hover:bg-opacity-75 rounded-full p-2 transition-colors duration-200"
                      aria-label="Télécharger la photo"
                    >
                      <Download className="h-6 w-6" />
                    </button>
                    <button
                      onClick={() => setIsPreviewOpen(false)}
                      className="text-white bg-black bg-opacity-50 hover:bg-opacity-75 rounded-full p-2 transition-colors duration-200"
                      aria-label="Fermer la prévisualisation"
                    >
                      <X className="h-6 w-6" />
                    </button>
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white p-4">
                    <div className="max-w-3xl mx-auto">
                      <h3 className="text-lg font-medium">{selectedPhoto.name}</h3>
                      <div className="flex items-center space-x-4 mt-2 text-sm">
                        <span>Taille: {(selectedPhoto.size / 1024 / 1024).toFixed(2)} MB</span>
                        <span>•</span>
                        <span>Uploadé le: {formatDate(selectedPhoto.uploaded_at)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
} 