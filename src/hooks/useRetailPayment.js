import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { gas } from '../lib/gasClient'
import { qk } from '../api/queries'

export function useRetailPayment(userName) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data) => gas.recordRetailPayment(data, userName),
    onMutate: async (data) => {
      toast.success('Retail payment saving…', { description: data.customer })
    },
    onSuccess: (res) => {
      if (!res?.success) {
        toast.error('Failed', { description: res?.error })
        return
      }
      toast.success(res.msg || 'Payment recorded')
      qc.invalidateQueries({ queryKey: qk.retail })
      qc.invalidateQueries({ queryKey: qk.all(userName) })
    },
    onError: (e) => toast.error(e?.message || 'Network error'),
  })
}
