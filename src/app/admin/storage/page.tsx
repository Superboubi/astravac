'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { AdminNavbar } from '@/components/ui/admin-navbar'
import { supabase } from '@/lib/supabase'

interface StorageStats {
  totalSpace: number
  usedSpace: number
  totalUsers: number
  totalFolders: number
  totalPhotos: number
  spaceByUser: {
    userId: string
    userName: string
    usedSpace: number
    photoCount: number
  }[]
}

export default function AdminStoragePage() {
  const router = useRouter()
  const [stats, setStats] = useState<StorageStats>({
    totalSpace: 1000, // GB
    usedSpace: 0,
    totalUsers: 0,
    totalFolders: 0,
    totalPhotos: 0,
    spaceByUser: []
  })
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

      fetchStorageStats()
    }
    checkAuth()
  }, [router])

  const fetchStorageStats = async () => {
    try {
      setIsLoading(true)
      setError(null)

      // Récupérer tous les utilisateurs
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('*')

      if (usersError) throw usersError

      // Récupérer toutes les photos
      const { data: photosData, error: photosError } = await supabase
        .from('photos')
        .select('*')

      if (photosError) throw photosError

      // Calculer l'espace utilisé par utilisateur
      const spaceByUser = usersData.map(user => {
        const userPhotos = photosData.filter(photo => photo.user_id === user.id)
        const usedSpace = userPhotos.reduce((acc, photo) => acc + (photo.size || 0), 0) / (1024 * 1024 * 1024) // Convertir en GB

        return {
          userId: user.id,
          userName: user.name,
          usedSpace,
          photoCount: userPhotos.length
        }
      })

      // Calculer les statistiques globales
      const totalUsedSpace = spaceByUser.reduce((acc, user) => acc + user.usedSpace, 0)
      const totalPhotos = photosData.length

      setStats({
        totalSpace: 1000, // GB
        usedSpace: totalUsedSpace,
        totalUsers: usersData.length,
        totalFolders: usersData.reduce((acc, user) => acc + user.folders?.length || 0, 0),
        totalPhotos,
        spaceByUser
      })
    } catch (error: any) {
      console.error('Erreur lors du chargement des statistiques:', error)
      setError('Erreur lors du chargement des statistiques')
    } finally {
      setIsLoading(false)
    }
  }

  const formatSize = (gb: number) => {
    if (gb >= 1000) {
      return `${(gb / 1000).toFixed(1)} TB`
    }
    return `${gb.toFixed(1)} GB`
  }

  const getUsagePercentage = (used: number, total: number) => {
    return ((used / total) * 100).toFixed(1)
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
          <h1 className="text-3xl font-bold text-gray-900">Gestion du stockage</h1>
        </div>

        {/* Vue d'ensemble */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <div className="overflow-hidden rounded-lg bg-white px-4 py-5 shadow sm:p-6">
            <dt className="truncate text-sm font-medium text-gray-500">Espace total</dt>
            <dd className="mt-1 text-3xl font-semibold tracking-tight text-gray-900">
              {formatSize(stats.totalSpace)}
            </dd>
          </div>
          <div className="overflow-hidden rounded-lg bg-white px-4 py-5 shadow sm:p-6">
            <dt className="truncate text-sm font-medium text-gray-500">Espace utilisé</dt>
            <dd className="mt-1 text-3xl font-semibold tracking-tight text-gray-900">
              {formatSize(stats.usedSpace)}
            </dd>
          </div>
          <div className="overflow-hidden rounded-lg bg-white px-4 py-5 shadow sm:p-6">
            <dt className="truncate text-sm font-medium text-gray-500">Utilisateurs</dt>
            <dd className="mt-1 text-3xl font-semibold tracking-tight text-gray-900">
              {stats.totalUsers}
            </dd>
          </div>
          <div className="overflow-hidden rounded-lg bg-white px-4 py-5 shadow sm:p-6">
            <dt className="truncate text-sm font-medium text-gray-500">Photos totales</dt>
            <dd className="mt-1 text-3xl font-semibold tracking-tight text-gray-900">
              {stats.totalPhotos}
            </dd>
          </div>
        </div>

        {/* Barre de progression de l'utilisation */}
        <div className="mt-8">
          <div className="overflow-hidden rounded-lg bg-white shadow">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg font-medium leading-6 text-gray-900">
                Utilisation par utilisateur
              </h3>
              <div className="mt-4">
                <div className="relative pt-1">
                  <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-blue-200">
                    <div
                      style={{ width: `${getUsagePercentage(stats.usedSpace, stats.totalSpace)}%` }}
                      className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-blue-500"
                    />
                  </div>
                </div>
              </div>
              <div className="mt-4">
                <ul className="divide-y divide-gray-200">
                  {stats.spaceByUser.map((user) => (
                    <li key={user.userId} className="py-5">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{user.userName}</p>
                          <p className="text-sm text-gray-500">
                            {user.photoCount} photos • {formatSize(user.usedSpace)}
                          </p>
                        </div>
                        <div className="text-sm text-gray-500">
                          {getUsagePercentage(user.usedSpace, stats.totalSpace)}%
                        </div>
                      </div>

                      <div className="mt-4">
                        <div className="relative pt-1">
                          <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-blue-200">
                            <div
                              style={{ width: `${getUsagePercentage(user.usedSpace, stats.totalSpace)}%` }}
                              className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-blue-500"
                            />
                          </div>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 