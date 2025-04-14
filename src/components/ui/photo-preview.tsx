import { useState, useEffect } from 'react'

interface PhotoPreviewProps {
  url: string
  name: string
  uploaded_at: string
  onDelete: () => void
}

export function PhotoPreview({ url, name, uploaded_at, onDelete }: PhotoPreviewProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  const handleImageLoad = () => {
    setIsLoading(false)
  }

  // Nettoyer l'URL si elle contient déjà le préfixe data:image
  const cleanUrl = url.startsWith('data:image') ? url : `data:image/png;base64,${url}`

  return (
    <>
      <div className="relative group">
        <div className="aspect-w-16 aspect-h-9 bg-gray-100 rounded-lg overflow-hidden">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          )}
          <img
            src={cleanUrl}
            alt={name}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            onClick={() => setIsOpen(true)}
            onLoad={handleImageLoad}
          />
        </div>
        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-opacity duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100">
          <button
            onClick={(e) => {
              e.stopPropagation()
              onDelete()
            }}
            className="bg-red-500 text-white p-2 rounded-full hover:bg-red-600 transition-colors"
            title="Supprimer la photo"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>
        <div className="mt-2">
          <h3 className="text-sm font-medium text-gray-900 truncate">{name}</h3>
          <p className="text-xs text-gray-500">
            Ajoutée le {new Date(uploaded_at).toLocaleDateString()}
          </p>
        </div>
      </div>

      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4"
          onClick={() => setIsOpen(false)}
        >
          <div className="relative max-w-4xl w-full">
            <button
              onClick={() => setIsOpen(false)}
              className="absolute -top-12 right-0 text-white hover:text-gray-300 transition-colors"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-8 w-8"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
            <div className="relative">
              <img
                src={cleanUrl}
                alt={name}
                className="w-full h-auto rounded-lg"
                style={{ maxHeight: '80vh' }}
              />
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-4 rounded-b-lg">
                <h3 className="text-xl font-semibold text-white">{name}</h3>
                <p className="text-sm text-gray-300">
                  Ajoutée le {new Date(uploaded_at).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
} 