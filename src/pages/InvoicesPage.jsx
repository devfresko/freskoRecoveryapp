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
          const due = inv.dueDate ? new Date(inv.dueDate) : null
          if (!due || due >= today) return false
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
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Sales Invoices</h1>
          <p className="text-sm text-slate-500">
            {filtered.length} shown · {(invoices || []).length} total
          </p>
        </div>
        <input
          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand sm:w-64"
          placeholder="Search invoice / party…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {STATUS_FILTERS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStatus(s)}
            className={
              'rounded-full px-3 py-1.5 text-xs font-semibold transition ' +
              (status === s
                ? 'bg-brand text-white'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50')
            }
          >
            {s}
          </button>
        ))}
      </div>

      {/* Mobile Cards */}
      <div className="space-y-3 md:hidden">
        {filtered.slice(0, 200).map((inv) => {
          const pend = invoicePending(inv)
          return (
            <div
              key={inv.invoiceID || inv.invoiceNo}
              className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-mono text-sm font-semibold text-slate-800">
                    {inv.invoiceNo}
                  </div>
                  <div className="mt-0.5 font-medium text-slate-700">{inv.partyName}</div>
                  <div className="mt-1 text-xs text-slate-500">
                    {inv.invoiceDate} · Due {inv.dueDate || '—'}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-slate-700">
                    {inr(inv.billValue || inv.netAmount)}
                  </div>
                  <div className={`text-sm font-bold ${pend > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                    {pend > 0 ? inr(pend) : 'Paid'}
                  </div>
                  <div className="mt-1">
                    <StatusPill status={inv.status} />
                  </div>
                </div>
              </div>
            </div>
          )
        })}
        {!filtered.length && (
          <div className="py-10 text-center text-slate-400">No invoices match</div>
        )}
      </div>

      {/* Desktop Table */}
      <div className="hidden overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm md:block">
        <div className="max-h-[70vh] overflow-auto">
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Invoice</th>
                <th className="px-4 py-3">Party</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Due</th>
                <th className="px-4 py-3">Slab</th>
                <th className="px-4 py-3 text-right">Bill</th>
                <th className="px-4 py-3 text-right">Pending</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, 500).map((inv) => {
                const pend = invoicePending(inv)
                return (
                  <tr
                    key={inv.invoiceID || inv.invoiceNo}
                    className="border-t border-slate-100 hover:bg-slate-50/80"
                  >
                    <td className="px-4 py-3 font-mono text-xs font-semibold">
                      {inv.invoiceNo}
                    </td>
                    <td className="px-4 py-3 font-medium">{inv.partyName}</td>
                    <td className="px-4 py-3 text-slate-500">{inv.invoiceDate}</td>
                    <td className="px-4 py-3 text-slate-500">{inv.dueDate}</td>
                    <td className="px-4 py-3">
                      <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs font-semibold">
                        {inv.slabPct || '0'}%
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {inr(inv.billValue || inv.netAmount)}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-rose-600">
                      {pend > 0 ? inr(pend) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <StatusPill status={inv.status} />
                    </td>
                  </tr>
                )
              })}
              {!filtered.length && (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-slate-400">
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
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${color}`}>
      {s}
    </span>
  )
}
