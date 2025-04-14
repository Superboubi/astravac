import { FC } from 'react'
import { PhotoPreviewProps } from '@/types/photo-preview'
import Image from 'next/image'

const PhotoPreview: FC<PhotoPreviewProps> = ({ url, name, created_at, onDelete }) => {
  return (
    <div className="relative group">
      <Image
        src={url}
        alt={name}
        width={300}
        height={200}
        className="object-cover w-full h-full"
      />
      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-opacity rounded-lg" />
      <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/50 to-transparent rounded-b-lg">
        <p className="text-white text-sm truncate">{name}</p>
        <p className="text-white text-xs opacity-75">
          {new Date(created_at).toLocaleDateString()}
        </p>
      </div>
      <button
        onClick={onDelete}
        className="absolute top-2 right-2 p-2 text-white bg-red-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
          />
        </svg>
      </button>
    </div>
  )
}

export default PhotoPreview 