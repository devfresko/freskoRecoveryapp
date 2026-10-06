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
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Retail Payment</h1>
        <p className="text-sm text-slate-500">Record customer payment</p>
      </div>

      <form
        onSubmit={onSubmit}
        className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
      >
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase text-slate-500">
            Customer
          </label>
          <select
            className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand"
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
            <p className="mt-1 text-xs text-slate-500">
              Pending <span className="font-semibold text-rose-600">{inrFull(selectedPending)}</span>
            </p>
          )}
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold uppercase text-slate-500">
            Amount
          </label>
          <input
            type="number"
            className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-semibold outline-none focus:ring-2 focus:ring-brand"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase text-slate-500">
              Date
            </label>
            <input
              type="date"
              className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand"
              value={payDate}
              onChange={(e) => setPayDate(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase text-slate-500">
              Mode
            </label>
            <select
              className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm"
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
          className="w-full rounded-lg bg-brand py-3 text-sm font-bold text-white hover:bg-brand-dark disabled:opacity-50"
        >
          {mutation.isPending ? 'Saving…' : 'Save Payment'}
        </button>
      </form>
    </div>
  )
}
