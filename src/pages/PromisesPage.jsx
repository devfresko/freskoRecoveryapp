import { useMemo, useState } from 'react'
import { useUser } from '@clerk/clerk-react'
import { useFollowups } from '../hooks/useAppData'
import { inr } from '../lib/utils'
import { parseIST } from '../lib/finance'

export default function PromisesPage() {
  const { user } = useUser()
  const userName = user?.fullName || user?.primaryEmailAddress?.emailAddress || ''
  const { data: followups, isLoading } = useFollowups(userName)
  const [filter, setFilter] = useState('ALL')

  const list = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return (followups || [])
      .filter((f) => f.promiseAmt || f.promiseDate)
      .filter((f) => {
        if (filter === 'ALL') return true
        if (filter === 'Pending') return (f.promiseKept || 'Pending') === 'Pending'
        if (filter === 'Kept') return f.promiseKept === 'Yes' || f.promiseKept === 'Kept'
        if (filter === 'Broken') return f.promiseKept === 'No' || f.promiseKept === 'Broken'
        if (filter === 'Overdue') {
          const pd = parseIST(f.promiseDate)
          return pd && pd < today && (f.promiseKept || 'Pending') === 'Pending'
        }
        return true
      })
  }, [followups, filter])

  if (isLoading) {
    return <div className="h-40 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800" />
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Promise Tracker</h1>
        <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
          Payment commitments from follow-ups
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {['ALL', 'Pending', 'Kept', 'Broken', 'Overdue'].map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={
              'rounded-full px-3.5 py-1.5 text-xs font-semibold transition ' +
              (filter === f
                ? 'bg-brand text-white shadow-sm'
                : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300')
            }
          >
            {f}
          </button>
        ))}
      </div>

      <div className="space-y-2.5 md:hidden">
        {list.map((f) => (
          <div
            key={f.followUpID}
            className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="font-semibold">{f.partyName}</div>
              <StatusPill status={f.promiseKept || 'Pending'} />
            </div>
            <div className="mt-2 flex justify-between text-sm">
              <span className="font-bold">{f.promiseAmt ? inr(f.promiseAmt) : '—'}</span>
              <span className="text-slate-500">{f.promiseDate || '—'}</span>
            </div>
            {f.notes && (
              <p className="mt-2 line-clamp-2 text-sm text-slate-600 dark:text-slate-300">
                {f.notes}
              </p>
            )}
          </div>
        ))}
        {!list.length && <div className="py-10 text-center text-slate-400">No promises</div>}
      </div>

      <div className="hidden overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 md:block">
        <div className="max-h-[70vh] overflow-auto">
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 bg-slate-50/95 text-[11px] uppercase tracking-wider text-slate-500 backdrop-blur dark:bg-slate-800/95 dark:text-slate-400">
              <tr>
                <th className="px-4 py-3">Party</th>
                <th className="px-4 py-3">Promise ₹</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Notes</th>
              </tr>
            </thead>
            <tbody>
              {list.map((f) => (
                <tr
                  key={f.followUpID}
                  className="border-t border-slate-100 hover:bg-slate-50/80 dark:border-slate-800 dark:hover:bg-slate-800/40"
                >
                  <td className="px-4 py-3 font-medium">{f.partyName}</td>
                  <td className="px-4 py-3 font-semibold">
                    {f.promiseAmt ? inr(f.promiseAmt) : '—'}
                  </td>
                  <td className="px-4 py-3 text-slate-500">{f.promiseDate || '—'}</td>
                  <td className="px-4 py-3">
                    <StatusPill status={f.promiseKept || 'Pending'} />
                  </td>
                  <td className="max-w-xs truncate px-4 py-3 text-slate-500">{f.notes}</td>
                </tr>
              ))}
              {!list.length && (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-slate-400">
                    No promises
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
  let color =
    'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
  if (s === 'Yes' || s === 'Kept')
    color = 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
  else if (s === 'No' || s === 'Broken')
    color = 'bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300'
  else if (s === 'Pending')
    color = 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'

  return (
    <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${color}`}>{s}</span>
  )
}
