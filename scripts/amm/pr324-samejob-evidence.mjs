// Dependency-free guards also used before dependency installation.
export function ownedProcessRows(rows,root,tracked){
 const currentRoot=rows.find(row=>row.pid===root),savedRoot=tracked.get(root);
 const reused=Boolean(savedRoot&&currentRoot&&savedRoot.started!==currentRoot.started);
 const ids=new Set(reused?[]:[root]);
 for(const row of rows)if(tracked.get(row.pid)?.started===row.started||!reused&&(row.group===root||row.session===root))ids.add(row.pid);
 let changed=true;while(changed){changed=false;for(const row of rows)if(ids.has(row.parent)&&!ids.has(row.pid)){ids.add(row.pid);changed=true;}}
 return rows.filter(row=>ids.has(row.pid)&&row.state!=='Z');
}
export function trialEvidenceIssue(result){
 if(!result||result.status==='missing'||!Array.isArray(result.results))return 'trial_result_missing';
 if(result.results.length===0&&!result.globalErrors?.length)return 'primary_startup_failure_missing';
 return null;
}
