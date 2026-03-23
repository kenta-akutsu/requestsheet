'use client'

import { useState, useRef, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ChatMessage } from './ChatMessage'
import { ChecklistProgress } from './ChecklistProgress'
import { getDisplayText, parseSheetFromResponse, parseProgressFromSheet } from '@/lib/utils/sheetParser'
import { AppButton } from '@/components/primitives/AppButton'
import { Send } from 'lucide-react'
import type { RequestSheet, ChatMessage as ChatMessageType } from '@/types/database'

interface ChatWindowProps {
  requestId: string
  initialMessage: string
  onSheetComplete: () => void
}

export function ChatWindow({ requestId, initialMessage, onSheetComplete }: ChatWindowProps) {
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>([])
  const [input, setInput] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [sheetComplete, setSheetComplete] = useState(false)
  const [progress, setProgress] = useState({ tier1: { total: 5, filled: 0 }, tier2: { total: 5, filled: 0 } })
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()
  const initialized = useRef(false)

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Send initial message on mount
  useEffect(() => {
    if (!initialized.current && initialMessage) {
      initialized.current = true
      sendMessage(initialMessage)
    }
  }, [initialMessage])

  async function sendMessage(userMessage: string) {
    const newMessages = [...messages, { role: 'user' as const, content: userMessage }]
    setMessages(newMessages)
    setInput('')

    // Save user message to DB
    await supabase.from('chat_messages').insert({
      request_id: requestId,
      role: 'user',
      content: userMessage,
    })

    // Start streaming
    setIsStreaming(true)
    let aiText = ''
    setMessages(prev => [...prev, { role: 'assistant', content: '' }])

    try {
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
          const displayText = getDisplayText(aiText)
          setMessages(prev => [
            ...prev.slice(0, -1),
            { role: 'assistant', content: displayText },
          ])
        }
      }

      // Check for sheet completion
      const sheet = parseSheetFromResponse(aiText)
      if (sheet) {
        const prog = parseProgressFromSheet(sheet as Partial<RequestSheet>)
        setProgress(prog)
        if (sheet.tier1_complete) {
          setSheetComplete(true)
          if (sheet.tier2_complete) {
            onSheetComplete()
          }
        }
      }
    } catch (err) {
      console.error('Chat error:', err)
      setMessages(prev => [
        ...prev.slice(0, -1),
        { role: 'assistant', content: 'エラーが発生しました。もう一度お試しください。' },
      ])
    }

    setIsStreaming(false)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!input.trim() || isStreaming) return
    sendMessage(input.trim())
  }

  return (
    <div className="flex flex-col h-[600px]">
      {/* Progress */}
      <ChecklistProgress tier1={progress.tier1} tier2={progress.tier2} />

      {/* Messages */}
      <div className="flex-1 overflow-auto p-4 space-y-2 mt-4">
        {messages.map((msg, i) => (
          <ChatMessage key={i} role={msg.role} content={msg.content} />
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Sheet complete banner */}
      {sheetComplete && (
        <div className="mx-4 mb-2 p-3 rounded-md bg-green-500/10 border border-green-500/30 text-green-300 text-sm">
          ✅ リクエストシートが完成しました
        </div>
      )}

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-4 border-t border-border">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="メッセージを入力..."
            disabled={isStreaming}
            className="flex-1 px-3 py-2 rounded-md bg-background border border-input text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
          />
          <AppButton type="submit" disabled={isStreaming || !input.trim()} size="default">
            <Send className="h-4 w-4" />
          </AppButton>
        </div>
      </form>
    </div>
  )
}
