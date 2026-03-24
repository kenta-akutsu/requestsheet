import { getDevProjectTasks } from '@/lib/asana/client'
import { createServerClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = createServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  try {
    const tasks = await getDevProjectTasks()
    return NextResponse.json({ tasks })
  } catch (error) {
    console.error('Asana dev tasks fetch error:', error)
    return NextResponse.json({ error: '開発タスクの取得に失敗しました', tasks: [] }, { status: 500 })
  }
}
