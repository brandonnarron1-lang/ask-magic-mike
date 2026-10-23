import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fireEvent, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resolveOwnedDemandPlacement } from "../../app/lib/growth/owned-demand";

const directory = path.join(process.cwd(), "public/launch-20261013");
const html = readFileSync(path.join(directory, "share-20261021.html"), "utf8");
const manifest = JSON.parse(readFileSync(path.join(directory, "share-manifest-20261021.json"), "utf8")) as {
  offers: Array<{ offer: string; caption: string; clean: string; alt: string; registeredLinks: Array<{ channel: string; url: string }> }>;
  images: Array<{ file: string; sha256: string }>;
  documents: Array<{ file: string; sha256: string }>;
  historicFiles: Array<{ file: string; sha256: string }>;
};
const offers = [
  { id: "home-value", placement: "seller_review", feed: "seller-feed.jpg" },
  { id: "buying-help", placement: "buyer_match", feed: "buyer-feed.jpg" },
  { id: "compare-selling-options", placement: "compare_selling_options", feed: "compare-selling-options-feed-20261021.jpg" },
] as const;
const clipboard = vi.fn<(text: string) => Promise<void>>();
const originalClipboard = Object.getOwnPropertyDescriptor(navigator, "clipboard");

beforeEach(() => {
  const page = new DOMParser().parseFromString(html, "text/html");
  document.body.innerHTML = page.body.innerHTML;
  clipboard.mockReset().mockResolvedValue(undefined);
  Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: clipboard } });
  vi.stubGlobal("fetch", vi.fn(() => { throw new Error("network forbidden in local sharing fixture"); }));
  // Execute exactly the tracked static page script against its actual DOM.
  // No server, browser session, provider or publication API is involved.
  const script = page.querySelector("script")!.textContent!;
  new Function(script)();
});
afterEach(() => {
  document.body.innerHTML = ""; vi.unstubAllGlobals(); vi.restoreAllMocks();
  if (originalClipboard) Object.defineProperty(navigator, "clipboard", originalClipboard);
  else Reflect.deleteProperty(navigator, "clipboard");
});

describe("existing three-offer share kit", () => {
  for (const [index, offer] of offers.entries()) {
    it(`copies the exact complete ${offer.id} Facebook caption and CURRENT registered tuple`, async () => {
      const section = within(document.getElementById(offer.id)!);
      const placement = resolveOwnedDemandPlacement("facebook", offer.placement)!;
      const expected = `${manifest.offers[index].caption}\n\n${placement.trackedUrl}`;
      expect(manifest.offers[index].registeredLinks.find(link => link.channel === "facebook")!.url).toBe(placement.trackedUrl);
      expect((document.getElementById(`facebook-${offer.id}`) as HTMLTextAreaElement).value).toBe(expected);
      fireEvent.click(section.getByRole("button", { name: "Copy Facebook post" }));
      await waitFor(() => expect(clipboard).toHaveBeenCalledExactlyOnceWith(expected));
      expect(section.getByText("Copied. Not posted or sent.")).toBeVisible();
      const destination = new URL(placement.trackedUrl);
      expect(destination.searchParams.get("utm_medium")).toBe("social_organic");
      expect(destination.searchParams.get("utm_campaign")).toBe("amm_owned_demand_2026");
      if (offer.placement === "compare_selling_options") expect(destination.searchParams.get("seller_option")).toBe("compare");
      expect(fetch).not.toHaveBeenCalled();
    });
    it(`copies clean ${offer.id} link, alt and separate Instagram caption, with matching download`, async () => {
      const section = within(document.getElementById(offer.id)!);
      for (const [name, text] of [["Copy clean link", manifest.offers[index].clean], ["Copy alt text", manifest.offers[index].alt], ["Copy Instagram caption", manifest.offers[index].caption]]) {
        fireEvent.click(section.getByRole("button", { name }));
        await waitFor(() => expect(clipboard).toHaveBeenLastCalledWith(text));
      }
      expect(section.getByText(/Instagram captions do not provide a clickable destination/)).toHaveTextContent("Story link sticker or your verified profile-link field");
      const link = section.getAllByRole("link").find(node => node.hasAttribute("download") && node.getAttribute("href") === offer.feed);
      expect(link).toBeDefined();
      expect(fetch).not.toHaveBeenCalled();
    });
  }
  it.each(["Copy Facebook post", "Copy clean link", "Copy alt text", "Copy Instagram caption"])("provides selectable exact text when clipboard refuses %s", async name => {
    clipboard.mockRejectedValue(new DOMException("synthetic denied", "NotAllowedError"));
    const section = within(document.getElementById("compare-selling-options")!);
    fireEvent.click(section.getByRole("button", { name }));
    await waitFor(() => expect(section.getByText("Text selected. Use your device’s Copy command. Not posted or sent.")).toBeVisible());
    const selected = document.activeElement as HTMLTextAreaElement;
    expect(selected.tagName).toBe("TEXTAREA"); expect(selected.readOnly).toBe(true);
    const expected = clipboard.mock.calls[0][0];
    expect(selected.value.slice(selected.selectionStart, selected.selectionEnd)).toBe(expected);
    expect(fetch).not.toHaveBeenCalled();
  });
  it("also falls back when the clipboard API is absent", async () => {
    Reflect.deleteProperty(navigator, "clipboard");
    fireEvent.click(within(document.getElementById("home-value")!).getByRole("button", { name: "Copy clean link" }));
    await waitFor(() => expect(document.activeElement).toHaveValue(manifest.offers[0].clean));
    expect(clipboard).not.toHaveBeenCalled();
  });
  it("updates the tracked HTML digest while preserving every historic file and image digest", () => {
    for (const record of [...manifest.documents, ...manifest.images, ...manifest.historicFiles]) {
      const digest = createHash("sha256").update(readFileSync(path.join(directory, record.file))).digest("hex");
      expect(digest, record.file).toBe(record.sha256);
    }
    expect(manifest.historicFiles).toHaveLength(18);
    expect(html).not.toMatch(/window\.open|navigator\.share|fetch\(|XMLHttpRequest|localStorage|sessionStorage|api\/.*publish/);
  });
});
