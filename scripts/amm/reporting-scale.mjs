#!/usr/bin/env node
// Synthetic loopback only. Fixture/runner and application run in separate OS processes.
import { spawn, execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync, statfsSync } from 'node:fs';
import { startDatabase, stopDatabase, install, psql } from '../../tests/support/qa-audit-postgres.ts';
if (process.env.DATABASE_URL || process.env.VERCEL_ENV || process.env.AMM_QA_POSTGRES_TEST !== '1' || process.env.AMM_QA_NATIVE_POSTGRES_TEST !== '1')
    throw Error('clean_local_native_venue_required');
const cohorts = process.argv.includes('--large') ? [1270, 10000, 50000] : [1270, 10000];
const output = '.amm-run/reporting-bounds';
const accepted = process.argv.includes('--accepted');
mkdirSync(output, { recursive: true, mode: 0o700 });
const anchor = '2026-10-08T12:00:00.000Z';
const owner = '00000000-0000-4000-8000-000000009901';
const other = '00000000-0000-4000-8000-000000009902';
const started = Date.now();
function guard() { const d = statfsSync('.'); if (process.memoryUsage().rss > 2 * 1024 ** 3 || d.bavail * d.bsize < 8 * 1024 ** 3 || Date.now() - started > 600000)
    throw Error('declared_resource_abort'); }
function seed(n) {
    psql('TRUNCATE sessions CASCADE;');
    // Set-based chunks; the runner never holds generated lead/contact/event arrays.
    for (let begin = 1; begin <= n + 6; begin += 1000) {
        guard();
        const end = Math.min(n + 6, begin + 999);
        psql(`CREATE TEMP TABLE scale_ids AS SELECT i,md5('amm-post291-scale-'||i)::uuid id FROM generate_series(${begin},${end})i;
      INSERT INTO sessions(id) SELECT id FROM scale_ids;
      INSERT INTO leads(id,session_id,created_at,first_name,email,phone,lead_type,primary_intent,status,source,assigned_agent_id,is_test,communication_suppressed,is_duplicate,duplicate_of_lead_id)
      SELECT id,id,'${anchor}'::timestamptz-(1+i%28)*interval '1 day','SYNTHETIC SCALE — NOT A CONSUMER',i||'@example.test','+12025550199','renter','unknown','new','rental_to_homeownership',
        CASE WHEN i%2=0 THEN '${owner}'::uuid ELSE '${other}'::uuid END,i=${n + 1},i=${n + 2},i=${n + 3},CASE WHEN i=${n + 4} THEN md5('amm-post291-scale-1')::uuid END FROM scale_ids;
      UPDATE leads SET created_at='${anchor}'::timestamptz-interval '45 days' WHERE id=(SELECT id FROM scale_ids WHERE i=${n + 5});
      UPDATE leads SET created_at='${anchor}'::timestamptz+interval '1 day' WHERE id=(SELECT id FROM scale_ids WHERE i=${n + 6});
      INSERT INTO source_attribution(lead_id,session_id,utm_source,utm_medium,utm_campaign,placement_id,created_at)
        SELECT id,id,'synthetic_source_'||i%5,'owned_media','synthetic_scale','wordpress_rental_to_homeownership','${anchor}'::timestamptz-interval '1 hour' FROM scale_ids WHERE i<=${n} AND i%5<>0;
      INSERT INTO lead_appointments(lead_id,status,created_at) SELECT id,s,'${anchor}'::timestamptz-interval '30 minutes' FROM scale_ids CROSS JOIN (VALUES('requested'),('completed'))v(s) WHERE i<=${n};
      INSERT INTO lead_appointments(lead_id,status,created_at) SELECT id,'completed','${anchor}'::timestamptz-interval '20 minutes' FROM scale_ids WHERE i<=${n} AND i%10=0;
      INSERT INTO tasks(lead_id,title,category,status,created_at) SELECT id,'SYNTHETIC SCALE FOLLOWUP','followup:manual_callback',s,'${anchor}'::timestamptz-interval '20 minutes' FROM scale_ids CROSS JOIN (VALUES('open'),('done'),('cancelled'))v(s) WHERE i<=${n};
      INSERT INTO audit_logs(actor,action,resource_type,resource_id,metadata,created_at) SELECT 'lead_center:synthetic-scale-admin',CASE WHEN j=3 THEN 'lead.lifecycle_changed' ELSE 'lead.human_interaction_recorded' END,'lead',id,
        jsonb_build_object('provenance','manual_operator_record','channel','phone','result',CASE WHEN i%3=0 THEN 'two_way_conversation' ELSE 'no_answer' END,'occurred_at','2026-10-08T11:45:00.000Z','request_key',md5(i||':'||j),'request_hash',repeat('a',64)),
        '${anchor}'::timestamptz-interval '10 minutes' FROM scale_ids CROSS JOIN generate_series(1,3)j WHERE i<=${n};
      INSERT INTO lead_outcomes(lead_id,outcome_type,occurred_at,created_at,source_system,is_test,communication_suppressed) SELECT id,'closed','${anchor}'::timestamptz-interval '5 minutes','${anchor}'::timestamptz-interval '5 minutes','synthetic_scale',false,false FROM scale_ids WHERE i<=${n} AND i%10=0;`);
    }
    psql('ANALYZE;');
}
const results = [];
let activeChild;
try {
    const connection = await startDatabase({ loopbackTcp: true });
    if (new URL(connection).hostname !== '127.0.0.1')
        throw Error('loopback_required');
    install('amm_qa_upgrade', true);
    const dbPid = Number(psql("SELECT split_part(pg_read_file('postmaster.pid'), E'\\n', 1);"));
    psql(`INSERT INTO agents(id,name,email,role,is_active) VALUES('${other}','SYNTHETIC OTHER','other-scale@example.test','backup',false);`);
    for (const n of cohorts) {
        guard();
        const seedStart = performance.now();
        seed(n);
        const seedMs = performance.now() - seedStart;
        const env = { PATH: process.env.PATH, HOME: process.env.HOME, TMPDIR: process.env.TMPDIR, AMM_SCALE_PORT: new URL(connection).port, AMM_SCALE_N: String(n), AMM_SCALE_ANCHOR: anchor, AMM_SCALE_RUN: '1', AMM_SCALE_ACCEPTED: accepted ? '1' : '0' };
        const child = spawn(process.execPath, ['--disable-warning=MODULE_TYPELESS_PACKAGE_JSON', 'scripts/amm/reporting-scale-worker.mjs'], { env, stdio: ['ignore', 'pipe', 'pipe'] });
        activeChild = child;
        let logs = '', runnerPeak = 0, dbPeak = 0, abort;
        const ticker = setInterval(() => {
            try {
                guard();
                runnerPeak = Math.max(runnerPeak, process.memoryUsage().rss);
                const procs = execFileSync('ps', ['-axo', 'pid=,ppid=,rss=,comm='], { encoding: 'utf8' }).trim().split('\n').map(l => l.trim().split(/\s+/));
                const ownDb = procs.find(p => Number(p[0]) === dbPid);
                if (ownDb) {
                    const owned = procs.filter(p => p[0] === ownDb[0] || p[1] === ownDb[0]);
                    dbPeak = Math.max(dbPeak, owned.reduce((s, p) => s + Number(p[2]) * 1024, 0));
                }
                const descendants = new Set([child.pid]);
                for (let i = 0; i < 5; i++)
                    for (const p of procs)
                        if (descendants.has(Number(p[1])))
                            descendants.add(Number(p[0]));
                if (procs.some(p => descendants.has(Number(p[0])) && Number(p[2]) * 1024 > 2 * 1024 ** 3)) {
                    abort = 'declared_resource_abort';
                    for (const pid of descendants)
                        try {
                            process.kill(pid, 'SIGTERM');
                        }
                        catch { /* already exited */ }
                }
            }
            catch (e) {
                abort = String(e);
                child.kill('SIGTERM');
            }
        }, 100);
        child.stdout.on('data', d => { logs += String(d); });
        child.stderr.on('data', d => { logs += String(d); });
        const code = await new Promise((resolve, reject) => { child.on('error', reject); child.on('exit', resolve); });
        clearInterval(ticker);
        activeChild = undefined;
        const path = `${output}/${accepted ? 'accepted' : 'candidate'}-${n}.log`;
        writeFileSync(path, logs, { mode: 0o600 });
        const match = logs.match(/REPORTING_PROCESS_RESULT (.+)/);
        const result = { n, seedMs, runnerPeakMiB: runnerPeak / 1024 ** 2, databaseSumRssMiB: dbPeak / 1024 ** 2, code, abort, ...(match ? JSON.parse(match[1]) : { status: 'NO_RESULT' }) };
        results.push(result);
        writeFileSync(`${output}/${accepted ? 'accepted' : 'candidate'}-measurements.json`, JSON.stringify({ at: new Date().toISOString(), productionSla: false, limits: { p95Ms: 2000, queries: 6, appRssMiB: 512, responseBytes: 1048576, abortMiB: 2048, wallMs: 600000, minFreeGiB: 8 }, results }, null, 2), { mode: 0o600 });
        console.log('REPORTING_MEASUREMENT', JSON.stringify(result));
        // Large diagnostic may proceed after attribution at 10k even when response target fails;
        // do not proceed past a timing/resource failure or any correctness failure.
        if (code !== 0 || abort || result.p95Ms > 2000 || result.peakRssMiB > 1024)
            break;
    }
}
finally {
    activeChild?.kill('SIGTERM');
    stopDatabase();
}
