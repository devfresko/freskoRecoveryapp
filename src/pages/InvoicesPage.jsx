import { useMemo, useState } from 'react'
import { useUser } from '@clerk/clerk-react'
import { useInvoices } from '../hooks/useAppData'
import { invoicePending, isInvoiceOpen } from '../lib/finance'
import { inr } from '../lib/utils'

const STATUS_FILTERS = ['ALL', 'Pending', 'PartPaid', 'Paid', 'Overdue']

export default function InvoicesPage() {
  const { user } = useUser()
  const userName = user?.fullName || user?.primaryEmailAddress?.emailAddress || ''
  const { data: invoices, isLoading } = useInvoices(userName)
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('ALL')

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase()
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return (invoices || [])
      .filter((inv) => {
        if (status === 'Overdue') {
          if (!isInvoiceOpen(inv)) return false
          // simple overdue: dueDate before today
          const due = inv.dueDate
          if (!due) return false
        } else if (status !== 'ALL') {
          if ((inv.status || 'Pending') !== status) return false
        }
        if (!term) return true
        const blob = `${inv.invoiceNo || ''} ${inv.partyName || ''} ${inv.partyCode || ''}`.toLowerCase()
        return blob.includes(term)
      })
      .sort((a, b) => String(b.invoiceDate || '').localeCompare(String(a.invoiceDate || '')))
  }, [invoices, q, status])

  if (isLoading) {
    return <div className="h-48 animate-pulse rounded-xl bg-slate-200" />
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Sales Invoices</h1>
          <p className="text-sm text-slate-500">
            {filtered.length} shown · {(invoices || []).length} total in cache
          </p>
        </div>
        <input
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-violet-500"
          placeholder="Search invoice / party…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        {STATUS_FILTERS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStatus(s)}
            className={
              'rounded-full px-3 py-1 text-xs font-semibold transition ' +
              (status === s
                ? 'bg-violet-600 text-white'
                : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50')
            }
          >
            {s}
          </button>
        ))}
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="max-h-[70vh] overflow-auto">
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-3 py-2">Invoice</th>
                <th className="px-3 py-2">Party</th>
                <th className="px-3 py-2">Date</th>
                <th className="px-3 py-2">Due</th>
                <th className="px-3 py-2">Slab</th>
                <th className="px-3 py-2 text-right">Bill</th>
                <th className="px-3 py-2 text-right">Pending</th>
                <th className="px-3 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, 500).map((inv) => {
                const pend = invoicePending(inv)
                return (
                  <tr key={inv.invoiceID || inv.invoiceNo} className="border-t border-slate-100">
                    <td className="px-3 py-2 font-mono text-xs font-semibold">{inv.invoiceNo}</td>
                    <td className="px-3 py-2 font-medium">{inv.partyName}</td>
                    <td className="px-3 py-2 text-slate-500">{inv.invoiceDate}</td>
                    <td className="px-3 py-2 text-slate-500">{inv.dueDate}</td>
                    <td className="px-3 py-2">
                      <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs font-semibold">
                        {inv.slabPct || '0'}%
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right">{inr(inv.billValue || inv.netAmount)}</td>
                    <td className="px-3 py-2 text-right font-semibold text-rose-600">
                      {pend > 0 ? inr(pend) : '—'}
                    </td>
                    <td className="px-3 py-2">
                      <StatusPill status={inv.status} />
                    </td>
                  </tr>
                )
              })}
              {!filtered.length && (
                <tr>
                  <td colSpan={8} className="px-3 py-10 text-center text-slate-400">
                    No invoices match
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function StatusPill({ status }) {
  const s = status || 'Pending'
  const color =
    s === 'Paid'
      ? 'bg-emerald-50 text-emerald-700'
      : s === 'PartPaid'
        ? 'bg-amber-50 text-amber-700'
        : s === 'Overdue'
          ? 'bg-rose-50 text-rose-700'
          : 'bg-slate-100 text-slate-600'
  return <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${color}`}>{s}</span>
}
