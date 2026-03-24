'use client'

import { useState } from 'react'
import { RequestForm } from '@/components/features/request-form/RequestForm'
import { ChatWindow } from '@/components/features/chat/ChatWindow'
import { useRouter } from 'next/navigation'

interface FormContext {
  customerName: string
  product: string
  contractStatus: string
  priority: string
  rawRequest: string
}

const PRODUCT_LABELS: Record<string, string> = {
  OCR: 'GenX AI OCR',
  TimecardAgent: 'タイムカードAIエージェント',
  NandemonAI: 'ナンデモンAI',
  AIConsulting: 'AIを利用したシステム開発のご相談',
  Other: 'その他',
}

const CONTRACT_LABELS: Record<string, string> = {
  pre_contract: '契約前',
  negotiating: '交渉中',
  contracted: '契約済み',
}

const PRIORITY_LABELS: Record<string, string> = {
  high: '高',
  medium: '中',
  low: '低',
}

export default function NewRequestPage() {
  const [step, setStep] = useState<'form' | 'chat'>('form')
  const [requestId, setRequestId] = useState<string | null>(null)
  const [formContext, setFormContext] = useState<FormContext | null>(null)
  const router = useRouter()

  function handleFormComplete(id: string, context: FormContext) {
    setRequestId(id)
    setFormContext(context)
    setStep('chat')
  }

  function handleSheetComplete() {
    if (requestId) {
      router.push(`/requests/${requestId}`)
    }
  }

  // Build the initial message with full context for AI
  function buildInitialMessage(ctx: FormContext): string {
    const productLabel = PRODUCT_LABELS[ctx.product] || ctx.product
    const contractLabel = CONTRACT_LABELS[ctx.contractStatus] || ctx.contractStatus
    const priorityLabel = PRIORITY_LABELS[ctx.priority] || ctx.priority

    return `【要望概要】
顧客名: ${ctx.customerName}
対象プロダクト: ${productLabel}
契約ステータス: ${contractLabel}
優先度: ${priorityLabel}

【要望内容】
${ctx.rawRequest}`
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
        ) : requestId && formContext ? (
          <ChatWindow
            requestId={requestId}
            initialMessage={buildInitialMessage(formContext)}
            productName={PRODUCT_LABELS[formContext.product] || formContext.product}
            customerName={formContext.customerName}
            onSheetComplete={handleSheetComplete}
          />
        ) : null}
      </div>
    </div>
  )
}
