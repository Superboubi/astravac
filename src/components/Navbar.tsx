'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import {
  HomeIcon,
  FolderIcon,
  UserIcon,
  ArrowRightOnRectangleIcon,
} from '@heroicons/react/24/outline'

export default function Navbar() {
  const router = useRouter()
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  return (
    <nav className="bg-white shadow-lg rounded-b-2xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <span className="text-[#50AFC9] font-bold text-xl">PhotoCloud</span>
            </div>
            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
              <button
                onClick={() => router.push('/dashboard')}
                className="border-[#50AFC9] text-[#50AFC9] inline-flex items-center px-3 py-2 rounded-lg text-sm font-medium hover:bg-[#50AFC9]/10 transition-colors"
              >
                <HomeIcon className="h-5 w-5 mr-2" />
                Accueil
              </button>
              <button
                onClick={() => router.push('/dashboard')}
                className="border-transparent text-gray-500 hover:text-gray-700 inline-flex items-center px-3 py-2 rounded-lg text-sm font-medium hover:bg-gray-100 transition-colors"
              >
                <FolderIcon className="h-5 w-5 mr-2" />
                Dossiers
              </button>
            </div>
          </div>
          <div className="hidden sm:ml-6 sm:flex sm:items-center">
            <div className="ml-3 relative">
              <div>
                <button
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  className="bg-white flex text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#50AFC9] p-2 hover:bg-gray-100 transition-colors"
                >
                  <span className="sr-only">Ouvrir le menu utilisateur</span>
                  <UserIcon className="h-6 w-6 text-[#50AFC9]" />
                </button>
              </div>
              {isMenuOpen && (
                <div className="origin-top-right absolute right-0 mt-2 w-48 rounded-xl shadow-lg py-1 bg-white ring-1 ring-black ring-opacity-5 focus:outline-none">
                  <button
                    onClick={handleSignOut}
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left rounded-lg transition-colors"
                  >
                    <ArrowRightOnRectangleIcon className="h-5 w-5 inline-block mr-2 text-[#50AFC9]" />
                    Déconnexion
                  </button>
                </div>
              )}
            </div>
          </div>
          <div className="-mr-2 flex items-center sm:hidden">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="inline-flex items-center justify-center p-2 rounded-lg text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[#50AFC9] transition-colors"
            >
              <span className="sr-only">Ouvrir le menu principal</span>
              <svg
                className="block h-6 w-6"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Menu mobile */}
      {isMenuOpen && (
        <div className="sm:hidden">
          <div className="pt-2 pb-3 space-y-1">
            <button
              onClick={() => {
                router.push('/dashboard')
                setIsMenuOpen(false)
              }}
              className="bg-[#50AFC9] text-white block pl-3 pr-4 py-2 rounded-lg text-base font-medium"
            >
              <HomeIcon className="h-5 w-5 inline-block mr-2" />
              Accueil
            </button>
            <button
              onClick={() => {
                router.push('/dashboard')
                setIsMenuOpen(false)
              }}
              className="text-gray-500 hover:bg-gray-100 block pl-3 pr-4 py-2 rounded-lg text-base font-medium transition-colors"
            >
              <FolderIcon className="h-5 w-5 inline-block mr-2" />
              Dossiers
            </button>
          </div>
          <div className="pt-4 pb-3 border-t border-gray-200">
            <div className="flex items-center px-4">
              <div className="flex-shrink-0">
                <UserIcon className="h-8 w-8 text-[#50AFC9]" />
              </div>
            </div>
            <div className="mt-3 space-y-1">
              <button
                onClick={() => {
                  handleSignOut()
                  setIsMenuOpen(false)
                }}
                className="block px-4 py-2 text-base font-medium text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowRightOnRectangleIcon className="h-5 w-5 inline-block mr-2 text-[#50AFC9]" />
                Déconnexion
              </button>
            </div>
          </div>
        </div>
      )}
    </nav>
  )
} 