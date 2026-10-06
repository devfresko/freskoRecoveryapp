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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Follow-ups</h1>
        <p className="text-sm text-slate-500">Log interactions & track recent activity</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Log Form */}
        <div className="lg:col-span-2">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <h2 className="mb-4 text-lg font-bold text-slate-800">Log Follow-up</h2>
            <form onSubmit={submit} className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase text-slate-500">
                  Party
                </label>
                <select
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand"
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
                  <label className="mb-1 block text-xs font-semibold uppercase text-slate-500">
                    Mode
                  </label>
                  <select
                    className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm"
                    value={mode}
                    onChange={(e) => setMode(e.target.value)}
                  >
                    {['Phone Call', 'WhatsApp', 'Email', 'Visit', 'SMS', 'Other'].map((m) => (
                      <option key={m}>{m}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase text-slate-500">
                    Priority
                  </label>
                  <select
                    className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm"
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
                <label className="mb-1 block text-xs font-semibold uppercase text-slate-500">
                  Promise Amount (optional)
                </label>
                <input
                  type="number"
                  min="0"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand"
                  placeholder="0"
                  value={promiseAmt}
                  onChange={(e) => setPromiseAmt(e.target.value)}
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase text-slate-500">
                  Notes / Outcome
                </label>
                <textarea
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand"
                  rows={3}
                  placeholder="What was discussed / next step…"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  required
                />
              </div>

              <button
                type="submit"
                disabled={mutation.isPending}
                className="w-full rounded-lg bg-brand py-2.5 text-sm font-bold text-white hover:bg-brand-dark disabled:opacity-50"
              >
                {mutation.isPending ? 'Saving…' : 'Save Follow-up'}
              </button>
            </form>
          </div>
        </div>

        {/* Recent List */}
        <div className="lg:col-span-3">
          <h2 className="mb-3 text-lg font-bold text-slate-800">Recent Follow-ups</h2>

          {/* Mobile Cards */}
          <div className="space-y-3 md:hidden">
            {list.map((f) => (
              <div
                key={f.followUpID}
                className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="font-semibold text-slate-800">
                    {f.partyName}
                    {f._optimistic && (
                      <span className="ml-2 text-xs text-brand">saving…</span>
                    )}
                  </div>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                    {f.mode}
                  </span>
                </div>
                <p className="mt-1 text-sm text-slate-600 line-clamp-2">{f.notes}</p>
                <div className="mt-2 text-xs text-slate-400">{f.datetime}</div>
              </div>
            ))}
            {!list.length && (
              <div className="py-10 text-center text-slate-400">No follow-ups yet</div>
            )}
          </div>

          {/* Desktop Table */}
          <div className="hidden overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm md:block">
            <div className="max-h-[60vh] overflow-auto">
              <table className="w-full text-left text-sm">
                <thead className="sticky top-0 bg-slate-50 text-xs uppercase text-slate-500">
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
                    <tr key={f.followUpID} className="border-t border-slate-100 hover:bg-slate-50/80">
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
                            'rounded-full px-2 py-0.5 text-xs font-semibold ' +
                            (f.priority === 'High'
                              ? 'bg-rose-50 text-rose-700'
                              : f.priority === 'Low'
                                ? 'bg-slate-100 text-slate-600'
                                : 'bg-amber-50 text-amber-700')
                          }
                        >
                          {f.priority || 'Medium'}
                        </span>
                      </td>
                      <td className="max-w-xs truncate px-4 py-3 text-slate-600">{f.notes}</td>
                      <td className="px-4 py-3 text-xs text-slate-400">{f.datetime}</td>
                    </tr>
                  ))}
                  {!list.length && (
                    <tr>
                      <td colSpan={5} className="px-4 py-10 text-center text-slate-400">
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
