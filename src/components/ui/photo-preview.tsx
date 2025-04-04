import { useState } from 'react'
import { motion } from 'framer-motion'
import { TrashIcon, XMarkIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline'
import Image from 'next/image'

interface PhotoPreviewProps {
  url: string
  name: string
  uploaded_at: string
  onDelete?: () => void
  isSelected?: boolean
  onSelect?: () => void
  viewMode?: 'grid' | 'list'
  onClick?: () => void
}

export function PhotoPreview({
  url,
  name,
  uploaded_at,
  onDelete,
  isSelected = false,
  onSelect,
  viewMode = 'grid',
  onClick
}: PhotoPreviewProps) {
  const [isHovered, setIsHovered] = useState(false)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (onSelect) {
      onSelect()
    } else if (onClick) {
      onClick()
    }
  }

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (onDelete) {
      onDelete()
    }
  }

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      const response = await fetch(url)
      const blob = await response.blob()
      const downloadUrl = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = downloadUrl
      link.download = name
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(downloadUrl)
    } catch (error) {
      console.error('Erreur lors du téléchargement:', error)
    }
  }

  if (viewMode === 'list') {
    return (
      <div 
        className="flex items-center space-x-4 w-full cursor-pointer"
        onClick={handleClick}
      >
        <div className="relative w-16 h-16 flex-shrink-0">
          <img
            src={url}
            alt={name}
            className={`w-full h-full object-cover rounded-lg ${
              isSelected ? 'ring-2 ring-blue-500' : ''
            }`}
          />
          {isHovered && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute inset-0 bg-black bg-opacity-50 rounded-lg flex items-center justify-center"
            >
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleDownload}
                  className="p-1 text-white hover:text-gray-300 transition-colors"
                >
                  <ArrowDownTrayIcon className="h-5 w-5" />
                </button>
                <button
                  onClick={handleDelete}
                  className="p-1 text-white hover:text-red-400 transition-colors"
                >
                  <TrashIcon className="h-5 w-5" />
                </button>
              </div>
            </motion.div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">{name}</p>
          <p className="text-xs text-gray-500">{uploaded_at}</p>
        </div>
      </div>
    )
  }

  return (
    <div 
      className="relative group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        className={`relative overflow-hidden rounded-lg cursor-pointer transition-all duration-200 ${
          isSelected ? 'ring-2 ring-blue-500' : ''
        }`}
        onClick={handleClick}
      >
        <Image
          src={url}
          alt={name}
          width={300}
          height={300}
          className="object-cover w-full h-full"
        />
        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200" />
        {isHovered && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex items-center space-x-2">
              <button
                onClick={handleDownload}
                className="p-2 text-white hover:text-gray-300 rounded-full bg-black bg-opacity-50 hover:bg-opacity-70 transition-all"
              >
                <ArrowDownTrayIcon className="h-5 w-5" />
              </button>
              <button
                onClick={handleDelete}
                className="p-2 text-red-400 hover:text-red-300 rounded-full bg-black bg-opacity-50 hover:bg-opacity-70 transition-all"
              >
                <TrashIcon className="h-5 w-5" />
              </button>
            </div>
          </div>
        )}
      </div>
      <div className="mt-2">
        <p className="text-xs text-gray-500">
          {new Date(uploaded_at).toLocaleDateString()}
        </p>
      </div>
      {isPreviewOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center">
          <div className="relative max-w-4xl w-full mx-4">
            <button
              onClick={() => setIsPreviewOpen(false)}
              className="absolute top-4 right-4 text-white hover:text-gray-300"
            >
              <XMarkIcon className="h-8 w-8" />
            </button>
            <Image
              src={url}
              alt={name}
              width={1200}
              height={800}
              className="max-h-[80vh] w-auto mx-auto"
            />
          </div>
        </div>
      )}
    </div>
  )
} 