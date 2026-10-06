import { Card, Metric, Text, Flex, Grid, BarChart } from '@tremor/react'
import { inr } from '../../lib/utils'

export function SupplyMetrics({ stats, invoices = [] }) {
  const outstanding = stats?.totalOutstanding ?? 0
  const overdue = stats?.totalOverdue ?? 0
  const dueToday = stats?.totalDueToday ?? 0
  const followupsToday = stats?.followupsToday ?? 0

  // Age buckets
  const buckets = { '1-7 Days': 0, '8-15 Days': 0, '16-30 Days': 0, '30+ Days': 0 }
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  invoices.forEach((inv) => {
    const paid = inv.paidAmount || 0
    const wo = inv.writeOff || 0
    const pending = (inv.billValue || inv.netAmount || 0) - paid - wo
    if (pending <= 0 || inv.status === 'Paid' || inv.status === 'Written-Off') return
    const due = inv.dueDate ? parseDate(inv.dueDate) : null
    if (!due) return
    const age = Math.floor((today - due) / 86400000)
    if (age < 1) return
    if (age <= 7) buckets['1-7 Days'] += pending
    else if (age <= 15) buckets['8-15 Days'] += pending
    else if (age <= 30) buckets['16-30 Days'] += pending
    else buckets['30+ Days'] += pending
  })

  const ageData = Object.entries(buckets).map(([name, value]) => ({
    name,
    Amount: Math.round(value),
  }))

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
          <Metric className="text-emerald-600">{followupsToday}</Metric>
        </Card>
      </Grid>

      {/* Aging Chart */}
      <Card>
        <Flex>
          <div>
            <Text className="font-semibold text-slate-700">Overdue by Age</Text>
            <Text className="text-xs text-slate-400">Outstanding amount by days past due</Text>
          </div>
        </Flex>
        <BarChart
          className="mt-4 h-64"
          data={ageData}
          index="name"
          categories={['Amount']}
          colors={['rose']}
          valueFormatter={(v) => inr(v)}
          yAxisWidth={70}
          showAnimation
        />
      </Card>
    </div>
  )
}

function parseDate(str) {
  if (!str) return null
  const s = String(str).split(' ')[0]
  if (s.includes('/')) {
    const p = s.split('/')
    if (p.length >= 3) return new Date(+p[2], +p[1] - 1, +p[0])
  }
  const d = new Date(str)
  return isNaN(d.getTime()) ? null : d
}
