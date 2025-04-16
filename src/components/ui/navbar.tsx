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

      try {
        // Récupérer le rôle depuis le localStorage
        const userRole = localStorage.getItem('userRole')
        const userId = localStorage.getItem('userId')

        if (userRole && userId === session.user.id) {
          setUserName(session.user.email || 'Utilisateur')
          setIsAdmin(userRole === 'admin')
          return
        }

        // Si le rôle n'est pas dans le localStorage, le récupérer depuis la base de données
        const { data: users, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', session.user.id)

        if (error || !users || users.length === 0) {
          console.error('Erreur lors de la vérification du rôle:', error)
          return
        }

        const userData = users[0]
        setUserName(userData.name || session.user.email || 'Utilisateur')
        setIsAdmin(userData.role === 'admin')
        localStorage.setItem('userRole', userData.role)
        localStorage.setItem('userId', session.user.id)
      } catch (error) {
        console.error('Erreur lors de la vérification du rôle:', error)
      }
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
    <nav className="bg-white shadow-lg rounded-2xl mx-2">
      <div className="max-w-7xl mx-auto px-1 sm:px-3 lg:px-4">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <Link href="/" className="text-xl font-bold text-[#50AFC9]">
                PhotoApp
              </Link>
            </div>
            <div className="hidden sm:ml-3 sm:flex sm:space-x-3">
              <Link
                href="/dashboard"
                className={`inline-flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  pathname === '/dashboard'
                    ? 'text-[#50AFC9] font-semibold'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                }`}
              >
                Tableau de bord
              </Link>
              {isAdmin && (
                <Link
                  href="/admin"
                  className={`inline-flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    pathname === '/admin'
                      ? 'text-[#50AFC9] font-semibold'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  Administration
                </Link>
              )}
            </div>
          </div>

          <div className="hidden sm:ml-3 sm:flex sm:items-center">
            <div className="ml-3 relative">
              <div className="flex items-center space-x-3">
                <span className="text-gray-700">{userName}</span>
                <button
                  onClick={handleLogout}
                  className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-colors"
                >
                  Déconnexion
                </button>
              </div>
            </div>
          </div>

          {/* Menu mobile */}
          <div className="flex items-center sm:hidden">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="inline-flex items-center justify-center p-2 rounded-lg text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[#50AFC9] transition-colors"
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
      </div>

      {/* Menu mobile */}
      {isMenuOpen && (
        <div className="sm:hidden">
          <div className="pt-2 pb-3 space-y-1">
            <Link
              href="/dashboard"
              className={`block pl-3 pr-4 py-2 rounded-lg text-base font-medium transition-colors ${
                pathname === '/dashboard'
                  ? 'text-[#50AFC9] font-semibold'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
              }`}
            >
              Tableau de bord
            </Link>
            {isAdmin && (
              <Link
                href="/admin"
                className={`block pl-3 pr-4 py-2 rounded-lg text-base font-medium transition-colors ${
                  pathname === '/admin'
                    ? 'text-[#50AFC9] font-semibold'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                }`}
              >
                Administration
              </Link>
            )}
            <div className="pl-3 pr-4 py-2">
              <span className="block text-gray-700">{userName}</span>
              <button
                onClick={handleLogout}
                className="mt-2 w-full bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-colors"
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