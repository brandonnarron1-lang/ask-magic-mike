import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { HomepageStructuredData } from "../../app/components/seo/HomepageStructuredData";
import MikeEatmonPage, { metadata } from "../../app/mike-eatmon/page";
import sitemap from "../../app/sitemap";

vi.mock("../../app/components/black-diamond/BlackDiamondHeader", () => ({ BlackDiamondHeader: () => <header /> }));
vi.mock("../../app/components/black-diamond/BlackDiamondShell", () => ({ Footer: () => <footer /> }));

afterEach(cleanup);

type Node = Record<string, unknown> & { "@id": string; "@type": string };
const personId = "https://www.ourtownproperties.com/agents/mike-eatmon/#person";
const organizationId = "https://www.ourtownproperties.com/#organization";
const portraitUrl = "https://www.ourtownproperties.com/wp-content/uploads/Mike-Eatmon.jpeg";

function graphFrom(container: HTMLElement): Node[] {
  const scripts = container.querySelectorAll('script[type="application/ld+json"]');
  expect(scripts).toHaveLength(1);
  return JSON.parse(scripts[0].textContent ?? "")["@graph"];
}

describe("Mike's public identity across the service and profile", () => {
  it("uses one shared brokerage and person identity with the approved full-size portrait", () => {
    const homepage = render(<HomepageStructuredData />);
    const homeGraph = graphFrom(homepage.container);
    homepage.unmount();
    const profile = render(<MikeEatmonPage />);
    const profileGraph = graphFrom(profile.container);

    for (const graph of [homeGraph, profileGraph]) {
      expect(new Set(graph.map((node) => node["@id"])).size).toBe(graph.length);
      expect(graph.filter((node) => node["@type"] === "Person")).toHaveLength(1);
      expect(graph.filter((node) => node["@type"] === "Organization")).toHaveLength(1);
      const person = graph.find((node) => node["@id"] === personId);
      expect(person).toMatchObject({ name: "Mike Eatmon", alternateName: "Magic Mike", worksFor: { "@id": organizationId } });
      const imageRef = person?.image as { "@id": string };
      expect(graph.find((node) => node["@id"] === imageRef["@id"])).toMatchObject({ url: portraitUrl, contentUrl: portraitUrl, width: 1024, height: 1024 });
      expect(JSON.stringify(graph)).not.toMatch(/richard|evans|askmagicmike\.com\/#organization/i);
    }
    expect(homeGraph.find((node) => node["@type"] === "WebPage")).toMatchObject({ about: [{ "@id": personId }, { "@id": organizationId }] });
    expect(profileGraph.find((node) => node["@type"] === "ProfilePage")).toMatchObject({ url: "https://www.askmagicmike.com/mike-eatmon", mainEntity: { "@id": personId } });
  });

  it("presents the real portrait, alias, brokerage and location beside truthful assistant disclosure", () => {
    render(<MikeEatmonPage />);
    expect(screen.getByRole("heading", { level: 1, name: "Mike Eatmon · Magic Mike" })).toBeVisible();
    expect(screen.getByAltText("Mike Eatmon, broker with Our Town Properties in Wilson, North Carolina.")).toHaveAttribute("width", "1024");
    expect(screen.getByText("Real estate broker · Our Town Properties, Inc. · Wilson, North Carolina")).toBeVisible();
    expect(screen.getByText(/It is not Mike personally/)).toBeVisible();
    expect(screen.getByRole("link", { name: "Mike's official brokerage biography" })).toHaveAttribute("href", "https://www.ourtownproperties.com/agents/mike-eatmon/");
    expect(screen.getByRole("link", { name: "Contact Mike's team" })).toHaveAttribute("href", "/contact");
  });

  it("keeps the profile self-canonical and its portrait metadata at the true dimensions", () => {
    expect(metadata.alternates).toEqual({ canonical: "/mike-eatmon" });
    expect(metadata.openGraph).toMatchObject({ type: "profile", url: "/mike-eatmon", images: [{ url: portraitUrl, width: 1024, height: 1024 }] });
    expect(metadata.twitter).toMatchObject({ images: [{ url: portraitUrl }] });
    expect(sitemap().find((entry) => entry.url === "https://www.askmagicmike.com/mike-eatmon")).toMatchObject({ lastModified: "2026-11-11" });
  });

  it("retains the supplied original portrait and logo bytes", () => {
    const digest = (path: string) => createHash("sha256").update(readFileSync(path)).digest("hex");
    expect(digest("public/images/identity/mike-eatmon-our-town-properties-wilson-nc-headshot.jpg")).toBe("7482274b540615dad5a5a8aa5e26fbfe6910ba66bb6b11bfb6340e8ebe62512e");
    expect(digest("public/images/identity/our-town-properties-logo-black-gold.png")).toBe("51aef38973f9379b614b811dad39c59e27fe13a07f9b6d22682c0ecafcc27297");
  });
});
