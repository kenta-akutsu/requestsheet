import type { RequestSheet } from '@/types/database'

interface ChecklistProgress {
  tier1: { total: number; filled: number }
  tier2: { total: number; filled: number }
}

export function parseProgressFromSheet(sheet: Partial<RequestSheet>): ChecklistProgress {
  const tier1Fields = ['summary', 'current_workaround', 'expected_behavior', 'target_users', 'target_screen'] as const
  const tier2Fields = ['data_scale', 'external_integrations', 'io_format', 'security_requirements', 'deadline'] as const

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

export function parseSheetFromResponse(text: string): Record<string, unknown> | null {
  if (!text.includes('SHEET_COMPLETE:')) return null
  const jsonStr = text.split('SHEET_COMPLETE:')[1]?.trim()
  if (!jsonStr) return null
  try {
    // Find balanced JSON
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

export function getDisplayText(text: string): string {
  if (text.includes('SHEET_COMPLETE:')) {
    return text.split('SHEET_COMPLETE:')[0].trim()
  }
  return text
}
