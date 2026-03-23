# ASANA.md — Asana API 連携仕様

## プラン制約の整理

GenX は Asana **Starter プラン**を使用。

| API | 可否 | 備考 |
|---|---|---|
| `GET /projects/{gid}/tasks` | ✅ 可能 | 固定プロジェクトのタスク一覧取得 |
| `POST /tasks/{gid}/subtasks` | ✅ 可能 | サブタスク作成（プラン制限なし） |
| `GET /workspaces/{gid}/tasks/search` | ❌ 不可 | Premium以上が必要（402エラー） |
| `GET /users` | ✅ 可能 | メンバー一覧取得（担当者選択用） |

---

## 戦略: プロジェクトタスク一覧をキャッシュして検索

```
起動時 or フォーム表示時:
  GET /projects/{ASANA_SALES_PROJECT_GID}/tasks?opt_fields=name,gid
    → 最大100件取得（Starterは通常100件以内）
    → フロント側でメモリキャッシュ（SWR使用）

営業がフォームに顧客名を入力:
  → キャッシュ済みタスク配列をフロントでfilter()
  → インクリメンタル検索（コンポーネント内）

リクエストシート確定時:
  POST /tasks/{選択したtask_gid}/subtasks
    → サブタスク作成
```

---

## Asana クライアント実装 (`/lib/asana/client.ts`)

```typescript
const ASANA_BASE_URL = 'https://app.asana.com/api/1.0'

const asanaFetch = async (path: string, options?: RequestInit) => {
  const res = await fetch(`${ASANA_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${process.env.ASANA_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  })

  if (!res.ok) {
    const error = await res.json()
    throw new Error(`Asana API error: ${res.status} - ${JSON.stringify(error)}`)
  }

  return res.json()
}

// 営業案件プロジェクトのタスク一覧取得
export async function getSalesProjectTasks(): Promise<AsanaTask[]> {
  const projectGid = process.env.ASANA_SALES_PROJECT_GID
  const data = await asanaFetch(
    `/projects/${projectGid}/tasks?opt_fields=name,gid&limit=100`
  )
  return data.data as AsanaTask[]
}

// サブタスク作成
export async function createSubtask(
  parentTaskGid: string,
  params: CreateSubtaskParams
): Promise<AsanaTask> {
  const data = await asanaFetch(`/tasks/${parentTaskGid}/subtasks`, {
    method: 'POST',
    body: JSON.stringify({ data: params }),
  })
  return data.data as AsanaTask
}

// ワークスペースメンバー一覧（担当者選択用）
export async function getWorkspaceMembers(): Promise<AsanaUser[]> {
  const workspaceGid = process.env.ASANA_WORKSPACE_GID
  const data = await asanaFetch(
    `/workspaces/${workspaceGid}/users?opt_fields=name,gid,email`
  )
  return data.data as AsanaUser[]
}
```

---

## 型定義 (`/types/asana.ts`)

```typescript
export interface AsanaTask {
  gid: string
  name: string
  resource_type: 'task'
}

export interface AsanaUser {
  gid: string
  name: string
  email: string
  resource_type: 'user'
}

export interface CreateSubtaskParams {
  name: string               // "[機能要望] {顧客名} - {要望サマリー}"
  assignee?: string          // AsanaユーザーGID
  due_on?: string            // "YYYY-MM-DD"（2営業日後）
  notes?: string             // リクエストシート全文
}
```

---

## API Routes

### タスク一覧取得 (`/app/api/asana/tasks/route.ts`)

```typescript
import { getSalesProjectTasks } from '@/lib/asana/client'
import { createServerClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = createServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const tasks = await getSalesProjectTasks()
    return NextResponse.json({ tasks })
  } catch (error) {
    console.error('Asana tasks fetch error:', error)
    return NextResponse.json({ error: 'Asanaタスクの取得に失敗しました' }, { status: 500 })
  }
}
```

### サブタスク作成 (`/app/api/asana/subtask/route.ts`)

```typescript
import { createSubtask } from '@/lib/asana/client'
import { getNextBusinessDay } from '@/lib/utils/businessDays'
import { createServerClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const supabase = createServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { requestId, parentTaskGid, assigneeGid } = await req.json()

  // リクエストシートとリクエスト情報を取得
  const { data: request } = await supabase
    .from('feature_requests')
    .select('*, request_sheets(*)')
    .eq('id', requestId)
    .single()

  if (!request) {
    return NextResponse.json({ error: 'リクエストが見つかりません' }, { status: 404 })
  }

  // 2営業日後の日付を計算
  const dueDate = await getNextBusinessDay(new Date(), 2)

  // リクエストシートのテキスト化
  const sheet = request.request_sheets
  const notesText = `
■ 機能要望リクエストシート
━━━━━━━━━━━━━━━━━━
【基本情報】
顧客名: ${request.customer_name}
対象プロダクト: ${request.product}
契約ステータス: ${request.contract_status}
優先度: ${request.priority}

【要望サマリー】
${sheet?.summary ?? ''}

【現状のワークアラウンド】
${sheet?.current_workaround ?? ''}

【期待する動作・完了条件】
${sheet?.expected_behavior ?? ''}

【対象ユーザー】
${sheet?.target_users ?? ''}

【対象プロダクト・画面】
${sheet?.target_screen ?? ''}

【データ量・規模感】
${sheet?.data_scale ?? '未確認'}

【外部システム連携】
${sheet?.external_integrations ?? '未確認'}

【入出力形式】
${sheet?.io_format ?? '未確認'}

【セキュリティ・権限要件】
${sheet?.security_requirements ?? '未確認'}

【デッドライン】
${sheet?.deadline ?? '未確認'}

【要追確認事項】
${sheet?.unchecked_items ?? 'なし'}
━━━━━━━━━━━━━━━━━━
ZENX Request より自動作成
  `.trim()

  try {
    const subtask = await createSubtask(parentTaskGid, {
      name: `[機能要望] ${request.customer_name} - ${sheet?.summary ?? request.raw_request.substring(0, 50)}`,
      assignee: assigneeGid,
      due_on: dueDate,
      notes: notesText,
    })

    // DBにサブタスクGIDを保存
    await supabase
      .from('feature_requests')
      .update({
        asana_subtask_gid: subtask.gid,
        asana_parent_task_gid: parentTaskGid,
        status: 'under_review',
        assigned_to: assigneeGid ? /* UsersテーブルのUUID */ null : null,
      })
      .eq('id', requestId)

    return NextResponse.json({ subtask })
  } catch (error) {
    console.error('Asana subtask create error:', error)
    return NextResponse.json({ error: 'Asanaサブタスクの作成に失敗しました' }, { status: 500 })
  }
}
```

---

## 2営業日計算ユーティリティ (`/lib/utils/businessDays.ts`)

```typescript
// 日本の祝日API: https://holidays-jp.github.io/api/v1/date.json
// レスポンス例: { "2026-01-01": "元日", "2026-01-12": "成人の日", ... }

let holidayCache: Set<string> | null = null
let cacheDate: string | null = null

async function getJapaneseHolidays(): Promise<Set<string>> {
  const today = new Date().toISOString().split('T')[0]

  // 同日中はキャッシュを使用
  if (holidayCache && cacheDate === today) {
    return holidayCache
  }

  const res = await fetch('https://holidays-jp.github.io/api/v1/date.json')
  const data: Record<string, string> = await res.json()
  holidayCache = new Set(Object.keys(data))
  cacheDate = today
  return holidayCache
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0] // "YYYY-MM-DD"
}

export async function getNextBusinessDay(
  startDate: Date,
  daysToAdd: number
): Promise<string> {
  const holidays = await getJapaneseHolidays()
  let count = 0
  const current = new Date(startDate)

  while (count < daysToAdd) {
    current.setDate(current.getDate() + 1)
    const dateStr = formatDate(current)
    const dayOfWeek = current.getDay() // 0=日, 6=土
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6
    const isHoliday = holidays.has(dateStr)

    if (!isWeekend && !isHoliday) {
      count++
    }
  }

  return formatDate(current)
}
```

---

## フロントエンド: Asanaタスク検索コンポーネント概要

`/components/features/request-form/AsanaTaskSearch.tsx` に実装する。

```
動作仕様:
- SWRで /api/asana/tasks をマウント時に1回取得・キャッシュ
- Input onChange でローカルfilter（API呼び出しなし）
- Popover + Command コンポーネントでサジェスト表示（shadcn/ui）
- 選択後は task.gid と task.name を親コンポーネントに返す
- 「タスクを選択しない」オプションあり（Asana連携スキップ）
- ローディング/エラー状態を適切に表示
```
