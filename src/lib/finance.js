/** Shared finance helpers — pure client-side, no network */

export function parseIST(str) {
  if (!str) return null
  if (str instanceof Date) return isNaN(str.getTime()) ? null : str
  const raw = String(str).trim()
  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (iso) return new Date(+iso[1], +iso[2] - 1, +iso[3])
  const p = raw.split(' ')[0].split(/[\/\-.]/)
  if (p.length >= 3) {
    if (p[0].length === 4) return new Date(+p[0], +p[1] - 1, +p[2])
    return new Date(+p[2], +p[1] - 1, +p[0])
  }
  const d = new Date(raw)
  return isNaN(d.getTime()) ? null : d
}

export function fmtLocalDate(d = new Date()) {
  const dt = d instanceof Date ? d : parseIST(d)
  if (!dt) return ''
  return (
    String(dt.getDate()).padStart(2, '0') +
    '/' +
    String(dt.getMonth() + 1).padStart(2, '0') +
    '/' +
    dt.getFullYear()
  )
}

export function localDateISO(d = new Date()) {
  return (
    d.getFullYear() +
    '-' +
    String(d.getMonth() + 1).padStart(2, '0') +
    '-' +
    String(d.getDate()).padStart(2, '0')
  )
}

export function invoicePending(inv) {
  if (!inv) return 0
  if (inv.status === 'Paid' || inv.status === 'Written-Off') return 0
  const bill = inv.billValue || inv.netAmount || 0
  const paid = inv.paidAmount || 0
  const wo = inv.writeOff || 0
  return Math.max(0, bill - paid - wo)
}

export function isInvoiceOpen(inv) {
  return invoicePending(inv) > 0.01
}

/** FIFO: oldest due/invoice first */
export function fifoAllocate(openInvoices, amount) {
  let remaining = Number(amount) || 0
  const sorted = [...openInvoices].sort((a, b) => {
    const da = parseIST(a.dueDate || a.invoiceDate) || new Date(0)
    const db = parseIST(b.dueDate || b.invoiceDate) || new Date(0)
    return da - db
  })
  const allocations = []
  for (const inv of sorted) {
    if (remaining <= 0) break
    const pend = invoicePending(inv)
    if (pend <= 0) continue
    const apply = Math.min(remaining, pend)
    allocations.push({
      invoiceID: inv.invoiceID,
      invoiceNo: inv.invoiceNo,
      amount: Math.round(apply * 100) / 100,
      pendingBefore: pend,
      pendingAfter: Math.round((pend - apply) * 100) / 100,
    })
    remaining = Math.round((remaining - apply) * 100) / 100
  }
  return {
    allocations,
    unallocated: Math.max(0, remaining),
    totalApplied: Math.round(((Number(amount) || 0) - Math.max(0, remaining)) * 100) / 100,
  }
}
