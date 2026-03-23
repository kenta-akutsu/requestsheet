import { createSubtask } from '@/lib/asana/client'
import { getNextBusinessDay } from '@/lib/utils/businessDays'
import { createServerClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const supabase = createServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  try {
    const { requestId, parentTaskGid, assigneeGid } = await req.json()

    // Fetch request + sheet
    const { data: request } = await supabase
      .from('feature_requests')
      .select('*, request_sheets(*)')
      .eq('id', requestId)
      .single()

    if (!request) {
      return NextResponse.json({ error: 'リクエストが見つかりません' }, { status: 404 })
    }

    const sheet = Array.isArray(request.request_sheets) ? request.request_sheets[0] : request.request_sheets
    const dueDate = await getNextBusinessDay(new Date(), 2)

    const notesText = [
      '■ 機能要望リクエストシート',
      '━━━━━━━━━━━━━━━━━━',
      '【基本情報】',
      `顧客名: ${request.customer_name}`,
      `対象プロダクト: ${request.product}`,
      `契約ステータス: ${request.contract_status}`,
      `優先度: ${request.priority}`,
      '',
      '【要望サマリー】',
      sheet?.summary || '',
      '',
      '【現状のワークアラウンド】',
      sheet?.current_workaround || '',
      '',
      '【期待する動作・完了条件】',
      sheet?.expected_behavior || '',
      '',
      '【対象ユーザー】',
      sheet?.target_users || '',
      '',
      '【対象プロダクト・画面】',
      sheet?.target_screen || '',
      '',
      '【データ量・規模感】',
      sheet?.data_scale || '未確認',
      '',
      '【外部システム連携】',
      sheet?.external_integrations || '未確認',
      '',
      '【入出力形式】',
      sheet?.io_format || '未確認',
      '',
      '【セキュリティ・権限要件】',
      sheet?.security_requirements || '未確認',
      '',
      '【デッドライン】',
      sheet?.deadline || '未確認',
      '',
      '【要追確認事項】',
      sheet?.unchecked_items || 'なし',
      '━━━━━━━━━━━━━━━━━━',
      'RequestSheet より自動作成',
    ].join('\n')

    const subtask = await createSubtask(parentTaskGid, {
      name: `[機能要望] ${request.customer_name} - ${sheet?.summary || request.raw_request.substring(0, 50)}`,
      assignee: assigneeGid || undefined,
      due_on: dueDate,
      notes: notesText,
    })

    // Update feature_request with subtask info
    await supabase
      .from('feature_requests')
      .update({
        asana_subtask_gid: subtask.gid,
        status: 'under_review',
      })
      .eq('id', requestId)

    return NextResponse.json({ subtask }, { status: 201 })
  } catch (error) {
    console.error('Asana subtask create error:', error)
    return NextResponse.json({ error: 'Asanaサブタスクの作成に失敗しました' }, { status: 500 })
  }
}
