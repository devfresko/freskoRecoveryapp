import { useMemo } from 'react'
import { useUser } from '@clerk/clerk-react'
import { Link } from 'react-router-dom'
import { useAppData } from '../hooks/useAppData'
import { invoicePending, isInvoiceOpen, parseIST } from '../lib/finance'
import { inr } from '../lib/utils'

export default function TodaysDuePage() {
  const { user } = useUser()
  const userName = user?.fullName || user?.primaryEmailAddress?.emailAddress || ''
  const { data, isLoading } = useAppData(userName)

  const invoices = data?.invoices || []
  const followups = data?.followups || []
  const stats = data?.stats || {}

  const today = useMemo(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d
  }, [])

  const computed = useMemo(() => {
    let dueTodayAmt = 0
    let overdueAmt = 0
    let dueTodayCount = 0
    let overdueCount = 0
    const billsToday = []

    invoices.forEach((inv) => {
      const pend = invoicePending(inv)
      if (pend <= 0 || !isInvoiceOpen(inv)) return
      const due = parseIST(inv.dueDate)
      if (!due) return
      if (due.getTime() === today.getTime()) {
        dueTodayAmt += pend
        dueTodayCount++
        billsToday.push({
          invoiceNo: inv.invoiceNo,
          partyName: inv.partyName,
          partyID: inv.partyID,
          pending: pend,
          dueDate: inv.dueDate,
        })
      } else if (due < today) {
        overdueAmt += pend
        overdueCount++
      }
    })

    billsToday.sort((a, b) => b.pending - a.pending)

    const todayStr = today.toLocaleDateString('en-GB')
    const todayFollowups = (followups || []).filter((f) => {
      const dt = f.datetime || ''
      return dt.includes(todayStr) || dt.startsWith(today.toISOString().slice(0, 10))
    })

    return {
      dueTodayAmt: stats.totalDueToday ?? dueTodayAmt,
      overdueAmt: stats.totalOverdue ?? overdueAmt,
      dueTodayCount,
      overdueCount,
      billsToday,
      todayFollowups: todayFollowups.slice(0, 20),
      followupsTodayCount: stats.followupsToday ?? todayFollowups.length,
    }
  }, [invoices, followups, stats, today])

  const dateLabel = today.toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-40 animate-pulse rounded bg-slate-200" />
        <div className="grid gap-3 sm:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-slate-200" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Today's Due
          </h1>
          <p className="text-sm text-slate-500">{dateLabel}</p>
        </div>
        <Link
          to="/followups"
          className="rounded-lg bg-amber-400 px-4 py-2 text-sm font-bold text-slate-900 shadow-sm hover:bg-amber-500"
        >
          ☎ Log Follow-up
        </Link>
      </div>

      {/* 3 KPI */}
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200/80 border-t-4 border-t-amber-400 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            Due Today (₹)
          </div>
          <div className="mt-1 text-2xl font-bold text-amber-600">
            {inr(computed.dueTodayAmt)}
          </div>
          <div className="mt-1 text-xs text-slate-400">
            {computed.dueTodayCount} invoices
          </div>
        </div>

        <div className="rounded-xl border border-slate-200/80 border-t-4 border-t-rose-500 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            Overdue (₹)
          </div>
          <div className="mt-1 text-2xl font-bold text-rose-600">
            {inr(computed.overdueAmt)}
          </div>
          <div className="mt-1 text-xs text-slate-400">
            {computed.overdueCount} invoices
          </div>
        </div>

        <div className="rounded-xl border border-slate-200/80 border-t-4 border-t-emerald-500 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            Follow-ups Today
          </div>
          <div className="mt-1 text-2xl font-bold text-emerald-600">
            {computed.followupsTodayCount}
          </div>
          <div className="mt-1 text-xs text-slate-400">logged today</div>
        </div>
      </div>

      {/* Bills Due Today */}
      <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-amber-100 bg-amber-50/80 px-4 py-3 dark:border-amber-900/30 dark:bg-amber-950/20">
          <div className="flex items-center gap-2 text-sm font-bold text-amber-800 dark:text-amber-200">
            <span>📋</span> Bills Due Today
          </div>
          <span className="rounded-full bg-amber-200/80 px-2 py-0.5 text-xs font-bold text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">
            {computed.billsToday.length}
          </span>
        </div>

        {computed.billsToday.length ? (
          <div className="max-h-[320px] divide-y divide-slate-100 overflow-y-auto dark:divide-slate-800">
            {computed.billsToday.map((b) => (
              <div
                key={b.invoiceNo}
                className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/40"
              >
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold">{b.partyName}</div>
                  <div className="text-[11px] text-slate-400">
                    {b.invoiceNo} · Due {b.dueDate}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="text-sm font-bold text-amber-600">{inr(b.pending)}</span>
                  <Link
                    to={`/payments/new?party=${encodeURIComponent(b.partyID)}`}
                    className="rounded-md bg-brand/10 px-2 py-1 text-xs font-semibold text-brand hover:bg-brand/20"
                  >
                    Pay
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-2xl text-emerald-500 dark:bg-emerald-900/30">
              ✓
            </div>
            <p className="text-sm text-slate-400">No bills due today</p>
          </div>
        )}
      </div>

      {/* Today's Follow-up Activity */}
      <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-emerald-100 bg-emerald-50/80 px-4 py-3 dark:border-emerald-900/30 dark:bg-emerald-950/20">
          <div className="flex items-center gap-2 text-sm font-bold text-emerald-800 dark:text-emerald-200">
            <span>☎</span> Today's Follow-up Activity
          </div>
          <Link
            to="/followups"
            className="rounded-lg bg-amber-400 px-3 py-1 text-xs font-bold text-slate-900 hover:bg-amber-500"
          >
            Log
          </Link>
        </div>

        {computed.todayFollowups.length ? (
          <div className="max-h-[320px] divide-y divide-slate-100 overflow-y-auto dark:divide-slate-800">
            {computed.todayFollowups.map((f) => (
              <div key={f.followUpID} className="px-4 py-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="font-semibold text-sm">{f.partyName}</div>
                  <span className="text-[11px] text-slate-400">{f.mode}</span>
                </div>
                <p className="mt-0.5 line-clamp-2 text-sm text-slate-600 dark:text-slate-300">
                  {f.notes}
                </p>
                <div className="mt-1 text-[11px] text-slate-400">{f.datetime}</div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-2 text-3xl text-slate-300">☎</div>
            <p className="text-sm text-slate-400">No follow-ups logged today</p>
            <Link
              to="/followups"
              className="mt-2 text-sm font-semibold text-rose-600 hover:underline"
            >
              + Log one
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
