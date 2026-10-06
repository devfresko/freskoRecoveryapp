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
      .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
  }, [parties, q, status])

  if (isLoading) {
    return <div className="h-48 animate-pulse rounded-xl bg-slate-200" />
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Parties</h1>
          <p className="text-sm text-slate-500">
            {filtered.length} of {(parties || []).length} · from local cache
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <input
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-violet-500"
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

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="max-h-[70vh] overflow-auto">
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-3 py-2">Name</th>
                <th className="px-3 py-2">Code</th>
                <th className="px-3 py-2">City</th>
                <th className="px-3 py-2">Phone</th>
                <th className="px-3 py-2 text-right">Outstanding</th>
                <th className="px-3 py-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => {
                const od = outstandingByParty[p.partyID] || 0
                return (
                  <tr key={p.partyID} className="border-t border-slate-100 hover:bg-slate-50/80">
                    <td className="px-3 py-2 font-semibold text-slate-800">{p.name}</td>
                    <td className="px-3 py-2 text-slate-500">{p.partyCode || '—'}</td>
                    <td className="px-3 py-2 text-slate-600">{p.city || '—'}</td>
                    <td className="px-3 py-2 text-slate-600">{p.phone || '—'}</td>
                    <td className="px-3 py-2 text-right font-semibold text-rose-600">
                      {od > 0 ? inr(od) : '—'}
                    </td>
                    <td className="px-3 py-2">
                      {od > 0 ? (
                        <Link
                          to={`/payments/new?party=${encodeURIComponent(p.partyID)}`}
                          className="rounded-md bg-violet-50 px-2 py-1 text-xs font-semibold text-violet-700 hover:bg-violet-100"
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
                  <td colSpan={6} className="px-3 py-10 text-center text-slate-400">
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
