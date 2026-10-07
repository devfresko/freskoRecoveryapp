// ============================================================
// api/_lib.js — shared logic (Firestore snapshot cache, GAS bridge, sync, RPC router)
// Underscore prefix = Vercel does NOT expose this file as an API endpoint.
// ============================================================
const __m = {};

// ───────────── firebase ─────────────
__m.firebase = (() => {
  const module = { exports: {} };
  // Firestore connection. The service account JSON lives ONLY in the Vercel
  // environment variable FIREBASE_SERVICE_ACCOUNT (raw JSON or base64 of it).
  // It must never be committed to git or placed in browser code.
  const admin = require('firebase-admin');

  function getDb() {
    if (!admin.apps.length) {
      const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
      if (!raw) throw new Error('FIREBASE_SERVICE_ACCOUNT env var is not set');
      const txt = raw.trim().startsWith('{') ? raw : Buffer.from(raw, 'base64').toString('utf8');
      const json = JSON.parse(txt);
      if (json.private_key) json.private_key = json.private_key.replace(/\\n/g, '\n');
      admin.initializeApp({ credential: admin.credential.cert(json) });
    }
    return admin.firestore();
  }
  module.exports = { getDb };

  return module.exports;
})();

// ───────────── gas ─────────────
__m.gas = (() => {
  const module = { exports: {} };
  // Server-to-server calls to the Apps Script web app (the system of record).
  async function callGas(fn, args, opts) {
    opts = opts || {};
    const base = process.env.GAS_URL;
    if (!base) throw new Error('GAS_URL env var is not set');
    const u = new URL(base);
    u.searchParams.set('fn', fn);
    u.searchParams.set('args', JSON.stringify(args || []));
    if (process.env.GAS_SECRET) u.searchParams.set('secret', process.env.GAS_SECRET);

    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), opts.timeoutMs || 55000);
    try {
      const res = await fetch(u.toString(), { redirect: 'follow', signal: ctl.signal });
      const text = await res.text();
      try { return JSON.parse(text); }
      catch (e) { throw new Error('Apps Script returned a non-JSON response (HTTP ' + res.status + ')'); }
    } catch (e) {
      if (e.name === 'AbortError') throw new Error('Apps Script request timed out');
      throw e;
    } finally { clearTimeout(timer); }
  }
  module.exports = { callGas };

  return module.exports;
})();

// ───────────── store ─────────────
__m.store = (() => {
  const module = { exports: {} };
  // Snapshot storage in Firestore.
  //   fresko_meta/snapshot : { version, chunks, lastUpdate, builtAt, bytes }
  //   fresko_meta/sync     : { dirty, dirtyAt, syncing, syncStartedAt, lastSyncAt, lastError }
  //   fresko_snap/{version}_{i} : { v, i, data(Bytes) }   (gzip(JSON) split in <=900KB pieces)
  const zlib = require('zlib');

  const CHUNK_BYTES = 900 * 1024;
  const LEASE_MS = 120000;           // a sync lease older than this is considered dead
  let _db = null;
  let _mem = { version: null, data: null };

  function db() { return _db || (_db = __m.firebase.getDb()); }
  function setDb(d) { _db = d; _mem = { version: null, data: null }; }
  const metaRef = (id) => db().collection('fresko_meta').doc(id);

  async function getMeta() {
    const s = await metaRef('snapshot').get();
    return s.exists ? s.data() : null;
  }

  async function getSyncState() {
    const s = await metaRef('sync').get();
    return s.exists ? s.data() : {};
  }

  function isBusy(s, now) {
    now = now || Date.now();
    const leaseAlive = s.syncing && (now - (s.syncStartedAt || 0) < LEASE_MS);
    return !!(s.dirty || leaseAlive);
  }

  async function markDirty() {
    await metaRef('sync').set({ dirty: true, dirtyAt: Date.now() }, { merge: true });
  }

  async function saveSnapshot(obj) {
    const gz = zlib.gzipSync(Buffer.from(JSON.stringify(obj), 'utf8'), { level: 6 });
    const version = String(Date.now());
    const n = Math.max(1, Math.ceil(gz.length / CHUNK_BYTES));
    const old = await getMeta();

    await Promise.all(Array.from({ length: n }, (_, i) =>
      db().collection('fresko_snap').doc(version + '_' + i).set({
        v: version, i: i, data: gz.subarray(i * CHUNK_BYTES, (i + 1) * CHUNK_BYTES)
      })));

    const meta = {
      version: version, chunks: n,
      lastUpdate: String((obj.all && obj.all.lastUpdate) || ''),
      builtAt: Date.now(), bytes: gz.length
    };
    await metaRef('snapshot').set(meta);          // atomic switch to the new version

    if (old && old.version && old.version !== version) {   // cleanup (best effort)
      await Promise.all(Array.from({ length: old.chunks || 0 }, (_, i) =>
        db().collection('fresko_snap').doc(old.version + '_' + i).delete().catch(() => {})));
    }
    _mem = { version: version, data: obj };
    return meta;
  }

  async function loadSnapshot(meta) {
    if (_mem.version === meta.version && _mem.data) return _mem.data;
    const refs = Array.from({ length: meta.chunks }, (_, i) =>
      db().collection('fresko_snap').doc(meta.version + '_' + i));
    const docs = await db().getAll(...refs);
    const parts = docs.map((d) => {
      if (!d.exists) throw new Error('Snapshot chunk missing');
      return Buffer.from(d.data().data);
    });
    const obj = JSON.parse(zlib.gunzipSync(Buffer.concat(parts)).toString('utf8'));
    _mem = { version: meta.version, data: obj };
    return obj;
  }

  module.exports = { db, setDb, metaRef, getMeta, getSyncState, isBusy, markDirty, saveSnapshot, loadSnapshot, LEASE_MS };

  return module.exports;
})();

// ───────────── sync ─────────────
__m.sync = (() => {
  const module = { exports: {} };
  // Rebuilds the Firestore snapshot from Apps Script (single getSnapshot call).
  // A Firestore-backed lease makes sure only one rebuild runs at a time; writes that
  // arrive during a rebuild set `dirty`, so exactly one more rebuild follows.
  const store = __m.store;
  const { callGas } = __m.gas;

  const MAX_LOOPS = 3;

  async function acquire() {
    const ref = store.metaRef('sync');
    return store.db().runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      const s = snap.exists ? snap.data() : {};
      const now = Date.now();
      if (s.syncing && now - (s.syncStartedAt || 0) < store.LEASE_MS) {
        tx.set(ref, { dirty: true }, { merge: true });      // queue a follow-up run
        return false;
      }
      tx.set(ref, { syncing: true, syncStartedAt: now, dirty: false }, { merge: true });
      return true;
    });
  }

  async function release() {            // returns true if another loop is needed
    const ref = store.metaRef('sync');
    return store.db().runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      const s = snap.exists ? snap.data() : {};
      if (s.dirty) { tx.set(ref, { dirty: false, syncStartedAt: Date.now() }, { merge: true }); return true; }
      tx.set(ref, { syncing: false, lastSyncAt: Date.now(), lastError: '' }, { merge: true });
      return false;
    });
  }

  async function runSync() {
    if (!(await acquire())) return { ran: false, queued: true };
    let loops = 0;
    try {
      for (;;) {
        loops++;
        const snap = await callGas('getSnapshot', [], { timeoutMs: 55000 });
        if (!snap || snap.success === false || !snap.all || snap.all.success === false) {
          throw new Error((snap && (snap.error || (snap.all && snap.all.error))) || 'getSnapshot failed');
        }
        await store.saveSnapshot({
          all: snap.all, retailData: snap.retailData, retailPending: snap.retailPending,
          retailCustomers: snap.retailCustomers, users: snap.users || {}
        });
        if (!(await release())) break;
        if (loops >= MAX_LOOPS) {      // still dirty: leave the flag set; self-heal kicks in on next read
          await store.metaRef('sync').set({ syncing: false, dirty: true }, { merge: true });
          break;
        }
      }
      return { ran: true, loops: loops };
    } catch (e) {
      await store.metaRef('sync').set({ syncing: false, lastError: String(e.message || e) }, { merge: true }).catch(() => {});
      throw e;
    }
  }

  module.exports = { runSync };

  return module.exports;
})();

// ───────────── rpc ─────────────
__m.rpc = (() => {
  const module = { exports: {} };
  // RPC router.
  //  - Snapshot reads  -> served from Firestore (fast). Falls back to live Apps Script on any problem.
  //  - Everything else -> passed through to Apps Script (system of record).
  //    After a write we mark the snapshot "dirty" and rebuild it in the background.
  const store = __m.store;
  const { callGas } = __m.gas;
  const { runSync } = __m.sync;

  let waitUntil = (p) => { p.catch(() => {}); };
  try { waitUntil = require('@vercel/functions').waitUntil || waitUntil; } catch (e) { /* local / tests */ }

  // Same whitelist as Code.gs API_FUNCTIONS (+ getSnapshot, used server-side only).
  const ALLOWED = new Set([
    'loginUser', 'getAllData', 'createParty', 'createInvoice', 'bulkUploadInvoices', 'writeOffInvoice',
    'closeInvoice', 'updateInvoice', 'updateFollowUp', 'recordPayment', 'updatePayment',
    'previewRecalcPartyInvoices', 'recalcPartyInvoices', 'saveFollowUp', 'updatePromiseKept', 'getAnalytics',
    'getAppUrl', 'checkLastUpdate', 'bustAllCaches', 'sendWhatsAppMessage', 'sendWhatsAppToParty',
    'getRetailData', 'checkRetailDuplicates', 'commitRetailData', 'getRetailCustomersWithPending',
    'getRetailEntriesForCustomer', 'recordRetailPayment', 'getRetailOutstandingSummary',
    'migrateRetailRegisterColumns', 'getRetailCustomers', 'createRetailCustomer', 'updateRetailCustomer'
  ]);

  // Served from the Firestore snapshot.
  const SNAPSHOT_READS = new Set([
    'getAllData', 'getRetailData', 'getRetailCustomersWithPending',
    'getRetailOutstandingSummary', 'getRetailCustomers'
  ]);

  // Pass-through calls that do NOT change sheet data (no snapshot rebuild needed).
  const NO_DIRTY = new Set([
    'loginUser', 'getAnalytics', 'getAppUrl', 'previewRecalcPartyInvoices', 'checkRetailDuplicates',
    'getRetailEntriesForCustomer', 'sendWhatsAppMessage', 'sendWhatsAppToParty'
  ]);

  const WAIT_MS = 15000;
  const POLL_MS = 400;
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  // Wait until no write/rebuild is pending. Self-heals if a dirty flag has no rebuild running.
  async function waitFresh(maxMs) {
    const t0 = Date.now();
    let kicked = false;
    for (;;) {
      const s = await store.getSyncState();
      if (!store.isBusy(s)) return true;
      if (s.dirty && !s.syncing && !kicked) { kicked = true; runSync().catch(() => {}); }
      if (Date.now() - t0 > (maxMs || WAIT_MS)) return false;
      await sleep(POLL_MS);
    }
  }

  function userInfoFor(userName, users) {
    const info = {
      name: userName || 'Unknown', dept: '', role: 'User', office: '',
      email: '', phone: '', designation: '', foundInDB: false
    };
    const hit = userName && users && users[String(userName).trim().toLowerCase()];
    return hit ? Object.assign({}, hit, { foundInDB: true }) : info;
  }

  function retailSummary(pending) {
    if (!pending || pending.success === false) return pending || { success: false, error: 'No retail data' };
    const list = pending.customers || [];
    const total = list.reduce((s, c) => s + (c.pending || 0), 0);
    return {
      success: true,
      totalOutstanding: Math.round(total * 100) / 100,
      customerCount: list.length,
      topCustomers: list.slice(0, 10)
    };
  }

  // Returns undefined when the snapshot can't answer -> caller falls back to live Apps Script.
  async function fromSnapshot(fn, args) {
    let meta = await store.getMeta();
    if (!meta) { waitUntil(runSync()); return undefined; }          // first ever run: build it, serve live now

    const sinceTs = fn === 'getAllData' ? args[1] : undefined;
    const force = fn !== 'getAllData' || !sinceTs || String(sinceTs) === '0' || String(sinceTs) === 'force';

    if (force) {                                                    // explicit refresh / retail reads must be fresh
      if (!(await waitFresh())) return undefined;
      meta = await store.getMeta();
      if (!meta) return undefined;
    }

    if (fn === 'getAllData' && !force && String(sinceTs) === String(meta.lastUpdate)) {
      return { success: true, unchanged: true, lastUpdate: meta.lastUpdate };
    }

    const snap = await store.loadSnapshot(meta);
    switch (fn) {
      case 'getAllData': return Object.assign({}, snap.all, { userInfo: userInfoFor(args[0], snap.users) });
      case 'getRetailData': return snap.retailData;
      case 'getRetailCustomersWithPending': return snap.retailPending;
      case 'getRetailOutstandingSummary': return retailSummary(snap.retailPending);
      case 'getRetailCustomers': return snap.retailCustomers;
    }
    return undefined;
  }

  let _lastCheck = { t: 0, v: null };
  async function checkLast() {
    if (Date.now() - _lastCheck.t < 1500 && _lastCheck.v !== null) return _lastCheck.v;   // coalesce polls
    const meta = await store.getMeta();
    if (!meta) { waitUntil(runSync()); return callGas('checkLastUpdate', []); }
    _lastCheck = { t: Date.now(), v: String(meta.lastUpdate) };
    return _lastCheck.v;
  }

  async function handle(fn, args) {
    args = Array.isArray(args) ? args : [];
    if (!ALLOWED.has(fn)) return { success: false, error: 'Unknown or unauthorized function: ' + fn };

    if (fn === 'checkLastUpdate') {
      try { return await checkLast(); } catch (e) { return callGas(fn, args); }
    }

    if (SNAPSHOT_READS.has(fn)) {
      try {
        const r = await fromSnapshot(fn, args);
        if (r !== undefined) return r;
      } catch (e) { console.error('snapshot read failed, using live:', e.message); }
      return callGas(fn, args);
    }

    const out = await callGas(fn, args);
    if (!NO_DIRTY.has(fn)) {
      try { await store.markDirty(); } catch (e) { console.error('markDirty failed:', e.message); }
      if (fn === 'bustAllCaches') _lastCheck = { t: 0, v: null };
      waitUntil(runSync().catch((e) => console.error('background sync failed:', e.message)));
    }
    return out === undefined ? { success: true } : out;
  }

  module.exports = { handle, ALLOWED, SNAPSHOT_READS, NO_DIRTY, waitFresh, _resetCheck: () => { _lastCheck = { t: 0, v: null }; } };

  return module.exports;
})();

module.exports = { handle: __m.rpc.handle, runSync: __m.sync.runSync, store: __m.store, _resetCheck: __m.rpc._resetCheck };
