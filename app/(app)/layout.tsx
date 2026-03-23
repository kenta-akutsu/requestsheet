import { Sidebar } from '@/components/layout/Sidebar'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <main className="flex-1 overflow-auto ml-60">
        <div className="p-6 max-w-6xl">
          {children}
        </div>
      </main>
    </div>
  )
}
