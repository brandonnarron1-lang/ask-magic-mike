// Diagnostic DOM reads only, after the unchanged assertion settles and before
// teardown. No application writes, retries, reloads or model/getter traversal.
const present=value=>typeof value==='string'&&value.trim().length>0;
export function finalCaptureCheck(record,expected){
 const fail=reason=>({status:'FAIL',reason});
 if(!record)return fail('FINAL_CAPTURE_MISSING');
 if(record.status!=='SUCCESS')return fail('FINAL_CAPTURE_'+(record.status==='FAILED'?'FAILED':'UNAVAILABLE'));
 if(!expected||['trialId','pageId','lead','action'].some(key=>!present(expected[key])||record.identity?.[key]!==expected[key]))return fail('FINAL_CAPTURE_IDENTITY_MISMATCH');
 if(record.schema!=='amm.pr324.final-capture.v1'||!Array.isArray(record.snapshot?.forms)||!Number.isFinite(record.snapshot.at)||record.snapshot.trigger!=='assertion_final_capture'||!present(record.boundary))return fail('FINAL_CAPTURE_INVALID');
 if(!Number.isFinite(Date.parse(record.requestedAt))||!Number.isFinite(Date.parse(record.completedAt))||Date.parse(record.completedAt)<Date.parse(record.requestedAt)||record.snapshot.at<Date.parse(record.requestedAt)||record.snapshot.at>Date.parse(record.completedAt))return fail('FINAL_CAPTURE_TIMING_INVALID');
 return {status:'PASS',reason:'ACTUAL_IDENTITY_BOUND_FINAL_DOM_READ'};
}
export function createFinalCapture(page,identity,host,retain){
 let final=null;
 return async({action,boundary})=>{
  if(final)return final; // First boundary wins; never replace it at teardown.
  const record={schema:'amm.pr324.final-capture.v1',identity:{...identity,action},boundary,status:'UNAVAILABLE',reason:'NOT_ATTEMPTED',requestedAt:new Date().toISOString(),completedAt:null};
  final=record;retain(record); // Host-side receipt before browser await.
  try{
   if(['trialId','pageId','lead','action'].some(key=>!present(record.identity[key]))){record.reason='CAPTURE_IDENTITY_MISSING';return record;}
   if(page.isClosed()){record.reason='PAGE_CLOSED';return record;}
   record.status='PENDING';record.reason=null;retain(record);
   const snapshot=await host.run('final_dom_capture',()=>page.evaluate(({lead})=>{
    const forms=Array.from(document.querySelectorAll('form')).flatMap(form=>{
     const input=name=>form.querySelector(`input[name="${name}"]`);
     if(input('lead_id')?.value!==lead)return [];
     const version=input('record_version'),button=form.querySelector('button[type="submit"]');
     return [{label:form.getAttribute('aria-label'),lead:input('lead_id')?.value,action:input('action_id')?.value,value:version?.value,defaultValue:version?.defaultValue,attribute:version?.getAttribute('value'),submitDisabled:button?.disabled,fieldsetDisabled:form.querySelector('fieldset')?.disabled}];
    });
    return {at:Date.now(),monotonic:performance.now(),trigger:'assertion_final_capture',forms};
   },{lead:identity.lead}),1500);
   if(!snapshot||!Array.isArray(snapshot.forms)||!Number.isFinite(snapshot.at)||snapshot.trigger!=='assertion_final_capture')throw Object.assign(Error('invalid_final_capture'),{code:'FINAL_CAPTURE_SHAPE'});
   record.status='SUCCESS';record.reason=null;record.snapshot=snapshot;
   record.matchCount=snapshot.forms.filter(form=>form?.label==='Complete task'&&form.lead===record.identity.lead&&form.action===action).length;
   return record;
  }catch(error){record.status='FAILED';record.reason=String(error?.code||error?.name||'CAPTURE_ERROR').replace(/[^A-Za-z0-9_-]/g,'').slice(0,60);return record;}
  finally{record.completedAt=new Date().toISOString();retain(record);}
 };
}
