import { Card, Metric, Text, Grid, BarList } from '@tremor/react'
import { useUser } from '@clerk/clerk-react'
import { useAppData, useRetailData } from '../hooks/useAppData'
import { inr } from '../lib/utils'
import { Link } from 'react-router-dom'
import { useMemo } from 'react'

export default function RetailDashboard() {
  const { user } = useUser()
  const userName = user?.fullName || user?.primaryEmailAddress?.emailAddress || ''
  const { data: app } = useAppData(userName)
  const { data: retail, isLoading } = useRetailData()
  const ro = app?.retailOutstanding || {}

  const top = useMemo(() => {
    const map = {}
    ;(retail?.rows || []).forEach((r) => {
      const n = r.customer || 'Unknown'
      map[n] = (map[n] || 0) + (Number(r.pending) || 0)
    })
    return Object.entries(map)
      .map(([name, value]) => ({ name, value: Math.round(value) }))
      .filter((x) => x.value > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, 8)
  }, [retail])

  if (isLoading) return <div className="h-40 animate-pulse rounded-xl bg-slate-200" />

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Retail Dashboard</h1>
          <p className="text-sm text-slate-500">Register + outstanding</p>
        </div>
        <div className="flex gap-2">
          <Link
            to="/retail-sales"
            className="rounded-lg bg-slate-100 px-3 py-2 text-sm font-semibold hover:bg-slate-200"
          >
            Sale Register
          </Link>
          <Link
            to="/retail-pay"
            className="rounded-lg bg-brand px-3 py-2 text-sm font-semibold text-white hover:bg-brand-dark"
          >
            Record Payment
          </Link>
        </div>
      </div>

      <Grid numItemsMd={2} numItemsLg={3} className="gap-4">
        <Card className="border-t-4 border-t-brand">
          <Text className="text-slate-500">Retail Outstanding</Text>
          <Metric className="text-brand">
            {inr(ro.totalOutstanding || top.reduce((s, t) => s + t.value, 0))}
          </Metric>
        </Card>
        <Card className="border-t-4 border-t-amber-500">
          <Text className="text-slate-500">Customers with dues</Text>
          <Metric className="text-amber-600">{ro.customerCount ?? top.length}</Metric>
        </Card>
        <Card className="border-t-4 border-t-emerald-500">
          <Text className="text-slate-500">Register rows</Text>
          <Metric className="text-emerald-600">{(retail?.rows || []).length}</Metric>
        </Card>
      </Grid>

      <Card>
        <Text className="font-semibold text-slate-700">Top pending customers</Text>
        <BarList data={top} className="mt-4" valueFormatter={(v) => inr(v)} color="teal" />
      </Card>
    </div>
  )
}
