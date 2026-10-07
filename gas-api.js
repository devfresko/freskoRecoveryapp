// ============================================================
// gas-api.js — JSONP bridge to the Fresko Apps Script backend
// ============================================================
// This file polyfills `google.script.run` so that every existing
// `google.script.run.withSuccessHandler(...).withFailureHandler(...).xxx(args)`
// call already written in Index.html keeps working unchanged — even though
// this page is now hosted on Vercel (a different origin) instead of
// inside Apps Script's own sandboxed iframe.
//
// How it works: instead of the real google.script.run RPC channel (which only
// exists when a page is served BY Apps Script), every call is translated into
// a CORS-free JSONP request: a <script src="...&callback=cbXXX"> tag pointed
// at the Apps Script doGet API (see Code.gs → API_FUNCTIONS / doGet).
//
// IMPORTANT: update GAS_API_URL below to match your deployed Apps Script
// Web App URL (Sheet menu → "Payment Follow-up" → "Show API URL (for app.js)").
// ============================================================

// GAS_API_URL removed: the browser now calls /api/rpc (Vercel). The Apps Script URL lives only in the GAS_URL env var.

(function () {
  var _cbIdx = 0;
  var JSONP_TIMEOUT_MS = 45000;
  // Keep each JSONP request's query string comfortably under safe URL-length
  // limits. Only matters for calls with big array payloads (bulk upload).
  var MAX_ARGS_JSON_LEN = 6000;

  // Auto-retry is ONLY safe for read-only / idempotent calls. Retrying a write such
  // as recordPayment / createInvoice / saveFollowUp / sendWhatsApp* after a timeout can
  // execute it twice on the server (duplicate payment, duplicate message).
  var RETRY_SAFE = {
    loginUser:1, getAllData:1, getRetailData:1, checkLastUpdate:1, getAnalytics:1, getAppUrl:1,
    bustAllCaches:1, getRetailCustomersWithPending:1, getRetailEntriesForCustomer:1,
    getRetailOutstandingSummary:1, getRetailCustomers:1, previewRecalcPartyInvoices:1,
    checkRetailDuplicates:1,
    commitRetailData:1,      // duplicates skipped server-side
    bulkUploadInvoices:1     // duplicate invoice nos skipped server-side
  };

  // Same-origin POST to Vercel /api/rpc. The server adds the secret and talks to
  // Apps Script, so no secret or script.google.com URL ever reaches the browser.
  // (Function name kept as _rawJsonpCall so the chunk helpers below stay unchanged.)
  function _rawJsonpCall(fnName, args, onSuccess, onFailure, _attempt) {
    var attempt = _attempt || 1;
    var maxAttempts = 3;
    var ctl = new AbortController();
    var timeoutId = setTimeout(function () { ctl.abort(); }, JSONP_TIMEOUT_MS);

    function fail(err) {
      clearTimeout(timeoutId);
      if (attempt < maxAttempts && RETRY_SAFE[fnName]) {
        setTimeout(function () {
          _rawJsonpCall(fnName, args, onSuccess, onFailure, attempt + 1);
        }, 600 * attempt);
        return;
      }
      if (!RETRY_SAFE[fnName] && err && err.message) {
        err.message += ' — Pehle check kar lo ki entry save hui ya nahi (Refresh dabao), phir hi dobara karo.';
      }
      if (onFailure) onFailure(err);
    }

    fetch('/api/rpc', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fn: fnName, args: args || [] }),
      cache: 'no-store',
      signal: ctl.signal
    }).then(function (res) {
      return res.text().then(function (text) {
        var data;
        try { data = JSON.parse(text); }
        catch (e) { throw new Error('Server returned a non-JSON response (HTTP ' + res.status + ')'); }
        return data;
      });
    }).then(function (data) {
      clearTimeout(timeoutId);
      if (onSuccess) onSuccess(data);
    }).catch(function (e) {
      fail({ message: (e && e.name === 'AbortError')
        ? 'Request timed out (try ' + attempt + '/' + maxAttempts + '). Check connection.'
        : ((e && e.message) || 'Network error while reaching the server.') });
    });
  }

  // bulkUploadInvoices(rows, batchLabel, userName) can carry a large `rows`
  // array (CSV/XLSX import). A single JSONP GET has a practical URL-length
  // ceiling, so this splits large uploads into sequential chunked calls and
  // merges the results back into the single result shape the app expects:
  // { success, rowsAdded, skipped, batch, msg, errors }.
  // Rows per chunk — 10 rows keeps URL under 7500 chars (GAS safe limit)
  var ROWS_PER_CHUNK = 10;

  function _chunkedBulkUpload(args, onSuccess, onFailure) {
    var rows      = args[0] || [];
    var batchLabel = args[1];
    var userName  = args[2];
    var total     = rows.length;

    // Split into fixed chunks of ROWS_PER_CHUNK
    var chunks = [];
    for (var ci = 0; ci < rows.length; ci += ROWS_PER_CHUNK) {
      chunks.push(rows.slice(ci, ci + ROWS_PER_CHUNK));
    }
    if (!chunks.length) chunks.push([]);

    var merged = { success: true, rowsAdded: 0, skipped: 0, batch: batchLabel, msg: '', errors: [] };
    var i = 0;

    function next() {
      if (i >= chunks.length) {
        merged.msg = merged.rowsAdded + ' invoices added' +
          (merged.skipped > 0 ? ', ' + merged.skipped + ' skipped.' : '.');
        onSuccess(merged);
        return;
      }

      // Fire progress callback so UI can update counter
      if (typeof window.__uploadProgress === 'function') {
        window.__uploadProgress(merged.rowsAdded, total, i, chunks.length);
      }

      _rawJsonpCall('bulkUploadInvoices', [chunks[i], batchLabel, userName], function (res) {
        if (!res || res.success === false) {
          onFailure(res || { message: 'Upload failed on batch ' + (i + 1) + ' of ' + chunks.length });
          return;
        }
        merged.rowsAdded += res.rowsAdded || 0;
        merged.skipped   += res.skipped   || 0;
        if (res.errors && res.errors.length) {
          merged.errors = merged.errors.concat(res.errors).slice(0, 10);
        }
        i++;
        next();
      }, onFailure);
    }
    next();
  }

  // Retail PDF rows can be large — chunk checkRetailDuplicates + commitRetailData
  var RETAIL_ROWS_PER_CHUNK = 8;

  function _chunkedRetailCheck(args, onSuccess, onFailure) {
    var rows = args[0] || [];
    var dateRange = args[1];
    var fileName = args[2];
    if (!rows.length) {
      onSuccess({
        success: true, newRows: [], dupRows: [],
        dateRange: dateRange, pdfFilename: fileName || 'RETAIL SALE REGISTER',
        summary: { totalParsed: 0, newCount: 0, dupCount: 0, totalQty: 0, totalAmount: 0 }
      });
      return;
    }
    var chunks = [];
    for (var ci = 0; ci < rows.length; ci += RETAIL_ROWS_PER_CHUNK) {
      chunks.push(rows.slice(ci, ci + RETAIL_ROWS_PER_CHUNK));
    }
    var merged = {
      success: true, newRows: [], dupRows: [],
      dateRange: dateRange, pdfFilename: fileName || 'RETAIL SALE REGISTER',
      userEmail: '',
      summary: { totalParsed: rows.length, newCount: 0, dupCount: 0, totalQty: 0, totalAmount: 0 }
    };
    var i = 0;
    function next() {
      if (i >= chunks.length) {
        onSuccess(merged);
        return;
      }
      _rawJsonpCall('checkRetailDuplicates', [chunks[i], dateRange, fileName], function (res) {
        if (!res || res.success === false) {
          onFailure(res || { message: 'Duplicate check failed on batch ' + (i + 1) });
          return;
        }
        if (res.newRows) merged.newRows = merged.newRows.concat(res.newRows);
        if (res.dupRows) merged.dupRows = merged.dupRows.concat(res.dupRows);
        if (res.userEmail) merged.userEmail = res.userEmail;
        if (res.summary) {
          merged.summary.newCount += res.summary.newCount || 0;
          merged.summary.dupCount += res.summary.dupCount || 0;
          merged.summary.totalQty += res.summary.totalQty || 0;
          merged.summary.totalAmount += res.summary.totalAmount || 0;
        }
        i++;
        next();
      }, onFailure);
    }
    next();
  }

  // ---- Retail commit: slim rows + size-based chunks ----
  // Server (commitRetailData) only reads Sale_Date, Customer_Name, Qty, Amount
  // (+ dateRange, which falls back to meta.dateRange). Sending only those keeps
  // each row ~4x smaller, so one JSONP call carries ~40-50 rows instead of 8.
  var RETAIL_MAX_ENC_LEN = 6500; // max encoded `args` length per request

  function _slimRetailRow(r, dr) {
    var o = {
      Sale_Date: r.Sale_Date,
      Customer_Name: r.Customer_Name || r.customer || '',
      Qty: (r.Qty != null ? r.Qty : r.Qty_Summary),
      Amount: (r.Amount != null ? r.Amount : r.Total_Amount)
    };
    if (r.dateRange && r.dateRange !== dr) o.dateRange = r.dateRange;
    return o;
  }

  function _chunkByEncodedLen(rows, maxLen) {
    var chunks = [], cur = [], len = 2;
    for (var k = 0; k < rows.length; k++) {
      var l = encodeURIComponent(JSON.stringify(rows[k])).length + 3; // +3 = encoded comma
      if (cur.length && len + l > maxLen) { chunks.push(cur); cur = []; len = 2; }
      cur.push(rows[k]); len += l;
    }
    if (cur.length) chunks.push(cur);
    return chunks;
  }

  function _chunkedRetailCommit(args, onSuccess, onFailure) {
    var rows = args[0] || [];
    var meta = args[1] || {};
    if (!rows.length) {
      onSuccess({ success: true, written: 0, skipped: meta.dupCount || 0 });
      return;
    }
    var slim = rows.map(function (r) { return _slimRetailRow(r, meta.dateRange); });
    var metaLen = encodeURIComponent(JSON.stringify(meta)).length;
    var chunks = _chunkByEncodedLen(slim, Math.max(2500, RETAIL_MAX_ENC_LEN - metaLen));
    var merged = { success: true, written: 0, skipped: meta.dupCount || 0 };
    var i = 0;
    function next() {
      if (i >= chunks.length) {
        onSuccess(merged);
        return;
      }
      if (typeof window.__chunkProgress === 'function') {
        window.__chunkProgress('Batch ' + (i + 1) + ' / ' + chunks.length + ' — ' + merged.written + ' rows saved');
      }
      // Only pass full meta on first chunk (log once); later chunks get minimal meta
      var chunkMeta = (i === 0) ? meta : {
        pdfFilename: meta.pdfFilename,
        dateRange: meta.dateRange,
        totalParsed: 0, totalQty: 0, totalAmount: 0, dupCount: 0,
        _skipLog: true
      };
      _rawJsonpCall('commitRetailData', [chunks[i], chunkMeta], function (res) {
        if (!res || res.success === false) {
          onFailure(res || { message: 'Retail save failed on batch ' + (i + 1) + ' of ' + chunks.length });
          return;
        }
        merged.written += res.written || 0;
        i++;
        next();
      }, onFailure);
    }
    next();
  }

  function _jsonpCall(fnName, args, onSuccess, onFailure) {
    if (fnName === 'bulkUploadInvoices') {
      _chunkedBulkUpload(args, onSuccess, onFailure);
    } else if (fnName === 'checkRetailDuplicates') {
      var argsJson = JSON.stringify(args || []);
      if (argsJson.length > MAX_ARGS_JSON_LEN) {
        _chunkedRetailCheck(args, onSuccess, onFailure);
      } else {
        _rawJsonpCall(fnName, args, onSuccess, onFailure);
      }
    } else if (fnName === 'commitRetailData') {
      // always go through the slimming/size-aware chunker (empty rows -> plain call)
      if ((args && args[0] && args[0].length)) {
        _chunkedRetailCommit(args, onSuccess, onFailure);
      } else {
        _rawJsonpCall(fnName, args, onSuccess, onFailure);
      }
    } else {
      _rawJsonpCall(fnName, args, onSuccess, onFailure);
    }
  }

  function createRunProxy(successHandler, failureHandler) {
    return new Proxy({}, {
      get: function (target, prop) {
        if (prop === 'withSuccessHandler') {
          return function (cb) { return createRunProxy(cb, failureHandler); };
        }
        if (prop === 'withFailureHandler') {
          return function (cb) { return createRunProxy(successHandler, cb); };
        }
        if (prop === 'withUserObject') {
          // No-op: not needed for JSONP calls, kept only for API-shape compatibility.
          return function () { return createRunProxy(successHandler, failureHandler); };
        }
        // Any other property access is treated as the remote function name.
        return function () {
          var args = Array.prototype.slice.call(arguments);
          _jsonpCall(prop, args, function (result) {
            if (successHandler) successHandler(result);
          }, function (err) {
            if (failureHandler) failureHandler(err);
          });
        };
      }
    });
  }

  window.google = window.google || {};
  window.google.script = window.google.script || {};
  window.google.script.run = createRunProxy(null, null);
})();
