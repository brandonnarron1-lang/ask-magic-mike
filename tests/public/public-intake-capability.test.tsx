import { act, cleanup, fireEvent, render, renderHook, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  readPublicIntakeCapability,
  usePublicIntakeCapability,
} from "../../app/lib/publicIntakeCapability";
import { IntakeModeNotice, LIVE_HOME_VALUE_URL } from "../../app/components/black-diamond/IntakeModeNotice";

const health = (mode: unknown) => ({ ok: true, service: "ask-magic-mike", public_intake: mode });
const jsonResponse = (value: unknown, status = 200) => new Response(JSON.stringify(value), {
  status, headers: { "Content-Type": "application/json" },
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("categorical public intake validation", () => {
  it.each(["live", "synthetic_qa", "read_only"])("accepts only known health category %s", (mode) => {
    expect(readPublicIntakeCapability(health(mode))).toBe(mode);
  });

  it.each([
    undefined, null, [], "live", true, {}, { public_intake: "live" },
    { ...health("live"), ok: false }, { ...health("live"), service: "other" },
    health("production"), health("checking"), health(true), health({ mode: "live" }),
  ])("fails closed for malformed, legacy, or unfamiliar response (%#)", (value) => {
    expect(readPublicIntakeCapability(value)).toBe("read_only");
  });
});

describe("usePublicIntakeCapability", () => {
  it("starts checking and fetches only public health without query, PII, caching, or referrer", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(health("live")));
    vi.stubGlobal("fetch", fetchMock);
    const storageSpy = vi.spyOn(Storage.prototype, "setItem");
    const { result } = renderHook(() => usePublicIntakeCapability());
    expect(result.current).toBe("checking");
    await waitFor(() => expect(result.current).toBe("live"));
    expect(fetchMock).toHaveBeenCalledWith("/api/health/live", expect.objectContaining({
      method: "GET", cache: "no-store", credentials: "same-origin", redirect: "error",
      referrerPolicy: "no-referrer", signal: expect.any(AbortSignal),
    }));
    expect(fetchMock.mock.calls[0][1]).not.toHaveProperty("body");
    expect(storageSpy).not.toHaveBeenCalled();
  });

  it.each(["read_only", "synthetic_qa"] as const)("returns the attested category %s", async (mode) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(health(mode))));
    const { result } = renderHook(() => usePublicIntakeCapability());
    await waitFor(() => expect(result.current).toBe(mode));
  });

  it.each([
    () => Promise.reject(new Error("offline")),
    () => Promise.resolve(jsonResponse(health("live"), 503)),
    () => Promise.resolve(new Response("invalid JSON", { headers: { "Content-Type": "application/json" } })),
    () => Promise.resolve(new Response("<html>sign in</html>", { headers: { "Content-Type": "text/html" } })),
    () => Promise.resolve(jsonResponse({ environment: "production", database_configured: true })),
    () => Promise.resolve(jsonResponse(health("unknown"))),
    () => Promise.resolve({ ...jsonResponse(health("live")), ok: true, redirected: true, headers: new Headers({ "Content-Type": "application/json" }) }),
  ])("fails closed for health transport or response failure (%#)", async (request) => {
    vi.stubGlobal("fetch", vi.fn(request));
    const { result } = renderHook(() => usePublicIntakeCapability());
    await waitFor(() => expect(result.current).toBe("read_only"));
  });

  it("rechecks on pageshow restoration and never retains the old live category while checking", async () => {
    let restoredResponse!: (response: Response) => void;
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse(health("live")))
      .mockImplementationOnce(() => new Promise<Response>((resolve) => { restoredResponse = resolve; }));
    vi.stubGlobal("fetch", fetchMock);
    const { result } = renderHook(() => usePublicIntakeCapability());
    await waitFor(() => expect(result.current).toBe("live"));
    act(() => window.dispatchEvent(new PageTransitionEvent("pageshow", { persisted: true })));
    expect(result.current).toBe("checking");
    expect(fetchMock).toHaveBeenCalledTimes(2);
    await act(async () => restoredResponse(jsonResponse(health("read_only"))));
    expect(result.current).toBe("read_only");
  });

  it("aborts stale requests and refuses late live responses after a new restoration check", async () => {
    const pending: Array<(response: Response) => void> = [];
    const signals: AbortSignal[] = [];
    vi.stubGlobal("fetch", vi.fn((_input: string, init: RequestInit) => {
      signals.push(init.signal as AbortSignal);
      return new Promise<Response>((resolve) => pending.push(resolve));
    }));
    const { result } = renderHook(() => usePublicIntakeCapability());
    act(() => window.dispatchEvent(new Event("pageshow")));
    expect(signals[0].aborted).toBe(true);
    await act(async () => pending[1](jsonResponse(health("read_only"))));
    expect(result.current).toBe("read_only");
    await act(async () => pending[0](jsonResponse(health("live"))));
    expect(result.current).toBe("read_only");
  });

  it("times out closed and ignores a transport that resolves live after abort", async () => {
    vi.useFakeTimers();
    let resolveRequest!: (response: Response) => void;
    let signal!: AbortSignal;
    vi.stubGlobal("fetch", vi.fn((_input: string, init: RequestInit) => {
      signal = init.signal as AbortSignal;
      return new Promise<Response>((resolve) => { resolveRequest = resolve; });
    }));
    const { result } = renderHook(() => usePublicIntakeCapability());
    await act(async () => vi.advanceTimersByTime(8_000));
    expect(signal.aborted).toBe(true);
    expect(result.current).toBe("read_only");
    await act(async () => resolveRequest(jsonResponse(health("live"))));
    expect(result.current).toBe("read_only");
  });

  it("aborts on unmount and removes the restoration listener", () => {
    const fetchMock = vi.fn().mockImplementation(() => new Promise(() => {}));
    vi.stubGlobal("fetch", fetchMock);
    const { unmount } = renderHook(() => usePublicIntakeCapability());
    const signal = fetchMock.mock.calls[0][1].signal as AbortSignal;
    unmount();
    expect(signal.aborted).toBe(true);
    act(() => window.dispatchEvent(new Event("pageshow")));
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe("IntakeModeNotice", () => {
  it("identifies configured live intake without a demo warning or forwarding link", () => {
    const { container } = render(<IntakeModeNotice mode="live" />);
    expect(container).toHaveTextContent("Live Home Value intake");
    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("asks visitors to wait before providing personal details while checking", () => {
    render(<IntakeModeNotice mode="checking" />);
    expect(screen.getByText("Checking availability. Please wait.")).toBeVisible();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it.each(["read_only", "synthetic_qa"] as const)("links %s only to the fixed live form without forwarding data", (mode) => {
    window.history.replaceState({}, "", "/home-value?email=fictional%40example.test&consent=true#contact");
    render(<IntakeModeNotice mode={mode} className="mb-6" />);
    fireEvent.click(screen.getByText("About this form’s availability"));
    const link = screen.getByRole("link", { name: "Open the live Home Value form" });
    expect(LIVE_HOME_VALUE_URL).toBe("https://www.askmagicmike.com/home-value");
    expect(link).toHaveAttribute("href", "https://www.askmagicmike.com/home-value");
    expect(link).toHaveAttribute("referrerpolicy", "no-referrer");
    expect(link).toHaveAttribute("rel", "noreferrer");
    expect(screen.getByRole("status").closest("[data-intake-mode]")).toHaveAttribute("data-intake-mode", mode);
    expect(screen.getByRole("status").closest("[data-intake-mode]")).toHaveClass("mb-6");
  });

  it("clearly labels read-only exploration as demo and warns against personal contact details", () => {
    render(<IntakeModeNotice mode="read_only" />);
    expect(screen.getByText("Read-only demo. Do not enter personal details.")).toBeVisible();
    fireEvent.click(screen.getByText("About this form’s availability"));
    expect(screen.getByText(/Read-only demo — requests cannot be saved here/)).toBeVisible();
  });

  it("requires fictional QA details and explains independently disabled outbound contact", () => {
    render(<IntakeModeNotice mode="synthetic_qa" />);
    expect(screen.getByText("Fictional QA details only. No outbound contact.")).toBeVisible();
    fireEvent.click(screen.getByText("About this form’s availability"));
    expect(screen.getByText(/Synthetic QA only — not a live intake/)).toHaveTextContent("fictional test details, not personal information");
    expect(screen.getByText(/Synthetic QA only — not a live intake/)).toHaveTextContent("outbound contact is disabled");
  });
});
