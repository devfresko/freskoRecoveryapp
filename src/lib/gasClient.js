const GAS_URL = import.meta.env.VITE_GAS_API_URL

function jsonp(fn, args = [], attempt = 1) {
  return new Promise((resolve, reject) => {
    if (!GAS_URL) {
      reject(new Error('VITE_GAS_API_URL missing in .env'))
      return
    }
    const cb = `__gascb_${Date.now()}_${Math.random().toString(36).slice(2)}`
    let script
    const timeout = setTimeout(() => {
      cleanup()
      if (attempt < 3) {
        jsonp(fn, args, attempt + 1).then(resolve, reject)
      } else {
        reject(new Error('Request timed out'))
      }
    }, 45000)

    function cleanup() {
      clearTimeout(timeout)
      try { delete window[cb] } catch { window[cb] = undefined }
      if (script?.parentNode) script.parentNode.removeChild(script)
    }

    window[cb] = (result) => {
      cleanup()
      resolve(result)
    }

    script = document.createElement('script')
    const url =
      `${GAS_URL}?callback=${encodeURIComponent(cb)}` +
      `&fn=${encodeURIComponent(fn)}` +
      `&args=${encodeURIComponent(JSON.stringify(args))}`
    if (url.length > 18000) {
      cleanup()
      reject(new Error('Request too large — use smaller batches'))
      return
    }
    script.src = url
    script.onerror = () => {
      cleanup()
      if (attempt < 3) {
        setTimeout(() => jsonp(fn, args, attempt + 1).then(resolve, reject), 600 * attempt)
      } else {
        reject(new Error('Network error while reaching the server.'))
      }
    }
    document.head.appendChild(script)
  })
}

export const gas = {
  getAllData: (userName, sinceTs = '0') => jsonp('getAllData', [userName, sinceTs]),
  bustAllCaches: () => jsonp('bustAllCaches', []),
  saveFollowUp: (data, userName) => jsonp('saveFollowUp', [data, userName]),
  recordPayment: (data, userName) => jsonp('recordPayment', [data, userName]),
  bulkUploadInvoices: (rows, batchLabel, userName) =>
    jsonp('bulkUploadInvoices', [rows, batchLabel, userName]),
  getRetailData: (force = false) => jsonp('getRetailData', [force]),
  commitRetailData: (rows, meta) => jsonp('commitRetailData', [rows, meta]),
  recordRetailPayment: (data, userName) => jsonp('recordRetailPayment', [data, userName]),
  getRetailCustomers: () => jsonp('getRetailCustomers', []),
  checkLastUpdate: () => jsonp('checkLastUpdate', []),
}
