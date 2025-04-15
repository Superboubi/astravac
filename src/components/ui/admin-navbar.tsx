'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'

export function AdminNavbar() {
  const router = useRouter()

  const handleLogout = () => {
    localStorage.removeItem('isAuthenticated')
    localStorage.removeItem('userRole')
    localStorage.removeItem('userName')
    router.push('/auth/login')
  }

  return (
    <nav className="bg-white shadow">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 justify-between">
          <div className="flex">
            <div className="flex flex-shrink-0 items-center">
              <span className="text-xl font-bold text-[#50AFC9]">Administration</span>
            </div>
            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
              <Link
                href="/admin/users"
                className="inline-flex items-center border-b-2 border-[#50AFC9] px-1 pt-1 text-sm font-medium text-gray-900"
              >
                Gestion des utilisateurs
              </Link>
            </div>
          </div>
          <div className="flex items-center">
            <button
              onClick={handleLogout}
              className="rounded-md bg-[#50AFC9] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#3F8BA1] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#50AFC9]"
            >
              Déconnexion
            </button>
          </div>
        </div>
      </div>
    </nav>
  )
} 