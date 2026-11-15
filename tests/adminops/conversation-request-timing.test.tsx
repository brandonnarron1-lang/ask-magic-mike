import {renderToStaticMarkup} from "react-dom/server";
import {describe,expect,it} from "vitest";
import {conversationRequestTiming} from "../../app/lib/conversationRequestTiming";
import {ConversationRequestNotice} from "../../app/components/admin/ConversationRequestNotice";
import {normalizeAppointment} from "../../app/lib/persistence/supabase/adminAppointmentFollowupOps";

const preferences={version:1 as const,channel:"phone" as const,day:"2024-03-09",window:"afternoon" as const,timezone:"America/New_York" as const};
const appointment=(patch:Record<string,unknown>={})=>normalizeAppointment({id:"synthetic-conversation",lead_id:"synthetic-inquiry",status:"requested",timezone:"America/New_York",request_preferences:preferences,...patch})!;
describe("saved conversation timing, not invented appointment outcomes",()=>{
  it("identifies an earlier Eastern day without turning a preference into a missed appointment",()=>{
    expect(conversationRequestTiming(appointment(),"2024-03-10T12:00:00Z")).toMatchObject({state:"past_preference",label:"Preferred day has passed"});
    expect(conversationRequestTiming(appointment(),"2024-03-10T12:00:00Z").explanation).toContain("not a missed confirmed appointment");
  });
  it("does not invent the end of an afternoon on the same local day",()=>{
    expect(conversationRequestTiming(appointment(),"2024-03-10T03:59:59Z").state).toBe("requested");
  });
  it.each(["2024-03-10T05:00:00Z","2024-11-04T05:00:00Z"])("uses civil Eastern day across daylight transitions %s",now=>{
    const day=now.startsWith("2024-03")?"2024-03-09":"2024-11-03";
    expect(conversationRequestTiming(appointment({request_preferences:{...preferences,day}}),now).state).toBe("past_preference");
  });
  it.each([null,undefined])("keeps missing preferred time %s unknown",request_preferences=>{
    expect(conversationRequestTiming(appointment({request_preferences}),"2024-03-10T12:00:00Z")).toMatchObject({state:"requested",preferenceLabel:"Preferred time not recorded"});
  });
  it("does not call an unknown clock or incomplete interval overdue",()=>{
    expect(conversationRequestTiming(appointment(),"invalid").state).toBe("requested");
    expect(conversationRequestTiming(appointment({request_preferences:null,starts_at:"2024-03-09T18:00:00Z",ends_at:null}),"2024-03-10T12:00:00Z").state).toBe("requested");
  });
  it("uses an actually recorded valid interval end, never a start alone or inverted interval",()=>{
    const record=appointment({request_preferences:null,starts_at:"2024-03-09T18:00:00Z",ends_at:"2024-03-09T18:30:00Z"});
    expect(conversationRequestTiming(record,"2024-03-09T18:29:59Z").state).toBe("requested");
    expect(conversationRequestTiming(record,"2024-03-09T18:30:00Z")).toMatchObject({label:"Requested window has passed"});
    expect(conversationRequestTiming({...record,ends_at:"2024-03-09T17:00:00Z"},"2024-03-10T12:00:00Z").state).toBe("requested");
  });
  it("keeps confirmed time and actual attendance separate",()=>{
    const record=appointment({status:"confirmed",starts_at:"2024-03-09T18:00:00Z",ends_at:"2024-03-09T18:30:00Z"});
    const timing=conversationRequestTiming(record,"2024-03-10T12:00:00Z");
    expect(timing.state).toBe("confirmed");expect(timing.explanation).toContain("Elapsed time alone does not establish");
    expect(record.status).toBe("confirmed");
  });
  it.each(["canceled","completed","no_show","scheduled"])("does not resurrect or infer an outcome from saved %s",status=>{
    const record=appointment({status});expect(conversationRequestTiming(record,"2024-03-10T12:00:00Z").state).toBe("recorded");expect(record.status).toBe(status);
  });
  it("renders only read-only text with no contact, task, consent or confirmation action",()=>{
    const markup=renderToStaticMarkup(<ConversationRequestNotice appointment={appointment()} observedAt="2024-03-10T12:00:00Z"/>);
    expect(markup).toContain("Preferred day has passed");expect(markup).toContain("Eastern time");
    expect(markup).not.toMatch(/<form|<button|href=|tel:|mailto:|no.show recorded/i);
  });
});
