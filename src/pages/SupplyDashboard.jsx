import { useUser } from '@clerk/clerk-react'
import { useAppData } from '../hooks/useAppData'
import { SupplyMetrics } from '../components/dashboard/SupplyMetrics'

export default function SupplyDashboard() {
  const { user } = useUser()
  const userName = user?.fullName || user?.primaryEmailAddress?.emailAddress || ''
  const { data, isLoading, isError, error } = useAppData(userName)

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 animate-pulse rounded bg-slate-200" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-xl bg-slate-200" />
          ))}
        </div>
        <div className="h-72 animate-pulse rounded-xl bg-slate-200" />
      </div>
    )
  }

  if (isError) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-700">
        Failed to load data: {error?.message || 'Unknown error'}
        <p className="mt-2 text-sm text-red-500">
          Check VITE_GAS_API_URL and Apps Script deployment.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Supply Dashboard</h1>
        <p className="text-sm text-slate-500">Payment follow-up overview</p>
      </div>
      <SupplyMetrics stats={data?.stats} invoices={data?.invoices} />
    </div>
  )
}
