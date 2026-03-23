import type { RequestSheet as RequestSheetType } from '@/types/database'

interface RequestSheetViewProps {
  sheet: RequestSheetType
  customerName: string
  product: string
  priority: string
  contractStatus: string
}

const FIELD_LABELS: { key: keyof RequestSheetType; label: string; tier: number }[] = [
  { key: 'summary', label: '要望サマリー', tier: 1 },
  { key: 'current_workaround', label: '現状のワークアラウンド', tier: 1 },
  { key: 'expected_behavior', label: '期待する動作・完了条件', tier: 1 },
  { key: 'target_users', label: '対象ユーザー', tier: 1 },
  { key: 'target_screen', label: '対象プロダクト・画面', tier: 1 },
  { key: 'data_scale', label: 'データ量・規模感', tier: 2 },
  { key: 'external_integrations', label: '外部システム連携', tier: 2 },
  { key: 'io_format', label: '入出力形式', tier: 2 },
  { key: 'security_requirements', label: 'セキュリティ・権限要件', tier: 2 },
  { key: 'deadline', label: 'デッドライン', tier: 2 },
  { key: 'business_impact', label: 'ビジネスインパクト', tier: 0 },
  { key: 'unchecked_items', label: '要追確認事項', tier: 0 },
]

export function RequestSheetView({ sheet, customerName, product, priority, contractStatus }: RequestSheetViewProps) {
  const CONTRACT_LABELS: Record<string, string> = {
    pre_contract: '契約前',
    negotiating: '交渉中',
    contracted: '契約済み',
  }
  const PRIORITY_LABELS: Record<string, string> = {
    high: '🔴 高',
    medium: '🟡 中',
    low: '🟢 低',
  }

  return (
    <div className="space-y-6">
      {/* Header info */}
      <div className="grid grid-cols-2 gap-4 p-4 bg-muted/30 rounded-lg">
        <div>
          <p className="text-xs text-muted-foreground">顧客名</p>
          <p className="text-sm font-medium text-foreground">{customerName}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">プロダクト</p>
          <p className="text-sm font-medium text-foreground">{product}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">契約ステータス</p>
          <p className="text-sm font-medium text-foreground">{CONTRACT_LABELS[contractStatus] || contractStatus}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">優先度</p>
          <p className="text-sm font-medium text-foreground">{PRIORITY_LABELS[priority] || priority}</p>
        </div>
      </div>

      {/* TIER 1 */}
      <div>
        <h3 className="text-sm font-medium text-primary mb-3">TIER1 必須項目</h3>
        <div className="space-y-4">
          {FIELD_LABELS.filter(f => f.tier === 1).map(({ key, label }) => (
            <div key={key} className="border-b border-border pb-3 last:border-0">
              <p className="text-xs text-muted-foreground mb-1">{label}</p>
              <p className="text-sm text-foreground whitespace-pre-wrap">
                {(sheet[key] as string) || <span className="text-muted-foreground italic">未確認</span>}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* TIER 2 */}
      <div>
        <h3 className="text-sm font-medium text-green-400 mb-3">TIER2 重要項目</h3>
        <div className="space-y-4">
          {FIELD_LABELS.filter(f => f.tier === 2).map(({ key, label }) => (
            <div key={key} className="border-b border-border pb-3 last:border-0">
              <p className="text-xs text-muted-foreground mb-1">{label}</p>
              <p className="text-sm text-foreground whitespace-pre-wrap">
                {(sheet[key] as string) || <span className="text-muted-foreground italic">未確認</span>}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Meta */}
      {FIELD_LABELS.filter(f => f.tier === 0).map(({ key, label }) => {
        const val = sheet[key] as string
        if (!val) return null
        return (
          <div key={key}>
            <p className="text-xs text-muted-foreground mb-1">{label}</p>
            <p className="text-sm text-foreground whitespace-pre-wrap">{val}</p>
          </div>
        )
      })}
    </div>
  )
}
