'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { BugReportForm } from '@/components/features/bug-report/BugReportForm'
import { Check } from 'lucide-react'
import { AppButton } from '@/components/primitives/AppButton'

export default function NewBugReportPage() {
  const [completed, setCompleted] = useState(false)
  const [bugReportId, setBugReportId] = useState<string | null>(null)
  const router = useRouter()

  function handleComplete(id: string) {
    setBugReportId(id)
    setCompleted(true)
  }

  if (completed) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-card border border-border rounded-lg p-8 text-center space-y-4">
          <div className="mx-auto w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
            <Check className="h-6 w-6 text-green-600" />
          </div>
          <h2 className="text-xl font-bold text-foreground">機能改修要望を登録しました</h2>
          <p className="text-sm text-muted-foreground">
            ご報告いただきありがとうございます。エンジニアチームが確認いたします。
          </p>
          <div className="flex gap-3 justify-center pt-2">
            <AppButton
              variant="outline"
              onClick={() => {
                setCompleted(false)
                setBugReportId(null)
              }}
            >
              続けて登録する
            </AppButton>
            <AppButton onClick={() => router.push('/dashboard')}>
              ダッシュボードへ
            </AppButton>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">機能改修要望登録</h1>
        <p className="text-sm text-muted-foreground mt-1">
          バグ報告や機能改修のご要望を入力してください
        </p>
      </div>

      <div className="bg-card border border-border rounded-lg p-6">
        <BugReportForm onComplete={handleComplete} />
      </div>
    </div>
  )
}
