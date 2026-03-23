interface ChatMessageProps {
  role: 'user' | 'assistant'
  content: string
}

export function ChatMessage({ role, content }: ChatMessageProps) {
  const isUser = role === 'user'
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div className={`max-w-[80%] rounded-lg px-4 py-3 text-sm leading-relaxed ${
        isUser
          ? 'bg-primary/20 text-foreground border border-primary/30'
          : 'bg-card text-foreground border border-border'
      }`}>
        <p className="text-xs text-muted-foreground mb-1">{isUser ? 'あなた' : 'AI'}</p>
        <div className="whitespace-pre-wrap">{content}</div>
      </div>
    </div>
  )
}
