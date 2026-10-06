import { useState } from 'react'
import Papa from 'papaparse'
import { useUser } from '@clerk/clerk-react'
import { useBulkUpload } from '../hooks/useBulkUpload'
import { toast } from 'sonner'

export default function ImportPage() {
  const { user } = useUser()
  const userName = user?.fullName || user?.primaryEmailAddress?.emailAddress || ''
  const upload = useBulkUpload(userName)
  const [rows, setRows] = useState([])
  const [fileName, setFileName] = useState('')

  function onFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setFileName(file.name)
    if (!file.name.toLowerCase().endsWith('.csv')) {
      toast.error('Sirf CSV support hai — PDF ke liye vanilla app use karein')
      return
    }
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        const mapped = (result.data || [])
          .map((r) => normalizeRow(r))
          .filter((r) => r.invoiceNo && r.partyName)
        setRows(mapped)
        toast.message(`${mapped.length} rows parsed`)
      },
      error: (err) => toast.error(err.message),
    })
  }

  function onUpload() {
    if (!rows.length) return
    upload.mutate({
      rows,
      batchLabel: fileName || `CSV-${new Date().toISOString().slice(0, 10)}`,
    })
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Bulk Import</h1>
        <p className="text-sm text-slate-500">
          CSV parse · chunked upload to Google Sheet
        </p>
      </div>

      <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center">
        <input type="file" accept=".csv,text/csv" onChange={onFile} className="text-sm" />
        <p className="mt-2 text-xs text-slate-400">
          Headers: invoiceNo, invoiceDate, partyName, billValue, dueDate, slabPct
        </p>
      </div>

      {rows.length > 0 && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-semibold text-slate-700">
              {rows.length} rows ready · {fileName}
            </p>
            <button
              type="button"
              onClick={onUpload}
              disabled={upload.isPending}
              className="rounded-lg bg-brand px-4 py-2 text-sm font-bold text-white hover:bg-brand-dark disabled:opacity-50"
            >
              {upload.isPending ? 'Uploading…' : 'Confirm & Upload'}
            </button>
          </div>
          <div className="max-h-80 overflow-auto rounded-xl border border-slate-200 bg-white">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 bg-slate-50">
                <tr>
                  <th className="px-3 py-2">Invoice</th>
                  <th className="px-3 py-2">Party</th>
                  <th className="px-3 py-2">Date</th>
                  <th className="px-3 py-2 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 100).map((r, i) => (
                  <tr key={i} className="border-t border-slate-100">
                    <td className="px-3 py-1.5 font-mono">{r.invoiceNo}</td>
                    <td className="px-3 py-1.5">{r.partyName}</td>
                    <td className="px-3 py-1.5">{r.invoiceDate}</td>
                    <td className="px-3 py-1.5 text-right">{r.billValue}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}

function normalizeRow(r) {
  const get = (...keys) => {
    for (const k of keys) {
      const found = Object.keys(r).find(
        (h) => h.toLowerCase().replace(/\s/g, '') === k.toLowerCase()
      )
      if (found && r[found] != null && String(r[found]).trim()) return String(r[found]).trim()
    }
    return ''
  }
  return {
    invoiceNo: get('invoiceno', 'invoice', 'billno', 'invno'),
    invoiceDate: get('invoicedate', 'date', 'billdate'),
    partyName: get('partyname', 'party', 'customer', 'name'),
    billValue:
      parseFloat(String(get('billvalue', 'amount', 'netamount', 'value')).replace(/[^\d.-]/g, '')) ||
      0,
    dueDate: get('duedate', 'due'),
    slabPct: get('slabpct', 'slab', 'discountslab') || '0',
    partyCode: get('partycode', 'code'),
  }
}
