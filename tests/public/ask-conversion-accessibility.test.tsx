import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { ImgHTMLAttributes } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next/image", () => ({
  default: ({
    priority: _priority,
    fill: _fill,
    ...props
  }: ImgHTMLAttributes<HTMLImageElement> & { priority?: boolean; fill?: boolean }) => (
    // The image itself is outside this test's accessibility contract.
    // eslint-disable-next-line @next/next/no-img-element
    <img {...props} />
  ),
}));

vi.mock("../../app/lib/analytics", () => ({ trackEvent: vi.fn() }));
vi.mock("next/navigation", () => ({ usePathname: () => "/ask" }));

import { AskMikeChatPanel } from "../../app/components/black-diamond/AskMikeChatPanel";
import { BlackDiamondHeader } from "../../app/components/black-diamond/BlackDiamondHeader";
import { trackEvent } from "../../app/lib/analytics";

const root = process.cwd();

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
});

function read(path: string) {
  return readFileSync(join(root, path), "utf8");
}

function businessCalls(calls: Array<[RequestInfo | URL, RequestInit?]>) {
  for (const [url, init] of calls) if (String(url) === "/api/health/live") {
    expect(init).toMatchObject({ method: "GET", cache: "no-store", redirect: "error", referrerPolicy: "no-referrer" });
    expect(init).not.toHaveProperty("body");
  }
  return calls.filter(([url]) => String(url) !== "/api/health/live");
}

afterEach(() => {
  vi.useRealTimers();
  cleanup();
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

describe("Ask Mike conversion clarity and keyboard access", () => {
  it("opens immediate manual intake, reuses the typed request and asks for permission without an AI call", async()=>{
    const user=userEvent.setup();
    const fetchMock=vi.fn(async(_input:RequestInfo|URL,_init?:RequestInit)=>new Response("{}",{status:503}));
    vi.stubGlobal("fetch",fetchMock);
    render(<AskMikeChatPanel/>);
    await user.type(screen.getByLabelText(/Your real estate question/),"Please have a person discuss my selling options.");
    await user.click(screen.getByRole("button",{name:"Request a person"}));
    expect(screen.getByLabelText(/Question for local follow-up/)).toHaveValue("Please have a person discuss my selling options.");
    await waitFor(()=>expect(screen.getByLabelText(/Question for local follow-up/)).toHaveFocus());
    expect(businessCalls(fetchMock.mock.calls)).toHaveLength(0);
    expect(screen.getByRole("checkbox",{name:/I agree that Our Town Properties/})).not.toBeChecked();
    await user.click(screen.getByRole("button",{name:"Request local follow-up"}));
    expect(await screen.findByRole("alert")).toHaveTextContent("email address or phone number");
    expect(businessCalls(fetchMock.mock.calls)).toHaveLength(0);
  });
  it("AI failure leaves manual intake usable and never claims a save",async()=>{
    const user=userEvent.setup();
    vi.stubGlobal("fetch",vi.fn(async()=>new Response("{}",{status:503})));
    render(<AskMikeChatPanel/>);
    await user.type(screen.getByLabelText(/Your real estate question/),"Please help");
    await user.click(screen.getByRole("button",{name:"Send Question"}));
    expect(await screen.findByRole("alert")).toHaveTextContent("answer did not come through");
    await user.click(screen.getByRole("button",{name:"Request a person"}));
    expect(screen.getByLabelText(/Question for local follow-up/)).toBeVisible();
    expect(screen.queryByText(/Your request is saved/)).not.toBeInTheDocument();
  });
  it("freezes an uncertain request and reopens/retries the identical body and key only",async()=>{
    const user=userEvent.setup(), bodies:string[]=[], keys:unknown[]=[];
    vi.stubGlobal("fetch",vi.fn(async(url:RequestInfo|URL,init?:RequestInit)=>{
      if(String(url)!=="/api/leads") return new Response("{}",{status:503});
      bodies.push(String(init?.body));keys.push((init?.headers as Record<string,string>)["Idempotency-Key"]);
      return bodies.length===1 ? new Response("{}",{status:500}) : new Response(JSON.stringify({lead_id:"synthetic-id",session_id:"synthetic-session",review_only:false}));
    }));
    render(<AskMikeChatPanel/>);
    await user.click(screen.getByRole("button",{name:"Request a person"}));
    await user.type(screen.getByLabelText("Email"),"synthetic@example.test");
    await user.click(screen.getByRole("checkbox",{name:/I agree that Our Town Properties/}));
    const send=screen.getByRole("button",{name:"Request local follow-up"});
    fireEvent.click(send); fireEvent.click(send);
    expect(await screen.findByRole("alert")).toHaveTextContent("outcome is not confirmed");
    expect(bodies).toHaveLength(1);
    expect(screen.getByLabelText("Email")).toBeDisabled();
    await user.click(screen.getByRole("button",{name:"Request a person"}));
    await user.click(screen.getByRole("button",{name:"Retry identical follow-up request"}));
    expect(await screen.findByText(/Your request is saved/)).toBeVisible();
    expect(bodies).toHaveLength(2);expect(bodies[1]).toBe(bodies[0]);expect(keys[1]).toBe(keys[0]);
    expect(screen.getByRole("button",{name:"Request a conversation"})).toBeVisible();
  });
  it.each([{review_only:true},{review_only:undefined},{review_only:false,duplicate_of_lead_id:"never-display-this-id"}])("keeps held/unknown saved outcomes neutral: %j",async outcome=>{
    const user=userEvent.setup();
    vi.stubGlobal("fetch",vi.fn(async(url:RequestInfo|URL)=>new Response(JSON.stringify(String(url)==="/api/leads" ? {lead_id:"synthetic-id",message:"INTERNAL QA — intercepted before durable storage.",...outcome}:{}))));
    render(<AskMikeChatPanel/>);
    await user.click(screen.getByRole("button",{name:"Request a person"}));
    await user.type(screen.getByLabelText("Phone"),"2525550199");
    await user.click(screen.getByRole("checkbox",{name:/I agree that Our Town Properties/}));
    await user.click(screen.getByRole("button",{name:"Request local follow-up"}));
    expect(await screen.findByText("Your request is stored for review.")).toBeVisible();
    expect(screen.queryByRole("button",{name:"Request a conversation"})).not.toBeInTheDocument();
    expect(document.body.textContent).not.toContain("never-display-this-id");
    expect(document.body.textContent).not.toContain("intercepted before durable storage");
  });
  it("shows approved sources and lets the visitor correct the handoff without submitting", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => new Response(JSON.stringify({
      message:"Approved buying-plan requirements.",
      citations:[{id:"offer-buyer",title:"Approved source",url:"https://www.askmagicmike.com/api/experience/v1",version:"v1",asOf:"2026-10-17T21:05:48.635Z"}],
      limitation:"Not Mike personally.",
    }), {status:200}));
    vi.stubGlobal("fetch", fetchMock);
    render(<AskMikeChatPanel />);
    await user.type(screen.getByLabelText(/Your real estate question/), "How do I buy?");
    await user.click(screen.getByRole("button",{name:"Send Question"}));
    expect(await screen.findByRole("link",{name:"Approved source"})).toHaveAttribute("href","https://www.askmagicmike.com/api/experience/v1");
    expect(JSON.parse(String(businessCalls(fetchMock.mock.calls)[0][1]?.body))).toMatchObject({knowledge_version:"amm.public-knowledge.v1"});
    const review = screen.getByRole("textbox",{name:/Question for local follow-up/});
    await user.clear(review);
    expect(review).toBeVisible();
    await user.type(review,"My corrected, user-reviewed question");
    expect(review).toHaveValue("My corrected, user-reviewed question");
    expect(screen.getByLabelText("Email")).toHaveValue("");
    expect(screen.getByRole("checkbox",{name:/I agree that Our Town Properties/})).not.toBeChecked();
    expect(businessCalls(fetchMock.mock.calls)).toHaveLength(1);
  });

  it("cancels an in-flight answer without creating or submitting a handoff", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn((_input: RequestInfo | URL, init?: RequestInit) => new Promise<Response>((_resolve,reject) => {
      init?.signal?.addEventListener("abort",()=>reject(new DOMException("Stopped","AbortError")),{once:true});
    }));
    vi.stubGlobal("fetch",fetchMock);
    render(<AskMikeChatPanel />);
    await user.type(screen.getByLabelText(/Your real estate question/),"How do I buy?");
    await user.click(screen.getByRole("button",{name:"Send Question"}));
    await user.click(screen.getByRole("button",{name:"Stop answer"}));
    expect(await screen.findByRole("alert")).toHaveTextContent("No follow-up request was submitted");
    expect(screen.queryByRole("textbox",{name:/Question for local follow-up/})).not.toBeInTheDocument();
    expect(businessCalls(fetchMock.mock.calls)).toHaveLength(1);
    expect(businessCalls(fetchMock.mock.calls)[0][1]?.signal?.aborted).toBe(true);
  });

  it("makes the skip link the first public-header control and points it at one focus target", () => {
    render(
      <>
        <BlackDiamondHeader />
        <section id="page-content" tabIndex={-1}>Primary content</section>
      </>,
    );

    const skip = screen.getByRole("link", { name: "Skip to main content" });
    const content = screen.getByText("Primary content");
    expect(skip).toHaveAttribute("href", "#page-content");
    expect(skip).toHaveClass("sr-only", "focus:not-sr-only");
    expect(document.querySelector("header a, header button, header input")).toBe(skip);
    vi.useFakeTimers();
    fireEvent.click(skip);
    expect(content).toHaveFocus();
    skip.focus();
    act(() => vi.runAllTimers());
    expect(content).toHaveFocus();
    vi.useRealTimers();
  });

  it("gives the chat question a visible required label and the same limit as the API", () => {
    render(<AskMikeChatPanel />);

    expect(screen.getByRole("heading", {
      level: 2,
      name: "Start with the real estate question on your mind.",
    })).toBeVisible();

    const question = screen.getByLabelText(/Your real estate question/);
    expect(question).toBeRequired();
    expect(question).toHaveAttribute("name", "question");
    expect(question).toHaveAttribute("type", "text");
    expect(question).toHaveAttribute("maxlength", "2000");
    expect(question).toHaveAttribute("autocomplete", "off");
    expect(question).toHaveAttribute("enterkeyhint", "send");
    expect(question).toHaveAttribute("aria-describedby", "ask-mike-question-help");
    expect(screen.getByText(/For pricing, listing strategy/)).toHaveAttribute(
      "id",
      "ask-mike-question-help",
    );
    expect(screen.getByRole("button", { name: "Send Question" })).toHaveAttribute(
      "type",
      "submit",
    );

    const chatRoute = read("app/api/chat/route.ts");
    expect(chatRoute).toContain("MAX_CHAT_MESSAGE_CHARACTERS = 2_000");
    expect(chatRoute).toContain("message.length > MAX_CHAT_MESSAGE_CHARACTERS");
    expect(chatRoute).toContain("Message must be 2,000 characters or fewer.");
  });

  it("keeps a chat answer anonymous until the visitor explicitly requests follow-up", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      if (String(input) === "/api/chat/message") {
        return new Response(JSON.stringify({ message: "Synthetic answer for internal QA." }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      throw new Error(`Unexpected request: ${String(input)}`);
    });
    vi.stubGlobal("fetch", fetchMock);
    render(<AskMikeChatPanel />);

    await user.type(screen.getByLabelText(/Your real estate question/), "How should I prepare to sell?");
    await user.click(screen.getByRole("button", { name: "Send Question" }));

    expect(await screen.findByText("Synthetic answer for internal QA.")).toBeVisible();
    expect(screen.getByRole("heading", { name: "Want Mike's team to contact you?" })).toBeVisible();
    expect(screen.getByText(/Sending a question by itself does not create a contact lead/)).toBeVisible();
    expect(screen.queryByRole("button", { name: "Request a conversation" })).not.toBeInTheDocument();
    expect(businessCalls(fetchMock.mock.calls)).toHaveLength(1);
    expect(fetchMock).not.toHaveBeenCalledWith("/api/leads", expect.anything());
    expect(vi.mocked(trackEvent).mock.calls.some(([event]) => event === "lead_created")).toBe(false);
  });

  it("requires a contact method and explicit consent before calling the lead API", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      if (String(input) === "/api/chat/message") {
        return new Response(JSON.stringify({ message: "Synthetic answer for internal QA." }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      throw new Error(`Unexpected request: ${String(input)}`);
    });
    vi.stubGlobal("fetch", fetchMock);
    render(<AskMikeChatPanel />);

    await user.type(screen.getByLabelText(/Your real estate question/), "Can Mike review my timing?");
    await user.click(screen.getByRole("button", { name: "Send Question" }));
    await screen.findByText("Synthetic answer for internal QA.");

    await user.click(screen.getByRole("button", { name: "Request local follow-up" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/email address or phone number/i);
    expect(screen.getByLabelText("Email")).toHaveFocus();
    expect(businessCalls(fetchMock.mock.calls)).toHaveLength(1);

    await user.type(screen.getByLabelText("Email"), "qa@example.test");
    await user.click(screen.getByRole("button", { name: "Request local follow-up" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/confirm contact permission/i);
    expect(screen.getByRole("checkbox", { name: /I agree that Our Town Properties/ })).toHaveFocus();
    expect(screen.getByText(/Consent language version: amm_contact_v2 · Required/)).toBeVisible();
    expect(businessCalls(fetchMock.mock.calls)).toHaveLength(1);
  });

  it("keeps the chat answer visible when an explicit follow-up save fails", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      if (String(input) === "/api/chat/message") {
        return new Response(JSON.stringify({ message: "Synthetic answer for internal QA." }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      if (String(input) === "/api/leads") {
        const payload = JSON.parse(String(init?.body)) as Record<string, unknown>;
        expect(init?.headers).toMatchObject({ "Idempotency-Key": payload.idempotency_key });
        expect(payload.widget_session_id).toBe(payload.idempotency_key);
        expect(payload).toMatchObject({
          funnel_type: "chat",
          email: "qa@example.test",
          consent: true,
          consent_email: true,
          consent_sms: false,
          consent_source: "ask_page:ask-follow-up",
        });
        return new Response(JSON.stringify({ error: "Synthetic lead save failure." }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        });
      }
      throw new Error(`Unexpected request: ${String(input)}`);
    });
    vi.stubGlobal("fetch", fetchMock);
    render(<AskMikeChatPanel />);

    await user.type(screen.getByLabelText(/Your real estate question/), "How should I prepare to sell?");
    await user.click(screen.getByRole("button", { name: "Send Question" }));
    expect(await screen.findByText("Synthetic answer for internal QA.")).toBeVisible();
    await user.type(screen.getByLabelText("Email"), "qa@example.test");
    await user.click(screen.getByRole("checkbox", { name: /I agree that Our Town Properties/ }));
    await user.click(screen.getByRole("button", { name: "Request local follow-up" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Synthetic lead save failure.");
    expect(screen.getByText("Synthetic answer for internal QA.")).toBeVisible();
    await waitFor(() => {
      const failureCall = vi.mocked(trackEvent).mock.calls.find(([event]) => event === "lead_submit_failed");
      expect(failureCall?.[2]).toEqual({
        funnel_name: "ask_mike_chat",
        lead_source_surface: "ask_page",
        step_name: "contact_follow_up",
      });
      expect(failureCall?.[3]?.sessionId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      );
    });
  });

  it.each([
    { label: "fresh durable capture", replay: false, emitsConversion: true },
    { label: "idempotent replay", replay: true, emitsConversion: false },
  ])("keeps Ask browser conversion aligned with $label", async ({ replay, emitsConversion }) => {
    const user = userEvent.setup();
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      if (String(input) === "/api/chat/message") {
        return new Response(JSON.stringify({ message: "Synthetic answer for internal QA." }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      if (String(input) === "/api/leads") {
        const payload = JSON.parse(String(init?.body)) as Record<string, unknown>;
        return new Response(JSON.stringify({
          lead_id: "qa_intercepted_chat_lead",
          review_only: replay,
          session_id: payload.widget_session_id,
        }), {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            ...(replay ? { "X-AMM-Idempotent-Replay": "1" } : {}),
          },
        });
      }
      throw new Error(`Unexpected request: ${String(input)}`);
    });
    vi.stubGlobal("fetch", fetchMock);
    render(<AskMikeChatPanel />);

    await user.type(screen.getByLabelText(/Your real estate question/), "What should I verify before listing?");
    await user.click(screen.getByRole("button", { name: "Send Question" }));

    expect(await screen.findByText("Synthetic answer for internal QA.")).toBeVisible();
    expect(fetchMock.mock.calls.filter(([input]) => String(input) === "/api/leads")).toHaveLength(0);
    expect(screen.queryByRole("button", { name: "Request a conversation" })).not.toBeInTheDocument();
    await user.type(screen.getByLabelText("Phone"), "252-555-0199");
    await user.click(screen.getByRole("checkbox", { name: /I agree that Our Town Properties/ }));
    await user.click(screen.getByRole("button", { name: "Request local follow-up" }));
    if (replay) {
      expect(await screen.findByText("Your request is stored for review.")).toBeVisible();
      expect(screen.queryByRole("button", {name:"Request a conversation"})).not.toBeInTheDocument();
    } else expect(await screen.findByRole("button", { name: "Request a conversation" })).toBeVisible();
    await waitFor(() => {
      expect(
        vi.mocked(trackEvent).mock.calls.some(([event]) => event === "lead_created"),
      ).toBe(emitsConversion);
    });
  });

  it("keeps every shared-header surface wired to one keyboard-focus destination", () => {
    const sharedHeaderSurfaces = [
      "app/ask/page.tsx",
      "app/buy/page.tsx",
      "app/components/black-diamond/HeroSection.tsx",
      "app/components/black-diamond/PublicInfoPage.tsx",
      "app/home-value/page.tsx",
      "app/integrations/ourtownproperties/page.tsx",
      "app/not-found.tsx",
      "app/open-house/[propertyOrId]/page.tsx",
      "app/plan/page.tsx",
      "app/rent/page.tsx",
      "app/sell/page.tsx",
      "app/social-preview/page.tsx",
    ];

    for (const path of sharedHeaderSurfaces) {
      const source = read(path);
      expect(source, path).toContain('id="page-content"');
      expect(source, path).toContain("tabIndex={-1}");
    }

    expect(read("app/ask/page.tsx")).toContain(
      "Ask Mike. Get a practical local next step.",
    );
    expect(read("app/ask/page.tsx")).not.toContain("advisor interface");
    expect(read("app/components/black-diamond/AskMikeChatPanel.tsx")).not.toContain(
      "local-advisor interface",
    );
  });
});
