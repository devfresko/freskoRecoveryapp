import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { gas } from '../lib/gasClient'
import { qk } from '../api/queries'

export function useLogFollowUp(userName) {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (payload) => gas.saveFollowUp(payload, userName),

    onMutate: async (payload) => {
      await qc.cancelQueries({ queryKey: qk.all(userName) })
      const prev = qc.getQueryData(qk.all(userName))

      const optimistic = {
        followUpID: `tmp-${Date.now()}`,
        ...payload,
        promiseKept: 'Pending',
        loggedBy: userName,
        loggedOn: payload.datetime,
        _optimistic: true,
      }

      qc.setQueryData(qk.all(userName), (old) => {
        if (!old) return old
        return { ...old, followups: [optimistic, ...(old.followups || [])] }
      })

      toast.success('Follow-up saved', { description: payload.partyName || 'Logged' })
      return { prev }
    },

    onError: (err, _payload, ctx) => {
      if (ctx?.prev) qc.setQueryData(qk.all(userName), ctx.prev)
      toast.error('Save failed', { description: err?.message || 'Rolled back' })
    },

    onSuccess: (res, _payload, ctx) => {
      if (!res?.success) {
        if (ctx?.prev) qc.setQueryData(qk.all(userName), ctx.prev)
        toast.error('Save failed', { description: res?.error || 'Server rejected' })
        return
      }
      qc.setQueryData(qk.all(userName), (old) => {
        if (!old) return old
        return {
          ...old,
          followups: (old.followups || []).map((f) =>
            f.followUpID?.startsWith('tmp-') && res.followUpID
              ? { ...f, followUpID: res.followUpID, _optimistic: false }
              : f
          ),
        }
      })
    },
  })
}
