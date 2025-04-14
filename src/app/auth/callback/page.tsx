export const dynamic = 'force-dynamic'

'use client'

import { Suspense, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

function CallbackHandler() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const code = searchParams.get('code')

  useEffect(() => {
    const handleCallback = async () => {
      if (code) {
        const supabase = createClientComponentClient()
        await supabase.auth.exchangeCodeForSession(code)
      }
      router.push('/dashboard')
    }

    handleCallback()
  }, [code, router])

  return null
}

function LoadingState() {
  return (
    <div className="text-center">
      <h2 className="text-2xl font-semibold text-gray-900">
        Connexion en cours...
      </h2>
      <p className="mt-2 text-gray-600">
        Veuillez patienter pendant que nous vous connectons.
      </p>
    </div>
  )
}

export default function CallbackPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Suspense fallback={<LoadingState />}>
        <CallbackHandler />
      </Suspense>
    </div>
  )
} 