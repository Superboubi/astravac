'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export function Navbar() {
  const pathname = usePathname()
  const [userName, setUserName] = useState<string | null>(null)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const { data: userData, error } = await supabase
        .from('users')
        .select('name, role')
        .eq('id', session.user.id)
        .single()

      if (error) {
        console.error('Erreur lors de la récupération des données utilisateur:', error)
        return
      }

      setUserName(userData.name)
      setIsAdmin(userData.role === 'admin')
    }
    checkUser()
  }, [])

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error

      localStorage.removeItem('isAuthenticated')
      localStorage.removeItem('userRole')
      localStorage.removeItem('userName')
      window.location.href = '/auth/login'
    } catch (error: any) {
      console.error('Erreur lors de la déconnexion:', error)
      alert('Erreur lors de la déconnexion')
    }
  }

  return (
    <nav className="bg-white">
      <div className="flex justify-between items-center h-16 px-6">
        {/* Logo et navigation principale */}
        <div className="flex items-center space-x-8">
          <Link href="/" className="flex-shrink-0">
            <span className="text-2xl font-bold text-blue-600">Astra</span>
          </Link>
          <div className="hidden sm:flex sm:space-x-8">
            <Link
              href="/dashboard"
              className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                pathname === '/dashboard'
                  ? 'border-blue-500 text-gray-900'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
              }`}
            >
              Tableau de bord
            </Link>
            {isAdmin && (
              <Link
                href="/admin"
                className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                  pathname === '/admin'
                    ? 'border-blue-500 text-gray-900'
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                }`}
              >
                Administration
              </Link>
            )}
          </div>
        </div>

        {/* Menu utilisateur */}
        <div className="flex items-center space-x-4">
          <span className="hidden sm:block text-sm text-gray-700">{userName}</span>
          <button
            onClick={handleLogout}
            className="px-6 py-2 text-sm text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors mr-4"
          >
            Se déconnecter
          </button>

          {/* Bouton menu mobile */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="sm:hidden inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
          >
            <span className="sr-only">Ouvrir le menu</span>
            {!isMenuOpen ? (
              <svg
                className="block h-6 w-6"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            ) : (
              <svg
                className="block h-6 w-6"
                xmlns="http://www.w3.org/2000/svg"
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
            )}
          </button>
        </div>
      </div>

      {/* Menu mobile */}
      {isMenuOpen && (
        <div className="sm:hidden">
          <div className="pt-2 pb-3 space-y-1">
            <Link
              href="/dashboard"
              className={`block pl-3 pr-4 py-2 border-l-4 text-base font-medium ${
                pathname === '/dashboard'
                  ? 'bg-blue-50 border-blue-500 text-blue-700'
                  : 'border-transparent text-gray-500 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-700'
              }`}
            >
              Tableau de bord
            </Link>
            {isAdmin && (
              <Link
                href="/admin"
                className={`block pl-3 pr-4 py-2 border-l-4 text-base font-medium ${
                  pathname === '/admin'
                    ? 'bg-blue-50 border-blue-500 text-blue-700'
                    : 'border-transparent text-gray-500 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-700'
                }`}
              >
                Administration
              </Link>
            )}
            <div className="pl-3 pr-4 py-2">
              <span className="block text-gray-700">{userName}</span>
              <button
                onClick={handleLogout}
                className="mt-2 w-full bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-colors mx-4"
              >
                Déconnexion
              </button>
            </div>
          </div>
        </div>
      )}
    </nav>
  )
} 