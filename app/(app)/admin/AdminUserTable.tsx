'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { User, UserRole } from '@/types/database'
import { useRouter } from 'next/navigation'

const ROLE_OPTIONS: { value: UserRole; label: string }[] = [
  { value: 'sales', label: '営業' },
  { value: 'engineer', label: 'エンジニア' },
  { value: 'bizdev', label: 'BizDev' },
  { value: 'admin', label: '管理者' },
]

export function AdminUserTable({ users }: { users: User[] }) {
  const supabase = createClient()
  const router = useRouter()
  const [updating, setUpdating] = useState<string | null>(null)

  async function handleRoleChange(userId: string, newRole: UserRole) {
    setUpdating(userId)
    try {
      await supabase
        .from('users')
        .update({ role: newRole })
        .eq('id', userId)
      router.refresh()
    } catch (err) {
      console.error('Role update error:', err)
    } finally {
      setUpdating(null)
    }
  }

  return (
    <table className="w-full">
      <thead>
        <tr className="border-b border-border">
          <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase">名前</th>
          <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase">メール</th>
          <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase">ロール</th>
          <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase">登録日</th>
        </tr>
      </thead>
      <tbody>
        {users.map((user) => (
          <tr key={user.id} className="border-b border-border last:border-0">
            <td className="px-5 py-4 text-sm text-foreground">{user.name || '-'}</td>
            <td className="px-5 py-4 text-sm text-muted-foreground">{user.email}</td>
            <td className="px-5 py-4">
              <select
                value={user.role}
                onChange={(e) => handleRoleChange(user.id, e.target.value as UserRole)}
                disabled={updating === user.id}
                className="px-2 py-1 rounded-md bg-background border border-input text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
              >
                {ROLE_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </td>
            <td className="px-5 py-4 text-sm text-muted-foreground">
              {new Date(user.created_at).toLocaleDateString('ja-JP')}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
