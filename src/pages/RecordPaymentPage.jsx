import { useEffect, useMemo, useState } from 'react'
import { useUser } from '@clerk/clerk-react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useParties, useInvoices } from '../hooks/useAppData'
import { useRecordPayment } from '../hooks/useRecordPayment'
import { fifoAllocate, fmtLocalDate, invoicePending, isInvoiceOpen, localDateISO } from '../lib/finance'
import { inr, inrFull } from '../lib/utils'

export default function RecordPaymentPage() {
  const { user } = useUser()
  const userName = user?.fullName || user?.primaryEmailAddress?.emailAddress || ''
  const { data: parties } = useParties(userName)
  const { data: invoices } = useInvoices(userName)
  const mutation = useRecordPayment(userName)
  const [params] = useSearchParams()
  const navigate = useNavigate()

  const [partyId, setPartyId] = useState(params.get('party') || '')
  const [amount, setAmount] = useState('')
  const [mode, setMode] = useState('NEFT')
  const [refNo, setRefNo] = useState('')
  const [payDate, setPayDate] = useState(localDateISO())
  const [remarks, setRemarks] = useState('')

  useEffect(() => {
    const p = params.get('party')
    if (p) setPartyId(p)
  }, [params])

  const party = useMemo(
    () => (parties || []).find((p) => p.partyID === partyId),
    [parties, partyId]
  )

  const openInvs = useMemo(() => {
    if (!partyId) return []
    return (invoices || [])
      .filter((i) => i.partyID === partyId && isInvoiceOpen(i))
      .sort((a, b) => String(a.dueDate || '').localeCompare(String(b.dueDate || '')))
  }, [invoices, partyId])

  const totalPending = useMemo(
    () => openInvs.reduce((s, i) => s + invoicePending(i), 0),
    [openInvs]
  )

  const plan = useMemo(() => fifoAllocate(openInvs, amount), [openInvs, amount])

  function onSubmit(e) {
    e.preventDefault()
    if (!party || !plan.allocations.length) return

    mutation.mutate(
      {
        partyID: party.partyID,
        partyCode: party.partyCode || '',
        partyName: party.name,
        paymentDate: fmtLocalDate(payDate),
        amount: Number(amount) || 0,
        mode,
        refNo,
        bankName: '',
        remarks,
        tdsDeducted: 0,
        discountGiven: 0,
        discountToBeGiven: 0,
        invoices: plan.allocations.map((a) => ({
          invoiceNo: a.invoiceNo,
          amount: a.amount,
        })),
      },
      {
        onSuccess: (res) => {
          if (res?.success) {
            setAmount('')
            setRefNo('')
            setRemarks('')
            navigate('/payments')
          }
        },
      }
    )
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Record Payment</h1>
        <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
          FIFO · oldest invoices clear first
        </p>
      </div>

      <form
        onSubmit={onSubmit}
        className="space-y-5 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6"
      >
        {/* Party */}
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
            {(parties || []).map((p) => (
              <option key={p.partyID} value={p.partyID}>
                {p.name} {p.partyCode ? `(${p.partyCode})` : ''}
              </option>
            ))}
          </select>
          {party && (
            <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-500">
              <span>
                Open: <strong className="text-slate-700 dark:text-slate-200">{openInvs.length}</strong>
              </span>
              <span>
                Pending:{' '}
                <strong className="text-rose-600">{inr(totalPending)}</strong>
              </span>
            </div>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Amount
            </label>
            <input
              type="number"
              min="1"
              step="0.01"
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-sm font-semibold outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 dark:border-slate-700 dark:bg-slate-800"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              required
            />
          </div>
          <div>
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Payment Date
            </label>
            <input
              type="date"
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 dark:border-slate-700 dark:bg-slate-800"
              value={payDate}
              onChange={(e) => setPayDate(e.target.value)}
              required
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Mode
            </label>
            <select
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-800"
              value={mode}
              onChange={(e) => setMode(e.target.value)}
            >
              {['NEFT', 'RTGS', 'IMPS', 'UPI', 'Cheque', 'Cash', 'Other'].map((m) => (
                <option key={m}>{m}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Ref No
            </label>
            <input
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 dark:border-slate-700 dark:bg-slate-800"
              value={refNo}
              onChange={(e) => setRefNo(e.target.value)}
            />
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            Remarks
          </label>
          <input
            className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 dark:border-slate-700 dark:bg-slate-800"
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
          />
        </div>

        {/* FIFO Preview */}
        <div className="rounded-xl border border-brand/15 bg-brand/5 p-4 dark:bg-brand/10">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-sm font-semibold text-brand-dark dark:text-teal-300">
            <span>FIFO allocation</span>
            <span>
              Applied {inr(plan.totalApplied)}
              {plan.unallocated > 0 && (
                <span className="ml-2 text-amber-600">· Unalloc {inr(plan.unallocated)}</span>
              )}
            </span>
          </div>
          {!plan.allocations.length ? (
            <p className="text-xs text-slate-500">
              Select party + amount — oldest dues allocate first.
            </p>
          ) : (
            <ul className="max-h-44 space-y-1.5 overflow-auto text-xs">
              {plan.allocations.map((a) => (
                <li
                  key={a.invoiceNo}
                  className="flex justify-between gap-2 rounded-lg bg-white/60 px-2.5 py-1.5 dark:bg-slate-900/40"
                >
                  <span className="font-mono font-medium">{a.invoiceNo}</span>
                  <span>
                    {inrFull(a.amount)}{' '}
                    <span className="text-slate-400">
                      ({inr(a.pendingBefore)} → {inr(a.pendingAfter)})
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <button
          type="submit"
          disabled={!party || !plan.allocations.length || mutation.isPending}
          className="w-full rounded-xl bg-brand py-3 text-sm font-bold text-white shadow-sm transition hover:bg-brand-dark hover:shadow disabled:opacity-50"
        >
          {mutation.isPending ? 'Saving…' : 'Save Payment'}
        </button>
      </form>
    </div>
  )
}
