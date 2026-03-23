'use client'

import { useRouter } from 'next/navigation'
import { ResponseForm } from '@/components/features/response/ResponseForm'

export function ResponseFormWrapper({ requestId }: { requestId: string }) {
  const router = useRouter()

  return (
    <ResponseForm
      requestId={requestId}
      onComplete={() => router.refresh()}
    />
  )
}
