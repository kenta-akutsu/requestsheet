interface ChecklistProgressProps {
  tier1: { total: number; filled: number }
  tier2: { total: number; filled: number }
}

export function ChecklistProgress({ tier1, tier2 }: ChecklistProgressProps) {
  const t1Pct = Math.round((tier1.filled / tier1.total) * 100)
  const t2Pct = Math.round((tier2.filled / tier2.total) * 100)

  return (
    <div className="space-y-3 p-4 bg-card rounded-lg border border-border">
      <div>
        <div className="flex justify-between text-xs mb-1">
          <span className="text-muted-foreground">TIER1 必須項目</span>
          <span className="text-foreground font-medium">{tier1.filled}/{tier1.total}</span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-500"
            style={{ width: `${t1Pct}%` }}
          />
        </div>
      </div>
      <div>
        <div className="flex justify-between text-xs mb-1">
          <span className="text-muted-foreground">TIER2 重要項目</span>
          <span className="text-foreground font-medium">{tier2.filled}/{tier2.total}</span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-green-500 rounded-full transition-all duration-500"
            style={{ width: `${t2Pct}%` }}
          />
        </div>
      </div>
    </div>
  )
}
