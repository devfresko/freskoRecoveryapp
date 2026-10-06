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
  return (
    <div className="flex h-full min-h-screen bg-slate-50">
      <aside className="flex w-60 flex-col border-r border-slate-200 bg-slate-900 text-slate-100">
        <div className="border-b border-white/10 px-5 py-4">
          <div className="text-lg font-bold tracking-tight">Fresko</div>
          <div className="text-xs text-slate-400">Recovery · v2 final</div>
        </div>
        <nav className="flex-1 space-y-4 overflow-y-auto p-3">
          {sections.map((sec) => (
            <div key={sec.label}>
              <div className="mb-1 px-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                {sec.label}
              </div>
              <div className="space-y-0.5">
                {sec.items.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    className={({ isActive }) =>
                      cn(
                        'block rounded-lg px-3 py-2 text-sm font-medium transition',
                        isActive
                          ? 'bg-violet-600 text-white'
                          : 'text-slate-300 hover:bg-white/5 hover:text-white'
                      )
                    }
                  >
                    {item.label}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>
        <div className="border-t border-white/10 p-4">
          <UserButton afterSignOutUrl="/sign-in" />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center border-b border-slate-200 bg-white px-6">
          <div className="text-sm font-semibold text-slate-700">Fresko Payment Follow-up</div>
        </header>
        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
