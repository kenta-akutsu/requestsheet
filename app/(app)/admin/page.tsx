import { createServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import type { User } from '@/types/database'
import { AdminUserTable } from './AdminUserTable'

export default async function AdminPage() {
  const supabase = createServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/login')

  const { data: currentUser } = await supabase
    .from('users')
    .select('*')
    .eq('id', session.user.id)
    .single()

  if (!currentUser || (currentUser as User).role !== 'admin') {
    redirect('/dashboard')
  }

  const { data: users } = await supabase
    .from('users')
    .select('*')
    .order('created_at', { ascending: true })

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-foreground">管理画面</h2>
        <p className="text-muted-foreground text-sm mt-1">ユーザー管理とロール設定</p>
      </div>

      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h3 className="text-sm font-medium text-foreground">ユーザー一覧</h3>
        </div>
        <AdminUserTable users={(users || []) as User[]} />
      </div>
    </div>
  )
}
