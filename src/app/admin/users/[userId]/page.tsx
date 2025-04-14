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
  photoCount: number
  lastModified: string
  photos: Photo[]
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
  const [isExpanded, setIsExpanded] = useState<string | null>(null)

  const fetchUserDetails = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', params.userId)
        .single()

      if (error) throw error
      setUser(data)
    } catch (error) {
      console.error('Erreur lors de la récupération des détails:', error)
    }
  }, [params.userId])

  useEffect(() => {
    fetchUserDetails()
  }, [fetchUserDetails])

  useEffect(() => {
    const checkAuth = async () => {
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

      fetchUserDetails()
    }
    checkAuth()
  }, [router, params.userId])

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
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce dossier ? Cette action est irréversible.')) {
      return
    }

    try {
      const { error: photosError } = await supabase
        .from('photos')
        .delete()
        .eq('folder_id', folderId)

      if (photosError) throw photosError

      const { error: folderError } = await supabase
        .from('folders')
        .delete()
        .eq('id', folderId)

      if (folderError) throw folderError

      fetchUserDetails()
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

        const fileExt = file.name.split('.').pop()?.toLowerCase()
        if (!fileExt) {
          throw new Error(`Extension de fichier invalide pour ${file.name}`)
        }

        // Génération d'un nom de fichier unique
        const timestamp = Date.now()
        const randomString = Math.random().toString(36).substring(2, 8)
        const fileName = `${timestamp}-${randomString}.${fileExt}`
        const filePath = `${params.userId}/${folderId}/${fileName}`

        // Upload du fichier
        const { error: uploadError } = await supabase.storage
          .from('photos')
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false
          })

        if (uploadError) {
          console.error('Erreur upload:', uploadError)
          throw new Error(`Erreur lors de l'upload de ${file.name}: ${uploadError.message}`)
        }

        // Récupération de l'URL publique
        const { data: { publicUrl } } = supabase.storage
          .from('photos')
          .getPublicUrl(filePath)

        // Insertion dans la base de données
        const { error: dbError } = await supabase
          .from('photos')
          .insert([
            {
              name: file.name,
              url: publicUrl,
              size: file.size,
              folder_id: folderId,
              user_id: params.userId,
              uploaded_at: new Date().toISOString()
            }
          ])

        if (dbError) {
          console.error('Erreur DB:', dbError)
          throw new Error(`Erreur lors de l'enregistrement de ${file.name}: ${dbError.message}`)
        }

        setUploadProgress(((i + 1) / files.length) * 100)
      }

      // Rafraîchissement des données après l'upload
      await fetchUserDetails()
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
          <div className="text-red-500">{error || 'Utilisateur non trouvé'}</div>
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
                className="rounded-md p-2 text-gray-400 hover:text-gray-500 hover:bg-gray-100 transition-colors duration-200"
                aria-label="Retour à la liste"
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
                <p className="mt-1 text-2xl font-semibold text-gray-900">{user.folders.length}</p>
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
                  {user.folders.reduce((acc, folder) => acc + folder.photoCount, 0)}
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
                  {user.folders.length > 0
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

            <AnimatePresence>
              <ul className="mt-6 divide-y divide-gray-200">
                {user.folders.map((folder) => (
                  <motion.div
                    key={folder.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-lg shadow overflow-hidden"
                  >
                    <div className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
                            <span className="text-white font-medium">
                              {folder.name.charAt(0)}
                            </span>
                          </div>
                          <div>
                            <h3 className="text-lg font-medium text-gray-900">{folder.name}</h3>
                            <p className="text-sm text-gray-500">
                              {folder.photoCount} photo{folder.photoCount > 1 ? 's' : ''} • Dernière modification: {folder.lastModified}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-4">
                          <button
                            onClick={() => handleDeleteFolder(folder.id)}
                            className="text-red-500 hover:text-red-700 transition-colors duration-200"
                            aria-label="Supprimer le dossier"
                          >
                            <Trash2 className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => setIsExpanded(prev => prev === folder.id ? null : folder.id)}
                            className="text-gray-400 hover:text-gray-600 transition-colors duration-200"
                            aria-label={isExpanded === folder.id ? "Réduire le dossier" : "Expandre le dossier"}
                          >
                            <motion.div
                              animate={{ rotate: isExpanded === folder.id ? 180 : 0 }}
                              transition={{ duration: 0.2 }}
                            >
                              <ChevronDown className="h-5 w-5" />
                            </motion.div>
                          </button>
                        </div>
                      </div>
                    </div>

                    <AnimatePresence>
                      {isExpanded === folder.id && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.3 }}
                          className="overflow-hidden"
                        >
                          <div className="p-4 border-t border-gray-200">
                            <PhotoGrid
                              photos={folder.photos}
                              onDelete={handleDeletePhoto}
                              onDownload={handleDownloadPhoto}
                            />
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                ))}
              </ul>
            </AnimatePresence>
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