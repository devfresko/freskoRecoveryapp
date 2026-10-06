import { useMemo, useState } from 'react'
import { useUser } from '@clerk/clerk-react'
import { usePayments } from '../hooks/useAppData'
import { inr } from '../lib/utils'
import { Link } from 'react-router-dom'

export default function PaymentsListPage() {
  const { user } = useUser()
  const userName = user?.fullName || user?.primaryEmailAddress?.emailAddress || ''
  const { data: payments, isLoading } = usePayments(userName)
  const [q, setQ] = useState('')

  const list = useMemo(() => {
    const t = q.trim().toLowerCase()
    return (payments || [])
      .filter(
        (p) =>
          !t ||
          (p.partyName || '').toLowerCase().includes(t) ||
          (p.refNo || '').toLowerCase().includes(t)
      )
      .slice(0, 200)
  }, [payments, q])

  if (isLoading) return <div className="h-40 animate-pulse rounded-xl bg-slate-200" />

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Payments</h1>
          <p className="text-sm text-slate-500">{list.length} shown</p>
        </div>
        <Link
          to="/payments/new"
          className="rounded-lg bg-brand px-4 py-2 text-sm font-bold text-white hover:bg-brand-dark"
        >
          + Record Payment
        </Link>
      </div>

      <input
        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand sm:w-64"
        placeholder="Search party / ref…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />

      {/* Mobile */}
      <div className="space-y-3 md:hidden">
        {list.map((p) => (
          <div key={p.paymentID} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex justify-between gap-2">
              <div className="font-semibold text-slate-800">
                {p.partyName}
                {p._optimistic && <span className="ml-1 text-xs text-brand">…</span>}
              </div>
              <div className="font-bold text-emerald-700">{inr(p.amount)}</div>
            </div>
            <div className="mt-1 text-xs text-slate-500">
              {p.paymentDate} · {p.mode} · {p.paymentType || 'Invoice'}
            </div>
          </div>
        ))}
        {!list.length && <div className="py-10 text-center text-slate-400">No payments</div>}
      </div>

      {/* Desktop */}
      <div className="hidden overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm md:block">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Party</th>
              <th className="px-4 py-3">Mode</th>
              <th className="px-4 py-3 text-right">Amount</th>
              <th className="px-4 py-3">Type</th>
            </tr>
          </thead>
          <tbody>
            {list.map((p) => (
              <tr key={p.paymentID} className="border-t border-slate-100 hover:bg-slate-50/80">
                <td className="px-4 py-3 text-slate-500">{p.paymentDate}</td>
                <td className="px-4 py-3 font-medium">
                  {p.partyName}
                  {p._optimistic && <span className="ml-1 text-xs text-brand">…</span>}
                </td>
                <td className="px-4 py-3">{p.mode}</td>
                <td className="px-4 py-3 text-right font-semibold text-emerald-700">
                  {inr(p.amount)}
                </td>
                <td className="px-4 py-3 text-xs text-slate-500">{p.paymentType || 'Invoice'}</td>
              </tr>
            ))}
            {!list.length && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-slate-400">
                  No payments
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
