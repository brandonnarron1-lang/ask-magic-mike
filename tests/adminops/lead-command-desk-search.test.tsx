// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LeadSearchPanel } from "../../app/admin/leads/lead-search-panel";
import Loading from "../../app/admin/today/loading";
import ErrorBoundary from "../../app/admin/today/error";
afterEach(()=>{cleanup();vi.unstubAllGlobals();});
const result=(label:string)=>({ok:true,configured:true,page:{total:1},leads:[{id:"synthetic-record",primary_detail:label,contact_summary:"Synthetic private record",status:"new"}]});
describe("command desk search and read boundaries",()=>{
  it("keeps terms in authenticated POST body, never the URL, and clears stale results on edit",async()=>{
    const fetch=vi.fn().mockResolvedValue({ok:true,json:async()=>result("Current result")});vi.stubGlobal("fetch",fetch);
    render(<LeadSearchPanel/>);fireEvent.change(screen.getByRole("textbox"),{target:{value:"synthetic query"}});fireEvent.click(screen.getByRole("button",{name:"Search"}));
    await screen.findByText("Current result");expect(fetch).toHaveBeenCalledWith("/api/admin/leads/search",expect.objectContaining({method:"POST",cache:"no-store",body:expect.stringContaining('"search":"synthetic query"')}));
    fireEvent.change(screen.getByRole("textbox"),{target:{value:"other query"}});expect(screen.queryByText("Current result")).toBeNull();
  });
  it("fences a late old response and preserves the newer request",async()=>{
    let oldResolve!:(v:unknown)=>void;
    const fetch=vi.fn().mockImplementationOnce(()=>new Promise(resolve=>{oldResolve=resolve;})).mockResolvedValueOnce({ok:true,json:async()=>result("New result")});vi.stubGlobal("fetch",fetch);
    render(<LeadSearchPanel/>);fireEvent.change(screen.getByRole("textbox"),{target:{value:"old query"}});fireEvent.click(screen.getByRole("button",{name:"Search"}));
    fireEvent.change(screen.getByRole("textbox"),{target:{value:"new query"}});fireEvent.click(screen.getByRole("button",{name:"Search"}));await screen.findByText("New result");
    await act(async()=>{oldResolve({ok:true,json:async()=>result("Old result")});});expect(screen.queryByText("Old result")).toBeNull();expect(screen.getByText("New result")).toBeTruthy();
    expect((fetch.mock.calls[0][1] as RequestInit).signal?.aborted).toBe(true);
  });
  it("denied/unavailable search never exposes returned records or claims zero demand",async()=>{
    vi.stubGlobal("fetch",vi.fn().mockResolvedValue({ok:false,json:async()=>result("Must not appear")}));render(<LeadSearchPanel/>);
    fireEvent.change(screen.getByRole("textbox"),{target:{value:"synthetic"}});fireEvent.click(screen.getByRole("button",{name:"Search"}));await screen.findByRole("alert");
    expect(screen.queryByText("Must not appear")).toBeNull();expect(screen.getByRole("alert").textContent).toContain("No lead data was changed");
  });
  it("loading is unmeasured; error retry only repeats the protected read",async()=>{
    const view=render(<Loading/>);expect(screen.getByRole("status").textContent).toContain("Reading your authorized work");expect(view.container.querySelector('main[aria-busy="true"]')).toBeTruthy();
    view.unmount();const reset=vi.fn();render(<ErrorBoundary reset={reset}/>);expect(screen.getByRole("alert").textContent).toContain("not a measured empty queue");fireEvent.click(screen.getByRole("button",{name:"Try the protected read again"}));await waitFor(()=>expect(reset).toHaveBeenCalledTimes(1));
  });
});
