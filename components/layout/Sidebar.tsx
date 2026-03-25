'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@/types/database'
import { LayoutDashboard, PlusCircle, Wrench, Settings, LogOut } from 'lucide-react'

export function Sidebar() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function loadUser() {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (session) {
          const { data } = await supabase
            .from('users')
            .select('*')
            .eq('id', session.user.id)
            .single()
          if (data) setUser(data as User)
        }
      } catch (error) {
        console.error('Failed to load user:', error)
      } finally {
        setLoading(false)
      }
    }
    loadUser()
  }, [supabase])

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const navItems = [
    { href: '/dashboard', label: 'ダッシュボード', icon: LayoutDashboard, roles: ['sales', 'engineer', 'bizdev', 'cs', 'admin'] },
    { href: '/requests/new', label: '新規要望登録', icon: PlusCircle, roles: ['sales', 'admin'] },
    { href: '/bugs/new', label: '機能改修要望登録', icon: Wrench, roles: ['sales', 'engineer', 'bizdev', 'cs', 'admin'] },
    { href: '/admin', label: '管理画面', icon: Settings, roles: ['admin'] },
  ]

  const filteredNav = navItems.filter(item => !user || item.roles.includes(user.role))

  const ROLE_LABELS: Record<string, string> = {
    sales: '営業',
    engineer: 'エンジニア',
    bizdev: 'BizDev',
    cs: 'カスタマーサクセス',
    admin: '管理者',
  }

  return (
    <aside className="w-60 h-screen bg-card border-r border-border flex flex-col shrink-0 fixed left-0 top-0">
      {/* Logo */}
      <div className="p-6 border-b border-border">
        <h1 className="text-xl font-bold text-primary">RequestSheet</h1>
        <p className="text-xs text-muted-foreground mt-1">GenX株式会社</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {filteredNav.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-accent text-accent-foreground'
                  : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'
              }`}
            >
              <Icon className="h-4 w-4 flex-shrink-0" />
              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>

      {/* User info + Logout */}
      <div className="p-4 border-t border-border">
        {!loading && user && (
          <div className="mb-3">
            <p className="text-sm font-medium text-foreground truncate">{user.name || user.email}</p>
            <p className="text-xs text-muted-foreground">{ROLE_LABELS[user.role] || user.role}</p>
          </div>
        )}
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-full"
        >
          <LogOut className="h-4 w-4" />
          ログアウト
        </button>
      </div>
    </aside>
  )
}
