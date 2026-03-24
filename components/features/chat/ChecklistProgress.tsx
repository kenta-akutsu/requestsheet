import { CheckCircle2, Circle } from 'lucide-react'
import type { ChecklistDetail } from '@/lib/utils/sheetParser'

interface ChecklistProgressProps {
  tier1: { total: number; filled: number }
  tier2: { total: number; filled: number }
  overallPercent: number
  items?: ChecklistDetail[]
}

export function ChecklistProgress({ tier1, tier2, overallPercent, items }: ChecklistProgressProps) {
  const totalPct = overallPercent
  const tier1Items = items?.filter(i => i.id.startsWith('t1_')) || []
  const tier2Items = items?.filter(i => i.id.startsWith('t2_')) || []

  return (
    <div className="p-4 bg-card rounded-lg border border-border">
      {/* Overall progress */}
      <div className="mb-3">
        <div className="flex justify-between items-center text-sm mb-2">
          <span className="text-foreground font-medium">ヒアリング進捗</span>
          <span className="text-primary font-bold text-lg">{totalPct}%</span>
        </div>
        <div className="h-3 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700 ease-out"
            style={{
              width: `${totalPct}%`,
              background: totalPct >= 100 ? '#22c55e' : totalPct >= 50 ? '#3b82f6' : '#f59e0b',
            }}
          />
        </div>
      </div>

      {/* Detailed checklist */}
      {items && items.length > 0 && (
        <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 mt-3">
          {/* TIER1 */}
          <div>
            <p className="text-xs text-muted-foreground mb-1 font-medium">
              TIER1 必須（{tier1.filled}/{tier1.total}）
            </p>
            {tier1Items.map(item => (
              <div key={item.id} className="flex items-center gap-1.5 py-0.5">
                {item.done ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-400 flex-shrink-0" />
                ) : (
                  <Circle className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                )}
                <span className={`text-xs ${item.done ? 'text-green-400' : 'text-muted-foreground'}`}>
                  {item.label}
                </span>
              </div>
            ))}
          </div>

          {/* TIER2 */}
          <div>
            <p className="text-xs text-muted-foreground mb-1 font-medium">
              TIER2 重要（{tier2.filled}/{tier2.total}）
            </p>
            {tier2Items.map(item => (
              <div key={item.id} className="flex items-center gap-1.5 py-0.5">
                {item.done ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-400 flex-shrink-0" />
                ) : (
                  <Circle className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                )}
                <span className={`text-xs ${item.done ? 'text-green-400' : 'text-muted-foreground'}`}>
                  {item.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
