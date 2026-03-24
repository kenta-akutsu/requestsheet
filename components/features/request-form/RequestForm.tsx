'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { createRequestSchema, type CreateRequestInput } from '@/schemas/requestSchema'
import { AsanaTaskSearch } from './AsanaTaskSearch'
import { PrioritySelector } from './PrioritySelector'
import { AppButton } from '@/components/primitives/AppButton'

interface FormContext {
  customerName: string
  product: string
  contractStatus: string
  priority: string
  rawRequest: string
}

interface RequestFormProps {
  onComplete: (requestId: string, context: FormContext) => void
}

const PRODUCTS = [
  { value: 'OCR', label: 'GenX AI OCR' },
  { value: 'TimecardAgent', label: 'タイムカードAIエージェント' },
  { value: 'NandemonAI', label: 'ナンデモンAI' },
  { value: 'AIConsulting', label: 'AIを利用したシステム開発のご相談' },
  { value: 'Other', label: 'その他' },
] as const

const CONTRACT_STATUSES = [
  { value: 'pre_contract', label: '契約前' },
  { value: 'negotiating', label: '交渉中' },
  { value: 'contracted', label: '契約済み' },
] as const

export function RequestForm({ onComplete }: RequestFormProps) {
  const [loading, setLoading] = useState(false)
  const [apiError, setApiError] = useState<string | null>(null)
  const [asanaTask, setAsanaTask] = useState<{ gid: string; name: string } | null>(null)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CreateRequestInput>({
    resolver: zodResolver(createRequestSchema),
  })

  const priority = watch('priority')
  const rawRequest = watch('raw_request')

  async function onSubmit(data: CreateRequestInput) {
    setLoading(true)
    setApiError(null)
    try {
      const payload = {
        ...data,
        asana_parent_task_gid: asanaTask?.gid,
        asana_parent_task_name: asanaTask?.name,
      }
      const res = await fetch('/api/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || '作成に失敗しました')
      onComplete(json.request.id, {
        customerName: data.customer_name,
        product: data.product,
        contractStatus: data.contract_status,
        priority: data.priority,
        rawRequest: data.raw_request,
      })
    } catch (e) {
      setApiError(e instanceof Error ? e.message : '予期しないエラーが発生しました')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {apiError && (
        <div className="p-3 rounded-md bg-destructive/10 border border-destructive/20 text-destructive text-sm">
          {apiError}
        </div>
      )}

      {/* Customer Name */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-1.5">顧客名 *</label>
        <input
          {...register('customer_name')}
          placeholder="例: 株式会社ABC"
          className="w-full px-3 py-2 rounded-md bg-background border border-input text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
        {errors.customer_name && <p className="text-destructive text-xs mt-1">{errors.customer_name.message}</p>}
      </div>

      {/* Product */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-1.5">対象プロダクト *</label>
        <select
          {...register('product')}
          className="w-full px-3 py-2 rounded-md bg-background border border-input text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">選択してください</option>
          {PRODUCTS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
        </select>
        {errors.product && <p className="text-destructive text-xs mt-1">{errors.product.message}</p>}
      </div>

      {/* Contract Status */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-1.5">契約ステータス *</label>
        <div className="flex gap-3">
          {CONTRACT_STATUSES.map(s => (
            <label key={s.value} className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                value={s.value}
                {...register('contract_status')}
                className="text-primary focus:ring-primary"
              />
              <span className="text-sm text-foreground">{s.label}</span>
            </label>
          ))}
        </div>
        {errors.contract_status && <p className="text-destructive text-xs mt-1">{errors.contract_status.message}</p>}
      </div>

      {/* Priority */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-1.5">優先度 *</label>
        <PrioritySelector
          value={priority}
          onChange={(val) => setValue('priority', val, { shouldValidate: true })}
          error={errors.priority?.message}
        />
      </div>

      {/* Asana Task */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-1.5">
          Asana 親タスク <span className="text-muted-foreground font-normal">(任意)</span>
        </label>
        <AsanaTaskSearch value={asanaTask} onChange={setAsanaTask} />
      </div>

      {/* Raw Request */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-1.5">要望の内容 *</label>
        <textarea
          {...register('raw_request')}
          rows={5}
          placeholder="顧客から言われたことをそのまま書いてください（AIが整理します）"
          className="w-full px-3 py-2 rounded-md bg-background border border-input text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
        />
        {errors.raw_request && <p className="text-destructive text-xs mt-1">{errors.raw_request.message}</p>}
      </div>

      <AppButton type="submit" loading={loading} className="w-full">
        次へ → AIと整理する
      </AppButton>
    </form>
  )
}
