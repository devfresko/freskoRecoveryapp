import { useMemo, useState } from 'react'
import { useUser } from '@clerk/clerk-react'
import { Link } from 'react-router-dom'
import { useAppData } from '../hooks/useAppData'
import { useLogFollowUp } from '../hooks/useLogFollowUp'
import { invoicePending, isInvoiceOpen, parseIST } from '../lib/finance'
import { inr } from '../lib/utils'

const BUCKETS = [
  { key: '1-7', label: '1-7 DAYS', min: 1, max: 7 },
  { key: '8-15', label: '8-15 DAYS', min: 8, max: 15 },
  { key: '16-30', label: '16-30 DAYS', min: 16, max: 30 },
  { key: '31-60', label: '31-60 DAYS', min: 31, max: 60 },
  { key: '60+', label: '60+ DAYS', min: 61, max: 99999 },
]

export default function OverduePage() {
  const { user } = useUser()
  const userName =
    user?.primaryEmailAddress?.emailAddress ||
    user?.emailAddresses?.[0]?.emailAddress ||
    user?.fullName ||
    user?.id ||
    ''
  const { data, isLoading } = useAppData(userName)
  const logMutation = useLogFollowUp(userName)

  const [q, setQ] = useState('')
  const [bucket, setBucket] = useState('ALL')
  const [followUpRow, setFollowUpRow] = useState(null)
  const [notes, setNotes] = useState('')
  const [mode, setMode] = useState('Phone Call')

  const invoices = data?.invoices || []
  const followups = data?.followups || []

  const today = useMemo(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d
  }, [])

  const lastFollowUpByParty = useMemo(() => {
    const map = {}
    ;(followups || []).forEach((f) => {
      const id = f.partyID
      if (!id) return
      if (!map[id] || (f.datetime || '') > (map[id] || '')) map[id] = f.datetime
    })
    return map
  }, [followups])

  const rows = useMemo(() => {
    const list = []
    invoices.forEach((inv) => {
      if (!isInvoiceOpen(inv)) return
      const due = parseIST(inv.dueDate)
      if (!due || due >= today) return
      const age = Math.floor((today - due) / 86400000)
      if (age < 1) return
      list.push({
        partyID: inv.partyID,
        partyName: inv.partyName,
        invoiceNo: inv.invoiceNo,
        dueDate: inv.dueDate,
        age,
        pending: invoicePending(inv),
        lastFollowUp: lastFollowUpByParty[inv.partyID] || '--',
        priority: age >= 30 ? 'High' : age >= 15 ? 'Medium' : 'Low',
      })
    })
    return list.sort((a, b) => b.age - a.age || b.pending - a.pending)
  }, [invoices, today, lastFollowUpByParty])

  const bucketTotals = useMemo(() => {
    const t = {}
    BUCKETS.forEach((b) => {
      t[b.key] = 0
    })
    rows.forEach((r) => {
      const b = BUCKETS.find((x) => r.age >= x.min && r.age <= x.max)
      if (b) t[b.key] += r.pending
    })
    return t
  }, [rows])

  const totalOverdue = useMemo(
    () => rows.reduce((s, r) => s + r.pending, 0),
    [rows]
  )

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase()
    return rows.filter((r) => {
      if (bucket !== 'ALL') {
        const b = BUCKETS.find((x) => x.key === bucket)
        if (!b || r.age < b.min || r.age > b.max) return false
      }
      if (!term) return true
      return (
        (r.partyName || '').toLowerCase().includes(term) ||
        (r.invoiceNo || '').toLowerCase().includes(term)
      )
    })
  }, [rows, q, bucket])

  function submitFollowUp(e) {
    e.preventDefault()
    if (!followUpRow || !notes.trim()) return
    logMutation.mutate(
      {
        partyID: followUpRow.partyID,
        partyCode: '',
        partyName: followUpRow.partyName,
        datetime: new Date().toLocaleString('en-GB', { hour12: false }),
        mode,
        notes: notes.trim(),
        priority: followUpRow.priority,
        escalated: followUpRow.priority === 'High' ? 'Yes' : 'No',
        promiseAmt: 0,
      },
      {
        onSuccess: () => {
          setFollowUpRow(null)
          setNotes('')
        },
      }
    )
  }

  if (isLoading) {
    return <div className="h-48 animate-pulse rounded-xl bg-slate-200" />
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Overdue Accounts</h1>
          <p className="text-sm text-slate-500">
            All invoices past their due date — sorted by age
          </p>
        </div>
        <span className="rounded-full bg-rose-50 px-3 py-1 text-sm font-bold text-rose-600 dark:bg-rose-900/30">
          {inr(totalOverdue)} overdue
        </span>
      </div>

      {/* Age buckets */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        {BUCKETS.map((b) => (
          <button
            key={b.key}
            type="button"
            onClick={() => setBucket(bucket === b.key ? 'ALL' : b.key)}
            className={
              'rounded-xl border bg-white p-3 text-left shadow-sm transition dark:bg-slate-900 ' +
              (bucket === b.key
                ? 'border-rose-400 ring-2 ring-rose-200'
                : 'border-slate-200/80 dark:border-slate-800')
            }
          >
            <div className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
              {b.label}
            </div>
            <div className="mt-1 text-lg font-bold text-rose-600">
              {inr(bucketTotals[b.key] || 0)}
            </div>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="flex flex-wrap gap-2">
        <input
          className="min-w-[200px] flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand dark:border-slate-700 dark:bg-slate-900"
          placeholder="Search party or invoice…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        {bucket !== 'ALL' && (
          <button
            type="button"
            onClick={() => setBucket('ALL')}
            className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold dark:border-slate-700"
          >
            Clear filter ×
          </button>
        )}
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="max-h-[65vh] overflow-auto">
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500 dark:bg-slate-800">
              <tr>
                <th className="px-3 py-3">Party</th>
                <th className="px-3 py-3">Invoice No</th>
                <th className="px-3 py-3">Due Date</th>
                <th className="px-3 py-3">Days OD</th>
                <th className="px-3 py-3 text-right">Pending (₹)</th>
                <th className="px-3 py-3">Last Follow-up</th>
                <th className="px-3 py-3">Priority</th>
                <th className="px-3 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, 300).map((r) => (
                <tr
                  key={r.invoiceNo + r.partyID}
                  className="border-t border-slate-100 hover:bg-slate-50/80 dark:border-slate-800 dark:hover:bg-slate-800/40"
                >
                  <td className="px-3 py-2.5 font-semibold">{r.partyName}</td>
                  <td className="px-3 py-2.5 font-mono text-xs">{r.invoiceNo}</td>
                  <td className="px-3 py-2.5 text-slate-500">{r.dueDate}</td>
                  <td className="px-3 py-2.5">
                    <span className="rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                      {r.age}d
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-right font-bold text-rose-600">
                    {inr(r.pending)}
                  </td>
                  <td className="px-3 py-2.5 text-xs text-slate-400">{r.lastFollowUp}</td>
                  <td className="px-3 py-2.5">
                    <span
                      className={
                        'rounded-full px-2 py-0.5 text-[11px] font-semibold ' +
                        (r.priority === 'High'
                          ? 'bg-rose-50 text-rose-700'
                          : r.priority === 'Medium'
                            ? 'bg-amber-50 text-amber-700'
                            : 'bg-slate-100 text-slate-600')
                      }
                    >
                      {r.priority}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex gap-1">
                      <button
                        type="button"
                        title="Log follow-up"
                        onClick={() => setFollowUpRow(r)}
                        className="rounded-lg border border-slate-200 px-2 py-1 text-xs hover:bg-slate-50 dark:border-slate-700"
                      >
                        ☎
                      </button>
                      <Link
                        to={`/payments/new?party=${encodeURIComponent(r.partyID)}`}
                        title="Record payment"
                        className="rounded-lg border border-slate-200 px-2 py-1 text-xs hover:bg-slate-50 dark:border-slate-700"
                      >
                        ₹
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
              {!filtered.length && (
                <tr>
                  <td colSpan={8} className="px-3 py-12 text-center text-slate-400">
                    No overdue invoices
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Follow-up popup modal */}
      {followUpRow && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl dark:bg-slate-900">
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h3 className="text-lg font-bold">Log Follow-up</h3>
                <p className="text-sm text-slate-500">{followUpRow.partyName}</p>
                <p className="text-xs text-slate-400">
                  {followUpRow.invoiceNo} · {inr(followUpRow.pending)} pending
                </p>
              </div>
              <button
                type="button"
                onClick={() => setFollowUpRow(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
              >
                ✕
              </button>
            </div>
            <form onSubmit={submitFollowUp} className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase text-slate-500">
                  Mode
                </label>
                <select
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
                  value={mode}
                  onChange={(e) => setMode(e.target.value)}
                >
                  {['Phone Call', 'WhatsApp', 'Email', 'Visit', 'SMS'].map((m) => (
                    <option key={m}>{m}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase text-slate-500">
                  Notes
                </label>
                <textarea
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Outcome / next step…"
                  required
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setFollowUpRow(null)}
                  className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold dark:border-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={logMutation.isPending}
                  className="flex-1 rounded-xl bg-brand py-2.5 text-sm font-bold text-white hover:bg-brand-dark disabled:opacity-50"
                >
                  {logMutation.isPending ? 'Saving…' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
