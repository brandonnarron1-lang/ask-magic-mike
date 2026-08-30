import { describe, expect, it } from "vitest";
import {
  evaluateReadinessContract,
  evaluateRouteContract,
  PRODUCTION_ROUTE_CONTRACTS,
} from "../../scripts/lib/monitor-contracts.mjs";

const readyBody = {
  ok: true,
  capture_function: true,
  leads_table: true,
  notification_table: true,
  rate_limit_required: true,
  rate_limit_table: true,
  rate_limit_schema_ready: true,
  rate_limit_permissions_ready: true,
  rate_limit_rls_ready: true,
  rate_limit_store_ready: true,
  rate_limit_secret_ready: true,
  rate_limit_ready: true,
  push_ready: true,
};

describe("production monitor readiness contract", () => {
  it("passes only when every required readiness dependency is true", () => {
    expect(evaluateReadinessContract(readyBody)).toEqual({
      ok: true,
      checks: readyBody,
    });
  });

  it.each([
    "ok",
    "capture_function",
    "leads_table",
    "notification_table",
    "rate_limit_required",
    "rate_limit_table",
    "rate_limit_schema_ready",
    "rate_limit_permissions_ready",
    "rate_limit_rls_ready",
    "rate_limit_store_ready",
    "rate_limit_secret_ready",
    "rate_limit_ready",
    "push_ready",
  ])("fails when %s is false or absent", (field) => {
    const falseResult = evaluateReadinessContract({ ...readyBody, [field]: false });
    const missing = { ...readyBody };
    delete missing[field];
    const missingResult = evaluateReadinessContract(missing);

    expect(falseResult.ok).toBe(false);
    expect(falseResult.checks[field]).toBe(false);
    expect(missingResult.ok).toBe(false);
    expect(missingResult.checks[field]).toBe(false);
  });

  it("fails safely for malformed response bodies", () => {
    expect(evaluateReadinessContract(null).ok).toBe(false);
    expect(evaluateReadinessContract([]).ok).toBe(false);
    expect(evaluateReadinessContract("ready").ok).toBe(false);
  });
});

describe("production monitor public-route contract", () => {
  it("checks canonical conversion documents and both permanent compatibility redirects", () => {
    expect(PRODUCTION_ROUTE_CONTRACTS).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: "home-value", path: "/home-value", expected: 200 }),
      expect.objectContaining({
        name: "value-alias",
        path: "/value",
        expected: 308,
        expectedLocation: "/home-value",
      }),
      expect.objectContaining({
        name: "we-buy-houses-alias",
        path: "/we-buy-houses",
        expected: 308,
        expectedLocation: "/sell",
      }),
    ]));
    expect(PRODUCTION_ROUTE_CONTRACTS).not.toContainEqual(
      expect.objectContaining({ path: "/value", expected: 200 }),
    );
  });

  it("fails closed when an alias has the wrong status or destination", () => {
    const alias = PRODUCTION_ROUTE_CONTRACTS.find(({ name }) => name === "value-alias");
    expect(alias).toBeDefined();

    expect(evaluateRouteContract(alias, {
      status: 308,
      location: "/home-value",
    })).toEqual({ ok: true, statusOk: true, locationOk: true });
    expect(evaluateRouteContract(alias, {
      status: 200,
      location: null,
    })).toEqual({ ok: false, statusOk: false, locationOk: false });
    expect(evaluateRouteContract(alias, {
      status: 308,
      location: "/value",
    })).toEqual({ ok: false, statusOk: true, locationOk: false });
  });
});
