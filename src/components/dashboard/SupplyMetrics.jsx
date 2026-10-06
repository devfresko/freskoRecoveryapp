import { useMemo } from 'react'
import { Card, Metric, Text, Grid, BarChart } from '@tremor/react'
import { Link } from 'react-router-dom'
import { inr } from '../../lib/utils'
import { invoicePending, isInvoiceOpen, parseIST } from '../../lib/finance'

export function SupplyMetrics({ stats, invoices = [], followups = [], parties = [] }) {
  const outstanding = stats?.totalOutstanding ?? 0
  const overdue = stats?.totalOverdue ?? 0
  const dueToday = stats?.totalDueToday ?? 0
  const followupsToday = stats?.followupsToday ?? 0

  const today = useMemo(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d
  }, [])

  // Age buckets
  const buckets = useMemo(() => {
    const b = { '1-7 Days': 0, '8-15 Days': 0, '16-30 Days': 0, '30+ Days': 0 }
    invoices.forEach((inv) => {
      const pend = invoicePending(inv)
      if (pend <= 0) return
      const due = parseIST(inv.dueDate)
      if (!due || due >= today) return
      const age = Math.floor((today - due) / 86400000)
      if (age <= 7) b['1-7 Days'] += pend
      else if (age <= 15) b['8-15 Days'] += pend
      else if (age <= 30) b['16-30 Days'] += pend
      else b['30+ Days'] += pend
    })
    return Object.entries(b).map(([name, value]) => ({ name, Amount: Math.round(value) }))
  }, [invoices, today])

  // Overdue parties (top 10 by pending)
  const overdueParties = useMemo(() => {
    const map = {}
    invoices.forEach((inv) => {
      if (!isInvoiceOpen(inv)) return
      const due = parseIST(inv.dueDate)
      if (!due || due >= today) return
      const id = inv.partyID
      if (!map[id]) {
        map[id] = {
          partyID: id,
          name: inv.partyName || 'Unknown',
          pending: 0,
          oldestAge: 0,
        }
      }
      const pend = invoicePending(inv)
      map[id].pending += pend
      const age = Math.floor((today - due) / 86400000)
      if (age > map[id].oldestAge) map[id].oldestAge = age
    })
    return Object.values(map)
      .filter((p) => p.pending > 0)
      .sort((a, b) => b.pending - a.pending)
      .slice(0, 10)
  }, [invoices, today])

  // Short payments (PartPaid)
  const shortPayments = useMemo(() => {
    return invoices
      .filter((inv) => {
        const status = inv.status || ''
        const paid = inv.paidAmount || 0
        return (status === 'PartPaid' || paid > 0) && isInvoiceOpen(inv)
      })
      .map((inv) => ({
        invoiceNo: inv.invoiceNo,
        partyName: inv.partyName,
        bill: inv.billValue || inv.netAmount || 0,
        paid: inv.paidAmount || 0,
        pending: invoicePending(inv),
      }))
      .sort((a, b) => b.pending - a.pending)
      .slice(0, 8)
  }, [invoices])

  // Bills Due Today
  const billsDueToday = useMemo(() => {
    return invoices
      .filter((inv) => {
        if (!isInvoiceOpen(inv)) return false
        const due = parseIST(inv.dueDate)
        if (!due) return false
        return due.getTime() === today.getTime()
      })
      .map((inv) => ({
        invoiceNo: inv.invoiceNo,
        partyName: inv.partyName,
        pending: invoicePending(inv),
      }))
      .sort((a, b) => b.pending - a.pending)
      .slice(0, 8)
  }, [invoices, today])

  // Today's follow-ups
  const todayFollowups = useMemo(() => {
    const todayStr = today.toLocaleDateString('en-GB')
    return (followups || [])
      .filter((f) => (f.datetime || '').includes(todayStr.split('/').reverse().join('-')) || 
                     (f.datetime || '').startsWith(today.toLocaleDateString('en-GB')))
      .slice(0, 6)
  }, [followups, today])

  return (
    <div className="space-y-6">
      {/* Top Stats */}
      <Grid numItems={1} numItemsSm={2} numItemsLg={4} className="gap-4">
        <Card className="border-t-4 border-t-rose-500">
          <Text className="text-slate-500">Total Outstanding</Text>
          <Metric className="text-rose-600">{inr(outstanding)}</Metric>
        </Card>
        <Card className="border-t-4 border-t-amber-500">
          <Text className="text-slate-500">Overdue</Text>
          <Metric className="text-amber-600">{inr(overdue)}</Metric>
        </Card>
        <Card className="border-t-4 border-t-blue-500">
          <Text className="text-slate-500">Due Today</Text>
          <Metric className="text-blue-600">{inr(dueToday)}</Metric>
        </Card>
        <Card className="border-t-4 border-t-emerald-500">
          <Text className="text-slate-500">Follow-ups Today</Text>
          <Metric className="text-emerald-600">{followupsToday || todayFollowups.length}</Metric>
        </Card>
      </Grid>

      {/* Aging Chart */}
      <Card>
        <Text className="font-semibold text-slate-700">Overdue by Age</Text>
        <Text className="text-xs text-slate-400">Outstanding amount by days past due</Text>
        <BarChart
          className="mt-4 h-56"
          data={buckets}
          index="name"
          categories={['Amount']}
          colors={['rose']}
          valueFormatter={(v) => inr(v)}
          yAxisWidth={70}
          showAnimation
        />
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Overdue Accounts */}
        <Card>
          <div className="mb-3 flex items-center justify-between">
            <div>
              <Text className="font-semibold text-slate-700">Overdue Accounts</Text>
              <Text className="text-xs text-slate-400">Top parties past due date</Text>
            </div>
            <Link to="/parties" className="text-xs font-semibold text-brand hover:underline">
              View all
            </Link>
          </div>
          <div className="space-y-2">
            {overdueParties.map((p) => (
              <div
                key={p.partyID}
                className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2 hover:bg-slate-50"
              >
                <div>
                  <div className="text-sm font-semibold text-slate-800">{p.name}</div>
                  <div className="text-xs text-slate-400">{p.oldestAge} days overdue</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold text-rose-600">{inr(p.pending)}</div>
                  <Link
                    to={`/payments/new?party=${encodeURIComponent(p.partyID)}`}
                    className="text-xs font-semibold text-brand hover:underline"
                  >
                    Pay
                  </Link>
                </div>
              </div>
            ))}
            {!overdueParties.length && (
              <p className="py-6 text-center text-sm text-slate-400">No overdue accounts</p>
            )}
          </div>
        </Card>

        {/* Short Payments */}
        <Card>
          <div className="mb-3">
            <Text className="font-semibold text-slate-700">Short Payments</Text>
            <Text className="text-xs text-slate-400">
              Paid something but less than bill — follow-up needed
            </Text>
          </div>
          <div className="space-y-2">
            {shortPayments.map((s) => (
              <div
                key={s.invoiceNo}
                className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2 hover:bg-slate-50"
              >
                <div>
                  <div className="text-sm font-semibold text-slate-800">{s.partyName}</div>
                  <div className="text-xs text-slate-400 font-mono">{s.invoiceNo}</div>
                </div>
                <div className="text-right text-sm">
                  <div className="text-slate-500">
                    {inr(s.paid)} / {inr(s.bill)}
                  </div>
                  <div className="font-bold text-amber-600">Short {inr(s.pending)}</div>
                </div>
              </div>
            ))}
            {!shortPayments.length && (
              <p className="py-6 text-center text-sm text-slate-400">No short payments</p>
            )}
          </div>
        </Card>
      </div>

      {/* Bills Due Today */}
      <Card>
        <div className="mb-3 flex items-center justify-between">
          <div>
            <Text className="font-semibold text-slate-700">Bills Due Today</Text>
            <Text className="text-xs text-slate-400">{billsDueToday.length} invoices</Text>
          </div>
          <Link to="/invoices" className="text-xs font-semibold text-brand hover:underline">
            All invoices
          </Link>
        </div>
        {billsDueToday.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase text-slate-500">
                <tr>
                  <th className="pb-2 pr-3">Invoice</th>
                  <th className="pb-2 pr-3">Party</th>
                  <th className="pb-2 text-right">Pending</th>
                </tr>
              </thead>
              <tbody>
                {billsDueToday.map((b) => (
                  <tr key={b.invoiceNo} className="border-t border-slate-100">
                    <td className="py-2 pr-3 font-mono text-xs font-semibold">{b.invoiceNo}</td>
                    <td className="py-2 pr-3">{b.partyName}</td>
                    <td className="py-2 text-right font-semibold text-rose-600">
                      {inr(b.pending)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="py-4 text-center text-sm text-slate-400">No bills due today</p>
        )}
      </Card>
    </div>
  )
}
