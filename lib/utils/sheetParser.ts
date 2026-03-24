import type { RequestSheet } from '@/types/database'

interface ChecklistProgress {
  tier1: { total: number; filled: number }
  tier2: { total: number; filled: number }
}

export interface ChecklistDetail {
  id: string
  label: string
  done: boolean
}

export function parseProgressFromSheet(sheet: Partial<RequestSheet>): ChecklistProgress {
  const tier1Fields = ['summary', 'current_workaround', 'expected_behavior', 'target_users', 'target_screen', 'deadline', 'budget'] as const
  const tier2Fields = ['data_scale', 'external_integrations', 'io_format', 'security_requirements'] as const

  return {
    tier1: {
      total: tier1Fields.length,
      filled: tier1Fields.filter(f => sheet[f] && sheet[f] !== '').length,
    },
    tier2: {
      total: tier2Fields.length,
      filled: tier2Fields.filter(f => sheet[f] && sheet[f] !== '').length,
    },
  }
}

const CHECKLIST_LABELS: Record<string, string> = {
  t1_1: '要望の一言要約',
  t1_2: '現状のワークアラウンド',
  t1_3: '期待する動作・完了条件',
  t1_4: '対象ユーザー',
  t1_5: '対象画面・フロー',
  t1_6: 'デッドライン',
  t1_7: '予算感',
  t2_1: 'データ量・規模感',
  t2_2: '外部システム連携',
  t2_3: '入出力形式',
  t2_4: 'セキュリティ・権限',
}

export interface ProgressData {
  items: ChecklistDetail[]
  tier1: { total: number; filled: number }
  tier2: { total: number; filled: number }
  overallPercent: number
}

export function parseProgressFromAI(text: string): ProgressData | null {
  const match = text.match(/PROGRESS:\s*(\{[^}]+\})/)
  if (!match) return null

  try {
    const data = JSON.parse(match[1]) as Record<string, boolean>

    const items: ChecklistDetail[] = Object.entries(CHECKLIST_LABELS).map(([id, label]) => ({
      id,
      label,
      done: data[id] === true,
    }))

    const tier1Items = items.filter(i => i.id.startsWith('t1_'))
    const tier2Items = items.filter(i => i.id.startsWith('t2_'))

    const tier1Filled = tier1Items.filter(i => i.done).length
    const tier2Filled = tier2Items.filter(i => i.done).length
    const totalFilled = tier1Filled + tier2Filled
    const totalItems = tier1Items.length + tier2Items.length

    return {
      items,
      tier1: { total: tier1Items.length, filled: tier1Filled },
      tier2: { total: tier2Items.length, filled: tier2Filled },
      overallPercent: totalItems > 0 ? Math.round((totalFilled / totalItems) * 100) : 0,
    }
  } catch {
    return null
  }
}

export function parseSheetFromResponse(text: string): Record<string, unknown> | null {
  if (!text.includes('SHEET_COMPLETE:')) return null
  const jsonStr = text.split('SHEET_COMPLETE:')[1]?.trim()
  if (!jsonStr) return null
  try {
    let depth = 0
    let start = -1
    for (let i = 0; i < jsonStr.length; i++) {
      if (jsonStr[i] === '{') {
        if (start === -1) start = i
        depth++
      } else if (jsonStr[i] === '}') {
        depth--
        if (depth === 0 && start !== -1) {
          return JSON.parse(jsonStr.substring(start, i + 1))
        }
      }
    }
    return null
  } catch {
    return null
  }
}

export interface SheetData {
  summary?: string
  current_workaround?: string
  expected_behavior?: string
  target_users?: string
  target_screen?: string
  deadline?: string
  budget?: string
  data_scale?: string
  external_integrations?: string
  io_format?: string
  security_requirements?: string
  business_impact?: string
  unchecked_items?: string
  tier1_complete?: boolean
  tier2_complete?: boolean
  related_dev_tasks?: string
  [key: string]: unknown
}

export function formatSheetAsMarkdown(sheet: SheetData, meta?: { customerName?: string; productName?: string; date?: string }): string {
  const lines: string[] = []

  lines.push('# リクエストシート')
  lines.push('')

  if (meta?.customerName || meta?.productName || meta?.date) {
    if (meta.date) lines.push(`**作成日**: ${meta.date}`)
    if (meta.customerName) lines.push(`**顧客名**: ${meta.customerName}`)
    if (meta.productName) lines.push(`**対象プロダクト**: ${meta.productName}`)
    lines.push('')
  }

  const tierStatus = sheet.tier2_complete ? '確定版（TIER1 + TIER2 完了）' : '暫定版（TIER1 完了）'
  lines.push(`**ステータス**: ${tierStatus}`)
  lines.push('')

  lines.push('---')
  lines.push('')
  lines.push('## TIER1（必須項目）')
  lines.push('')

  const tier1Fields: [string, string][] = [
    ['summary', '要望の一言要約'],
    ['current_workaround', '現状のワークアラウンド'],
    ['expected_behavior', '期待する動作・完了条件'],
    ['target_users', '対象ユーザー'],
    ['target_screen', '対象画面・フロー'],
    ['deadline', 'デッドライン'],
    ['budget', '予算感'],
  ]

  for (const [key, label] of tier1Fields) {
    const val = sheet[key]
    lines.push(`### ${label}`)
    lines.push('')
    lines.push(typeof val === 'string' && val ? val : '（未記入）')
    lines.push('')
  }

  lines.push('---')
  lines.push('')
  lines.push('## TIER2（重要項目）')
  lines.push('')

  const tier2Fields: [string, string][] = [
    ['data_scale', 'データ量・規模感'],
    ['external_integrations', '外部システム連携'],
    ['io_format', '入出力形式'],
    ['security_requirements', 'セキュリティ・権限要件'],
  ]

  for (const [key, label] of tier2Fields) {
    const val = sheet[key]
    lines.push(`### ${label}`)
    lines.push('')
    lines.push(typeof val === 'string' && val ? val : '（未記入）')
    lines.push('')
  }

  if (sheet.business_impact) {
    lines.push('---')
    lines.push('')
    lines.push('## ビジネスインパクト')
    lines.push('')
    lines.push(sheet.business_impact)
    lines.push('')
  }

  if (sheet.related_dev_tasks) {
    lines.push('---')
    lines.push('')
    lines.push('## 関連する開発計画タスク')
    lines.push('')
    lines.push(sheet.related_dev_tasks)
    lines.push('')
  }

  if (sheet.unchecked_items) {
    lines.push('---')
    lines.push('')
    lines.push('## 要追確認項目')
    lines.push('')
    lines.push(sheet.unchecked_items)
    lines.push('')
  }

  return lines.join('\n')
}

export function getDisplayText(text: string): string {
  let result = text

  // Remove PROGRESS line
  result = result.replace(/PROGRESS:\s*\{[^}]+\}\n?/g, '')

  // Remove SHEET_COMPLETE and everything after
  if (result.includes('SHEET_COMPLETE:')) {
    result = result.split('SHEET_COMPLETE:')[0]
  }

  return result.trim()
}
