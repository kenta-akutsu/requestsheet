import { geminiModel, buildSystemPrompt } from '@/lib/gemini/client'
import { getDevProjectTasks, getSalesProjectTasksWithSections } from '@/lib/asana/client'
import { createServerClient } from '@/lib/supabase/server'
import { NextRequest } from 'next/server'
import type { AsanaDevTask } from '@/types/asana'

// Format dev tasks into a readable context for AI
function formatDevTasksContext(tasks: AsanaDevTask[]): string {
  if (tasks.length === 0) return '（開発ボードの情報は取得できませんでした）'

  const activeTasks = tasks.filter(t => !t.completed)
  const completedTasks = tasks.filter(t => t.completed)

  let context = `## 現在の開発ボード状況（${tasks.length}件）\n\n`

  if (activeTasks.length > 0) {
    context += `### 進行中・予定のタスク（${activeTasks.length}件）\n`
    activeTasks.forEach(t => {
      context += `- **${t.name}**`
      if (t.section) context += ` [${t.section}]`
      if (t.assignee) context += ` 担当:${t.assignee}`
      if (t.dueOn) context += ` 期限:${t.dueOn}`
      if (t.notes) {
        const shortNotes = t.notes.substring(0, 150).replace(/\n/g, ' ')
        context += `\n  詳細: ${shortNotes}${t.notes.length > 150 ? '...' : ''}`
      }
      context += '\n'
    })
  }

  if (completedTasks.length > 0) {
    context += `\n### 完了済みタスク（${completedTasks.length}件）\n`
    completedTasks.slice(0, 20).forEach(t => {
      context += `- ${t.name}`
      if (t.section) context += ` [${t.section}]`
      context += '\n'
    })
  }

  return context
}

// Format sales project tasks into context for AI
function formatSalesTasksContext(tasks: AsanaDevTask[]): string {
  if (tasks.length === 0) return ''

  const activeTasks = tasks.filter(t => !t.completed)

  let context = `## 案件管理ボード状況（${activeTasks.length}件の進行中案件）\n\n`

  activeTasks.forEach(t => {
    context += `- **${t.name}**`
    if (t.section) context += ` [${t.section}]`
    if (t.assignee) context += ` 担当:${t.assignee}`
    if (t.dueOn) context += ` 期限:${t.dueOn}`
    context += '\n'
  })

  return context
}

export async function POST(req: NextRequest) {
  const supabase = createServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return new Response('Unauthorized', { status: 401 })

  try {
    const { requestId, messages, productName } = await req.json()

    // Fetch both boards in parallel (non-blocking on failure)
    let devTasksContext = ''
    let salesTasksContext = ''

    const [devResult, salesResult] = await Promise.allSettled([
      getDevProjectTasks(),
      getSalesProjectTasksWithSections(),
    ])

    if (devResult.status === 'fulfilled') {
      devTasksContext = formatDevTasksContext(devResult.value)
    } else {
      console.warn('Dev tasks fetch skipped:', devResult.reason)
      devTasksContext = '（開発ボード情報の取得に失敗しました。タスク照合なしで進めます）'
    }

    if (salesResult.status === 'fulfilled') {
      salesTasksContext = formatSalesTasksContext(salesResult.value)
    } else {
      console.warn('Sales tasks fetch skipped:', salesResult.reason)
    }

    const combinedContext = [devTasksContext, salesTasksContext].filter(Boolean).join('\n\n')
    const systemPrompt = buildSystemPrompt(productName || '不明なプロダクト', combinedContext)

    // Build Gemini chat history from messages
    const geminiHistory = messages.slice(0, -1).map((m: { role: string; content: string }) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }))

    const lastMessage = messages[messages.length - 1]

    const chat = geminiModel.startChat({
      history: [
        {
          role: 'user',
          parts: [{ text: `以下はあなたのシステム指示です。この指示に従って行動してください:\n\n${systemPrompt}` }],
        },
        {
          role: 'model',
          parts: [{ text: `承知しました。${productName || 'プロダクト'}に関する機能要望のヒアリングを行い、リクエストシートを作成いたします。開発ボードの既存タスクも確認済みです。チェックリストに沿って質問を進めますね。` }],
        },
        ...geminiHistory,
      ],
    })

    const result = await chat.sendMessageStream(lastMessage.content)

    let fullText = ''

    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of result.stream) {
            const text = chunk.text()
            if (text) {
              fullText += text
              controller.enqueue(new TextEncoder().encode(text))
            }
          }

          // Save assistant message to DB
          await supabase.from('chat_messages').insert({
            request_id: requestId,
            role: 'assistant',
            content: fullText,
          })

          // Detect SHEET_COMPLETE
          if (fullText.includes('SHEET_COMPLETE:')) {
            const jsonStr = fullText.split('SHEET_COMPLETE:')[1]?.trim()
            if (jsonStr) {
              try {
                let depth = 0
                let start = -1
                let endIdx = -1
                for (let i = 0; i < jsonStr.length; i++) {
                  if (jsonStr[i] === '{') {
                    if (start === -1) start = i
                    depth++
                  } else if (jsonStr[i] === '}') {
                    depth--
                    if (depth === 0 && start !== -1) {
                      endIdx = i + 1
                      break
                    }
                  }
                }
                if (endIdx > 0) {
                  const parsed = JSON.parse(jsonStr.substring(start, endIdx))
                  await supabase.from('request_sheets').upsert({
                    request_id: requestId,
                    summary: parsed.summary || null,
                    current_workaround: parsed.current_workaround || null,
                    expected_behavior: parsed.expected_behavior || null,
                    target_users: parsed.target_users || null,
                    target_screen: parsed.target_screen || null,
                    deadline: parsed.deadline || null,
                    budget: parsed.budget || null,
                    data_scale: parsed.data_scale || null,
                    external_integrations: parsed.external_integrations || null,
                    io_format: parsed.io_format || null,
                    security_requirements: parsed.security_requirements || null,
                    business_impact: parsed.business_impact || null,
                    unchecked_items: parsed.unchecked_items || null,
                    tier1_complete: parsed.tier1_complete ?? false,
                    tier2_complete: parsed.tier2_complete ?? false,
                    raw_json: parsed,
                  }, { onConflict: 'request_id' })

                  const newStatus = parsed.tier2_complete ? 'sheet_complete' : 'chatting'
                  await supabase
                    .from('feature_requests')
                    .update({ status: newStatus })
                    .eq('id', requestId)
                }
              } catch (e) {
                console.error('Sheet parse error:', e)
              }
            }
          }

          controller.close()
        } catch (err) {
          controller.error(err)
        }
      },
    })

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked',
      },
    })
  } catch (error) {
    console.error('Chat error:', error)
    return new Response('チャットでエラーが発生しました', { status: 500 })
  }
}
