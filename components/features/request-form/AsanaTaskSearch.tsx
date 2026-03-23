'use client'

import { useState, useRef, useEffect } from 'react'
import { useAsanaTasks } from '@/hooks/useAsanaTasks'
import { Search, X } from 'lucide-react'

interface AsanaTaskSearchProps {
  value: { gid: string; name: string } | null
  onChange: (value: { gid: string; name: string } | null) => void
}

export function AsanaTaskSearch({ value, onChange }: AsanaTaskSearchProps) {
  const { tasks, isLoading, error } = useAsanaTasks()
  const [query, setQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const filtered = tasks.filter(t =>
    t.name.toLowerCase().includes(query.toLowerCase())
  )

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  if (value) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-background border border-input text-sm">
        <span className="flex-1 truncate text-foreground">{value.name}</span>
        <button
          type="button"
          onClick={() => onChange(null)}
          className="text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    )
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setIsOpen(true) }}
          onFocus={() => setIsOpen(true)}
          placeholder="顧客名でAsanaタスクを検索..."
          className="w-full pl-9 pr-3 py-2 rounded-md bg-background border border-input text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-card border border-border rounded-md shadow-lg max-h-60 overflow-auto">
          <button
            type="button"
            onClick={() => { onChange(null); setIsOpen(false); setQuery('') }}
            className="w-full text-left px-3 py-2 text-sm text-muted-foreground hover:bg-accent/50"
          >
            タスクを選択しない
          </button>
          {isLoading && <p className="px-3 py-2 text-sm text-muted-foreground">読み込み中...</p>}
          {error && <p className="px-3 py-2 text-sm text-destructive">Asanaの接続に失敗しました</p>}
          {filtered.map((task) => (
            <button
              key={task.gid}
              type="button"
              onClick={() => {
                onChange({ gid: task.gid, name: task.name })
                setIsOpen(false)
                setQuery('')
              }}
              className="w-full text-left px-3 py-2 text-sm text-foreground hover:bg-accent/50 truncate"
            >
              {task.name}
            </button>
          ))}
          {!isLoading && !error && filtered.length === 0 && query && (
            <p className="px-3 py-2 text-sm text-muted-foreground">該当するタスクがありません</p>
          )}
        </div>
      )}
    </div>
  )
}
