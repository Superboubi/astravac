'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Photo } from '@/types'
import Image from 'next/image'

interface ImagePreviewProps {
  photo: Photo
  onClose: () => void
  onRename: (newName: string) => void
}

export function ImagePreview({ photo, onClose, onRename }: ImagePreviewProps) {
  const [isRenaming, setIsRenaming] = useState(false)
  const [newName, setNewName] = useState(photo.name)
  const [isLoading, setIsLoading] = useState(false)

  const handleRename = async () => {
    if (!newName.trim()) return

    setIsLoading(true)
    try {
      const { error } = await supabase
        .from('photos')
        .update({ name: newName })
        .eq('id', photo.id)

      if (error) throw error

      onRename(newName)
      setIsRenaming(false)
    } catch (error) {
      console.error('Erreur lors du renommage:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDownload = () => {
    const link = document.createElement('a')
    link.href = `data:${photo.mime_type};base64,${photo.image_data}`
    link.download = photo.name
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full mx-4">
        <div className="p-4 flex justify-between items-center border-b">
          {isRenaming ? (
            <div className="flex-1 flex items-center space-x-2">
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="flex-1 px-2 py-1 border rounded"
                autoFocus
              />
              <button
                onClick={handleRename}
                disabled={isLoading}
                className="px-3 py-1 bg-[#50AFC9] text-white rounded hover:bg-[#3F8BA1] disabled:opacity-50"
              >
                {isLoading ? 'Enregistrement...' : 'Valider'}
              </button>
              <button
                onClick={() => setIsRenaming(false)}
                className="px-3 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
              >
                Annuler
              </button>
            </div>
          ) : (
            <h3 className="text-lg font-medium text-gray-900">{photo.name}</h3>
          )}
          <div className="flex items-center space-x-2">
            <button
              onClick={handleDownload}
              className="p-2 text-gray-500 hover:text-[#50AFC9]"
              title="Télécharger"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
            <button
              onClick={() => setIsRenaming(true)}
              className="p-2 text-gray-500 hover:text-[#50AFC9]"
              title="Renommer"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
              </svg>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-500 hover:text-[#50AFC9]"
              title="Fermer"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          </div>
        </div>
        <div className="p-4">
          <Image
            src={photo.url}
            alt={photo.name}
            width={800}
            height={600}
            className="max-w-full max-h-[80vh] object-contain"
          />
        </div>
      </div>
    </div>
  )
} 