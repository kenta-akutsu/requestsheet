import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

interface UserToCreate {
  email: string
  name: string
  role: string
}

const USERS: UserToCreate[] = [
  { email: 'kimura@genxinc.ai', name: 'Kimura', role: 'bizdev' },
  { email: 'miura@genxinc.ai', name: 'Miura', role: 'sales' },
  { email: 'yokoyama@genxinc.ai', name: 'Yokoyama', role: 'sales' },
  { email: 'nagami@genxinc.ai', name: 'Nagami', role: 'sales' },
  { email: 'sekine@genxinc.ai', name: 'Sekine', role: 'cs' },
]

async function main() {
  console.log('=== ユーザー作成開始 ===\n')

  for (const user of USERS) {
    console.log(`Creating: ${user.email} (${user.role})...`)

    // 1. Supabase Authにユーザー作成（パスワードなし → パスワードリセットで設定）
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: user.email,
      email_confirm: true, // メール確認済みにする
      user_metadata: { full_name: user.name },
    })

    if (authError) {
      console.error(`  Auth error: ${authError.message}`)
      continue
    }

    const userId = authData.user.id
    console.log(`  Auth user created: ${userId}`)

    // 2. usersテーブルにレコード作成
    const { error: dbError } = await supabase
      .from('users')
      .upsert({
        id: userId,
        email: user.email,
        name: user.name,
        role: user.role,
      })

    if (dbError) {
      console.error(`  DB error: ${dbError.message}`)
      continue
    }

    console.log(`  Done: ${user.email} ✓`)
  }

  console.log('\n=== 完了 ===')
  console.log('各ユーザーはログイン画面の「パスワードを忘れた場合はこちら」からパスワードを設定できます。')
}

main().catch(console.error)
