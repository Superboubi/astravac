'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { FolderList } from '@/components/ui/folder-list'
import { PhotoGrid } from '../../components/ui/photo-grid'
import Navbar from '@/components/Navbar'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

interface DashboardContentProps {
  folderId: string | null
  userName: string
  folders: any[]
}

function DashboardContent({ folderId, userName, folders }: DashboardContentProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar userName={userName} />
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="md:col-span-1">
            <FolderList folders={folders} />
          </div>
          <div className="md:col-span-3">
            <PhotoGrid folderId={folderId} />
          </div>
        </div>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const searchParams = useSearchParams()
  const folderId = searchParams.get('folderId')
  const [userName, setUserName] = useState('')
  const [folders, setFolders] = useState<any[]>([])
  const supabase = createClientComponentClient()

  useEffect(() => {
    const fetchUserData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUserName(user.email || '')
      }
    }

    const fetchFolders = async () => {
      const { data, error } = await supabase
        .from('folders')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Erreur lors de la récupération des dossiers:', error)
        return
      }

      setFolders(data || [])
    }

    fetchUserData()
    fetchFolders()
  }, [])

  return (
    <Suspense fallback={<div>Chargement...</div>}>
      <DashboardContent 
        folderId={folderId} 
        userName={userName}
        folders={folders}
      />
    </Suspense>
  )
} 