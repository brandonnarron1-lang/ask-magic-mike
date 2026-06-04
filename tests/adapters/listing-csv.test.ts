import { describe, expect, it } from "vitest";
import { CsvListingProvider, parseCsv } from "@/lib/adapters/listing-csv-provider";

const CSV_SAMPLE = `MLS Number,Status,Address,City,State,Zip,List Price,Beds,Baths Full,Baths Half,SqFt,Year Built,Property Type,Public Remarks,Agent Remarks,Lockbox
10001234,Active,"123 Nash St NW",Wilson,NC,27893,"425,000",4,2,1,2300,1998,Single Family,"Updated home in established neighborhood.","Seller motivated.","Combo 1234"
10001235,Pending,"456 Oak Ave",Wilson,NC,27896,"312,000",3,2,0,1700,1985,Single Family,"Cute starter home.",,
`;

describe("parseCsv", () => {
  it("handles quoted fields with commas", () => {
    const rows = parseCsv(CSV_SAMPLE);
    expect(rows).toHaveLength(2);
    expect(rows[0]["MLS Number"]).toBe("10001234");
    expect(rows[0]["List Price"]).toBe("425,000");
    expect(rows[0]["Public Remarks"]).toBe(
      "Updated home in established neighborhood."
    );
  });
});

describe("CsvListingProvider.parse", () => {
  it("maps a FlexMLS-style CSV into split listings", () => {
    const report = CsvListingProvider.parse(CSV_SAMPLE);
    expect(report.totalRows).toBe(2);
    expect(report.okCount).toBe(2);
    expect(report.errorCount).toBe(0);

    const first = report.rows[0].listing!;
    expect(first.public.mls_number).toBe("10001234");
    expect(first.public.list_price).toBe(425000);
    expect(first.public.beds).toBe(4);
    expect(first.public.state).toBe("NC");

    // Private fields land in the private bag, not the public one.
    expect(first.private.agent_remarks).toBe("Seller motivated.");
    expect(first.private.lockbox_info).toBe("Combo 1234");
    expect((first.public as unknown as Record<string, unknown>).agent_remarks).toBeUndefined();
    expect((first.public as unknown as Record<string, unknown>).lockbox_info).toBeUndefined();
  });

  it("falls back to status=active on garbage status", () => {
    const csv =
      `MLS,Status,Address,City,State,Zip,List Price\n10001236,Garbage,789 Lane,Wilson,NC,27896,250000`;
    const report = CsvListingProvider.parse(csv);
    expect(report.rows[0].listing!.public.status).toBe("active");
  });

  it("flags every row as error when no recognizable columns are present", () => {
    const csv = `Foo,Bar,Baz\n1,2,3`;
    const report = CsvListingProvider.parse(csv);
    expect(report.errorCount).toBeGreaterThan(0);
  });
});
