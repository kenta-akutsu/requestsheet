import type { RequestStatus, Priority } from '@/types/database'

const STATUS_LABEL: Record<RequestStatus, string> = {
  chatting: 'AI質問中',
  sheet_complete: 'シート完成',
  under_review: 'レビュー待ち',
  responded: '返答済み',
  closed: 'クローズ',
}

const STATUS_VARIANT: Record<RequestStatus, string> = {
  chatting: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  sheet_complete: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  under_review: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
  responded: 'bg-green-500/20 text-green-300 border-green-500/30',
  closed: 'bg-gray-500/20 text-gray-300 border-gray-500/30',
}

const PRIORITY_LABEL: Record<Priority, string> = {
  high: '🔴 優先度高',
  medium: '🟡 優先度中',
  low: '🟢 優先度低',
}

export function StatusBadge({ status }: { status: RequestStatus }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${STATUS_VARIANT[status]}`}>
      {STATUS_LABEL[status]}
    </span>
  )
}

export function PriorityBadge({ priority }: { priority: Priority }) {
  return (
    <span className="inline-flex items-center text-xs font-medium">
      {PRIORITY_LABEL[priority]}
    </span>
  )
}
