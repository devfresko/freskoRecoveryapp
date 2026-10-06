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
  const [notes, setNotes] = useState('')

  function submit(e) {
    e.preventDefault()
    const party = (parties || []).find((p) => p.partyID === partyId)
    if (!party || !notes.trim()) return

    mutation.mutate({
      partyID: party.partyID,
      partyCode: party.partyCode,
      partyName: party.name,
      datetime: new Date().toLocaleString('en-GB', { hour12: false }),
      mode: 'Phone Call',
      notes: notes.trim(),
      priority: 'Medium',
      escalated: 'No',
      promiseAmt: 0,
    })
    setNotes('')
  }

  const list = (followups || []).slice(0, 50)

  return (
    <div className="grid gap-6 lg:grid-cols-5">
      <div className="lg:col-span-2">
        <h2 className="mb-3 text-lg font-bold">Log Follow-up</h2>
        <form onSubmit={submit} className="space-y-3 rounded-xl border bg-white p-4 shadow-sm">
          <select
            className="w-full rounded-lg border px-3 py-2 text-sm"
            value={partyId}
            onChange={(e) => setPartyId(e.target.value)}
          >
            <option value="">Select party</option>
            {(parties || []).slice(0, 200).map((p) => (
              <option key={p.partyID} value={p.partyID}>
                {p.name}
              </option>
            ))}
          </select>
          <textarea
            className="w-full rounded-lg border px-3 py-2 text-sm"
            rows={3}
            placeholder="Notes / outcome"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
          <button
            type="submit"
            className="w-full rounded-lg bg-violet-600 py-2 text-sm font-semibold text-white hover:bg-violet-700"
          >
            Save (optimistic)
          </button>
        </form>
      </div>

      <div className="lg:col-span-3">
        <h2 className="mb-3 text-lg font-bold">Recent follow-ups</h2>
        <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-3 py-2">Party</th>
                <th className="px-3 py-2">Mode</th>
                <th className="px-3 py-2">Notes</th>
              </tr>
            </thead>
            <tbody>
              {list.map((f) => (
                <tr key={f.followUpID} className="border-t">
                  <td className="px-3 py-2 font-medium">
                    {f.partyName}
                    {f._optimistic && (
                      <span className="ml-2 text-xs text-violet-500">saving…</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-slate-500">{f.mode}</td>
                  <td className="max-w-xs truncate px-3 py-2 text-slate-600">{f.notes}</td>
                </tr>
              ))}
              {!list.length && (
                <tr>
                  <td colSpan={3} className="px-3 py-8 text-center text-slate-400">
                    No follow-ups yet
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
