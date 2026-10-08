// Standalone application worker: no Vitest, mock call history or fixture arrays.
import { registerHooks } from 'node:module';
import { Pool } from 'pg';
import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
if (process.env.DATABASE_URL || process.env.VERCEL_ENV || process.env.AMM_SCALE_RUN !== '1' || !/^\d+$/.test(process.env.AMM_SCALE_PORT || ''))
    throw Error('clean_local_worker_required');
// Only transport changes; the accepted/candidate SQL and aggregation execute unchanged.
registerHooks({ resolve(specifier, context, next) {
        if (specifier === '@neondatabase/serverless')
            return next(new URL('../../tests/support/reporting-scale-transport.mjs', import.meta.url).href, context);
        try {
            return next(specifier, context);
        }
        catch (e) {
            if (e.code === 'ERR_MODULE_NOT_FOUND' && specifier.startsWith('.'))
                return next(specifier + '.ts', context);
            throw e;
        }
    } });
const transport = (await import('../../tests/support/reporting-scale-transport.mjs')).transport;
const module = process.env.AMM_SCALE_ACCEPTED === '1' ? await import('../../tests/support/acceptedReportingReference.ts') : await import('../../app/lib/persistence/neonAdminReportingView.ts');
const load = module.loadAcceptedReportingSummary || module.loadNeonAdminReportingSummary;
const pool = new Pool({ host: '127.0.0.1', port: Number(process.env.AMM_SCALE_PORT), user: 'postgres', database: 'amm_qa_upgrade', max: 10, statement_timeout: 15000 });
const n = Number(process.env.AMM_SCALE_N), now = new Date(process.env.AMM_SCALE_ANCHOR);
const admin = { userId: 'synthetic-scale-admin', role: 'administrator', agentId: null, name: 'SYNTHETIC', email: 'scale@example.test' };
let queries = 0, dbMs = 0, peakRss = 0, peakHeap = 0;
const plans = [];
const sample = () => { const m = process.memoryUsage(); peakRss = Math.max(peakRss, m.rss); peakHeap = Math.max(peakHeap, m.heapUsed); if (m.rss > 2 * 1024 ** 3)
    throw Error('declared_resource_abort'); };
const base = process.memoryUsage(), configured = new WeakSet();
transport.query = async (sql, params = []) => { queries++; if (plans.length < 6 && !plans.some(p => p.sql === sql))
    plans.push({ sql, params }); const c = await pool.connect(); try {
    if (!configured.has(c)) {
        await c.query('SET ROLE service_role');
        configured.add(c);
    }
    const t = performance.now(), r = await c.query(sql, params);
    dbMs += performance.now() - t;
    sample();
    return r.rows;
}
finally {
    c.release();
} };
process.env.DATABASE_URL = 'postgresql://synthetic-only.invalid/amm_qa_upgrade';
globalThis.fetch = () => { throw Error('external_network_forbidden'); };
function check(r) {
    assert.equal(r.error, undefined);
    assert.equal(r.funnel.captured, n);
    assert.equal(r.conversionReporting.cohort.denominator, n);
    const t = r.conversionReporting.totals;
    for (const key of ['captured', 'appointments', 'manualAttempted'])
        assert.equal(t[key], n);
    assert.equal(t.twoWayContact, Math.floor(n / 3));
    assert.equal(t.closedWon, Math.floor(n / 10));
    assert.equal(t.appointmentStates.requested, n);
    assert.equal(t.appointmentStates.completed, n);
    assert.equal(r.conversionReporting.sources.reduce((s, x) => s + x.captured, 0), n);
    for (const key of ['open', 'completed', 'cancelled'])
        assert.equal(r.followupOps[key], n);
    assert.equal(r.dataTrust.excludedTest, 1);
    assert.equal(r.dataTrust.excludedSuppressed, 1);
    assert.equal(r.dataTrust.excludedDuplicates, 2);
    assert.equal(r.dataTrust.unknownFirstTouch, Math.floor(n / 5));
}
async function run() { const q = queries, d = dbMs, t = performance.now(), r = await load(30, admin, now), ms = performance.now() - t; check(r); const bytes = Buffer.byteLength(JSON.stringify(r)); sample(); return { ms, queries: queries - q, bytes, dbMs: dbMs - d }; }
const ticker = setInterval(sample, 10);
try {
    await run();
    const samples = [];
    for (let i = 0; i < 5; i++)
        samples.push(await run());
    const c = performance.now();
    await Promise.all([1, 2, 3].map(async () => { check(await load(30, admin, now)); }));
    const concurrentMs = performance.now() - c;
    assert.equal((await load(30, { ...admin, role: 'approved_agent' }, now)).error, 'lead_center_report_permission_required');
    const sorted = samples.map(s => s.ms).sort((a, b) => a - b);
    clearInterval(ticker);
    process.stdout.write(`REPORTING_PROCESS_RESULT ${JSON.stringify({ worker: 'standalone Node24; no test framework', pid: process.pid, exactCounts: 'PASS', samples, concurrentMs, p50Ms: sorted[2], p95Ms: sorted[4], baselineRssMiB: base.rss / 1024 ** 2, baselineHeapMiB: base.heapUsed / 1024 ** 2, peakRssMiB: peakRss / 1024 ** 2, peakHeapMiB: peakHeap / 1024 ** 2, incrementalRssMiB: (peakRss - base.rss) / 1024 ** 2, incrementalHeapMiB: (peakHeap - base.heapUsed) / 1024 ** 2 })}\n`);
    // EXPLAIN ANALYZE executes outside the measurement window. All data is synthetic.
    const explained = [];
    for (const p of plans) {
        const c = await pool.connect();
        try {
            await c.query('SET ROLE service_role');
            const r = await c.query('EXPLAIN (ANALYZE,BUFFERS,FORMAT JSON) ' + p.sql, p.params);
            explained.push(r.rows[0]['QUERY PLAN']);
        }
        finally {
            c.release();
        }
    }
    writeFileSync(`.amm-run/reporting-bounds/${process.env.AMM_SCALE_ACCEPTED === '1' ? 'accepted' : 'candidate'}-${n}-plans.json`, JSON.stringify(explained), { mode: 0o600 });
}
finally {
    clearInterval(ticker);
    await pool.end();
}
