import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PublicExperimentContext } from "../../app/lib/growth/experiment-registry";
import { HOME_VALUE_TRUST_EXPERIMENT } from "../../app/lib/growth/experiment-registry";
import { HomeValueExperimentExperience } from "../../app/components/black-diamond/HomeValueExperimentExperience";
import HomeValuePage from "../../app/home-value/page";

const mocks = vi.hoisted(() => ({ capability: vi.fn(), exposure: vi.fn() }));

vi.mock("../../app/lib/publicIntakeCapability", () => ({ usePublicIntakeCapability: mocks.capability }));
vi.mock("../../app/lib/growth/public-experiment-client", () => ({ recordExperimentEvent: mocks.exposure }));
vi.mock("../../app/components/black-diamond/HomeValueFunnel", () => ({
  HomeValueFunnel: ({ experimentContext, surface }: { experimentContext: PublicExperimentContext | null; surface: string }) => (
    <div data-testid="funnel" data-surface={surface} data-variant={experimentContext?.variantKey}>
      <input aria-label="Property address" />
    </div>
  ),
}));
vi.mock("../../app/components/black-diamond/BlackDiamondHeader", () => ({ BlackDiamondHeader: () => <header>Ask Magic Mike</header> }));
vi.mock("../../app/components/black-diamond/BlackDiamondShell", () => ({ Footer: () => <footer>Our Town Properties</footer> }));
vi.mock("../../app/components/black-diamond/PageTracker", () => ({ PageTracker: () => null }));
vi.mock("../../app/components/black-diamond/TrustProofStrip", () => ({ TrustProofStrip: () => null }));

beforeEach(() => {
  mocks.capability.mockReturnValue("read_only");
  mocks.exposure.mockResolvedValue(null);
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.unstubAllGlobals();
  window.sessionStorage.clear();
});

describe("Home Value capability approach", () => {
  it.each(["checking", "read_only", "synthetic_qa"])("warns %s before the mobile approach and any input", (mode) => {
    mocks.capability.mockReturnValue(mode);
    render(<HomeValueExperimentExperience />);
    const notice = screen.getByRole("status");
    const heading = screen.getByRole("heading", { level: 1 });
    const input = screen.getByLabelText("Property address");
    expect(notice.compareDocumentPosition(heading) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(notice.compareDocumentPosition(input) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByTestId("funnel")).toHaveAttribute("data-surface", "home_value_page");
  });

  it("leaves the live approach without a demo warning", () => {
    mocks.capability.mockReturnValue("live");
    render(<HomeValueExperimentExperience />);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("uses the short mobile heading and intro while keeping the desktop control variant", () => {
    render(<HomeValueExperimentExperience />);
    expect(screen.getByText("Request a local home value review.")).toHaveClass("lg:hidden");
    expect(screen.getByText(/Share the address and your best contact method/)).toHaveClass("lg:hidden");
    const control = HOME_VALUE_TRUST_EXPERIMENT.variants[0];
    expect(screen.getByText(control.headline)).toHaveClass("hidden", "lg:inline");
    expect(screen.getByText(control.description)).toHaveClass("hidden", "lg:inline");
  });

  it("preserves assigned desktop experiment copy and context for the existing funnel", async () => {
    mocks.exposure.mockResolvedValue({ active: true, variant_key: "broker_review" });
    vi.stubGlobal("crypto", {
      randomUUID: () => "11111111-1111-4111-8111-111111111111",
      subtle: { digest: vi.fn().mockResolvedValue(new Uint8Array(32).buffer) },
    });
    render(<HomeValueExperimentExperience />);
    await waitFor(() => expect(screen.getByTestId("funnel")).toHaveAttribute("data-variant", "broker_review"));
    const treatment = HOME_VALUE_TRUST_EXPERIMENT.variants.find((variant) => variant.key === "broker_review")!;
    expect(screen.getByText(treatment.headline)).toHaveClass("hidden", "lg:inline");
    expect(screen.getByText(treatment.description)).toHaveClass("hidden", "lg:inline");
    expect(screen.getByText("Request a local home value review.")).toHaveClass("lg:hidden");
  });

  it("reduces mobile page padding while preserving desktop spacing and the existing page", () => {
    const { container } = render(<HomeValuePage />);
    const content = container.querySelector("#page-content");
    const headerSection = container.querySelector("header")?.parentElement?.parentElement;
    expect(content).toHaveClass("py-6", "lg:py-14");
    expect(headerSection).toHaveClass("py-3", "lg:py-6");
    expect(screen.getByText("Ask Magic Mike")).toBeInTheDocument();
    expect(screen.getByText("Our Town Properties")).toBeInTheDocument();
    expect(screen.getByLabelText("Property address")).toBeInTheDocument();
  });
});
