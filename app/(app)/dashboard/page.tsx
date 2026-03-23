import { createServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import type { FeatureRequest, User } from '@/types/database'
import { StatusBadge, PriorityBadge } from '@/components/primitives/AppBadge'
import Link from 'next/link'

export default async function DashboardPage() {
  const supabase = createServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/login')

  // Get user role
  const { data: currentUser } = await supabase
    .from('users')
    .select('*')
    .eq('id', session.user.id)
    .single()

  if (!currentUser) redirect('/login')

  // Fetch requests based on role
  let query = supabase
    .from('feature_requests')
    .select('*')
    .order('created_at', { ascending: false })

  if (currentUser.role === 'sales') {
    query = query.eq('created_by', session.user.id)
  }

  const { data: requests } = await query
  const typedRequests = (requests || []) as FeatureRequest[]

  // KPI counts
  const total = typedRequests.length
  const chatting = typedRequests.filter(r => r.status === 'chatting').length
  const underReview = typedRequests.filter(r => r.status === 'under_review' || r.status === 'sheet_complete').length
  const responded = typedRequests.filter(r => r.status === 'responded').length

  const kpis = [
    { label: '全要望数', value: total, color: 'text-foreground' },
    { label: 'AI質問中', value: chatting, color: 'text-blue-400' },
    { label: 'レビュー待ち', value: underReview, color: 'text-orange-400' },
    { label: '返答済み', value: responded, color: 'text-green-400' },
  ]

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-foreground">ダッシュボード</h2>
        <p className="text-muted-foreground text-sm mt-1">機能要望の一覧と進捗状況</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="bg-card rounded-lg border border-border p-5">
            <p className="text-sm text-muted-foreground">{kpi.label}</p>
            <p className={`text-3xl font-bold mt-2 ${kpi.color}`}>{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Requests Table */}
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h3 className="text-sm font-medium text-foreground">要望一覧</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-card/50">
                <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">顧客名</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">優先度</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">ステータス</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">プロダクト</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">作成日</th>
              </tr>
            </thead>
            <tbody>
              {typedRequests.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center text-muted-foreground">
                    <div>まだ要望がありません。</div>
                    {currentUser.role === 'sales' && (
                      <Link href="/requests/new" className="text-primary hover:underline">新規登録する</Link>
                    )}
                  </td>
                </tr>
              ) : (
                typedRequests.map((req) => (
                  <tr key={req.id} className="border-b border-border last:border-0 hover:bg-accent/30 transition-colors">
                    <td className="px-5 py-4">
                      <Link href={`/requests/${req.id}`} className="text-sm font-medium text-foreground hover:text-primary">
                        {req.customer_name}
                      </Link>
                    </td>
                    <td className="px-5 py-4">
                      <PriorityBadge priority={req.priority} />
                    </td>
                    <td className="px-5 py-4">
                      <StatusBadge status={req.status} />
                    </td>
                    <td className="px-5 py-4 text-sm text-muted-foreground">
                      {req.product}
                    </td>
                    <td className="px-5 py-4 text-sm text-muted-foreground">
                      {new Date(req.created_at).toLocaleDateString('ja-JP')}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
