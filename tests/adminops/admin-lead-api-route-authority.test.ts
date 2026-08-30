import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function read(path: string) {
  return readFileSync(path, "utf8");
}

describe("canonical admin lead API route authority", () => {
  const routes = [
    ["app/api/admin/leads/route.ts", "export { GET }"],
    ["app/api/admin/leads/[id]/route.ts", "export { GET, PATCH }"],
    ["app/api/admin/leads/[id]/assign/route.ts", "export { POST }"],
    ["app/api/admin/leads/[id]/notes/route.ts", "export { POST }"],
    ["app/api/admin/leads/[id]/tasks/route.ts", "export { POST }"],
  ] as const;

  it("activates each documented path from the authoritative root router", () => {
    for (const [path, verbExport] of routes) {
      const source = read(path);
      expect(source, path).toContain(verbExport);
      expect(source, path).toContain("src/app/api/admin/leads");
    }
  });

  it("keeps auth and persistence in one shared reviewed handler implementation", () => {
    const detail = read("src/app/api/admin/leads/[id]/route.ts");
    const note = read("src/app/api/admin/leads/[id]/notes/route.ts");
    expect(detail).toContain("checkAdminAuth(req)");
    expect(detail).toContain("patchCanonicalAdminLead");
    expect(note).toContain("checkAdminAuth(req)");
    expect(note).toContain("addCanonicalAdminLeadNote");
    for (const [path] of routes) {
      expect(read(path), path).not.toContain("process.env");
      expect(read(path), path).not.toContain("SUPABASE_SERVICE_ROLE_KEY");
    }
  });
});
