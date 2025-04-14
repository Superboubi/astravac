'use client'

export const dynamic = 'force-dynamic'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

function CallbackContent() {
  const searchParams = useSearchParams()
  const code = searchParams.get('code')

  if (code) {
    supabase.auth.exchangeCodeForSession(code)
  }

  return null
}

export default function CallbackPage() {
  return (
    <Suspense fallback={<div>Chargement...</div>}>
      <CallbackContent />
    </Suspense>
  )
} 