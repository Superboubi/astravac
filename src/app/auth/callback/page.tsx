'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Suspense } from 'react'

function CallbackContent() {
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

export default function CallbackPage() {
  return (
    <Suspense fallback={<div>Chargement...</div>}>
      <CallbackContent />
    </Suspense>
  )
} 