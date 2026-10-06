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
          <Link to="/retail-sales" className="rounded-lg bg-slate-100 px-3 py-2 text-sm font-semibold">
            Sale Register
          </Link>
          <Link to="/retail-pay" className="rounded-lg bg-violet-600 px-3 py-2 text-sm font-semibold text-white">
            Record Payment
          </Link>
        </div>
      </div>

      <Grid numItemsMd={2} numItemsLg={3} className="gap-4">
        <Card decoration="top" decorationColor="violet">
          <Text>Retail Outstanding</Text>
          <Metric>{inr(ro.totalOutstanding || top.reduce((s, t) => s + t.value, 0))}</Metric>
        </Card>
        <Card decoration="top" decorationColor="amber">
          <Text>Customers with dues</Text>
          <Metric>{ro.customerCount ?? top.length}</Metric>
        </Card>
        <Card decoration="top" decorationColor="emerald">
          <Text>Register rows</Text>
          <Metric>{(retail?.rows || []).length}</Metric>
        </Card>
      </Grid>

      <Card>
        <Text>Top pending customers</Text>
        <BarList data={top} className="mt-4" valueFormatter={(v) => inr(v)} color="violet" />
      </Card>
    </div>
  )
}
