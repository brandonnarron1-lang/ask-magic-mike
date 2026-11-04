import { afterEach,beforeEach,describe,expect,it,vi } from "vitest";
import { publicTrafficEvidence,claimPublicNavigation } from "../../app/lib/client/publicTraffic";
import { parseTrafficEvidence,publicTrafficRoute } from "../../app/lib/trafficContract";
import { EXTERNAL_ANALYTICS_CONSENT_STORAGE_KEY } from "../../app/lib/externalAnalytics";
const uuid="10000000-0000-4000-8000-000000000001";
beforeEach(()=>{
  localStorage.clear(); sessionStorage.clear();
  vi.stubGlobal("location",new URL("https://www.askmagicmike.com/home-value"));
  Object.defineProperty(window,"location",{configurable:true,value:new URL("https://www.askmagicmike.com/home-value")});
  Object.defineProperty(navigator,"webdriver",{configurable:true,value:false});
});
afterEach(()=>vi.unstubAllGlobals());
describe("first-party traffic grains",()=>{
  it("counts an untouched page without persisting an identity before consent",()=>{
    expect(publicTrafficEvidence(uuid)).toEqual({version:1,eventId:uuid,route:"/home-value",context:"top_level"});
    expect(localStorage.length).toBe(0); expect(sessionStorage.length).toBe(0);
  });
  it("uses consented optional tab visits and bounded browser estimates, not lead IDs",()=>{
    localStorage.setItem(EXTERNAL_ANALYTICS_CONSENT_STORAGE_KEY,"granted");
    const a=publicTrafficEvidence(uuid)!, b=publicTrafficEvidence(uuid)!;
    expect(a.visitId).toBe(b.visitId); expect(a.browserId).toBe(b.browserId);
    localStorage.setItem(EXTERNAL_ANALYTICS_CONSENT_STORAGE_KEY,"denied");
    expect(publicTrafficEvidence(uuid)).not.toHaveProperty("visitId");
  });
  it("retains a countable unlinked event when storage is blocked",()=>{
    const spy=vi.spyOn(Storage.prototype,"getItem").mockImplementation(()=>{throw new Error("blocked")});
    expect(publicTrafficEvidence(uuid)).not.toHaveProperty("browserId"); spy.mockRestore();
  });
  it("deduplicates remounts, counts pathname returns and never serializes dynamic IDs",()=>{
    expect(claimPublicNavigation("/buy")).toBeTruthy(); expect(claimPublicNavigation("/buy")).toBeNull();
    expect(claimPublicNavigation("/sell")).toBeTruthy(); expect(claimPublicNavigation("/buy")).toBeTruthy();
    expect(publicTrafficRoute("/open-house/private-property")).toBe("/open-house/:reference");
    expect(publicTrafficRoute("/admin/leads/private")).toBeNull();
    expect(parseTrafficEvidence({version:1,eventId:uuid,route:"/sell?email=private",context:"top_level"})).toBeNull();
  });
  it("excludes QA and automation and separates standalone embedded surfaces",()=>{
    Object.defineProperty(window,"location",{configurable:true,value:new URL("https://www.askmagicmike.com/widget/v1")});
    expect(publicTrafficEvidence(uuid)?.context).toBe("embedded");
    Object.defineProperty(navigator,"webdriver",{configurable:true,value:true});
    expect(publicTrafficEvidence(uuid)).toBeNull();
  });
  it("excludes retained QA touches but does not confuse a prospect's staff-shared link with staff access",()=>{
    Object.defineProperty(window,"location",{configurable:true,value:new URL("https://www.askmagicmike.com/home-value?utm_source=staff_share")});
    expect(publicTrafficEvidence(uuid)).not.toBeNull();
    sessionStorage.setItem("amm_attribution",JSON.stringify({campaign:"internal_qa_readiness"}));
    expect(publicTrafficEvidence(uuid)).toBeNull();
  });
});
