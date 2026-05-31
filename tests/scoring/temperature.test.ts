import { describe, it, expect } from "vitest";
import { classifyTemperature } from "@/lib/scoring/temperature";

describe("classifyTemperature", () => {
  it("returns 'urgent' for score >= 80 AND timeline <= 3 months", () => {
    expect(classifyTemperature(80, 0)).toBe("urgent");
    expect(classifyTemperature(95, 3)).toBe("urgent");
    expect(classifyTemperature(100, 0)).toBe("urgent");
  });

  it("returns 'hot' not 'urgent' when score >= 80 but timeline > 3 months", () => {
    expect(classifyTemperature(80, 6)).toBe("hot");
    expect(classifyTemperature(95, 12)).toBe("hot");
  });

  it("returns 'hot' not 'urgent' when score >= 80 and timeline is null", () => {
    expect(classifyTemperature(80, null)).toBe("hot");
  });

  it("returns 'hot' for score 65-79", () => {
    expect(classifyTemperature(65, null)).toBe("hot");
    expect(classifyTemperature(79, 6)).toBe("hot");
  });

  it("returns 'warm' for score 40-64", () => {
    expect(classifyTemperature(40, null)).toBe("warm");
    expect(classifyTemperature(64, 12)).toBe("warm");
  });

  it("returns 'nurture' for score 20-39", () => {
    expect(classifyTemperature(20, null)).toBe("nurture");
    expect(classifyTemperature(39, null)).toBe("nurture");
  });

  it("returns 'low' for score < 20", () => {
    expect(classifyTemperature(0, null)).toBe("low");
    expect(classifyTemperature(19, null)).toBe("low");
  });

  it("boundary: score exactly 65 with short timeline is hot not urgent", () => {
    expect(classifyTemperature(65, 0)).toBe("hot");
  });

  it("boundary: score exactly 79 with short timeline is hot not urgent (urgent requires >=80)", () => {
    expect(classifyTemperature(79, 0)).toBe("hot");
  });
});
