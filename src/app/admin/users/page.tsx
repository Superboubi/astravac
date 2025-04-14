'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { AdminNavbar } from '@/components/ui/admin-navbar'
import { supabase } from '@/lib/supabase'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Filter, ChevronLeft, ChevronRight, Download, Trash2, Edit2, Image as ImageIcon, X, User, Mail, Folder } from 'lucide-react'
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

export default function AdminUsersPage() {
  const router = useRouter()
  const [users, setUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | 'user'>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const usersPerPage = 10
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)

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

      fetchUsers()
    }
    checkAuth()
  }, [router])

  const fetchUsers = async () => {
    try {
      setIsLoading(true)
      setError(null)

      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false })

      if (usersError) throw usersError

      const { data: foldersData, error: foldersError } = await supabase
        .from('folders')
        .select('*')

      if (foldersError) throw foldersError

      const { data: photosData, error: photosError } = await supabase
        .from('photos')
        .select('*')

      if (photosError) throw photosError

      const usersWithData = usersData.map(user => ({
        ...user,
        folders: foldersData
          .filter(folder => folder.user_id === user.id)
          .map(folder => ({
            ...folder,
            photoCount: photosData.filter(photo => photo.folder_id === folder.id).length,
            lastModified: new Date(folder.updated_at).toLocaleDateString(),
            photos: photosData.filter(photo => photo.folder_id === folder.id)
          }))
      }))

      setUsers(usersWithData)
      setTotalPages(Math.ceil(usersWithData.length / usersPerPage))
    } catch (error: any) {
      console.error('Erreur lors du chargement des utilisateurs:', error)
      setError('Erreur lors du chargement des utilisateurs')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet utilisateur ? Cette action est irréversible.')) {
      return
    }

    try {
      const { error: photosError } = await supabase
        .from('photos')
        .delete()
        .eq('user_id', userId)

      if (photosError) throw photosError

      const { error: foldersError } = await supabase
        .from('folders')
        .delete()
        .eq('user_id', userId)

      if (foldersError) throw foldersError

      const { error: userError } = await supabase
        .from('users')
        .delete()
        .eq('id', userId)

      if (userError) throw userError

      fetchUsers()
    } catch (error: any) {
      console.error('Erreur lors de la suppression de l\'utilisateur:', error)
      setError('Erreur lors de la suppression de l\'utilisateur')
    }
  }

  const handleUpdateUserRole = async (userId: string, newRole: 'user' | 'admin') => {
    try {
      const { error } = await supabase
        .from('users')
        .update({ role: newRole })
        .eq('id', userId)

      if (error) throw error

      fetchUsers()
    } catch (error: any) {
      console.error('Erreur lors de la mise à jour du rôle:', error)
      setError('Erreur lors de la mise à jour du rôle')
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

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesRole = roleFilter === 'all' || user.role === roleFilter
    return matchesSearch && matchesRole
  })

  const paginatedUsers = filteredUsers.slice(
    (currentPage - 1) * usersPerPage,
    currentPage * usersPerPage
  )

  const totalPhotos = users.reduce((acc, user) => 
    acc + user.folders.reduce((folderAcc, folder) => folderAcc + folder.photoCount, 0), 0
  )

  const totalFolders = users.reduce((acc, user) => acc + user.folders.length, 0)

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

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <AdminNavbar />
        <div className="flex items-center justify-center min-h-[calc(100vh-64px)]">
          <div className="text-red-500">{error}</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNavbar />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col space-y-6">
          {/* En-tête */}
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">Gestion des utilisateurs</h1>
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <input
                  type="text"
                  placeholder="Rechercher un utilisateur..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Statistiques */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-lg shadow p-6"
            >
              <div className="flex items-center">
                <User className="h-8 w-8 text-blue-500" />
                <div className="ml-4">
                  <h3 className="text-sm font-medium text-gray-500">Total utilisateurs</h3>
                  <p className="mt-1 text-2xl font-semibold text-gray-900">{users.length}</p>
                </div>
              </div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white rounded-lg shadow p-6"
            >
              <div className="flex items-center">
                <Folder className="h-8 w-8 text-purple-500" />
                <div className="ml-4">
                  <h3 className="text-sm font-medium text-gray-500">Total dossiers</h3>
                  <p className="mt-1 text-2xl font-semibold text-gray-900">{totalFolders}</p>
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
                <ImageIcon className="h-8 w-8 text-green-500" />
                <div className="ml-4">
                  <h3 className="text-sm font-medium text-gray-500">Total photos</h3>
                  <p className="mt-1 text-2xl font-semibold text-gray-900">{totalPhotos}</p>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Liste des utilisateurs */}
          <div className="bg-white shadow overflow-hidden sm:rounded-lg">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Utilisateur
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Rôle
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Dossiers
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Photos
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Inscription
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredUsers.map((user, index) => (
                    <motion.tr
                      key={user.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => router.push(`/admin/users/${user.id}`)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {user.avatar_url && (
                            <Image
                              src={user.avatar_url}
                              alt={`Avatar de ${user.name || 'utilisateur'}`}
                              width={40}
                              height={40}
                              className="rounded-full"
                            />
                          )}
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{user.name}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{user.email}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          user.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                        }`}>
                          {user.role === 'admin' ? 'Administrateur' : 'Utilisateur'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{user.folders.length}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {user.folders.reduce((acc, folder) => acc + folder.photoCount, 0)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {new Date(user.created_at).toLocaleDateString()}
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
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