import { useMemo, useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useUser } from '@clerk/clerk-react'
import { useRetailData } from '../hooks/useAppData'
import { useRetailPayment } from '../hooks/useRetailPayment'
import { localDateISO, fmtLocalDate } from '../lib/finance'
import { inrFull } from '../lib/utils'

export default function RetailPayPage() {
  const { user } = useUser()
  const userName = user?.fullName || user?.primaryEmailAddress?.emailAddress || ''
  const { data } = useRetailData()
  const mutation = useRetailPayment(userName)
  const [params] = useSearchParams()
  const navigate = useNavigate()

  const [customer, setCustomer] = useState(params.get('customer') || '')
  const [amount, setAmount] = useState('')
  const [mode, setMode] = useState('UPI')
  const [payDate, setPayDate] = useState(localDateISO())

  useEffect(() => {
    const c = params.get('customer')
    if (c) setCustomer(c)
  }, [params])

  const customers = useMemo(() => {
    const map = {}
    ;(data?.rows || []).forEach((r) => {
      const n = (r.customer || '').trim()
      if (!n) return
      map[n] = (map[n] || 0) + (Number(r.pending) || 0)
    })
    return Object.entries(map)
      .map(([name, pending]) => ({ name, pending }))
      .sort((a, b) => b.pending - a.pending)
  }, [data])

  const selectedPending = customers.find((c) => c.name === customer)?.pending || 0

  function onSubmit(e) {
    e.preventDefault()
    if (!customer || !Number(amount)) return
    mutation.mutate(
      {
        customer,
        amount: Number(amount),
        paymentDate: fmtLocalDate(payDate),
        mode,
        remarks: '',
      },
      {
        onSuccess: (res) => {
          if (res?.success) navigate('/retail-sales')
        },
      }
    )
  }

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <h1 className="text-2xl font-bold">Retail Payment</h1>
      <form onSubmit={onSubmit} className="space-y-3 rounded-xl border bg-white p-5 shadow-sm">
        <div>
          <label className="text-xs font-semibold uppercase text-slate-500">Customer</label>
          <select
            className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
            value={customer}
            onChange={(e) => setCustomer(e.target.value)}
            required
          >
            <option value="">Select…</option>
            {customers.map((c) => (
              <option key={c.name} value={c.name}>
                {c.name} ({inrFull(c.pending)})
              </option>
            ))}
          </select>
          {customer && (
            <p className="mt-1 text-xs text-slate-500">Pending {inrFull(selectedPending)}</p>
          )}
        </div>
        <div>
          <label className="text-xs font-semibold uppercase text-slate-500">Amount</label>
          <input
            type="number"
            className="mt-1 w-full rounded-lg border px-3 py-2 text-sm font-semibold"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs font-semibold uppercase text-slate-500">Date</label>
            <input
              type="date"
              className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
              value={payDate}
              onChange={(e) => setPayDate(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase text-slate-500">Mode</label>
            <select
              className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
              value={mode}
              onChange={(e) => setMode(e.target.value)}
            >
              {['UPI', 'Cash', 'NEFT', 'Cheque', 'Other'].map((m) => (
                <option key={m}>{m}</option>
              ))}
            </select>
          </div>
        </div>
        <button
          type="submit"
          disabled={mutation.isPending}
          className="w-full rounded-lg bg-violet-600 py-2.5 text-sm font-bold text-white disabled:opacity-50"
        >
          Save Payment
        </button>
      </form>
    </div>
  )
}
