'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setMessage(null)

    if (password.length < 6) {
      setError('パスワードは6文字以上で入力してください')
      return
    }

    if (password !== confirmPassword) {
      setError('パスワードが一致しません')
      return
    }

    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      setMessage('パスワードを更新しました。ログイン画面に移動します...')
      setTimeout(() => {
        router.push('/login')
      }, 2000)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="bg-card rounded-lg border border-border p-8 shadow-xl">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-primary">RequestSheet</h1>
            <p className="text-muted-foreground text-sm mt-2">
              新しいパスワードを設定してください
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-md bg-destructive/10 border border-destructive/20 text-destructive text-sm">
              {error}
            </div>
          )}

          {message && (
            <div className="mb-4 p-3 rounded-md bg-green-500/10 border border-green-500/20 text-green-400 text-sm">
              {message}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-foreground mb-1.5">
                新しいパスワード
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="6文字以上"
                className="w-full px-3 py-2 rounded-md bg-background border border-input text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-foreground mb-1.5">
                パスワード確認
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                placeholder="もう一度入力"
                className="w-full px-3 py-2 rounded-md bg-background border border-input text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-md bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {loading ? '更新中...' : 'パスワードを設定'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
