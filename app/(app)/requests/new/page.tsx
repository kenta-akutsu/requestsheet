'use client'

import { useState } from 'react'
import { RequestForm } from '@/components/features/request-form/RequestForm'
import { ChatWindow } from '@/components/features/chat/ChatWindow'
import { useRouter } from 'next/navigation'

export default function NewRequestPage() {
  const [step, setStep] = useState<'form' | 'chat'>('form')
  const [requestId, setRequestId] = useState<string | null>(null)
  const [rawRequest, setRawRequest] = useState('')
  const router = useRouter()

  function handleFormComplete(id: string, raw: string) {
    setRequestId(id)
    setRawRequest(raw)
    setStep('chat')
  }

  function handleSheetComplete() {
    if (requestId) {
      router.push(`/requests/${requestId}`)
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-foreground">新規機能要望登録</h2>
        <p className="text-muted-foreground text-sm mt-1">
          {step === 'form' ? '顧客からの要望情報を入力してください' : 'AIが不足情報を質問します'}
        </p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-3 mb-6">
        <div className={`flex items-center gap-2 text-sm ${step === 'form' ? 'text-primary font-medium' : 'text-muted-foreground'}`}>
          <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
            step === 'form' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
          }`}>1</span>
          基本情報入力
        </div>
        <div className="h-px flex-1 bg-border" />
        <div className={`flex items-center gap-2 text-sm ${step === 'chat' ? 'text-primary font-medium' : 'text-muted-foreground'}`}>
          <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
            step === 'chat' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
          }`}>2</span>
          AIと整理
        </div>
      </div>

      <div className="bg-card rounded-lg border border-border p-6">
        {step === 'form' ? (
          <RequestForm onComplete={handleFormComplete} />
        ) : requestId ? (
          <ChatWindow
            requestId={requestId}
            initialMessage={rawRequest || '要望の詳細を教えてください。'}
            onSheetComplete={handleSheetComplete}
          />
        ) : null}
      </div>
    </div>
  )
}
