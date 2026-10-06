import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { gas } from '../lib/gasClient'
import { qk } from '../api/queries'
import { invoicePending } from '../lib/finance'

/**
 * Optimistic Record Payment
 * - UI updates invoices + payments cache instantly
 * - Background GAS recordPayment
 * - Rollback on failure
 */
export function useRecordPayment(userName) {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (payload) => gas.recordPayment(payload, userName),

    onMutate: async (payload) => {
      await qc.cancelQueries({ queryKey: qk.all(userName) })
      const prev = qc.getQueryData(qk.all(userName))

      const tempId = `tmp-pay-${Date.now()}`
      const appliedMap = {}
      ;(payload.invoices || []).forEach((i) => {
        appliedMap[i.invoiceNo] = (appliedMap[i.invoiceNo] || 0) + (Number(i.amount) || 0)
      })

      qc.setQueryData(qk.all(userName), (old) => {
        if (!old) return old
        const invoices = (old.invoices || []).map((inv) => {
          const add = appliedMap[inv.invoiceNo]
          if (!add) return inv
          const newPaid = (inv.paidAmount || 0) + add
          const pend = invoicePending({ ...inv, paidAmount: newPaid })
          return {
            ...inv,
            paidAmount: newPaid,
            pendingAmount: pend,
            status: pend <= 0.5 ? 'Paid' : 'PartPaid',
          }
        })
        const payment = {
          paymentID: tempId,
          partyID: payload.partyID,
          partyCode: payload.partyCode,
          partyName: payload.partyName,
          paymentDate: payload.paymentDate,
          amount: payload.amount,
          mode: payload.mode,
          refNo: payload.refNo || '',
          appliedTo: (payload.invoices || []).map((i) => i.invoiceNo).join(', '),
          appliedAmt: (payload.invoices || []).reduce((s, i) => s + (Number(i.amount) || 0), 0),
          paymentType: 'Invoice',
          _optimistic: true,
        }
        return {
          ...old,
          invoices,
          payments: [payment, ...(old.payments || [])],
        }
      })

      toast.success('Payment recorded', {
        description: `${payload.partyName || 'Party'} · ₹${Number(payload.amount || 0).toLocaleString('en-IN')}`,
      })
      return { prev, tempId }
    },

    onError: (err, _payload, ctx) => {
      if (ctx?.prev) qc.setQueryData(qk.all(userName), ctx.prev)
      toast.error('Payment failed', { description: err?.message || 'Rolled back' })
    },

    onSuccess: (res, _payload, ctx) => {
      if (!res?.success) {
        if (ctx?.prev) qc.setQueryData(qk.all(userName), ctx.prev)
        toast.error('Payment failed', { description: res?.error || 'Server rejected' })
        return
      }
      qc.setQueryData(qk.all(userName), (old) => {
        if (!old) return old
        return {
          ...old,
          payments: (old.payments || []).map((p) =>
            p.paymentID === ctx?.tempId
              ? { ...p, paymentID: res.paymentID || p.paymentID, _optimistic: false }
              : p
          ),
        }
      })
    },
  })
}
