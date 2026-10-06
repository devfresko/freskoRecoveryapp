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

  if (isLoading) return <div className="h-40 animate-pulse rounded-xl bg-slate-200" />

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Promise Tracker</h1>
      <div className="flex flex-wrap gap-2">
        {['ALL', 'Pending', 'Kept', 'Broken', 'Overdue'].map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={
              'rounded-full px-3 py-1 text-xs font-semibold ' +
              (filter === f ? 'bg-violet-600 text-white' : 'bg-white ring-1 ring-slate-200')
            }
          >
            {f}
          </button>
        ))}
      </div>
      <div className="overflow-hidden rounded-xl border bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-3 py-2">Party</th>
              <th className="px-3 py-2">Promise ₹</th>
              <th className="px-3 py-2">Date</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Notes</th>
            </tr>
          </thead>
          <tbody>
            {list.map((f) => (
              <tr key={f.followUpID} className="border-t">
                <td className="px-3 py-2 font-medium">{f.partyName}</td>
                <td className="px-3 py-2">{f.promiseAmt ? inr(f.promiseAmt) : '—'}</td>
                <td className="px-3 py-2 text-slate-500">{f.promiseDate || '—'}</td>
                <td className="px-3 py-2">{f.promiseKept || 'Pending'}</td>
                <td className="max-w-xs truncate px-3 py-2 text-slate-500">{f.notes}</td>
              </tr>
            ))}
            {!list.length && (
              <tr>
                <td colSpan={5} className="px-3 py-8 text-center text-slate-400">
                  No promises
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
