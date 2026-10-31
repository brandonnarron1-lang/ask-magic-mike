import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LeadContactActions } from "../../app/components/admin/LeadContactActions";
import { contactReadiness, prepareRequestReply, preparedReplyUri } from "../../app/lib/contactReadiness";
import type { ManualContactReview } from "../../app/lib/manualContactReview";
const review:ManualContactReview={ok:true,lead:{isTest:false,suppressed:false},manualContact:{canReview:true,terminal:false,phone:'+12025550199',email:'request@example.test'},operator:{name:'Synthetic operator',role:'administrator',canRecordEvaluation:true},reviewMatrix:['email','phone'].map(channel=>({channel,purpose:'manual_one_to_one',decision:{allowed:false,code:'auto_send_disabled',requiresHumanApproval:true,decisionSource:'canonical_request_consent'}}))};
function held(code='ambiguous_consent'):ManualContactReview {return {...review,manualContact:{...review.manualContact!,evidence:{email:{eligible:false,reason:'The recorded consent time is missing.'}}},reviewMatrix:['email','phone'].map(channel=>({channel,purpose:'manual_one_to_one',decision:{allowed:false,code:code as 'ambiguous_consent',requiresHumanApproval:false}}))};}
afterEach(()=>{cleanup();vi.unstubAllGlobals();});
describe('plain-language contact readiness',()=>{
  it('recognizes request-specific permission without requiring Mike or a new approval ceremony',()=>{
    expect(contactReadiness(review,'email')).toMatchObject({ready:true,label:'Ready for your review'});
    expect(contactReadiness(review,'email').reason).toContain('this request only');
  });
  it.each(['consent_denied','channel_opt_out','legal_hold','bic_hold','ambiguous_consent','missing_permission'] as const)('keeps %s restricted without a grant control',code=>expect(contactReadiness(held(code),'email').ready).toBe(false));
  it('uses the actual missing evidence rather than an invented broker requirement',()=>{
    const r=contactReadiness(held(),'email');expect(r.reason).toBe('The recorded consent time is missing.');expect(r.reason).not.toMatch(/broker|Mike/);
  });
  it('does not turn a stored hold code into proof of a legal finding',()=>expect(contactReadiness(held('legal_hold'),'email').reason).toContain('label alone does not establish'));
  it.each([{lead:{isTest:true,suppressed:false}},{lead:{isTest:false,suppressed:true}},{manualContact:{...review.manualContact!,terminal:true}},{manualContact:{...review.manualContact!,canReview:false}}])('keeps lifecycle/scope restrictions %j',patch=>expect(contactReadiness({...review,...patch},'email').ready).toBe(false));
  it('uses the actual operator, not the assigned owner, in an unsent reply',()=>{
    const d=prepareRequestReply(review,'Home value request');expect(d.body).toContain('Synthetic operator');expect(d.body).not.toContain('Mike');expect(d.body).not.toMatch(/appointment confirmed|email sent|guaranteed|cash offer/i);
  });
  it('percent-encodes a native reply without plus signs or header injection',()=>{
    const draft={subject:'Your request & next step',body:'Hello,\nA + B? #yes'};
    const uri=preparedReplyUri('mailto:request@example.test',draft);
    expect(uri).toBe('mailto:request@example.test?subject=Your%20request%20%26%20next%20step&body=Hello%2C%0AA%20%2B%20B%3F%20%23yes');
    expect(uri).not.toContain('+');
  });
  it('does not infer a missing destination or display a permitted invalid one',()=>{
    expect(contactReadiness({...review,manualContact:{...review.manualContact!,email:null}},'email').reason).toContain('not provided');
    expect(contactReadiness({...review,manualContact:{...review.manualContact!,email:'bad?bcc=other@example.test'}},'email').ready).toBe(false);
  });
});
describe('single-screen operator controls (synthetic fetches, not real-auth proof)',()=>{
  it('shows the actual reason, operator and inline evidence without another reminder',async()=>{
    vi.stubGlobal('fetch',vi.fn().mockResolvedValue(Response.json(held())));render(<LeadContactActions leadId='synthetic' blocked={false} canReview/>);
    expect(await screen.findByText('The recorded consent time is missing.')).toBeInTheDocument();
    expect(screen.getByText('Operating as Synthetic operator. Reply about this request only.')).toBeInTheDocument();
    expect(screen.getByRole('button',{name:'Review & email'})).toBeDisabled();expect(screen.queryByRole('button',{name:/approve|new task/i})).not.toBeInTheDocument();
    expect(screen.getByText('Permission evidence and audit')).toBeInTheDocument();
  });
  it('keeps a generic held record blocked without asserting a legal finding',async()=>{
    const value=held('legal_hold');value.reviewMatrix![0].decision.explanation='A legal hold blocks this communication.';
    vi.stubGlobal('fetch',vi.fn().mockImplementation(()=>Promise.resolve(Response.json(value))));
    render(<LeadContactActions leadId='synthetic' blocked={false} canReview/>);
    await screen.findByText('Permission evidence and audit');
    await waitFor(()=>expect(screen.getAllByText(/The code alone is not a legal finding/)).toHaveLength(2));
    expect(screen.queryByText(/A legal hold blocks/)).not.toBeInTheDocument();
    expect(screen.getByRole('button',{name:'Review & email'})).toBeDisabled();
  });
  it('prepares but does not open/send a reply on selection',async()=>{
    const fetch=vi.fn().mockResolvedValue(Response.json(review));vi.stubGlobal('fetch',fetch);render(<LeadContactActions leadId='synthetic' requestLabel='Home value request' blocked={false} canReview/>);
    const email=screen.getByRole('button',{name:'Review & email'});await waitFor(()=>expect(email).toBeEnabled());fireEvent.click(email);
    expect(screen.getByLabelText('Prepared reply — unsent')).toHaveValue(prepareRequestReply(review,'Home value request').body);
    expect(screen.getByRole('button',{name:'Open email app'})).toBeDisabled();expect(fetch).toHaveBeenCalledTimes(1);
  });
  it('never treats a saved audit evaluation as permission amendment',async()=>{
    const fetch=vi.fn().mockResolvedValueOnce(Response.json(review)).mockResolvedValueOnce(Response.json({ok:true,decision:{allowed:true}})).mockResolvedValueOnce(Response.json(held()));vi.stubGlobal('fetch',fetch);
    render(<LeadContactActions leadId='synthetic' blocked={false} canReview/>);const b=await screen.findByRole('button',{name:'Save current email evaluation to audit'});fireEvent.click(b);
    expect(await screen.findByText('Evaluation saved to the audit. No permission was amended, and no message or task was created.')).toBeInTheDocument();
    expect(screen.getByRole('button',{name:'Review & email'})).toBeDisabled();
    expect(JSON.parse(fetch.mock.calls[1][1].body)).toEqual({channel:'email',purpose:'manual_one_to_one',humanApproved:false});
  });
  it('locks duplicate audit clicks and reports an unconfirmed persistence failure honestly',async()=>{
    let resolve!:(r:Response)=>void;const fetch=vi.fn().mockResolvedValueOnce(Response.json(review)).mockImplementationOnce(()=>new Promise<Response>(r=>{resolve=r;}));vi.stubGlobal('fetch',fetch);
    render(<LeadContactActions leadId='synthetic' blocked={false} canReview/>);const b=await screen.findByRole('button',{name:'Save current email evaluation to audit'});fireEvent.click(b);fireEvent.click(b);expect(fetch).toHaveBeenCalledTimes(2);
    await act(async()=>resolve(Response.json({ok:false},{status:503})));expect(await screen.findByText(/Evaluation save could not be confirmed/)).toBeInTheDocument();expect(screen.getByRole('button',{name:'Review & email'})).toBeDisabled();
  });
  it('clears a pending selection when its lead scope changes',async()=>{
    vi.stubGlobal('fetch',vi.fn().mockImplementation(()=>Promise.resolve(Response.json(review))));const r=render(<LeadContactActions leadId='first' blocked={false} canReview/>);const b=screen.getByRole('button',{name:'Review & call'});await waitFor(()=>expect(b).toBeEnabled());fireEvent.click(b);
    expect(screen.getByRole('button',{name:'Open dialer'})).toBeInTheDocument();r.rerender(<LeadContactActions leadId='second' blocked={false} canReview/>);await waitFor(()=>expect(screen.getByRole('button',{name:'Review & call'})).toBeEnabled());expect(screen.queryByRole('button',{name:'Open dialer'})).not.toBeInTheDocument();
  });
  it('does not ask the assigned owner to operate a read-only account',()=>{
    render(<LeadContactActions leadId='synthetic' blocked={false} canReview={false}/>);expect(screen.getByText(/does not need to participate in testing/)).toBeInTheDocument();expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
