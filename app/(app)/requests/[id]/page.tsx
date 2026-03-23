import { createServerClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { RequestSheetView } from '@/components/features/request-sheet/RequestSheet'
import { ResponseThread } from '@/components/features/response/ResponseThread'
import { StatusBadge, PriorityBadge } from '@/components/primitives/AppBadge'
import { ResponseFormWrapper } from './ResponseFormWrapper'
import type { FeatureRequest, RequestSheet, ResponseRecord, User } from '@/types/database'

export default async function RequestDetailPage({ params }: { params: { id: string } }) {
  const supabase = createServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/login')

  const { data: currentUser } = await supabase
    .from('users')
    .select('*')
    .eq('id', session.user.id)
    .single()

  if (!currentUser) redirect('/login')

  // Fetch request with related data
  const { data: request } = await supabase
    .from('feature_requests')
    .select('*')
    .eq('id', params.id)
    .single()

  if (!request) notFound()

  const { data: sheet } = await supabase
    .from('request_sheets')
    .select('*')
    .eq('request_id', params.id)
    .single()

  const { data: responses } = await supabase
    .from('responses')
    .select('*, responder:responded_by(name, email)')
    .eq('request_id', params.id)
    .order('created_at', { ascending: true })

  const typedRequest = request as FeatureRequest
  const typedSheet = sheet as RequestSheet | null
  const typedResponses = (responses || []) as ResponseRecord[]
  const typedUser = currentUser as User

  const isEngineerOrBizdev = ['engineer', 'bizdev', 'admin'].includes(typedUser.role)
  const asanaUrl = typedRequest.asana_subtask_gid
    ? `https://app.asana.com/0/0/${typedRequest.asana_subtask_gid}`
    : null

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground">{typedRequest.customer_name}</h2>
          <div className="flex items-center gap-3 mt-2">
            <StatusBadge status={typedRequest.status} />
            <PriorityBadge priority={typedRequest.priority} />
            <span className="text-sm text-muted-foreground">{typedRequest.product}</span>
          </div>
        </div>
        {asanaUrl && (
          <a
            href={asanaUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-primary hover:underline"
          >
            Asanaで確認 →
          </a>
        )}
      </div>

      {/* 2-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[7fr_3fr] gap-6">
        {/* Left: Request Sheet */}
        <div className="bg-card rounded-lg border border-border p-6">
          <h3 className="text-lg font-medium text-foreground mb-4">リクエストシート</h3>
          {typedSheet ? (
            <RequestSheetView
              sheet={typedSheet}
              customerName={typedRequest.customer_name}
              product={typedRequest.product}
              priority={typedRequest.priority}
              contractStatus={typedRequest.contract_status}
            />
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground">リクエストシートはまだ作成されていません</p>
              <p className="text-sm text-muted-foreground mt-1">AIチャットで要望を整理中です</p>
            </div>
          )}
        </div>

        {/* Right: Responses */}
        <div className="space-y-6">
          {/* Response form (engineers/bizdev only) */}
          {isEngineerOrBizdev && typedSheet && (
            <div className="bg-card rounded-lg border border-border p-4">
              <h3 className="text-sm font-medium text-foreground mb-3">返答を書く</h3>
              <ResponseFormWrapper requestId={params.id} />
            </div>
          )}

          {/* Response thread */}
          <div className="bg-card rounded-lg border border-border p-4">
            <h3 className="text-sm font-medium text-foreground mb-3">返答履歴</h3>
            <ResponseThread responses={typedResponses} />
          </div>
        </div>
      </div>
    </div>
  )
}
