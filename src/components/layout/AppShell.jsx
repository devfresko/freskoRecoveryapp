import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { UserButton, useUser } from '@clerk/clerk-react'
import { cn } from '../../lib/utils'

const sections = [
  {
  label: 'Overview',
  items: [
    { to: '/', label: 'Dashboard', end: true },
    { to: '/todays-due', label: "Today's Due" },
    { to: '/overdue', label: 'Overdue' },
  ],
},
  {
    label: 'Parties',
    items: [
      { to: '/parties', label: 'Parties' },
    ],
  },
  {
    label: 'Invoices',
    items: [
      { to: '/invoices', label: 'All Invoices' },
      { to: '/invoices?status=Pending', label: 'Pending Invoices' },
      { to: '/import', label: 'CSV Upload' },
    ],
  },
  {
    label: 'Slabs & Collections',
    items: [
      { to: '/payments', label: 'Payments' },
      { to: '/payments/new', label: 'Record Payment' },
      { to: '/followups', label: 'Follow-ups' },
      { to: '/promises', label: 'Promises' },
    ],
  },
  {
    label: 'Retail',
    items: [
      { to: '/retail', label: 'Retail Dashboard' },
      { to: '/retail-sales', label: 'Sale Register' },
      { to: '/retail-pay', label: 'Retail Pay' },
    ],
  },
]

export function AppShell() {
  const { user } = useUser()
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(
    () => localStorage.getItem('sidebar-collapsed') === '1'
  )
  const [dark, setDark] = useState(() => {
    return (
      localStorage.getItem('theme') === 'dark' ||
      (!localStorage.getItem('theme') &&
        window.matchMedia('(prefers-color-scheme: dark)').matches)
    )
  })

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
    localStorage.setItem('theme', dark ? 'dark' : 'light')
  }, [dark])

  useEffect(() => {
    localStorage.setItem('sidebar-collapsed', collapsed ? '1' : '0')
  }, [collapsed])

  const width = collapsed ? 'w-[72px]' : 'w-[260px]'
  const pageTitle =
    location.pathname === '/'
      ? 'Dashboard'
      : location.pathname.replace('/', '').replace(/-/g, ' ')

  return (
    <div className="flex h-full min-h-screen bg-[#f4f6f9] text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex flex-col bg-[#0f172a] text-slate-100 transition-all duration-200 lg:static',
          width,
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        {/* Brand */}
        <div className="flex h-14 items-center gap-2 border-b border-white/10 px-4">
          {!collapsed && (
            <div className="min-w-0">
              <div className="truncate text-base font-bold text-white">Fresko</div>
              <div className="truncate text-[10px] text-slate-400">
                Payment Follow-up System
              </div>
            </div>
          )}
          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            className="ml-auto hidden rounded-lg p-1.5 text-slate-400 hover:bg-white/10 lg:block"
          >
            {collapsed ? '»' : '«'}
          </button>
          <button
            type="button"
            className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          >
            ✕
          </button>
        </div>

        <nav className="flex-1 space-y-5 overflow-y-auto px-2 py-4">
          {sections.map((sec) => (
            <div key={sec.label}>
              {!collapsed && (
                <div className="mb-1.5 px-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  {sec.label}
                </div>
              )}
              <div className="space-y-0.5">
                {sec.items.map((item) => (
                  <NavLink
                    key={item.to + item.label}
                    to={item.to}
                    end={item.end}
                    onClick={() => setSidebarOpen(false)}
                    title={collapsed ? item.label : undefined}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center rounded-lg px-3 py-2 text-[13px] font-medium transition',
                        collapsed && 'justify-center',
                        isActive
                          ? 'bg-[#e11d48] text-white shadow-sm'
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
          {!collapsed && user && (
            <div className="rounded-xl bg-white/5 px-3 py-2.5">
              <div className="truncate text-sm font-semibold">
                {user.fullName || 'User'}
              </div>
              <div className="text-[10px] text-slate-400">ADMIN</div>
            </div>
          )}
          <button
            type="button"
            onClick={() => setDark((d) => !d)}
            className={cn(
              'flex w-full items-center rounded-lg px-3 py-2 text-sm text-slate-300 hover:bg-white/5',
              collapsed && 'justify-center'
            )}
          >
            {collapsed ? (dark ? '☀️' : '🌙') : dark ? '☀️ Light mode' : '🌙 Dark mode'}
          </button>
          <div className={cn('flex', collapsed ? 'justify-center' : 'px-1')}>
            <UserButton afterSignOutUrl="/sign-in" />
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center gap-3 border-b border-slate-200/80 bg-white px-4 dark:border-slate-800 dark:bg-slate-900 lg:px-6">
          <button
            type="button"
            className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden dark:text-slate-300 dark:hover:bg-slate-800"
            onClick={() => setSidebarOpen(true)}
          >
            ☰
          </button>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold capitalize">{pageTitle}</span>
            <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500 dark:bg-slate-800">
              v2.0
            </span>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={() => setDark((d) => !d)}
              className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              {dark ? '☀️' : '🌙'}
            </button>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              ↻ Refresh
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
