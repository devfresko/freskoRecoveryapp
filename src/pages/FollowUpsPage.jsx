import { useState } from 'react'
import { useUser } from '@clerk/clerk-react'
import { useFollowups, useParties } from '../hooks/useAppData'
import { useLogFollowUp } from '../hooks/useLogFollowUp'

export default function FollowUpsPage() {
  const { user } = useUser()
  const userName = user?.fullName || user?.primaryEmailAddress?.emailAddress || ''
  const { data: followups } = useFollowups(userName)
  const { data: parties } = useParties(userName)
  const mutation = useLogFollowUp(userName)

  const [partyId, setPartyId] = useState('')
  const [mode, setMode] = useState('Phone Call')
  const [priority, setPriority] = useState('Medium')
  const [notes, setNotes] = useState('')
  const [promiseAmt, setPromiseAmt] = useState('')

  function submit(e) {
    e.preventDefault()
    const party = (parties || []).find((p) => p.partyID === partyId)
    if (!party || !notes.trim()) return

    mutation.mutate({
      partyID: party.partyID,
      partyCode: party.partyCode,
      partyName: party.name,
      datetime: new Date().toLocaleString('en-GB', { hour12: false }),
      mode,
      notes: notes.trim(),
      priority,
      escalated: priority === 'High' ? 'Yes' : 'No',
      promiseAmt: Number(promiseAmt) || 0,
    })
    setNotes('')
    setPromiseAmt('')
  }

  const list = (followups || []).slice(0, 80)

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Follow-ups</h1>
        <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
          Log interactions · track recent activity
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-5">
        {/* Form */}
        <div className="lg:col-span-2">
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h2 className="mb-4 text-base font-bold">Log Follow-up</h2>
            <form onSubmit={submit} className="space-y-3.5">
              <div>
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  Party
                </label>
                <select
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 dark:border-slate-700 dark:bg-slate-800"
                  value={partyId}
                  onChange={(e) => setPartyId(e.target.value)}
                  required
                >
                  <option value="">Select party</option>
                  {(parties || []).slice(0, 300).map((p) => (
                    <option key={p.partyID} value={p.partyID}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    Mode
                  </label>
                  <select
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-800"
                    value={mode}
                    onChange={(e) => setMode(e.target.value)}
                  >
                    {['Phone Call', 'WhatsApp', 'Email', 'Visit', 'SMS', 'Other'].map((m) => (
                      <option key={m}>{m}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    Priority
                  </label>
                  <select
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-800"
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                  >
                    {['Low', 'Medium', 'High'].map((p) => (
                      <option key={p}>{p}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  Promise Amount
                </label>
                <input
                  type="number"
                  min="0"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 dark:border-slate-700 dark:bg-slate-800"
                  placeholder="Optional"
                  value={promiseAmt}
                  onChange={(e) => setPromiseAmt(e.target.value)}
                />
              </div>

              <div>
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  Notes / Outcome
                </label>
                <textarea
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 dark:border-slate-700 dark:bg-slate-800"
                  rows={3}
                  placeholder="Discussion summary…"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  required
                />
              </div>

              <button
                type="submit"
                disabled={mutation.isPending}
                className="w-full rounded-xl bg-brand py-2.5 text-sm font-bold text-white shadow-sm hover:bg-brand-dark disabled:opacity-50"
              >
                {mutation.isPending ? 'Saving…' : 'Save Follow-up'}
              </button>
            </form>
          </div>
        </div>

        {/* List */}
        <div className="lg:col-span-3">
          <h2 className="mb-3 text-base font-bold">Recent</h2>

          <div className="space-y-2.5 md:hidden">
            {list.map((f) => (
              <div
                key={f.followUpID}
                className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="font-semibold">
                    {f.partyName}
                    {f._optimistic && <span className="ml-2 text-xs text-brand">saving…</span>}
                  </div>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium dark:bg-slate-800">
                    {f.mode}
                  </span>
                </div>
                <p className="mt-1 line-clamp-2 text-sm text-slate-600 dark:text-slate-300">
                  {f.notes}
                </p>
                <div className="mt-2 text-[11px] text-slate-400">{f.datetime}</div>
              </div>
            ))}
            {!list.length && (
              <div className="py-10 text-center text-slate-400">No follow-ups yet</div>
            )}
          </div>

          <div className="hidden overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 md:block">
            <div className="max-h-[62vh] overflow-auto">
              <table className="w-full text-left text-sm">
                <thead className="sticky top-0 bg-slate-50/95 text-[11px] uppercase tracking-wider text-slate-500 backdrop-blur dark:bg-slate-800/95 dark:text-slate-400">
                  <tr>
                    <th className="px-4 py-3">Party</th>
                    <th className="px-4 py-3">Mode</th>
                    <th className="px-4 py-3">Priority</th>
                    <th className="px-4 py-3">Notes</th>
                    <th className="px-4 py-3">When</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((f) => (
                    <tr
                      key={f.followUpID}
                      className="border-t border-slate-100 hover:bg-slate-50/80 dark:border-slate-800 dark:hover:bg-slate-800/40"
                    >
                      <td className="px-4 py-3 font-medium">
                        {f.partyName}
                        {f._optimistic && (
                          <span className="ml-2 text-xs text-brand">saving…</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-500">{f.mode}</td>
                      <td className="px-4 py-3">
                        <span
                          className={
                            'rounded-full px-2 py-0.5 text-[11px] font-semibold ' +
                            (f.priority === 'High'
                              ? 'bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300'
                              : f.priority === 'Low'
                                ? 'bg-slate-100 text-slate-600 dark:bg-slate-800'
                                : 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300')
                          }
                        >
                          {f.priority || 'Medium'}
                        </span>
                      </td>
                      <td className="max-w-[200px] truncate px-4 py-3 text-slate-600 dark:text-slate-300">
                        {f.notes}
                      </td>
                      <td className="px-4 py-3 text-[11px] text-slate-400">{f.datetime}</td>
                    </tr>
                  ))}
                  {!list.length && (
                    <tr>
                      <td colSpan={5} className="px-4 py-12 text-center text-slate-400">
                        No follow-ups yet
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
