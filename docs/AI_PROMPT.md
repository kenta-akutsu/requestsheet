# AI_PROMPT.md — AIチャット システムプロンプト & ロジック

## システムプロンプト（`/lib/anthropic/client.ts` に定義）

```typescript
export const CHAT_SYSTEM_PROMPT = `
あなたはGenX株式会社の社内ツール「ZENX Request」のAIアシスタントです。
営業担当から受け取った顧客の機能要望を、エンジニアやBizDevがすぐに開発・見積もりに取り掛かれるレベルの「リクエストシート」に仕上げることがあなたの役割です。

## あなたの行動ルール

1. **不足情報を日本語・丁寧語で質問する**。1回につき最大2〜3問まで。
2. **チェックリストを内部で管理**し、未確認の項目を優先度順に質問する。
3. **TIER1が全て埋まった時点**で「暫定シートが完成しました」と伝え、SHEET_COMPLETE（暫定版）を出力する。
4. **TIER1+TIER2が全て埋まった時点**で「確定リクエストシートが完成しました」と伝え、SHEET_COMPLETE（確定版）を出力する。
5. 営業担当が「分からない」「顧客に確認します」と答えた場合は、その項目を「要追確認」としてマークし次の項目に進む。
6. 質問は会話的・親しみやすいトーンで行う。詰問にならないよう注意する。

## チェックリスト

### TIER1（必須 — 全て揃うまで確定シート不可）
- [ ] T1-1: 要望の一言要約（「〇〇ができない → 〇〇したい」の形式）
- [ ] T1-2: 現状のワークアラウンド（今どうやって対処しているか）
- [ ] T1-3: 期待する動作・完了条件（何ができれば満足か）
- [ ] T1-4: 対象ユーザー（役職・ITリテラシー・利用頻度）
- [ ] T1-5: 対象プロダクト・画面・フロー（どの画面・フローの話か）

### TIER2（重要 — 全て揃うと確定シートに昇格）
- [ ] T2-1: データ量・規模感（件数・頻度・バッチかリアルタイムか）
- [ ] T2-2: 外部システム連携の有無（ERP・基幹・他SaaS）
- [ ] T2-3: 入出力形式（何を渡して何が欲しいか）
- [ ] T2-4: セキュリティ・権限要件（特定ロールのみ？ログ必要？）
- [ ] T2-5: デッドライン（いつまでに必要か）

## SHEET_COMPLETE 出力形式

全TIER1項目が充足したら、会話の最後に必ず以下のJSON形式で出力すること。
JSONの直前に必ず "SHEET_COMPLETE:" というプレフィックスを付けること。
プレフィックスとJSONの間にスペースや改行を入れないこと。

SHEET_COMPLETE:{"summary":"","current_workaround":"","expected_behavior":"","target_users":"","target_screen":"","data_scale":"","external_integrations":"","io_format":"","security_requirements":"","deadline":"","business_impact":"","unchecked_items":"","tier1_complete":true,"tier2_complete":false}

## 判断基準

- 情報が曖昧・抽象的な場合は具体化を求める質問をする
  例：「CSVが欲しい」→「CSVの列構成はどのようなイメージでしょうか？」
- エンジニア視点で必要な情報が欠けていると判断したら積極的に質問する
  例：「帳票を出力したい」→「出力枚数・頻度・ファイル形式（PDF/Excel等）はいかがでしょうか？」
- 顧客が言ってきた要望をそのまま転記するだけでなく、本質的なニーズに言い換える
`
```

---

## API Route 実装 (`/app/api/chat/route.ts`)

```typescript
import { anthropic } from '@/lib/anthropic/client'
import { createServerClient } from '@/lib/supabase/server'
import { NextRequest } from 'next/server'
import { CHAT_SYSTEM_PROMPT } from '@/lib/anthropic/client'

export async function POST(req: NextRequest) {
  const supabase = createServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return new Response('Unauthorized', { status: 401 })

  const { requestId, messages } = await req.json()

  // ストリーミングレスポンス
  const stream = await anthropic.messages.stream({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2000,
    system: CHAT_SYSTEM_PROMPT,
    messages: messages.map((m: { role: string; content: string }) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    })),
  })

  // チャンクをDBに保存しながらストリーミング
  let fullText = ''

  const readable = new ReadableStream({
    async start(controller) {
      for await (const chunk of stream) {
        if (
          chunk.type === 'content_block_delta' &&
          chunk.delta.type === 'text_delta'
        ) {
          const text = chunk.delta.text
          fullText += text
          controller.enqueue(new TextEncoder().encode(text))
        }
      }

      // ストリーム完了後にDBに保存
      await supabase.from('chat_messages').insert({
        request_id: requestId,
        role: 'assistant',
        content: fullText,
      })

      // SHEET_COMPLETE 検出
      if (fullText.includes('SHEET_COMPLETE:')) {
        const jsonStr = fullText.split('SHEET_COMPLETE:')[1]?.trim()
        if (jsonStr) {
          try {
            // JSONの終端を探す
            const endIndex = jsonStr.indexOf('}') + 1
            const parsed = JSON.parse(jsonStr.substring(0, endIndex))

            await supabase.from('request_sheets').upsert({
              request_id: requestId,
              ...parsed,
            })

            await supabase
              .from('feature_requests')
              .update({ status: 'sheet_complete' })
              .eq('id', requestId)
          } catch (e) {
            console.error('Sheet parse error:', e)
          }
        }
      }

      controller.close()
    },
  })

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Transfer-Encoding': 'chunked',
    },
  })
}
```

---

## フロントエンド: チャット送信ロジック (`/components/features/chat/ChatWindow.tsx`)

```typescript
// ストリーミングを受け取りながらUIに表示する実装パターン
const sendMessage = async (userMessage: string) => {
  // 1. ユーザーメッセージをDBとローカルstateに追加
  const newMessages = [...messages, { role: 'user', content: userMessage }]
  setMessages(newMessages)

  // 2. ユーザーメッセージをDBに保存
  await supabase.from('chat_messages').insert({
    request_id: requestId,
    role: 'user',
    content: userMessage,
  })

  // 3. ストリーミング開始
  setIsStreaming(true)
  let aiText = ''
  setMessages(prev => [...prev, { role: 'assistant', content: '' }])

  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ requestId, messages: newMessages }),
  })

  const reader = response.body?.getReader()
  const decoder = new TextDecoder()

  if (reader) {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      aiText += decoder.decode(value)
      // リアルタイムでUIを更新（SHEET_COMPLETEより前のテキストのみ表示）
      const displayText = aiText.includes('SHEET_COMPLETE:')
        ? aiText.split('SHEET_COMPLETE:')[0].trim()
        : aiText
      setMessages(prev => [
        ...prev.slice(0, -1),
        { role: 'assistant', content: displayText },
      ])
    }
  }

  setIsStreaming(false)

  // 4. SHEET_COMPLETE検出でUIを更新
  if (aiText.includes('SHEET_COMPLETE:')) {
    onSheetComplete?.()  // 親コンポーネントに通知
  }
}
```

---

## チェックリスト進捗バー

AIのレスポンスを解析してTIER充足率を計算する関数:

```typescript
// lib/utils/sheetParser.ts

interface ChecklistProgress {
  tier1: { total: number; filled: number }
  tier2: { total: number; filled: number }
}

export function parseProgressFromSheet(sheet: Partial<RequestSheet>): ChecklistProgress {
  const tier1Fields = [
    'summary',
    'current_workaround',
    'expected_behavior',
    'target_users',
    'target_screen',
  ] as const

  const tier2Fields = [
    'data_scale',
    'external_integrations',
    'io_format',
    'security_requirements',
    'deadline',
  ] as const

  return {
    tier1: {
      total: tier1Fields.length,
      filled: tier1Fields.filter(f => sheet[f] && sheet[f] !== '').length,
    },
    tier2: {
      total: tier2Fields.length,
      filled: tier2Fields.filter(f => sheet[f] && sheet[f] !== '').length,
    },
  }
}
```
