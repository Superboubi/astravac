'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState, useCallback } from 'react'
import { Navbar } from '@/components/ui/navbar'
import { supabase } from '@/lib/supabase'
import { PhotoPreview } from '@/components/ui/photo-preview'
import { 
  FolderIcon, 
  PlusIcon, 
  PhotoIcon,
  ArrowUpTrayIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  TrashIcon,
  PencilIcon,
  StarIcon,
  ShareIcon,
  Cog6ToothIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  ArrowsUpDownIcon,
  XMarkIcon,
  Squares2X2Icon,
  Bars3Icon,
  CheckIcon
} from '@heroicons/react/24/outline'
import { motion, AnimatePresence } from 'framer-motion'

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
  is_favorite: boolean
}

export default function DashboardPage() {
  const router = useRouter()
  const [folders, setFolders] = useState<Folder[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set())
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [sortBy, setSortBy] = useState<'date' | 'name'>('date')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedPhotos, setSelectedPhotos] = useState<Set<string>>(new Set())
  const [isBulkMode, setIsBulkMode] = useState(false)
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null)
  const [newFolderName, setNewFolderName] = useState('')
  const [isSortMenuOpen, setIsSortMenuOpen] = useState(false)
  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false)
  const [filters, setFilters] = useState({
    dateRange: 'all',
    size: 'all',
    type: 'all'
  })
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const [isSelectionMode, setIsSelectionMode] = useState(false)

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

      // Mettre à jour les dossiers sans changer le dossier sélectionné
      setFolders(prevFolders => {
        const newFolders = foldersWithPhotos
        // Si aucun dossier n'est sélectionné, sélectionner le premier
        if (!selectedFolder && newFolders.length > 0) {
          setSelectedFolder(newFolders[0].id)
        }
        return newFolders
      })
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

      const newPhotos: Photo[] = []

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
        const { data: photoData, error: dbError } = await supabase
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
          .select()
          .single()

        if (dbError) {
          console.error('Erreur base de données:', dbError)
          throw new Error(`Erreur lors de l'enregistrement de ${file.name}: ${dbError.message}`)
        }

        if (photoData) {
          newPhotos.push(photoData)
        }
      }

      // Mettre à jour l'état local sans recharger tous les dossiers
      setFolders(prev => prev.map(folder => 
        folder.id === selectedFolder
          ? {
              ...folder,
              photos: [...folder.photos, ...newPhotos],
              photoCount: folder.photoCount + newPhotos.length
            }
          : folder
      ))
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

      const newPhotos: Photo[] = []

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

        // Créer l'entrée dans la table photos sans is_favorite
        const { data: photoData, error: dbError } = await supabase
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
          .select()
          .single()

        if (dbError) {
          console.error('Erreur base de données:', dbError)
          throw new Error(`Erreur lors de l'enregistrement de ${file.name}: ${dbError.message}`)
        }

        if (photoData) {
          newPhotos.push(photoData)
        }
      }

      // Mettre à jour l'état local sans recharger tous les dossiers
      setFolders(prev => prev.map(folder => 
        folder.id === selectedFolder
          ? {
              ...folder,
              photos: [...folder.photos, ...newPhotos],
              photoCount: folder.photoCount + newPhotos.length
            }
          : folder
      ))

      // Réinitialiser l'input file
      e.target.value = ''
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
      const filePath = urlParts.slice(-3).join('/')

      // Supprimer le fichier du stockage
      const { error: storageError } = await supabase.storage
        .from('photos')
        .remove([filePath])

      if (storageError) throw storageError

      // Supprimer l'entrée de la base de données
      const { error: dbError } = await supabase
        .from('photos')
        .delete()
        .eq('id', photoId)

      if (dbError) throw dbError

      // Mettre à jour l'état local sans changer le dossier sélectionné
      setFolders(prev => prev.map(folder => 
        folder.id === selectedFolder
          ? {
              ...folder,
              photos: folder.photos.filter(p => p.id !== photoId),
              photoCount: folder.photoCount - 1
            }
          : folder
      ))
    } catch (error) {
      console.error('Erreur lors de la suppression:', error)
      setError('Erreur lors de la suppression de la photo')
    }
  }

  const togglePhotoSelection = (photoId: string) => {
    setSelectedPhotos(prev => {
      const newSet = new Set(prev)
      if (newSet.has(photoId)) {
        newSet.delete(photoId)
      } else {
        newSet.add(photoId)
      }
      return newSet
    })
  }

  const handleRenameFolder = async (folderId: string, newName: string) => {
    try {
      const { error } = await supabase
        .from('folders')
        .update({ name: newName })
        .eq('id', folderId)

      if (error) throw error

      setFolders(folders.map(folder => 
        folder.id === folderId ? { ...folder, name: newName } : folder
      ))
      setEditingFolderId(null)
      setNewFolderName('')
    } catch (error) {
      console.error('Erreur lors du renommage du dossier:', error)
      alert('Erreur lors du renommage du dossier')
    }
  }

  const startEditing = (folder: Folder) => {
    setEditingFolderId(folder.id)
    setNewFolderName(folder.name)
  }

  const handleDeleteFolder = async (folderId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce dossier et toutes ses photos ?')) return

    try {
      const { error } = await supabase
        .from('folders')
        .delete()
        .eq('id', folderId)

      if (error) throw error

      setFolders(prev => prev.filter(folder => folder.id !== folderId))
      if (selectedFolder === folderId) {
        setSelectedFolder(null)
      }
    } catch (error) {
      console.error('Erreur lors de la suppression du dossier:', error)
      setError('Erreur lors de la suppression du dossier')
    }
  }

  const handleSharePhotos = async () => {
    if (selectedPhotos.size === 0) {
      alert('Veuillez sélectionner au moins une photo à partager')
      return
    }

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      // Créer un lien de partage temporaire
      const { data, error } = await supabase
        .from('shared_links')
        .insert([
          {
            user_id: session.user.id,
            photo_ids: Array.from(selectedPhotos),
            expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 jours
          }
        ])
        .select()
        .single()

      if (error) throw error

      // Copier le lien dans le presse-papiers
      const shareUrl = `${window.location.origin}/share/${data.id}`
      await navigator.clipboard.writeText(shareUrl)
      alert('Lien de partage copié dans le presse-papiers !')
    } catch (error) {
      console.error('Erreur lors du partage des photos:', error)
      setError('Erreur lors du partage des photos')
    }
  }

  const handleBulkDelete = async () => {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer ${selectedPhotos.size} photo(s) ?`)) return

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      // Supprimer les photos de la base de données
      const { error: dbError } = await supabase
        .from('photos')
        .delete()
        .in('id', Array.from(selectedPhotos))

      if (dbError) throw dbError

      // Supprimer les fichiers du stockage
      const photosToDelete = folders
        .find(f => f.id === selectedFolder)
        ?.photos
        .filter(p => selectedPhotos.has(p.id))
        .map(p => {
          const urlParts = p.url.split('/')
          return urlParts.slice(-3).join('/')
        })

      if (photosToDelete?.length) {
        const { error: storageError } = await supabase.storage
          .from('photos')
          .remove(photosToDelete)

        if (storageError) throw storageError
      }

      // Mettre à jour l'état local sans changer le dossier sélectionné
      setFolders(prev => prev.map(folder => 
        folder.id === selectedFolder
          ? {
              ...folder,
              photos: folder.photos.filter(p => !selectedPhotos.has(p.id)),
              photoCount: folder.photoCount - selectedPhotos.size
            }
          : folder
      ))
      setSelectedPhotos(new Set())
      setIsBulkMode(false)
    } catch (error) {
      console.error('Erreur lors de la suppression en masse:', error)
      setError('Erreur lors de la suppression en masse')
    }
  }

  const handleSortChange = (newSortBy: 'date' | 'name', newSortOrder: 'asc' | 'desc') => {
    setSortBy(newSortBy)
    setSortOrder(newSortOrder)
    setIsSortMenuOpen(false)
  }

  const handleFilterChange = (newFilters: typeof filters) => {
    setFilters(newFilters)
    setIsFilterMenuOpen(false)
  }

  const handleToggleFavorite = async (photoId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const { error } = await supabase
        .from('photos')
        .update({ is_favorite: !folders
          .find(f => f.id === selectedFolder)
          ?.photos.find(p => p.id === photoId)?.is_favorite
        })
        .eq('id', photoId)

      if (error) throw error

      // Mettre à jour l'état local
      setFolders(prev => prev.map(folder => 
        folder.id === selectedFolder
          ? {
              ...folder,
              photos: folder.photos.map(photo =>
                photo.id === photoId
                  ? { ...photo, is_favorite: !photo.is_favorite }
                  : photo
              )
            }
          : folder
      ))
    } catch (error) {
      console.error('Erreur lors de la mise à jour des favoris:', error)
    }
  }

  // Fonction pour filtrer les photos
  const getFilteredPhotos = (photos: Photo[]) => {
    return photos.filter(photo => {
      // Filtre par date
      if (filters.dateRange !== 'all') {
        const photoDate = new Date(photo.uploaded_at)
        const now = new Date()
        const diffTime = Math.abs(now.getTime() - photoDate.getTime())
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

        switch (filters.dateRange) {
          case 'today':
            if (diffDays > 1) return false
            break
          case 'week':
            if (diffDays > 7) return false
            break
          case 'month':
            if (diffDays > 30) return false
            break
        }
      }

      // Filtre par taille
      if (filters.size !== 'all') {
        const sizeInMB = photo.size / (1024 * 1024)
        switch (filters.size) {
          case 'small':
            if (sizeInMB >= 1) return false
            break
          case 'medium':
            if (sizeInMB < 1 || sizeInMB > 5) return false
            break
          case 'large':
            if (sizeInMB <= 5) return false
            break
        }
      }

      // Filtre par type
      if (filters.type !== 'all') {
        const extension = photo.name.split('.').pop()?.toLowerCase()
        if (extension !== filters.type) return false
      }

      return true
    })
  }

  // Fonction pour trier les photos
  const getSortedPhotos = (photos: Photo[]) => {
    return [...photos].sort((a, b) => {
      if (sortBy === 'date') {
        return sortOrder === 'desc'
          ? new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime()
          : new Date(a.uploaded_at).getTime() - new Date(b.uploaded_at).getTime()
      } else {
        return sortOrder === 'desc'
          ? b.name.localeCompare(a.name)
          : a.name.localeCompare(b.name)
      }
    })
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="flex h-[calc(100vh-64px)]">
        {/* Sidebar */}
        <div className="w-72 bg-white border-r border-gray-200 overflow-y-auto">
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Dossiers</h2>
              <div className="flex items-center space-x-2">
                <button
                  onClick={createNewFolder}
                  className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
                  title="Nouveau dossier"
                >
                  <PlusIcon className="h-5 w-5" />
                </button>
              </div>
            </div>
            
            {/* Barre de recherche */}
            <div className="relative mb-4">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Rechercher un dossier..."
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>

            {/* Dossiers */}
            <div className="space-y-1">
              {folders.map((folder) => (
                <div key={folder.id} className="group">
                  {editingFolderId === folder.id ? (
                    <div className="flex items-center space-x-2 px-4 py-2">
                      <input
                        type="text"
                        value={newFolderName}
                        onChange={(e) => setNewFolderName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleRenameFolder(folder.id, newFolderName)
                          } else if (e.key === 'Escape') {
                            setEditingFolderId(null)
                            setNewFolderName('')
                          }
                        }}
                        className="flex-1 px-2 py-1 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        autoFocus
                      />
                      <button
                        onClick={() => handleRenameFolder(folder.id, newFolderName)}
                        className="p-1 text-green-600 hover:text-green-700"
                      >
                        <CheckIcon className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => {
                          setEditingFolderId(null)
                          setNewFolderName('')
                        }}
                        className="p-1 text-red-600 hover:text-red-700"
                      >
                        <XMarkIcon className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setSelectedFolder(folder.id)}
                      className={`w-full flex items-center justify-between px-4 py-2 text-sm rounded-lg transition-colors ${
                        selectedFolder === folder.id
                          ? 'bg-blue-50 text-blue-700'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <div className="flex items-center space-x-2">
                        <FolderIcon className="h-5 w-5" />
                        <span>{folder.name}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs text-gray-500">{folder.photoCount}</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            startEditing(folder)
                          }}
                          className="p-1 text-gray-400 hover:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <PencilIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto px-6 py-8">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center space-x-4">
                <h1 className="text-2xl font-bold text-gray-900">Mes Photos</h1>
                {selectedFolder && (
                  <span className="text-sm text-gray-500">
                    {folders.find(f => f.id === selectedFolder)?.photoCount || 0} photos
                  </span>
                )}
              </div>
              <div className="flex items-center space-x-4">
                {selectedFolder && (
                  <>
                    <button
                      onClick={() => setIsSelectionMode(!isSelectionMode)}
                      className={`px-4 py-2 rounded-lg transition-colors ${
                        isSelectionMode
                          ? 'bg-blue-500 text-white hover:bg-blue-600'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {isSelectionMode ? 'Annuler' : 'Sélectionner'}
                    </button>
                    {isSelectionMode && selectedPhotos.size > 0 && (
                      <button
                        onClick={handleBulkDelete}
                        className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                      >
                        Supprimer ({selectedPhotos.size})
                      </button>
                    )}
                  </>
                )}
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-2 rounded-lg transition-colors ${
                      viewMode === 'grid'
                        ? 'bg-gray-100 text-gray-900'
                        : 'text-gray-500 hover:bg-gray-100'
                    }`}
                  >
                    <Squares2X2Icon className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-2 rounded-lg transition-colors ${
                      viewMode === 'list'
                        ? 'bg-gray-100 text-gray-900'
                        : 'text-gray-500 hover:bg-gray-100'
                    }`}
                  >
                    <Bars3Icon className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Barre d'actions en masse */}
            {isBulkMode && selectedPhotos.size > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white border border-gray-200 rounded-lg p-4 mb-6 shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <span className="text-sm font-medium text-gray-700">
                      {selectedPhotos.size} photo(s) sélectionnée(s)
                    </span>
                    <button
                      onClick={handleBulkDelete}
                      className="flex items-center space-x-1 text-sm text-red-600 hover:text-red-700"
                    >
                      <TrashIcon className="h-4 w-4" />
                      <span>Supprimer</span>
                    </button>
                    <button 
                      onClick={handleSharePhotos}
                      className="flex items-center space-x-1 text-sm text-gray-600 hover:text-gray-700"
                    >
                      <ShareIcon className="h-4 w-4" />
                      <span>Partager</span>
                    </button>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedPhotos(new Set())
                      setIsBulkMode(false)
                    }}
                    className="text-sm text-gray-500 hover:text-gray-700"
                  >
                    Annuler
                  </button>
                </div>
              </motion.div>
            )}

            {/* Zone de dépôt */}
            <AnimatePresence>
              {selectedFolder && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className={`border-2 border-dashed rounded-lg p-8 text-center mb-8 transition-all ${
                    isDragging
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-300 hover:border-blue-500'
                  }`}
                  onDragEnter={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    setIsDragging(true)
                  }}
                  onDragLeave={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    setIsDragging(false)
                  }}
                  onDragOver={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                  }}
                  onDrop={handleDrop}
                  onClick={() => {
                    const fileInput = document.getElementById('file-upload') as HTMLInputElement
                    if (fileInput) {
                      fileInput.click()
                    }
                  }}
                >
                  <ArrowUpTrayIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <p className="text-lg font-medium text-gray-900 mb-2">
                    Glissez-déposez vos photos ici
                  </p>
                  <p className="text-sm text-gray-500">
                    ou cliquez pour sélectionner des fichiers
                  </p>
                  <p className="text-xs text-gray-400 mt-2">
                    Formats acceptés : JPG, PNG, GIF (max 10MB)
                  </p>
                  <input
                    id="file-upload"
                    type="file"
                    className="hidden"
                    accept="image/*"
                    multiple
                    onChange={handleFileSelect}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Photos */}
            <div className={viewMode === 'grid' 
              ? 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6'
              : 'space-y-4'
            }>
              {selectedFolder ? (
                getSortedPhotos(getFilteredPhotos(
                  folders.find(f => f.id === selectedFolder)?.photos || []
                )).map((photo) => (
                  <motion.div
                    key={photo.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.2 }}
                    className={viewMode === 'grid' ? '' : 'flex items-center space-x-4 bg-white p-4 rounded-lg shadow-sm'}
                  >
                    <PhotoPreview
                      url={photo.url}
                      name={photo.name}
                      uploaded_at={photo.uploaded_at}
                      onDelete={() => handleDeletePhoto(photo.id, photo.url)}
                      isSelected={isSelectionMode && selectedPhotos.has(photo.id)}
                      onSelect={isSelectionMode ? () => togglePhotoSelection(photo.id) : undefined}
                      viewMode={viewMode}
                      onClick={() => {
                        if (!isSelectionMode) {
                          setSelectedPhoto(photo)
                          setIsPreviewOpen(true)
                        }
                      }}
                    />
                  </motion.div>
                ))
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="col-span-full text-center py-12"
                >
                  <FolderIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <p className="text-lg font-medium text-gray-900 mb-2">
                    Aucun dossier sélectionné
                  </p>
                  <p className="text-sm text-gray-500">
                    Sélectionnez un dossier pour voir ses photos
                  </p>
                </motion.div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Menu de tri */}
      {isSortMenuOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg z-10">
          <div className="py-1">
            <button
              onClick={() => handleSortChange('date', 'desc')}
              className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            >
              Date (plus récent)
            </button>
            <button
              onClick={() => handleSortChange('date', 'asc')}
              className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            >
              Date (plus ancien)
            </button>
            <button
              onClick={() => handleSortChange('name', 'asc')}
              className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            >
              Nom (A-Z)
            </button>
            <button
              onClick={() => handleSortChange('name', 'desc')}
              className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            >
              Nom (Z-A)
            </button>
          </div>
        </div>
      )}

      {/* Menu de filtres */}
      {isFilterMenuOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg z-10">
          <div className="p-4">
            <h3 className="text-sm font-medium text-gray-900 mb-2">Filtrer par</h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-gray-700">Date</label>
                <select
                  value={filters.dateRange}
                  onChange={(e) => handleFilterChange({ ...filters, dateRange: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                >
                  <option value="all">Toutes les dates</option>
                  <option value="today">Aujourd'hui</option>
                  <option value="week">Cette semaine</option>
                  <option value="month">Ce mois</option>
                </select>
              </div>
              <div>
                <label className="text-sm text-gray-700">Taille</label>
                <select
                  value={filters.size}
                  onChange={(e) => handleFilterChange({ ...filters, size: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                >
                  <option value="all">Toutes les tailles</option>
                  <option value="small">Petit (&lt; 1MB)</option>
                  <option value="medium">Moyen (1-5MB)</option>
                  <option value="large">Grand (&gt; 5MB)</option>
                </select>
              </div>
              <div>
                <label className="text-sm text-gray-700">Type</label>
                <select
                  value={filters.type}
                  onChange={(e) => handleFilterChange({ ...filters, type: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                >
                  <option value="all">Tous les types</option>
                  <option value="jpg">JPG</option>
                  <option value="png">PNG</option>
                  <option value="gif">GIF</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de prévisualisation */}
      <AnimatePresence>
        {isPreviewOpen && selectedPhoto && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center"
            onClick={() => setIsPreviewOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="relative max-w-4xl w-full mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setIsPreviewOpen(false)}
                className="absolute top-4 right-4 text-white hover:text-gray-300"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
              <img
                src={selectedPhoto.url}
                alt={selectedPhoto.name}
                className="w-full h-auto rounded-lg shadow-2xl"
              />
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-4 rounded-b-lg">
                <div className="flex items-center justify-end">
                  <button
                    onClick={() => {
                      handleDeletePhoto(selectedPhoto.id, selectedPhoto.url)
                      setIsPreviewOpen(false)
                    }}
                    className="p-2 text-red-400 hover:text-red-300 rounded-full"
                  >
                    <TrashIcon className="h-6 w-6" />
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
} 