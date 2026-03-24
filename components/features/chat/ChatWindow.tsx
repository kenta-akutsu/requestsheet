'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ChatMessage } from './ChatMessage'
import { ChecklistProgress } from './ChecklistProgress'
import { getDisplayText, parseSheetFromResponse, parseProgressFromAI, formatSheetAsMarkdown } from '@/lib/utils/sheetParser'
import type { ProgressData, SheetData } from '@/lib/utils/sheetParser'
import { AppButton } from '@/components/primitives/AppButton'
import { Send, Square, Pencil, Loader2, Download } from 'lucide-react'
import type { RequestSheet } from '@/types/database'

interface ChatWindowProps {
  requestId: string
  initialMessage: string
  productName: string
  customerName?: string
  onSheetComplete: () => void
}

export function ChatWindow({ requestId, initialMessage, productName, customerName, onSheetComplete }: ChatWindowProps) {
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>([])
  const [input, setInput] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [isThinking, setIsThinking] = useState(false)
  const [sheetComplete, setSheetComplete] = useState(false)
  const [sheetData, setSheetData] = useState<SheetData | null>(null)
  const [progressData, setProgressData] = useState<ProgressData>({
    items: [],
    tier1: { total: 7, filled: 0 },
    tier2: { total: 4, filled: 0 },
    overallPercent: 0,
  })
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [editText, setEditText] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  const isComposingRef = useRef(false) // IME composition tracking
  const editComposingRef = useRef(false) // IME for edit textarea
  const supabase = createClient()
  const initialized = useRef(false)

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isThinking])

  // Auto-resize textarea
  const adjustTextareaHeight = useCallback(() => {
    const ta = textareaRef.current
    if (ta) {
      ta.style.height = 'auto'
      ta.style.height = `${Math.min(ta.scrollHeight, 150)}px`
    }
  }, [])

  useEffect(() => {
    adjustTextareaHeight()
  }, [input, adjustTextareaHeight])

  // Send initial message on mount
  useEffect(() => {
    if (!initialized.current && initialMessage) {
      initialized.current = true
      sendMessage(initialMessage)
    }
  }, [initialMessage])

  function handleAbort() {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
      setIsStreaming(false)
      setIsThinking(false)
    }
  }

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

    // Show thinking indicator
    setIsThinking(true)
    setIsStreaming(true)
    let aiText = ''
    let firstChunkReceived = false

    const abortController = new AbortController()
    abortControllerRef.current = abortController

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId, messages: newMessages, productName }),
        signal: abortController.signal,
      })

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()

      if (reader) {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          if (!firstChunkReceived) {
            firstChunkReceived = true
            setIsThinking(false)
            setMessages(prev => [...prev, { role: 'assistant', content: '' }])
          }

          aiText += decoder.decode(value)
          const displayText = getDisplayText(aiText)
          setMessages(prev => [
            ...prev.slice(0, -1),
            { role: 'assistant', content: displayText },
          ])

          // Parse progress from streaming text
          const prog = parseProgressFromAI(aiText)
          if (prog) {
            setProgressData(prog)
          }
        }
      }

      // If no chunks were received at all
      if (!firstChunkReceived) {
        setIsThinking(false)
      }

      // Check for sheet completion
      const sheet = parseSheetFromResponse(aiText)
      if (sheet) {
        if (sheet.tier1_complete) {
          setSheetComplete(true)
          setSheetData(sheet as SheetData)
          if (sheet.tier2_complete) {
            onSheetComplete()
          }
        }
      }
    } catch (err) {
      setIsThinking(false)
      if (err instanceof DOMException && err.name === 'AbortError') {
        if (aiText) {
          const displayText = getDisplayText(aiText)
          setMessages(prev => [
            ...prev.slice(0, -1),
            { role: 'assistant', content: displayText + '\n\n（生成を中断しました）' },
          ])
        } else {
          // Remove thinking state, no assistant message to show
          setMessages(prev => prev)
        }
      } else {
        console.error('Chat error:', err)
        setMessages(prev => [
          ...(firstChunkReceived ? prev.slice(0, -1) : prev),
          { role: 'assistant', content: 'エラーが発生しました。もう一度お試しください。' },
        ])
      }
    }

    abortControllerRef.current = null
    setIsStreaming(false)
  }

  async function resendFromIndex(index: number, newContent: string) {
    const trimmedMessages = messages.slice(0, index)
    setMessages(trimmedMessages)
    setEditingIndex(null)
    setEditText('')

    await new Promise(r => setTimeout(r, 50))

    const newMessages = [...trimmedMessages, { role: 'user' as const, content: newContent }]
    setMessages(newMessages)
    setInput('')

    await supabase.from('chat_messages').insert({
      request_id: requestId,
      role: 'user',
      content: newContent,
    })

    setIsThinking(true)
    setIsStreaming(true)
    let aiText = ''
    let firstChunkReceived = false

    const abortController = new AbortController()
    abortControllerRef.current = abortController

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId, messages: newMessages, productName }),
        signal: abortController.signal,
      })

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()

      if (reader) {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          if (!firstChunkReceived) {
            firstChunkReceived = true
            setIsThinking(false)
            setMessages(prev => [...prev, { role: 'assistant', content: '' }])
          }

          aiText += decoder.decode(value)
          const displayText = getDisplayText(aiText)
          setMessages(prev => [
            ...prev.slice(0, -1),
            { role: 'assistant', content: displayText },
          ])

          const prog = parseProgressFromAI(aiText)
          if (prog) {
            setProgressData(prog)
          }
        }
      }

      if (!firstChunkReceived) setIsThinking(false)

      const sheet = parseSheetFromResponse(aiText)
      if (sheet) {
        if (sheet.tier1_complete) {
          setSheetComplete(true)
          setSheetData(sheet as SheetData)
          if (sheet.tier2_complete) {
            onSheetComplete()
          }
        }
      }
    } catch (err) {
      setIsThinking(false)
      if (err instanceof DOMException && err.name === 'AbortError') {
        if (aiText) {
          const displayText = getDisplayText(aiText)
          setMessages(prev => [
            ...prev.slice(0, -1),
            { role: 'assistant', content: displayText + '\n\n（生成を中断しました）' },
          ])
        }
      } else {
        console.error('Chat error:', err)
        setMessages(prev => [
          ...(firstChunkReceived ? prev.slice(0, -1) : prev),
          { role: 'assistant', content: 'エラーが発生しました。もう一度お試しください。' },
        ])
      }
    }

    abortControllerRef.current = null
    setIsStreaming(false)
  }

  function handleDownloadSheet() {
    if (!sheetData) return

    const today = new Date().toISOString().split('T')[0]
    const markdown = formatSheetAsMarkdown(sheetData, {
      customerName,
      productName,
      date: today,
    })

    const blob = new Blob([markdown], { type: 'text/markdown; charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    const safeName = customerName?.replace(/[/\\?%*:|"<>]/g, '_') || 'sheet'
    a.download = `リクエストシート_${safeName}_${today}.md`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!input.trim() || isStreaming) return
    sendMessage(input.trim())
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    // IME変換中はEnterで送信しない（日本語入力対応）
    if (e.key === 'Enter' && !e.shiftKey && !isComposingRef.current) {
      e.preventDefault()
      if (!input.trim() || isStreaming) return
      sendMessage(input.trim())
    }
  }

  function startEditing(index: number) {
    setEditingIndex(index)
    setEditText(messages[index].content)
  }

  function cancelEditing() {
    setEditingIndex(null)
    setEditText('')
  }

  function confirmEdit(index: number) {
    if (!editText.trim()) return
    resendFromIndex(index, editText.trim())
  }

  return (
    <div className="flex flex-col h-[600px]">
      {/* Progress */}
      <ChecklistProgress
        tier1={progressData.tier1}
        tier2={progressData.tier2}
        overallPercent={progressData.overallPercent}
        items={progressData.items}
      />

      {/* Messages */}
      <div className="flex-1 overflow-auto p-4 space-y-2 mt-4">
        {messages.map((msg, i) => (
          <div key={i} className="group relative">
            {editingIndex === i ? (
              <div className="flex justify-end mb-4">
                <div className="max-w-[80%] w-full">
                  <p className="text-xs text-muted-foreground mb-1 text-right">あなた（編集中）</p>
                  <textarea
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    className="w-full px-3 py-2 rounded-md bg-background border border-primary text-foreground text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                    rows={3}
                    autoFocus
                    onCompositionStart={() => { editComposingRef.current = true }}
                    onCompositionEnd={() => { editComposingRef.current = false }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey && !editComposingRef.current) {
                        e.preventDefault()
                        confirmEdit(i)
                      }
                      if (e.key === 'Escape') {
                        cancelEditing()
                      }
                    }}
                  />
                  <div className="flex gap-2 mt-2 justify-end">
                    <button
                      onClick={cancelEditing}
                      className="px-3 py-1 text-xs rounded-md border border-border text-muted-foreground hover:bg-accent transition-colors"
                    >
                      キャンセル
                    </button>
                    <button
                      onClick={() => confirmEdit(i)}
                      className="px-3 py-1 text-xs rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                    >
                      再送信
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <ChatMessage role={msg.role} content={msg.content} />
                {msg.role === 'user' && !isStreaming && i > 0 && (
                  <div className="flex justify-end -mt-2 mr-1 mb-2">
                    <button
                      onClick={() => startEditing(i)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-md hover:bg-accent text-muted-foreground"
                      title="メッセージを編集"
                    >
                      <Pencil className="h-3 w-3" />
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        ))}

        {/* Thinking indicator */}
        {isThinking && (
          <div className="flex justify-start mb-4">
            <div className="bg-card border border-border rounded-lg px-4 py-3">
              <p className="text-xs text-muted-foreground mb-1">AI</p>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>考え中...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Sheet complete banner */}
      {sheetComplete && (
        <div className="mx-4 mb-2 p-4 rounded-md bg-green-500/10 border border-green-500/30">
          <div className="flex items-center justify-between">
            <span className="text-green-300 text-sm font-medium">
              ✅ {sheetData?.tier2_complete ? '確定' : '暫定'}リクエストシートが完成しました
            </span>
            <button
              onClick={handleDownloadSheet}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-green-600 hover:bg-green-500 text-white text-xs font-medium transition-colors"
            >
              <Download className="h-3.5 w-3.5" />
              ダウンロード
            </button>
          </div>
        </div>
      )}

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-4 border-t border-border">
        <div className="flex gap-2 items-end">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            onCompositionStart={() => { isComposingRef.current = true }}
            onCompositionEnd={() => { isComposingRef.current = false }}
            placeholder="メッセージを入力...（Shift+Enterで改行）"
            disabled={isStreaming}
            rows={1}
            className="flex-1 px-3 py-2 rounded-md bg-background border border-input text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50 resize-none leading-relaxed"
          />
          {isStreaming ? (
            <AppButton type="button" onClick={handleAbort} size="default" className="bg-destructive hover:bg-destructive/90">
              <Square className="h-4 w-4" />
            </AppButton>
          ) : (
            <AppButton type="submit" disabled={!input.trim()} size="default">
              <Send className="h-4 w-4" />
            </AppButton>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Enter：送信　Shift+Enter：改行
        </p>
      </form>
    </div>
  )
}
