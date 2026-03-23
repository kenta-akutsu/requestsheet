import type { ResponseRecord } from '@/types/database'

interface ResponseThreadProps {
  responses: ResponseRecord[]
}

const FEASIBILITY_LABELS: Record<string, { label: string; color: string }> = {
  feasible: { label: '実現可能', color: 'text-green-400' },
  conditional: { label: '条件付き', color: 'text-yellow-400' },
  infeasible: { label: '実現困難', color: 'text-red-400' },
}

export function ResponseThread({ responses }: ResponseThreadProps) {
  if (responses.length === 0) {
    return <p className="text-sm text-muted-foreground py-4 text-center">まだ返答がありません</p>
  }

  return (
    <div className="space-y-4">
      {responses.map((res) => {
        const feasibility = res.feasibility ? FEASIBILITY_LABELS[res.feasibility] : null
        return (
          <div key={res.id} className="bg-muted/30 rounded-lg p-4 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                {res.responder?.name || '返答者'} · {new Date(res.created_at).toLocaleDateString('ja-JP')}
              </p>
              {feasibility && (
                <span className={`text-xs font-medium ${feasibility.color}`}>{feasibility.label}</span>
              )}
            </div>
            {res.questions && (
              <div>
                <p className="text-xs text-muted-foreground">質問・確認</p>
                <p className="text-sm text-foreground whitespace-pre-wrap">{res.questions}</p>
              </div>
            )}
            {(res.estimate_amount || res.estimate_duration) && (
              <div className="flex gap-4">
                {res.estimate_amount && (
                  <div>
                    <p className="text-xs text-muted-foreground">見積金額</p>
                    <p className="text-sm text-foreground">{res.estimate_amount}</p>
                  </div>
                )}
                {res.estimate_duration && (
                  <div>
                    <p className="text-xs text-muted-foreground">見積期間</p>
                    <p className="text-sm text-foreground">{res.estimate_duration}</p>
                  </div>
                )}
              </div>
            )}
            {res.notes && (
              <div>
                <p className="text-xs text-muted-foreground">備考</p>
                <p className="text-sm text-foreground whitespace-pre-wrap">{res.notes}</p>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
