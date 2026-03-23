import { createServerClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { createResponseSchema } from '@/schemas/responseSchema'

export async function POST(req: NextRequest) {
  const supabase = createServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  // Check role
  const { data: user } = await supabase
    .from('users')
    .select('role')
    .eq('id', session.user.id)
    .single()

  if (!user || !['engineer', 'bizdev', 'admin'].includes(user.role)) {
    return NextResponse.json({ error: '返答の権限がありません' }, { status: 403 })
  }

  try {
    const body = await req.json()
    const parsed = createResponseSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('responses')
      .insert({
        ...parsed.data,
        responded_by: session.user.id,
      })
      .select()
      .single()

    if (error) throw error

    // Update feature request status
    await supabase
      .from('feature_requests')
      .update({ status: 'responded' })
      .eq('id', parsed.data.request_id)

    return NextResponse.json({ response: data }, { status: 201 })
  } catch (error) {
    console.error('Response creation error:', error)
    return NextResponse.json({ error: '返答の作成に失敗しました' }, { status: 500 })
  }
}
