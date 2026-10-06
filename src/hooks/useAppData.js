import { useQuery } from '@tanstack/react-query'
import { gas } from '../lib/gasClient'
import { qk } from '../api/queries'

export function useAppData(userName) {
  return useQuery({
    queryKey: qk.all(userName || 'anon'),
    queryFn: async () => {
      const res = await gas.getAllData(userName || '', '0')
      if (!res?.success) throw new Error(res?.error || 'Load failed')
      return res
    },
    enabled: !!userName,
    staleTime: 5 * 60 * 1000,
    placeholderData: (prev) => prev,
  })
}

export function useStats(userName) {
  const q = useAppData(userName)
  return { ...q, data: q.data?.stats ?? null }
}

export function useParties(userName) {
  const q = useAppData(userName)
  return { ...q, data: q.data?.parties ?? [] }
}

export function useInvoices(userName) {
  const q = useAppData(userName)
  return { ...q, data: q.data?.invoices ?? [] }
}

export function useFollowups(userName) {
  const q = useAppData(userName)
  return { ...q, data: q.data?.followups ?? [] }
}

export function usePayments(userName) {
  const q = useAppData(userName)
  return { ...q, data: q.data?.payments ?? [] }
}

export function useRetailData() {
  return useQuery({
    queryKey: qk.retail,
    queryFn: async () => {
      const res = await gas.getRetailData(true)
      if (!res?.success) throw new Error(res?.error || 'Retail load failed')
      return res
    },
    staleTime: 2 * 60 * 1000,
  })
}
