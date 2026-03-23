'use client'

import type { Priority } from '@/types/database'

interface PrioritySelectorProps {
  value: Priority | undefined
  onChange: (value: Priority) => void
  error?: string
}

const priorities: { value: Priority; label: string; color: string; bgColor: string }[] = [
  { value: 'high', label: '高', color: 'border-red-500 text-red-400', bgColor: 'bg-red-500/10' },
  { value: 'medium', label: '中', color: 'border-yellow-500 text-yellow-400', bgColor: 'bg-yellow-500/10' },
  { value: 'low', label: '低', color: 'border-green-500 text-green-400', bgColor: 'bg-green-500/10' },
]

export function PrioritySelector({ value, onChange, error }: PrioritySelectorProps) {
  return (
    <div>
      <div className="flex gap-3">
        {priorities.map((p) => (
          <button
            key={p.value}
            type="button"
            onClick={() => onChange(p.value)}
            className={`flex-1 py-2.5 px-4 rounded-md border-2 text-sm font-medium transition-all ${
              value === p.value
                ? `${p.color} ${p.bgColor}`
                : 'border-border text-muted-foreground hover:border-muted-foreground/50'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>
      {error && <p className="text-destructive text-xs mt-1">{error}</p>}
    </div>
  )
}
