import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { IntelligenceSourceReview } from "../../src/components/admin/intelligence-source-review";
afterEach(()=>{cleanup();vi.unstubAllGlobals();});
const version={id:"SYNTHETIC-version",ordinal:1,validation:"validated",revoked:false,reason:"SYNTHETIC pending staff review",content_hash:"a".repeat(64),snapshot:{source:{fetchedAt:"2026-10-19T10:00:00Z",effectiveAt:"2026-10-17T00:00:00Z",freshnessHours:720,url:"https://www.askmagicmike.com/api/experience/v1",owner:"Our Town Properties, Inc.",licenseScope:"Owned service wording only",upstreamModifiedAt:null,permissions:{display:true,ai:true,marketing:false,embedding:false,training:false}},passages:[{id:"offer-buyer",version:"SYNTHETIC-pinned-version",intent:"buyer",text:"<img src=x onerror=alert(1)> SYNTHETIC exact retained passage"}]}};
it("shows the retained version, rights, dates and escaped passage without approving on inspection",async()=>{
 const fetch=vi.fn().mockResolvedValue({ok:true,json:async()=>({sources:[{id:"ourtown-experience",revision:2,active_version:null,revoked:false,versions:[version]}]})});vi.stubGlobal("fetch",fetch);
 const {container}=render(<IntelligenceSourceReview/>);
 const summary=await screen.findByText("Version 1 · validated · not active");fireEvent.click(summary);
 expect(screen.getByText(/SYNTHETIC exact retained passage/)).toBeVisible();expect(container.querySelector("img")).toBeNull();
 expect(screen.getByText(/Saved version: SYNTHETIC-version/)).toHaveTextContent("Validation is not a human approval");
 expect(screen.getByText(/Permitted uses in this saved snapshot/)).toHaveTextContent("marketing: not permitted");
 expect(screen.getByText(/Upstream modification date/)).toHaveTextContent("Not recorded");
 expect(screen.getByText(/Effective/)).toHaveTextContent("Publication date not recorded");
 expect(fetch).toHaveBeenCalledTimes(1);expect(fetch.mock.calls[0][1].method).toBeUndefined();
 expect(screen.getByText(/No active version/)).toBeVisible();
});
it("never substitutes current public wording for a version with missing retained passages",async()=>{
 vi.stubGlobal("fetch",vi.fn().mockResolvedValue({ok:true,json:async()=>({sources:[{id:"ourtown-experience",revision:2,active_version:null,revoked:false,versions:[{...version,snapshot:{source:version.snapshot.source}}]}]})}));
 render(<IntelligenceSourceReview/>);fireEvent.click(await screen.findByText("Version 1 · validated · not active"));
 expect(screen.getByText(/No retained passage is recorded/)).toBeVisible();expect(screen.queryByText(/SYNTHETIC exact retained passage/)).toBeNull();
});
