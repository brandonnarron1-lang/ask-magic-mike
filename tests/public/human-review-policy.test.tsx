import {describe,it,expect,vi} from "vitest";
import {renderToStaticMarkup} from "react-dom/server";
vi.mock("server-only",()=>({}));
import {reviewTarget,coveredWait,newReviewObjective,savedReviewObjective,publicReviewPolicy,HUMAN_REVIEW_POLICY} from "../../app/lib/humanReviewPolicy";
import {HumanReviewObjective} from "../../app/components/admin/HumanReviewObjective";

describe("server-owned covered review minutes",()=>{
  it.each([
    ["2026-11-12T12:59:00Z","2026-11-12T13:05:00.000Z"],
    ["2026-11-12T13:00:00Z","2026-11-12T13:05:00.000Z"],
    ["2026-11-13T00:58:00Z","2026-11-13T13:03:00.000Z"],
    ["2026-11-13T00:59:00Z","2026-11-13T13:04:00.000Z"],
    ["2026-11-13T01:00:00Z","2026-11-13T13:05:00.000Z"],
    ["2026-11-13T03:00:00Z","2026-11-13T13:05:00.000Z"],
    ["2026-11-13T00:58:30.125Z","2026-11-13T13:03:30.125Z"],
    ["2026-11-14T13:00:00Z","2026-11-14T13:05:00.000Z"], // Saturday
    ["2026-03-08T00:58:00Z","2026-03-08T12:03:00.000Z"], // spring forward
    ["2026-11-01T23:58:00Z","2026-11-02T00:03:00.000Z"], // standard time after fall change
    ["2026-10-31T23:58:00Z","2026-11-01T13:03:00.000Z"], // fall back overnight
  ])("%s carries five exact minutes to %s",(start,end)=>expect(reviewTarget(start)).toBe(end));
  it("explicit no-staff/holiday/vacation and reduced windows carry, never invent availability",()=>{
    const policy={...HUMAN_REVIEW_POLICY,exceptions:[
      {day:"2026-11-13",windows:[],reason:"no_staff" as const},
      {day:"2026-11-14",windows:[],reason:"holiday" as const},
      {day:"2026-11-15",windows:[],reason:"vacation" as const},
      {day:"2026-11-16",windows:[[600,720],[780,1080]] as Array<[number,number]>,reason:"reduced_coverage" as const},
    ]};
    expect(reviewTarget("2026-11-13T00:58:30Z",policy)).toBe("2026-11-16T15:03:30.000Z");
    expect(reviewTarget("2026-11-16T16:58:30Z",policy)).toBe("2026-11-16T18:03:30.000Z");
    expect(coveredWait("2026-11-13T00:58:30Z","2026-11-16T15:04:00Z",policy)).toBe(5.5);
  });
  it("retains overnight age and accumulated covered wait after reopening",()=>{
    expect(coveredWait("2026-11-13T00:58:30Z","2026-11-13T13:04:00Z")).toBe(5.5);
    expect(coveredWait("2026-11-13T03:00:00Z","2026-11-13T13:00:00Z")).toBe(0);
    expect(coveredWait("bad","2026-11-13T13:00:00Z")).toBeNull();
  });
  it("invalid/missing/altered policy evidence is unknown, not a retroactive target",()=>{
    const saved=newReviewObjective("2026-11-13T00:58:00Z");
    expect(savedReviewObjective(saved)).toEqual(saved);
    expect(savedReviewObjective({...saved,targetAt:"2026-11-13T13:00:00Z"})).toBeNull();
    expect(savedReviewObjective({...saved,policyVersion:"visitor-policy"})).toBeNull();
    expect(savedReviewObjective(null)).toBeNull();
    expect(()=>reviewTarget("bad")).toThrow();
    expect(()=>reviewTarget(saved.acceptedAt,{...HUMAN_REVIEW_POLICY,exceptions:[{day:"2026-11-13",reason:"no_staff",windows:[[0,1440]]}]})).toThrow();
  });
  it("public hours derive from server time, never presence or bookable slots",()=>{
    expect(publicReviewPolicy(new Date("2026-11-12T12:59Z")).message).toContain("next review window");
    expect(publicReviewPolicy(new Date("2026-11-12T13:00Z")).message).toContain("not confirmation");
    expect(publicReviewPolicy(new Date("2026-11-13T01:00Z")).message).toContain("next review window");
    expect(publicReviewPolicy(new Date("2026-11-12T13:00Z")).normalHours).toContain("Daily 8 a.m.–8 p.m. Eastern");
  });
  it("protected projection fences held records and discloses unknown history",()=>{
    const saved=newReviewObjective("2026-11-13T00:58:30.125Z");
    const props={value:saved,now:"2026-11-13T13:04Z"};
    expect(renderToStaticMarkup(<HumanReviewObjective {...props}/>)).toContain("target passed");
    expect(renderToStaticMarkup(<HumanReviewObjective {...props}/>)).toContain("8:03:30.125");
    expect(renderToStaticMarkup(<HumanReviewObjective {...props} held/>)).not.toContain("target passed");
    expect(renderToStaticMarkup(<HumanReviewObjective value={null} now={props.now}/>)).toContain("Review target unknown");
  });
});
