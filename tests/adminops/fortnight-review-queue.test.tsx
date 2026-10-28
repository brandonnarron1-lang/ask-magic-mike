import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { FortnightReviewQueue } from "../../app/admin/distribution/FortnightReviewQueue";
import { CopyDemandAsset } from "../../app/admin/distribution/CopyDemandAsset";
import * as content from "../../src/lib/content/reviewed-launch-work-item";
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

it("renders closed native disclosures and review-only controls, with no network or approval action", () => {
  const fetch = vi.fn(); vi.stubGlobal("fetch", fetch);
  const { container } = render(<FortnightReviewQueue />);
  const panel = screen.getByRole("region", { name: "Fortnight review queue" });
  expect(panel.querySelector("details")).not.toHaveAttribute("open");
  expect(container.querySelectorAll("ol > li")).toHaveLength(14);
  expect(screen.getByText(/Nothing here is scheduled or published/)).toBeInTheDocument();
  expect(screen.queryAllByText(/REFERENCE_ONLY_NOT_REGISTERED/)).toHaveLength(0);
  expect(screen.getAllByText(/permission not established/)).toHaveLength(3);
  expect(container.querySelectorAll('button[type="button"]')).toHaveLength(14);
  expect(container.querySelector("form")).toBeNull();
  expect(container.querySelector('button[type="submit"]')).toBeNull();
  expect(fetch).not.toHaveBeenCalled();
});
it("shows an unavailable alert instead of drafts on an integrity failure", () => {
  vi.spyOn(content, "currentFortnightReviewQueue").mockImplementationOnce(() => { throw Error("launch_asset_changed_review_required"); });
  render(<FortnightReviewQueue />);
  expect(screen.getByRole("alert")).toHaveTextContent("could not be verified");
  expect(screen.queryAllByRole("button")).toHaveLength(0);
});
it("reports clipboard success and failure truthfully, with no fetch or send", async () => {
  const writeText = vi.fn().mockResolvedValueOnce(undefined).mockRejectedValueOnce(Error("clipboard_denied"));
  vi.stubGlobal("navigator", { clipboard: { writeText } }); vi.stubGlobal("isSecureContext", true);
  const fetch = vi.fn(); vi.stubGlobal("fetch", fetch);
  render(<CopyDemandAsset label="Copy review" value="REVIEW DRAFT — NOT PUBLISHED" comfortable />);
  const button = screen.getByRole("button", { name: "Copy review to clipboard" });
  fireEvent.click(button); expect(await screen.findByText("Copied")).toBeVisible();
  fireEvent.click(button); expect(await screen.findByText("Copy failed")).toBeVisible();
  expect(writeText).toHaveBeenCalledWith("REVIEW DRAFT — NOT PUBLISHED"); expect(fetch).not.toHaveBeenCalled();
});
