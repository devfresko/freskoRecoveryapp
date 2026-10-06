import { useMemo, useState } from 'react'
import { useUser } from '@clerk/clerk-react'
import { useParties, useInvoices } from '../hooks/useAppData'
import { invoicePending, isInvoiceOpen } from '../lib/finance'
import { inr } from '../lib/utils'
import { Link } from 'react-router-dom'

export default function PartiesPage() {
  const { user } = useUser()
  const userName = user?.fullName || user?.primaryEmailAddress?.emailAddress || ''
  const { data: parties, isLoading } = useParties(userName)
  const { data: invoices } = useInvoices(userName)
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('ALL')

  const outstandingByParty = useMemo(() => {
    const map = {}
    ;(invoices || []).forEach((inv) => {
      if (!isInvoiceOpen(inv)) return
      const id = inv.partyID
      map[id] = (map[id] || 0) + invoicePending(inv)
    })
    return map
  }, [invoices])

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase()
    return (parties || [])
      .filter((p) => {
        if (status === 'Active' && (p.status || 'Active') !== 'Active') return false
        if (status === 'Inactive' && p.status === 'Active') return false
        if (!term) return true
        const blob = `${p.name || ''} ${p.partyCode || ''} ${p.city || ''} ${p.phone || ''}`.toLowerCase()
        return blob.includes(term)
      })
      .sort((a, b) => (outstandingByParty[b.partyID] || 0) - (outstandingByParty[a.partyID] || 0))
  }, [parties, q, status, outstandingByParty])

  if (isLoading) {
    return <div className="h-48 animate-pulse rounded-xl bg-slate-200" />
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Parties</h1>
          <p className="text-sm text-slate-500">
            {filtered.length} of {(parties || []).length}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <input
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand sm:w-64"
            placeholder="Search name, code, city, phone…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <select
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="ALL">All status</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
        </div>
      </div>

      {/* Mobile Cards */}
      <div className="space-y-3 md:hidden">
        {filtered.map((p) => {
          const od = outstandingByParty[p.partyID] || 0
          return (
            <div key={p.partyID} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-semibold text-slate-800">{p.name}</div>
                  <div className="text-xs text-slate-500">{p.partyCode || '—'} · {p.city || '—'}</div>
                  <div className="mt-1 text-sm text-slate-600">{p.phone || '—'}</div>
                </div>
                <div className="text-right">
                  <div className={`font-bold ${od > 0 ? 'text-rose-600' : 'text-slate-400'}`}>
                    {od > 0 ? inr(od) : 'Settled'}
                  </div>
                  {od > 0 && (
                    <Link
                      to={`/payments/new?party=${encodeURIComponent(p.partyID)}`}
                      className="mt-2 inline-block rounded-md bg-brand px-3 py-1 text-xs font-semibold text-white"
                    >
                      Pay
                    </Link>
                  )}
                </div>
              </div>
            </div>
          )
        })}
        {!filtered.length && (
          <div className="py-10 text-center text-slate-400">No parties match</div>
        )}
      </div>

      {/* Desktop Table */}
      <div className="hidden overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm md:block">
        <div className="max-h-[70vh] overflow-auto">
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Code</th>
                <th className="px-4 py-3">City</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3 text-right">Outstanding</th>
                <th className="px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => {
                const od = outstandingByParty[p.partyID] || 0
                return (
                  <tr key={p.partyID} className="border-t border-slate-100 hover:bg-slate-50/80">
                    <td className="px-4 py-3 font-semibold text-slate-800">{p.name}</td>
                    <td className="px-4 py-3 text-slate-500">{p.partyCode || '—'}</td>
                    <td className="px-4 py-3 text-slate-600">{p.city || '—'}</td>
                    <td className="px-4 py-3 text-slate-600">{p.phone || '—'}</td>
                    <td className="px-4 py-3 text-right font-semibold text-rose-600">
                      {od > 0 ? inr(od) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      {od > 0 ? (
                        <Link
                          to={`/payments/new?party=${encodeURIComponent(p.partyID)}`}
                          className="rounded-md bg-brand/10 px-3 py-1.5 text-xs font-semibold text-brand hover:bg-brand/20"
                        >
                          Pay
                        </Link>
                      ) : (
                        <span className="text-xs text-slate-400">Settled</span>
                      )}
                    </td>
                  </tr>
                )
              })}
              {!filtered.length && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-slate-400">
                    No parties match
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
