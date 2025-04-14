'use client'

import { useState } from 'react'
import Image from 'next/image'
import { format, parseISO } from 'date-fns'
import { fr } from 'date-fns/locale'
import { Photo } from '@/lib/supabase'

interface PhotoPreviewProps {
  photo: Photo
  onClose: () => void
}

export function PhotoPreview({ photo, onClose }: PhotoPreviewProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const handleImageError = () => {
    setError('Impossible de charger l\'image')
    setIsLoading(false)
  }

  const handleImageLoad = () => {
    setIsLoading(false)
    setError(null)
  }

  const formatDate = (dateString: string) => {
    console.log('Date reçue:', dateString) // Log pour déboguer
    if (!dateString) return 'Date inconnue'
    
    try {
      // Vérifier si la date est déjà un timestamp
      if (!isNaN(Date.parse(dateString))) {
        return format(new Date(dateString), 'PPP', { locale: fr })
      }
      
      // Essayer de parser la date ISO
      const parsedDate = parseISO(dateString)
      if (isNaN(parsedDate.getTime())) {
        throw new Error('Date invalide')
      }
      return format(parsedDate, 'PPP', { locale: fr })
    } catch (error) {
      console.error('Erreur de formatage de la date:', error)
      return 'Date inconnue'
    }
  }

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
      <div className="relative w-full max-w-4xl bg-white rounded-lg overflow-hidden">
        <button
          onClick={onClose}
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
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
            </div>
          )}
          
          {error ? (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
              <p className="text-red-500">{error}</p>
            </div>
          ) : (
            <Image
              src={photo.url}
              alt={photo.name}
              fill
              className="object-contain"
              onError={handleImageError}
              onLoad={handleImageLoad}
              priority
            />
          )}
        </div>

        <div className="p-4 bg-white">
          <h3 className="text-lg font-medium text-gray-900">{photo.name}</h3>
          <p className="text-sm text-gray-500 mt-1">
            Ajoutée le {formatDate(photo.created_at)}
          </p>
        </div>
      </div>
    </div>
  )
} 