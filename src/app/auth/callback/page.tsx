'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function AuthCallbackPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const handleCallback = async () => {
      const { error } = await supabase.auth.getSession()
      
      if (error) {
        console.error('Erreur lors de la confirmation:', error)
        router.push('/auth/login?error=confirmation_failed')
        return
      }

      // Rediriger vers la page de connexion avec un message de succès
      router.push('/auth/login?registered=true&emailConfirmed=true')
    }

    handleCallback()
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <h2 className="text-2xl font-semibold text-gray-900">
          Confirmation de votre email en cours...
        </h2>
        <p className="mt-2 text-gray-600">
          Veuillez patienter pendant que nous vérifions votre email.
        </p>
      </div>
    </div>
  )
} 