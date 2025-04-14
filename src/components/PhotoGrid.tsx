import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Download, Trash2, ChevronUp, ChevronDown, X } from 'lucide-react'
import Image from 'next/image'

interface Photo {
  id: string
  url: string
  name: string
  size: number
  uploaded_at: string
  folder_id: string
  user_id: string
}

interface PhotoGridProps {
  photos: Photo[]
  onDelete: (id: string) => void
  onDownload: (photo: Photo) => void
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

export function PhotoGrid({ photos, onDelete, onDownload }: PhotoGridProps) {
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)

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
    }
  }

  return (
    <>
      <motion.div 
        className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
      >
        {photos.map((photo, index) => (
          <motion.div
            key={photo.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.05 }}
            className="relative group aspect-square"
          >
            <Image
              src={photo.url}
              alt={photo.name}
              width={300}
              height={200}
              className="w-full h-full object-cover rounded-lg cursor-pointer"
              onClick={() => {
                setSelectedPhoto(photo)
                setIsPreviewOpen(true)
                setIsMinimized(false)
              }}
            />
            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-opacity duration-200 rounded-lg flex items-center justify-center space-x-2">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleDownloadPhoto(photo)
                }}
                className="opacity-0 group-hover:opacity-100 text-white bg-green-600 hover:bg-green-700 p-2 rounded-full transition-opacity duration-200"
                aria-label="Télécharger la photo"
              >
                <Download className="h-4 w-4" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onDelete(photo.id)
                }}
                className="opacity-0 group-hover:opacity-100 text-white bg-red-600 hover:bg-red-700 p-2 rounded-full transition-opacity duration-200"
                aria-label="Supprimer la photo"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </motion.div>
        ))}
      </motion.div>

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
                animate={{ 
                  scale: isMinimized ? 0.3 : 1,
                  opacity: 1,
                  y: isMinimized ? '80vh' : 0
                }}
                exit={{ scale: 0.9, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className={`inline-block align-bottom text-left overflow-hidden transform transition-all sm:my-8 sm:align-middle sm:max-w-5xl sm:w-full ${
                  isMinimized ? 'fixed bottom-4 right-4 w-64' : ''
                }`}
              >
                <div className="relative">
                  <Image
                    src={selectedPhoto.url}
                    alt={selectedPhoto.name}
                    width={300}
                    height={200}
                    className={`w-full h-auto ${isMinimized ? 'max-h-48' : 'max-h-[80vh]'} object-contain`}
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
                      onClick={() => setIsMinimized(!isMinimized)}
                      className="text-white bg-black bg-opacity-50 hover:bg-opacity-75 rounded-full p-2 transition-colors duration-200"
                      aria-label={isMinimized ? "Agrandir la prévisualisation" : "Réduire la prévisualisation"}
                    >
                      {isMinimized ? <ChevronUp className="h-6 w-6" /> : <ChevronDown className="h-6 w-6" />}
                    </button>
                    <button
                      onClick={() => setIsPreviewOpen(false)}
                      className="text-white bg-black bg-opacity-50 hover:bg-opacity-75 rounded-full p-2 transition-colors duration-200"
                      aria-label="Fermer la prévisualisation"
                    >
                      <X className="h-6 w-6" />
                    </button>
                  </div>
                  <div className={`absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white p-4 transition-opacity duration-200 ${isMinimized ? 'opacity-0' : 'opacity-100'}`}>
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
    </>
  )
} 