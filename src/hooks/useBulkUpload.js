import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { gas } from '../lib/gasClient'
import { qk } from '../api/queries'

const CHUNK = 10

export function useBulkUpload(userName) {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async ({ rows, batchLabel }) => {
      let rowsAdded = 0
      let skipped = 0
      const errors = []
      for (let i = 0; i < rows.length; i += CHUNK) {
        const chunk = rows.slice(i, i + CHUNK)
        const res = await gas.bulkUploadInvoices(chunk, batchLabel, userName)
        if (!res?.success) throw new Error(res?.error || `Batch ${i / CHUNK + 1} failed`)
        rowsAdded += res.rowsAdded || 0
        skipped += res.skipped || 0
        if (res.errors?.length) errors.push(...res.errors)
      }
      return { success: true, rowsAdded, skipped, errors }
    },
    onSuccess: (res) => {
      toast.success('Import complete', {
        description: `${res.rowsAdded} added` + (res.skipped ? `, ${res.skipped} skipped` : ''),
      })
      qc.invalidateQueries({ queryKey: qk.all(userName) })
    },
    onError: (err) => {
      toast.error('Import failed', { description: err?.message })
    },
  })
}
