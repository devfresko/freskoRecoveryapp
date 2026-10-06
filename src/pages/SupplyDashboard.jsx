import { useMemo } from 'react'
import { useUser } from '@clerk/clerk-react'
import { Link } from 'react-router-dom'
import { useAppData } from '../hooks/useAppData'
import { invoicePending, isInvoiceOpen, parseIST } from '../lib/finance'
import { inr } from '../lib/utils'

export default function SupplyDashboard() {
  const { user } = useUser()
  const userName = user?.fullName || user?.primaryEmailAddress?.emailAddress || ''
  const { data, isLoading, isError, error } = useAppData(userName)

  const invoices = data?.invoices || []
  const followups = data?.followups || []
  const stats = data?.stats || {}

  const today = useMemo(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d
  }, [])

  const computed = useMemo(() => {
    let outstanding = 0
    let overdueAmt = 0
    let dueTodayAmt = 0
    let overdueCount = 0
    let dueTodayCount = 0
    let partiesWithDue = new Set()
    const slab = { '1.5': 0, '1': 0, nil: 0, '1.5c': 0, '1c': 0, nilc: 0 }

    const overdueList = []

    invoices.forEach((inv) => {
      const pend = invoicePending(inv)
      if (pend <= 0) return
      outstanding += pend
      partiesWithDue.add(inv.partyID)

      const pct = String(inv.slabPct || '0').replace('%', '')
      if (pct === '1.5') {
        slab['1.5'] += pend
        slab['1.5c']++
      } else if (pct === '1') {
        slab['1'] += pend
        slab['1c']++
      } else {
        slab.nil += pend
        slab.nilc++
      }

      const due = parseIST(inv.dueDate)
      if (due) {
        if (due.getTime() === today.getTime()) {
          dueTodayAmt += pend
          dueTodayCount++
        } else if (due < today) {
          overdueAmt += pend
          overdueCount++
          const age = Math.floor((today - due) / 86400000)
          overdueList.push({
            partyName: inv.partyName,
            invoiceNo: inv.invoiceNo,
            dueDate: inv.dueDate,
            pending: pend,
            age,
            partyID: inv.partyID,
          })
        }
      }
    })

    overdueList.sort((a, b) => b.pending - a.pending)

    const todayStr = today.toLocaleDateString('en-GB')
    const todayFollowups = followups.filter((f) =>
      (f.datetime || '').includes(todayStr.split('/').join('/'))
    )

    return {
      outstanding: stats.totalOutstanding ?? outstanding,
      overdueAmt: stats.totalOverdue ?? overdueAmt,
      dueTodayAmt: stats.totalDueToday ?? dueTodayAmt,
      collected: stats.collectedThisMonth ?? 0,
      overdueCount,
      dueTodayCount,
      partyCount: partiesWithDue.size,
      slab,
      overdueList: overdueList.slice(0, 12),
      todayFollowups: todayFollowups.slice(0, 8),
    }
  }, [invoices, followups, stats, today])

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-40 animate-pulse rounded bg-slate-200" />
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-slate-200" />
          ))}
        </div>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-700">
        {error?.message || 'Failed to load'}
      </div>
    )
  }

  const dateLabel = today.toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Dashboard
          </h1>
          <p className="text-sm text-slate-500">{dateLabel}</p>
        </div>
        <Link
          to="/import"
          className="rounded-lg bg-[#e11d48] px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-rose-700"
        >
          + New Invoice
        </Link>
      </div>

      {/* 4 KPI cards */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi
          label="Total Outstanding"
          value={inr(computed.outstanding)}
          sub={`${computed.partyCount} parties`}
          accent="border-slate-200"
          valueClass="text-slate-900 dark:text-white"
        />
        <Kpi
          label="Overdue"
          value={inr(computed.overdueAmt)}
          sub={`${computed.overdueCount} invoices`}
          accent="border-t-rose-500"
          valueClass="text-rose-600"
        />
        <Kpi
          label="Due Today"
          value={inr(computed.dueTodayAmt)}
          sub={`${computed.dueTodayCount} invoices`}
          accent="border-t-amber-400"
          valueClass="text-amber-600"
        />
        <Kpi
          label="Collected This Month"
          value={inr(computed.collected)}
          sub="payments"
          accent="border-t-emerald-500"
          valueClass="text-emerald-600"
        />
      </div>

      {/* Slab row */}
      <div className="grid gap-3 md:grid-cols-3">
        <SlabCard label="1.5% SLAB" amount={computed.slab['1.5']} count={computed.slab['1.5c']} color="emerald" />
        <SlabCard label="1% SLAB" amount={computed.slab['1']} count={computed.slab['1c']} color="amber" />
        <SlabCard label="NIL SLAB" amount={computed.slab.nil} count={computed.slab.nilc} color="slate" />
      </div>

      {/* Bottom 2 cols */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Overdue / Urgent */}
        <div className="rounded-xl border border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-slate-800">
            <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100">
              Overdue / Urgent
            </h2>
            <span className="rounded-full bg-rose-50 px-2 py-0.5 text-xs font-bold text-rose-600 dark:bg-rose-900/30">
              {computed.overdueCount}
            </span>
          </div>
          <div className="max-h-[380px] overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
            {computed.overdueList.map((row) => (
              <div
                key={row.invoiceNo + row.partyID}
                className="flex items-center justify-between gap-3 px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/50"
              >
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">
                    {row.partyName}
                  </div>
                  <div className="text-[11px] text-slate-400">
                    {row.invoiceNo} · Due {row.dueDate}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="text-sm font-bold text-rose-600">
                    {inr(row.pending)}
                  </span>
                  <span className="rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                    {row.age}
                  </span>
                </div>
              </div>
            ))}
            {!computed.overdueList.length && (
              <div className="py-10 text-center text-sm text-slate-400">No overdue</div>
            )}
          </div>
        </div>

        {/* Follow-ups */}
        <div className="rounded-xl border border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-slate-800">
            <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100">Follow-ups</h2>
            <div className="flex gap-2 text-xs font-semibold">
              <span className="text-brand">Today</span>
              <Link to="/followups" className="text-slate-400 hover:text-brand">
                All →
              </Link>
            </div>
          </div>
          {computed.todayFollowups.length ? (
            <div className="max-h-[380px] divide-y divide-slate-100 overflow-y-auto dark:divide-slate-800">
              {computed.todayFollowups.map((f) => (
                <div key={f.followUpID} className="px-4 py-2.5">
                  <div className="text-sm font-semibold">{f.partyName}</div>
                  <div className="text-xs text-slate-500 line-clamp-1">{f.notes}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="mb-2 text-3xl text-slate-300">📋</div>
              <p className="text-sm text-slate-400">No follow-ups today</p>
              <Link
                to="/followups"
                className="mt-2 text-sm font-semibold text-rose-600 hover:underline"
              >
                + Log one now
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function Kpi({ label, value, sub, accent, valueClass }) {
  return (
    <div
      className={`rounded-xl border border-slate-200/80 border-t-4 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 ${accent}`}
    >
      <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </div>
      <div className={`mt-1 text-2xl font-bold tracking-tight ${valueClass}`}>{value}</div>
      <div className="mt-1 text-xs text-slate-400">{sub}</div>
    </div>
  )
}

function SlabCard({ label, amount, count, color }) {
  const bar =
    color === 'emerald'
      ? 'bg-emerald-500'
      : color === 'amber'
        ? 'bg-amber-400'
        : 'bg-slate-400'
  const border =
    color === 'emerald'
      ? 'border-l-emerald-500'
      : color === 'amber'
        ? 'border-l-amber-400'
        : 'border-l-slate-400'

  return (
    <div
      className={`rounded-xl border border-slate-200/80 border-l-4 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 ${border}`}
    >
      <div
        className={`text-xs font-bold uppercase ${
          color === 'emerald'
            ? 'text-emerald-600'
            : color === 'amber'
              ? 'text-amber-600'
              : 'text-slate-500'
        }`}
      >
        {label}
      </div>
      <div className="mt-1 text-xl font-bold">{inr(amount)}</div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
        <div className={`h-full w-2/3 rounded-full ${bar}`} />
      </div>
      <div className="mt-1 text-xs text-slate-400">{count} invoices</div>
    </div>
  )
}
