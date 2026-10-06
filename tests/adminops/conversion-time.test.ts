import {describe,expect,it} from "vitest";
import {resolveConversionDateTime} from "../../app/lib/conversionTime";
describe("Declared operator timezone, not server timezone",()=>{
 it("resolves winter/summer offsets and leaves offset timestamps/microseconds intact",()=>{
  expect(resolveConversionDateTime("2026-01-07T10:00","America/New_York")).toBe("2026-01-07T15:00:00.000Z");
  expect(resolveConversionDateTime("2026-07-07T10:00","America/New_York")).toBe("2026-07-07T14:00:00.000Z");
  expect(resolveConversionDateTime("2026-11-01T01:30:00.123456-04:00","America/New_York")).toBe("2026-11-01T01:30:00.123456-04:00");
 });
 it("rejects DST gaps, ambiguous repeats, invalid zones/dates and preserves missing time",()=>{
  expect(()=>resolveConversionDateTime("2026-03-08T02:30")).toThrow("nonexistent_conversion_time");
  expect(()=>resolveConversionDateTime("2026-11-01T01:30")).toThrow("ambiguous_conversion_time");
  expect(()=>resolveConversionDateTime("2026-02-30T10:00")).toThrow("invalid_conversion_time");
  expect(()=>resolveConversionDateTime("2026-10-07T10:00","Not/A_Zone")).toThrow("invalid_appointment_timezone");
  expect(resolveConversionDateTime("")).toBeNull();
 });
});
