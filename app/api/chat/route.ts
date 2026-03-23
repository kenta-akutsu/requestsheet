import { anthropic, CHAT_SYSTEM_PROMPT } from '@/lib/anthropic/client'
import { createServerClient } from '@/lib/supabase/server'
import { NextRequest } from 'next/server'

export async function POST(req: NextRequest) {
  const supabase = createServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return new Response('Unauthorized', { status: 401 })

  try {
    const { requestId, messages } = await req.json()

    const stream = await anthropic.messages.stream({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      system: CHAT_SYSTEM_PROMPT,
      messages: messages.map((m: { role: string; content: string }) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
    })

    let fullText = ''

    const readable = new ReadableStream({
      async start(controller) {
        try {
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
                    data_scale: parsed.data_scale || null,
                    external_integrations: parsed.external_integrations || null,
                    io_format: parsed.io_format || null,
                    security_requirements: parsed.security_requirements || null,
                    deadline: parsed.deadline || null,
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
