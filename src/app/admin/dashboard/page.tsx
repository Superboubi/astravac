'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { AdminNavbar } from '@/components/ui/admin-navbar'
import { supabase } from '@/lib/supabase'

interface User {
  id: string
  name: string
  email: string
  role: 'user' | 'admin'
  folders: Folder[]
  created_at: string
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

export default function AdminDashboardPage() {
  const router = useRouter()
  const [users, setUsers] = useState<User[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/auth/login')
        return
      }

      // Vérifier si l'utilisateur est admin
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

      // Récupérer tous les utilisateurs
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false })

      if (usersError) throw usersError

      // Récupérer tous les dossiers
      const { data: foldersData, error: foldersError } = await supabase
        .from('folders')
        .select('*')

      if (foldersError) throw foldersError

      // Récupérer toutes les photos
      const { data: photosData, error: photosError } = await supabase
        .from('photos')
        .select('*')

      if (photosError) throw photosError

      // Organiser les données
      const usersWithData = usersData.map(user => {
        const userFolders = foldersData.filter(folder => folder.user_id === user.id)
        const userPhotos = photosData.filter(photo => photo.user_id === user.id)

        return {
          ...user,
          folders: userFolders.map(folder => ({
            ...folder,
            photoCount: userPhotos.filter(photo => photo.folder_id === folder.id).length,
            lastModified: new Date(folder.updated_at).toLocaleDateString(),
            photos: userPhotos
              .filter(photo => photo.folder_id === folder.id)
              .map(photo => ({
                ...photo,
                uploaded_at: new Date(photo.uploaded_at).toLocaleDateString()
              }))
          }))
        }
      })

      setUsers(usersWithData)
    } catch (error: any) {
      console.error('Erreur lors du chargement des données:', error)
      setError('Erreur lors du chargement des données')
    } finally {
      setIsLoading(false)
    }
  }

  const filteredUsers = users.filter(user =>
    user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const stats = {
    totalUsers: users.length,
    totalFolders: users.reduce((acc, user) => acc + user.folders.length, 0),
    totalPhotos: users.reduce((acc, user) => 
      acc + user.folders.reduce((folderAcc, folder) => folderAcc + folder.photoCount, 0), 0),
    recentUsers: users.filter(user => {
      const userDate = new Date(user.created_at)
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      return userDate >= thirtyDaysAgo
    }).length,
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
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="py-6">
          <h1 className="text-3xl font-bold text-gray-900">Tableau de bord administrateur</h1>
        </div>

        {/* Barre de recherche */}
        <div className="mb-6">
          <div className="relative">
            <input
              type="text"
              placeholder="Rechercher un utilisateur..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-4 py-2 pl-10 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <svg
              className="absolute left-3 top-2.5 h-5 w-5 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
        </div>

        {/* Statistiques */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <div
            className="cursor-pointer rounded-lg bg-white p-6 shadow transition-all hover:shadow-md"
            onClick={() => router.push('/admin/users')}
          >
            <div className="flex items-center">
              <div className="rounded-full bg-blue-100 p-3">
                <svg className="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <h2 className="text-sm font-medium text-gray-600">Utilisateurs totaux</h2>
                <p className="text-2xl font-semibold text-gray-900">{stats.totalUsers}</p>
              </div>
            </div>
          </div>

          <div
            className="cursor-pointer rounded-lg bg-white p-6 shadow transition-all hover:shadow-md"
            onClick={() => router.push('/admin/users')}
          >
            <div className="flex items-center">
              <div className="rounded-full bg-green-100 p-3">
                <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                </svg>
              </div>
              <div className="ml-4">
                <h2 className="text-sm font-medium text-gray-600">Dossiers totaux</h2>
                <p className="text-2xl font-semibold text-gray-900">{stats.totalFolders}</p>
              </div>
            </div>
          </div>

          <div
            className="cursor-pointer rounded-lg bg-white p-6 shadow transition-all hover:shadow-md"
            onClick={() => router.push('/admin/users')}
          >
            <div className="flex items-center">
              <div className="rounded-full bg-yellow-100 p-3">
                <svg className="h-6 w-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="ml-4">
                <h2 className="text-sm font-medium text-gray-600">Photos totales</h2>
                <p className="text-2xl font-semibold text-gray-900">{stats.totalPhotos}</p>
              </div>
            </div>
          </div>

          <div
            className="cursor-pointer rounded-lg bg-white p-6 shadow transition-all hover:shadow-md"
            onClick={() => router.push('/admin/users')}
          >
            <div className="flex items-center">
              <div className="rounded-full bg-purple-100 p-3">
                <svg className="h-6 w-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <div className="ml-4">
                <h2 className="text-sm font-medium text-gray-600">Nouveaux utilisateurs (30j)</h2>
                <p className="text-2xl font-semibold text-gray-900">{stats.recentUsers}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Liste des utilisateurs récents */}
        <div className="mt-8">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium text-gray-900">Utilisateurs récents</h2>
            <button
              onClick={() => router.push('/admin/users')}
              className="text-sm font-medium text-blue-600 hover:text-blue-500"
            >
              Voir tout
            </button>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filteredUsers.slice(0, 6).map((user) => (
              <div
                key={user.id}
                className="cursor-pointer rounded-lg bg-white p-6 shadow transition-all hover:shadow-md"
                onClick={() => router.push(`/admin/users/${user.id}`)}
              >
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="h-12 w-12 rounded-full bg-gray-200 flex items-center justify-center">
                      <span className="text-xl font-medium text-gray-600">
                        {user.name.charAt(0)}
                      </span>
                    </div>
                  </div>
                  <div className="ml-4">
                    <h3 className="text-sm font-medium text-gray-900">{user.name}</h3>
                    <p className="text-sm text-gray-500">{user.email}</p>
                    <div className="mt-2 flex items-center text-sm text-gray-500">
                      <svg className="mr-1.5 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                      </svg>
                      {user.folders.length} dossiers
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
} 