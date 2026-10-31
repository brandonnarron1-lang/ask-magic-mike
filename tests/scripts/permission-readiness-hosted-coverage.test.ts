import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
describe('source-bound contact-readiness coverage remains selected',()=>{
  it('executes the real SQL opt-in and the existing real-session browser suite in hosted CI',()=>{
    const workflow=readFileSync('.github/workflows/release-gate.yml','utf8');
    expect(workflow).toContain('AMM_QA_POSTGRES_TEST=1 pnpm exec vitest run tests/persistence/manual-contact-readiness-postgres.test.ts --maxWorkers=1 --no-file-parallelism');
    expect(workflow).toContain('AMM_LEAD_READABILITY_ACCEPTANCE=1 AMM_SESSION_ARTIFACT_DIR=.amm-run/lead-navigation-ci pnpm run test:reference:sessions');
    const browser=readFileSync('tests/e2e/lead-readability-real-session.spec.ts','utf8');
    expect(browser).toContain('solo administrator uses retained request consent without assignment changes or a new consent grant');
    expect(browser).toContain('expect(first.body.permissions).toEqual([])');
    expect(browser).toContain("expect(denied.status).toBe(403)");
    expect(browser).not.toContain('test.fixme(');
  });
});
