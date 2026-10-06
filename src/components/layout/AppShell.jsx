import { useEffect, useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { UserButton } from '@clerk/clerk-react'
import { cn } from '../../lib/utils'

const sections = [
  {
    label: 'Supply',
    items: [
      { to: '/', label: 'Dashboard', end: true },
      { to: '/parties', label: 'Parties' },
      { to: '/invoices', label: 'Invoices' },
      { to: '/payments', label: 'Payments' },
      { to: '/payments/new', label: 'Record Payment' },
      { to: '/import', label: 'Bulk Import' },
    ],
  },
  {
    label: 'Follow-ups',
    items: [
      { to: '/followups', label: 'Log & List' },
      { to: '/promises', label: 'Promises' },
    ],
  },
  {
    label: 'Retail',
    items: [
      { to: '/retail', label: 'Dashboard' },
      { to: '/retail-sales', label: 'Sale Register' },
      { to: '/retail-pay', label: 'Retail Pay' },
    ],
  },
]

export function AppShell() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(() => {
    return localStorage.getItem('sidebar-collapsed') === '1'
  })
  const [dark, setDark] = useState(() => {
    return localStorage.getItem('theme') === 'dark' ||
      (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches)
  })

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
    localStorage.setItem('theme', dark ? 'dark' : 'light')
  }, [dark])

  useEffect(() => {
    localStorage.setItem('sidebar-collapsed', collapsed ? '1' : '0')
  }, [collapsed])

  const width = collapsed ? 'w-[72px]' : 'w-64'

  return (
    <div className="flex h-full min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 transition-opacity lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex flex-col bg-slate-900 text-slate-100 transition-all duration-200 lg:static',
          width,
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        <div className="flex h-14 items-center justify-between border-b border-white/10 px-3">
          {!collapsed && (
            <div className="min-w-0 pl-1">
              <div className="truncate text-lg font-bold tracking-tight">Fresko</div>
              <div className="truncate text-[10px] text-slate-400">Payment Follow-up</div>
            </div>
          )}
          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            className="hidden rounded-lg p-2 text-slate-400 hover:bg-white/10 hover:text-white lg:block"
            title={collapsed ? 'Expand' : 'Collapse'}
          >
            {collapsed ? '»' : '«'}
          </button>
          <button
            type="button"
            className="rounded-lg p-2 text-slate-400 hover:bg-white/10 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          >
            ✕
          </button>
        </div>

        <nav className="flex-1 space-y-4 overflow-y-auto p-2">
          {sections.map((sec) => (
            <div key={sec.label}>
              {!collapsed && (
                <div className="mb-1 px-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  {sec.label}
                </div>
              )}
              <div className="space-y-0.5">
                {sec.items.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    onClick={() => setSidebarOpen(false)}
                    title={collapsed ? item.label : undefined}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center rounded-lg px-3 py-2 text-sm font-medium transition',
                        collapsed && 'justify-center',
                        isActive
                          ? 'bg-brand text-white'
                          : 'text-slate-300 hover:bg-white/5 hover:text-white'
                      )
                    }
                  >
                    {collapsed ? item.label.charAt(0) : item.label}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="space-y-2 border-t border-white/10 p-3">
          <button
            type="button"
            onClick={() => setDark((d) => !d)}
            className={cn(
              'flex w-full items-center rounded-lg px-3 py-2 text-sm text-slate-300 hover:bg-white/5 hover:text-white',
              collapsed && 'justify-center'
            )}
            title={dark ? 'Light mode' : 'Dark mode'}
          >
            {collapsed ? (dark ? '☀️' : '🌙') : dark ? '☀️ Light' : '🌙 Dark'}
          </button>
          <div className={cn('flex', collapsed ? 'justify-center' : 'px-1')}>
            <UserButton afterSignOutUrl="/sign-in" />
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center gap-3 border-b border-slate-200 bg-white px-4 dark:border-slate-800 dark:bg-slate-900 lg:px-6">
          <button
            type="button"
            className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            ☰
          </button>
          <div className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            Fresko Payment Follow-up
          </div>
          <div className="ml-auto">
            <button
              type="button"
              onClick={() => setDark((d) => !d)}
              className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 lg:hidden"
            >
              {dark ? '☀️' : '🌙'}
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-4 transition-colors lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
