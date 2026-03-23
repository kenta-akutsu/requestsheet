'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { createResponseSchema, type CreateResponseInput } from '@/schemas/responseSchema'
import { AppButton } from '@/components/primitives/AppButton'

interface ResponseFormProps {
  requestId: string
  onComplete: () => void
}

const FEASIBILITY_OPTIONS = [
  { value: 'feasible', label: '実現可能', color: 'text-green-400' },
  { value: 'conditional', label: '条件付き', color: 'text-yellow-400' },
  { value: 'infeasible', label: '実現困難', color: 'text-red-400' },
] as const

export function ResponseForm({ requestId, onComplete }: ResponseFormProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { register, handleSubmit, formState: { errors } } = useForm<CreateResponseInput>({
    resolver: zodResolver(createResponseSchema),
    defaultValues: { request_id: requestId },
  })

  async function onSubmit(data: CreateResponseInput) {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/responses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const json = await res.json()
        throw new Error(json.error || '送信に失敗しました')
      }
      onComplete()
    } catch (e) {
      setError(e instanceof Error ? e.message : '予期しないエラーが発生しました')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <input type="hidden" {...register('request_id')} />

      {error && (
        <div className="p-3 rounded-md bg-destructive/10 border border-destructive/20 text-destructive text-sm">
          {error}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-foreground mb-1.5">質問・確認事項</label>
        <textarea
          {...register('questions')}
          rows={3}
          placeholder="エンジニアとして確認したいことがあれば記入してください"
          className="w-full px-3 py-2 rounded-md bg-background border border-input text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">見積金額 (任意)</label>
          <input
            {...register('estimate_amount')}
            placeholder="例: 50万円"
            className="w-full px-3 py-2 rounded-md bg-background border border-input text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">見積期間 (任意)</label>
          <input
            {...register('estimate_duration')}
            placeholder="例: 2週間"
            className="w-full px-3 py-2 rounded-md bg-background border border-input text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-foreground mb-1.5">実現可否 *</label>
        <div className="flex gap-3">
          {FEASIBILITY_OPTIONS.map(opt => (
            <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                value={opt.value}
                {...register('feasibility')}
                className="text-primary focus:ring-primary"
              />
              <span className={`text-sm ${opt.color}`}>{opt.label}</span>
            </label>
          ))}
        </div>
        {errors.feasibility && <p className="text-destructive text-xs mt-1">{errors.feasibility.message}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-foreground mb-1.5">備考</label>
        <textarea
          {...register('notes')}
          rows={2}
          placeholder="その他の補足情報"
          className="w-full px-3 py-2 rounded-md bg-background border border-input text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
        />
      </div>

      <AppButton type="submit" loading={loading} className="w-full">
        返答を送信
      </AppButton>
    </form>
  )
}
