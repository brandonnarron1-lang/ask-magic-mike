import fs from "node:fs";
import path from "node:path";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  NativePublicationHandoff,
  NATIVE_PUBLICATION_MAX_IMAGE_BYTES,
} from "../../app/admin/distribution/NativePublicationHandoff";
import {
  resolveNativePublicationHandoff,
  resolveNativePublicationProofFocus,
} from "../../app/lib/growth/native-publication-handoff";

const root = process.cwd();
const originalFetch = globalThis.fetch;

function installShareApi(share: ReturnType<typeof vi.fn>) {
  Object.defineProperty(navigator, "canShare", {
    configurable: true,
    value: vi.fn(() => true),
  });
  Object.defineProperty(navigator, "share", {
    configurable: true,
    value: share,
  });
}

function renderFacebookHandoff() {
  const handoff = resolveNativePublicationHandoff("facebook", "seller_review");
  if (!handoff) throw new Error("expected canonical handoff");
  render(<NativePublicationHandoff {...handoff} />);
  return handoff;
}

describe("native publication handoff definitions", () => {
  it("reuses exactly 16 approved social placements and channel-native image formats", () => {
    const expectedFormats = {
      google_business_profile: "feed",
      facebook: "feed",
      instagram: "story",
      linkedin: "feed",
    } as const;

    let count = 0;
    for (const [channel, format] of Object.entries(expectedFormats)) {
      for (const placement of ["general_question", "seller_review", "buyer_match", "renter_plan"]) {
        const handoff = resolveNativePublicationHandoff(channel, placement);
        expect(handoff).not.toBeNull();
        expect(handoff?.assetHref).toContain(`format=${format}`);
        expect(handoff?.filename).toMatch(/^ask-magic-mike-[a-z0-9-]+\.png$/);
        expect(handoff?.trackedUrl).toMatch(/^https:\/\/www\.askmagicmike\.com\//);
        expect(new URL(handoff!.trackedUrl).searchParams.get("utm_campaign")).toBe("amm_owned_demand_2026");
        expect(handoff?.shareText).toContain(handoff!.trackedUrl);
        expect(handoff?.proofHref).toBe(
          `/admin/distribution?proof_channel=${channel}&proof_placement=${placement}#publication-proof-${channel}`,
        );
        count += 1;
      }
    }
    expect(count).toBe(16);
  });

  it("fails closed for non-native, unknown, and traversal-shaped inputs", () => {
    expect(resolveNativePublicationHandoff("ourtown_wordpress", "general_question")).toBeNull();
    expect(resolveNativePublicationHandoff("email_signature", "general_question")).toBeNull();
    expect(resolveNativePublicationHandoff("qr_print", "general_question")).toBeNull();
    expect(resolveNativePublicationHandoff("unknown", "seller_review")).toBeNull();
    expect(resolveNativePublicationHandoff("../facebook", "seller_review")).toBeNull();
    expect(resolveNativePublicationHandoff("facebook", "../seller_review")).toBeNull();
  });

  it("resolves only exact allowlisted proof focus pairs from untrusted query input", () => {
    expect(resolveNativePublicationProofFocus("facebook", "seller_review")).toEqual({
      channelKey: "facebook",
      channelLabel: "Facebook",
      placementKey: "seller_review",
      placementLabel: "Seller review",
      proofHref: "/admin/distribution?proof_channel=facebook&proof_placement=seller_review#publication-proof-facebook",
    });
    expect(resolveNativePublicationProofFocus(undefined, "seller_review")).toBeNull();
    expect(resolveNativePublicationProofFocus(["facebook"], "seller_review")).toBeNull();
    expect(resolveNativePublicationProofFocus("facebook", "wordpress_home_value")).toBeNull();
    expect(resolveNativePublicationProofFocus("facebook", "../seller_review")).toBeNull();
    expect(resolveNativePublicationProofFocus("https://evil.example", "seller_review")).toBeNull();
  });
});

describe("NativePublicationHandoff", () => {
  beforeEach(() => {
    globalThis.fetch = vi.fn(async () => new Response(
      new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]),
      { status: 200, headers: { "Content-Type": "image/png" } },
    ));
  });

  afterEach(() => {
    cleanup();
    globalThis.fetch = originalFetch;
    Reflect.deleteProperty(navigator, "canShare");
    Reflect.deleteProperty(navigator, "share");
    vi.restoreAllMocks();
  });

  it("requires separate prepare and share gestures and uses only the protected GET asset", async () => {
    const share = vi.fn(async () => undefined);
    installShareApi(share);
    const handoff = renderFacebookHandoff();

    fireEvent.click(screen.getByRole("button", { name: "Prepare native share" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Open device share sheet" })).toBeEnabled());

    expect(globalThis.fetch).toHaveBeenCalledWith(handoff.assetHref, {
      cache: "no-store",
      credentials: "same-origin",
      headers: { Accept: "image/png" },
    });
    expect(share).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Open device share sheet" }));
    await waitFor(() => expect(share).toHaveBeenCalledTimes(1));
    expect(share).toHaveBeenCalledWith(expect.objectContaining({
      text: handoff.shareText,
      title: handoff.shareTitle,
      url: handoff.trackedUrl,
      files: [expect.any(File)],
    }));
    expect(await screen.findByText(/This is not publication proof/i)).toBeVisible();
    const proofLink = screen.getByRole("link", { name: "Review matching proof requirements" });
    expect(proofLink).toHaveAttribute("href", handoff.proofHref);
    expect(screen.getByText(/Record only after an authorized person observes/i)).toBeVisible();
  });

  it("treats a closed share sheet as no publication and keeps the prepared file reusable", async () => {
    const share = vi.fn(async () => {
      throw new DOMException("closed", "AbortError");
    });
    installShareApi(share);
    renderFacebookHandoff();

    fireEvent.click(screen.getByRole("button", { name: "Prepare native share" }));
    await screen.findByRole("button", { name: "Open device share sheet" });
    fireEvent.click(screen.getByRole("button", { name: "Open device share sheet" }));

    await waitFor(() => expect(screen.getByText(/Tap again to open the device share sheet/i)).toBeVisible());
    expect(screen.getByRole("button", { name: "Open device share sheet" })).toBeEnabled();
    expect(screen.queryByRole("link", { name: "Review matching proof requirements" })).not.toBeInTheDocument();
  });

  it("keeps a prepared image reusable when the device handoff fails", async () => {
    const share = vi.fn(async () => {
      throw new DOMException("rejected", "DataError");
    });
    installShareApi(share);
    renderFacebookHandoff();

    fireEvent.click(screen.getByRole("button", { name: "Prepare native share" }));
    await screen.findByRole("button", { name: "Open device share sheet" });
    fireEvent.click(screen.getByRole("button", { name: "Open device share sheet" }));

    await waitFor(() => expect(screen.getByText(/Nothing was published/i)).toBeVisible());
    expect(screen.getByText(/prepared image remains ready/i)).toBeVisible();
    expect(screen.getByRole("button", { name: "Open device share sheet" })).toBeEnabled();
    expect(screen.queryByRole("link", { name: "Review matching proof requirements" })).not.toBeInTheDocument();
  });

  it("fails before fetching when a proof return path is not exact and same-origin", async () => {
    installShareApi(vi.fn());
    const handoff = resolveNativePublicationHandoff("facebook", "seller_review");
    if (!handoff) throw new Error("expected canonical handoff");
    render(<NativePublicationHandoff {...handoff} proofHref="//evil.example/admin/distribution" />);

    fireEvent.click(screen.getByRole("button", { name: "Prepare native share" }));

    await waitFor(() => expect(screen.getByText(/could not be prepared/i)).toBeVisible());
    expect(globalThis.fetch).not.toHaveBeenCalled();
    expect(navigator.share).not.toHaveBeenCalled();
  });

  it("fails closed when file sharing is unavailable or an asset exceeds the bounded size", async () => {
    installShareApi(vi.fn());
    Object.defineProperty(navigator, "canShare", { configurable: true, value: vi.fn(() => false) });
    renderFacebookHandoff();
    fireEvent.click(screen.getByRole("button", { name: "Prepare native share" }));
    await waitFor(() => expect(screen.getByText(/cannot share the approved image/i)).toBeVisible());
    cleanup();

    Object.defineProperty(navigator, "canShare", { configurable: true, value: vi.fn(() => true) });
    globalThis.fetch = vi.fn(async () => ({
      ok: true,
      headers: new Headers({ "Content-Type": "image/png" }),
      blob: vi.fn(async () => ({
        size: NATIVE_PUBLICATION_MAX_IMAGE_BYTES + 1,
        type: "image/png",
      } as Blob)),
    } as unknown as Response));
    renderFacebookHandoff();
    fireEvent.click(screen.getByRole("button", { name: "Prepare native share" }));
    await waitFor(() => expect(screen.getByText(/could not be prepared/i)).toBeVisible());
    expect(screen.getByText(/No content was posted or transmitted/i)).toBeVisible();
  });

  it("rejects active or masquerading content even when a response claims image/png", async () => {
    installShareApi(vi.fn());
    globalThis.fetch = vi.fn(async () => new Response(
      "<script>alert('not a png')</script>",
      { status: 200, headers: { "Content-Type": "image/png" } },
    ));
    renderFacebookHandoff();

    fireEvent.click(screen.getByRole("button", { name: "Prepare native share" }));

    await waitFor(() => expect(screen.getByText(/could not be prepared/i)).toBeVisible());
    expect(screen.getByText(/No content was posted or transmitted/i)).toBeVisible();
    expect(navigator.share).not.toHaveBeenCalled();
  });
});

describe("native publication handoff source boundary", () => {
  const component = fs.readFileSync(
    path.join(root, "app/admin/distribution/NativePublicationHandoff.tsx"),
    "utf8",
  );
  const page = fs.readFileSync(path.join(root, "app/admin/distribution/page.tsx"), "utf8");

  it("keeps native delivery user-initiated, same-origin, read-only, and explicitly non-authoritative", () => {
    expect(component).toContain('type="button"');
    expect(component).toContain("navigator.canShare");
    expect(component).toContain("navigator.share");
    expect(component).toContain('credentials: "same-origin"');
    expect(component).toContain('cache: "no-store"');
    expect(component).toContain("This is not publication proof");
    expect(component).toContain("trustedProofHref");
    expect(component).toContain("APPROVED_PROOF_CHANNELS");
    expect(component).toContain("Review matching proof requirements");
    expect(component).toContain("PNG_SIGNATURE");
    expect(component).not.toContain('from "../../lib/growth/native-publication-handoff"');
    expect(component).not.toMatch(/useEffect|sendBeacon|XMLHttpRequest|method:\s*["'](?:POST|PUT|PATCH|DELETE)|provider\.com/i);
    expect(page).toContain("resolveNativePublicationHandoff");
    expect(page).toContain("resolveNativePublicationProofFocus");
    expect(page).toContain("data-publication-proof-focus");
    expect(page).toContain("defaultPlacementKey");
    expect(page).toContain("<NativePublicationHandoff");
  });
});
