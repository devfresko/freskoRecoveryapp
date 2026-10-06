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
      .filter((p) => !t || (p.partyName || '').toLowerCase().includes(t) || (p.refNo || '').toLowerCase().includes(t))
      .slice(0, 200)
  }, [payments, q])

  if (isLoading) return <div className="h-40 animate-pulse rounded-xl bg-slate-200" />

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">Payments</h1>
        <Link to="/payments/new" className="rounded-lg bg-violet-600 px-3 py-2 text-sm font-bold text-white">
          + Record Payment
        </Link>
      </div>
      <input
        className="rounded-lg border px-3 py-2 text-sm"
        placeholder="Search party / ref…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      <div className="overflow-hidden rounded-xl border bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-3 py-2">Date</th>
              <th className="px-3 py-2">Party</th>
              <th className="px-3 py-2">Mode</th>
              <th className="px-3 py-2 text-right">Amount</th>
              <th className="px-3 py-2">Type</th>
            </tr>
          </thead>
          <tbody>
            {list.map((p) => (
              <tr key={p.paymentID} className="border-t">
                <td className="px-3 py-2 text-slate-500">{p.paymentDate}</td>
                <td className="px-3 py-2 font-medium">
                  {p.partyName}
                  {p._optimistic && <span className="ml-1 text-xs text-violet-500">…</span>}
                </td>
                <td className="px-3 py-2">{p.mode}</td>
                <td className="px-3 py-2 text-right font-semibold text-emerald-700">{inr(p.amount)}</td>
                <td className="px-3 py-2 text-xs text-slate-500">{p.paymentType || 'Invoice'}</td>
              </tr>
            ))}
            {!list.length && (
              <tr>
                <td colSpan={5} className="px-3 py-8 text-center text-slate-400">
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
