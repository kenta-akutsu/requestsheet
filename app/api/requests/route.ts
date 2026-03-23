import { createServerClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { createRequestSchema } from '@/schemas/requestSchema'

export async function POST(req: NextRequest) {
  const supabase = createServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  try {
    const body = await req.json()
    const parsed = createRequestSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('feature_requests')
      .insert({
        ...parsed.data,
        created_by: session.user.id,
        sales_owner_name: session.user.user_metadata?.full_name || session.user.email,
      })
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({ request: data }, { status: 201 })
  } catch (error) {
    console.error('Request creation error:', error)
    return NextResponse.json({ error: '要望の作成に失敗しました' }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  const supabase = createServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  try {
    const { data: currentUser } = await supabase
      .from('users')
      .select('role')
      .eq('id', session.user.id)
      .single()

    let query = supabase
      .from('feature_requests')
      .select('*, request_sheets(*)')
      .order('created_at', { ascending: false })

    if (currentUser?.role === 'sales') {
      query = query.eq('created_by', session.user.id)
    }

    const { data, error } = await query
    if (error) throw error
    return NextResponse.json({ requests: data })
  } catch (error) {
    console.error('Request fetch error:', error)
    return NextResponse.json({ error: '要望の取得に失敗しました' }, { status: 500 })
  }
}
