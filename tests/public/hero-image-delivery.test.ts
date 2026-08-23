import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(
  join(process.cwd(), "app/components/black-diamond/HeroSection.tsx"),
  "utf8",
);

describe("public hero image delivery", () => {
  it("keeps the approved mobile and desktop Black Diamond artwork", () => {
    expect(source).toContain("hero-home-mobile.webp");
    expect(source).toContain("hero-home-desktop.webp");
    expect(source).toContain('media="(min-width: 768px)"');
    expect(source).toContain('alt: ""');
  });

  it("uses the Next.js responsive optimizer for the LCP artwork", () => {
    expect(source).toContain('import { getImageProps } from "next/image"');
    expect(source).toContain('sizes: "100vw"');
    expect(source).toContain('loading: "eager"');
    expect(source).toContain('fetchPriority: "high"');
    expect(source).toContain("srcSet={desktopHeroSrcSet}");
    expect(source).not.toContain('src="/brand/black-diamond/hero-home-desktop.jpg"');
  });
});
