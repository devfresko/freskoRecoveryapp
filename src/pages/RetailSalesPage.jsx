import { useMemo, useState } from 'react'
import { useRetailData } from '../hooks/useAppData'
import { inr, inrFull } from '../lib/utils'
import { Link } from 'react-router-dom'

export default function RetailSalesPage() {
  const { data, isLoading, isError, error, refetch, isFetching } = useRetailData()
  const [q, setQ] = useState('')
  const rows = data?.rows || []

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase()
    if (!t) return rows
    return rows.filter((r) => (r.customer || '').toLowerCase().includes(t))
  }, [rows, q])

  const grouped = useMemo(() => {
    const map = {}
    filtered.forEach((r) => {
      const n = r.customer || 'Unknown'
      if (!map[n]) map[n] = { name: n, pending: 0, entries: 0 }
      map[n].pending += Number(r.pending) || 0
      map[n].entries += 1
    })
    return Object.values(map).sort((a, b) => b.pending - a.pending)
  }, [filtered])

  if (isLoading) return <div className="h-40 animate-pulse rounded-xl bg-slate-200" />
  if (isError) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
        {error?.message}{' '}
        <button type="button" className="underline" onClick={() => refetch()}>
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold">Retail Sale Register</h1>
          <p className="text-sm text-slate-500">{rows.length} entries · {grouped.length} customers</p>
        </div>
        <div className="flex gap-2">
          <input
            className="rounded-lg border px-3 py-2 text-sm"
            placeholder="Search customer…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <button
            type="button"
            onClick={() => refetch()}
            className="rounded-lg bg-slate-100 px-3 py-2 text-sm font-semibold"
          >
            {isFetching ? '…' : 'Refresh'}
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-3 py-2">Customer</th>
              <th className="px-3 py-2 text-right">Entries</th>
              <th className="px-3 py-2 text-right">Pending</th>
              <th className="px-3 py-2">Action</th>
            </tr>
          </thead>
          <tbody>
            {grouped.map((g) => (
              <tr key={g.name} className="border-t">
                <td className="px-3 py-2 font-semibold">{g.name}</td>
                <td className="px-3 py-2 text-right text-slate-500">{g.entries}</td>
                <td className="px-3 py-2 text-right font-semibold text-rose-600">
                  {g.pending > 0 ? inrFull(g.pending) : '—'}
                </td>
                <td className="px-3 py-2">
                  {g.pending > 0 && (
                    <Link
                      to={`/retail-pay?customer=${encodeURIComponent(g.name)}`}
                      className="text-xs font-bold text-violet-600"
                    >
                      Pay
                    </Link>
                  )}
                </td>
              </tr>
            ))}
            {!grouped.length && (
              <tr>
                <td colSpan={4} className="px-3 py-8 text-center text-slate-400">
                  No retail data
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
