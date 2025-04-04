'use client'

import { useState, useCallback, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  FolderIcon, 
  ChevronRightIcon, 
  ChevronDownIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  EllipsisVerticalIcon
} from '@heroicons/react/24/outline'
import { motion, AnimatePresence } from 'framer-motion'

interface Folder {
  id: string
  name: string
  path: string
  children?: Folder[]
  photoCount?: number
  lastModified?: string
}

interface FolderListProps {
  folders: Folder[]
  onFolderSelect?: (folderId: string) => void
  onCreateFolder?: () => void
  onDeleteFolder?: (folderId: string) => void
  onRenameFolder?: (folderId: string, newName: string) => void
}

export function FolderList({ 
  folders, 
  onFolderSelect,
  onCreateFolder,
  onDeleteFolder,
  onRenameFolder 
}: FolderListProps) {
  const pathname = usePathname()
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set())
  const [searchQuery, setSearchQuery] = useState('')
  const [contextMenu, setContextMenu] = useState<{ folderId: string, x: number, y: number } | null>(null)
  const [editingFolder, setEditingFolder] = useState<{ id: string, name: string } | null>(null)

  useEffect(() => {
    if (folders.length > 0 && folders[0].children && folders[0].children.length > 0) {
      setExpandedFolders(new Set([folders[0].id]))
    }
  }, [folders])

  const toggleFolder = (folderId: string) => {
    setExpandedFolders(prev => {
      const newSet = new Set(prev)
      if (newSet.has(folderId)) {
        newSet.delete(folderId)
      } else {
        newSet.add(folderId)
      }
      return newSet
    })
  }

  const handleContextMenu = (e: React.MouseEvent, folderId: string) => {
    e.preventDefault()
    setContextMenu({ folderId, x: e.clientX, y: e.clientY })
  }

  const closeContextMenu = useCallback(() => {
    setContextMenu(null)
  }, [])

  const handleRenameStart = (folderId: string, currentName: string) => {
    setEditingFolder({ id: folderId, name: currentName })
    closeContextMenu()
  }

  const handleRenameSubmit = async () => {
    if (editingFolder && onRenameFolder) {
      await onRenameFolder(editingFolder.id, editingFolder.name)
      setEditingFolder(null)
    }
  }

  const filteredFolders = folders.filter(folder => 
    folder.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const renderFolder = (folder: Folder, level: number = 0) => {
    const isExpanded = expandedFolders.has(folder.id)
    const isActive = pathname === folder.path
    const hasChildren = folder.children && folder.children.length > 0

    return (
      <div key={folder.id}>
        <div
          className={`group flex items-center py-2 px-4 cursor-pointer hover:bg-gray-50 transition-colors ${
            isActive ? 'bg-blue-50 text-blue-600' : 'text-gray-700'
          }`}
          style={{ paddingLeft: `${level * 16 + 16}px` }}
          onClick={() => onFolderSelect?.(folder.id)}
          onContextMenu={(e) => handleContextMenu(e, folder.id)}
        >
          {hasChildren && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                toggleFolder(folder.id)
              }}
              className="mr-2 text-gray-400 hover:text-gray-600 focus:outline-none"
            >
              {isExpanded ? (
                <ChevronDownIcon className="h-4 w-4" />
              ) : (
                <ChevronRightIcon className="h-4 w-4" />
              )}
            </button>
          )}
          {!hasChildren && <div className="w-6" />}
          <FolderIcon className="h-5 w-5 mr-2 flex-shrink-0" />
          {editingFolder?.id === folder.id ? (
            <input
              type="text"
              value={editingFolder.name}
              onChange={(e) => setEditingFolder({ ...editingFolder, name: e.target.value })}
              onBlur={handleRenameSubmit}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleRenameSubmit()
                if (e.key === 'Escape') setEditingFolder(null)
              }}
              className="flex-1 bg-transparent border-b border-blue-500 focus:outline-none"
              autoFocus
            />
          ) : (
            <Link
              href={folder.path}
              className={`flex-1 truncate text-sm font-medium ${
                isActive ? 'text-blue-600' : 'text-gray-700 hover:text-gray-900'
              }`}
            >
              {folder.name}
            </Link>
          )}
          <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
            {folder.photoCount !== undefined && (
              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                {folder.photoCount}
              </span>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation()
                handleContextMenu(e, folder.id)
              }}
              className="p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
            >
              <EllipsisVerticalIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
        <AnimatePresence>
          {isExpanded && hasChildren && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
            >
              {folder.children?.map(child => renderFolder(child, level + 1))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    )
  }

  return (
    <div className="w-64 h-full bg-white border-r border-gray-200 overflow-y-auto">
      <div className="p-3">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-900">Dossiers</h2>
          {onCreateFolder && (
            <button
              onClick={onCreateFolder}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
              title="Nouveau dossier"
            >
              <PlusIcon className="h-5 w-5" />
            </button>
          )}
        </div>
        
        <div className="relative mb-3">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Rechercher un dossier..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          />
        </div>

        <div className="space-y-0.5">
          {filteredFolders.map(folder => renderFolder(folder))}
        </div>
      </div>

      {/* Menu contextuel */}
      <AnimatePresence>
        {contextMenu && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed bg-white rounded-lg shadow-lg py-1 z-50"
            style={{ top: contextMenu.y, left: contextMenu.x }}
            onClick={closeContextMenu}
          >
            <button
              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              onClick={() => {
                const folder = folders.find(f => f.id === contextMenu.folderId)
                if (folder) handleRenameStart(folder.id, folder.name)
              }}
            >
              Renommer
            </button>
            {onDeleteFolder && (
              <button
                className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                onClick={() => {
                  onDeleteFolder(contextMenu.folderId)
                  closeContextMenu()
                }}
              >
                Supprimer
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
} 