'use client'

import { useState, useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { PhotoPreview } from './photo-preview'

interface PhotoGridProps {
  folderId: string | null
}

export function PhotoGrid({ folderId }: PhotoGridProps) {
  const [photos, setPhotos] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const supabase = createClientComponentClient()

  useEffect(() => {
    const fetchPhotos = async () => {
      try {
        const { data, error } = await supabase
          .from('photos')
          .select('*')
          .eq('folder_id', folderId)
          .order('created_at', { ascending: false })

        if (error) throw error
        setPhotos(data || [])
      } catch (error) {
        console.error('Erreur lors de la récupération des photos:', error)
      } finally {
        setIsLoading(false)
      }
    }

    if (folderId) {
      fetchPhotos()
    }
  }, [folderId])

  if (isLoading) {
    return <div>Chargement des photos...</div>
  }

  const handleDelete = async (photoId: string) => {
    try {
      const { error } = await supabase
        .from('photos')
        .delete()
        .eq('id', photoId)

      if (error) throw error

      setPhotos(photos.filter(photo => photo.id !== photoId))
    } catch (error) {
      console.error('Erreur lors de la suppression:', error)
    }
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {photos.map((photo) => (
        <PhotoPreview
          key={photo.id}
          url={photo.url}
          name={photo.name}
          uploaded_at={photo.created_at}
          onDelete={() => handleDelete(photo.id)}
        />
      ))}
    </div>
  )
} 