// One-off, version-pinned observers in an owned Linux CI install only.
// No dependency/version/lockfile change; no Mac/shared install or release use.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import path from "node:path";
const require = createRequire(import.meta.url);
if (process.platform !== "linux" || process.env.GITHUB_ACTIONS !== "true" || process.env.AMM_STALE_REVIEW_DIAGNOSTIC !== "1") throw new Error("owned_linux_diagnostic_required");
const packagePath = require.resolve("next/package.json");
if (JSON.parse(readFileSync(packagePath,"utf8")).version !== "15.5.26") throw new Error("exact_next_version_required");
const root = path.dirname(packagePath), records=[];
const hash = value => createHash("sha256").update(value).digest("hex");
const trace = fields => `if(typeof window!=="undefined")window.__ammStaleForm?.({${fields}});`;
for (const flavor of ["client", "esm/client"]) {
  for (const module of ["router-reducer/fetch-server-response.js", "router-reducer/reducers/refresh-reducer.js", "app-router-instance.js"]) {
    const file=path.join(root,"dist",flavor,"components",module),before=readFileSync(file,"utf8");let body=before;
    const replace=(needle,value)=>{if(body.split(needle).length!==2)throw new Error(`exact_observer_anchor_required:${module}:${needle}`);body=body.replace(needle,value);};
    if(module.endsWith("fetch-server-response.js")) {
      const needle="const response = await createFromNextReadableStream(flightStream);";
      const local=flavor.startsWith("esm")?"getAppBuildId()":"(0, _appbuildid.getAppBuildId)()";
      replace(needle,trace('stage:"next_decode_begin",path:url.pathname')+needle+trace(`stage:"next_decode_done",path:url.pathname,build:response.b,localBuild:${local},patchLengths:response.f?.map(p=>p.length)`));
      replace("const contentType = res.headers.get('content-type') || '';", "const contentType = res.headers.get('content-type') || '';"+trace('stage:"next_fetch_headers",path:url.pathname,status:res.status,contentType'));
    } else if(module.endsWith("refresh-reducer.js")) {
      replace("let { flightData, canonicalUrl: canonicalUrlOverride } = param;","let { flightData, canonicalUrl: canonicalUrlOverride } = param;"+trace('stage:"next_refresh_decoded",type:typeof flightData,patches:Array.isArray(flightData)?flightData.map(p=>({root:p.isRootRender,seed:!!p.seedData})):null'));
      const start="await "; const position=body.indexOf("refreshInactiveParallelSegments)({");
      // CJS call is (0, _refetchinactiveparallelsegments.refreshInactiveParallelSegments)(...);
      const awaited=flavor.startsWith("esm")?"await refreshInactiveParallelSegments({":"await (0, _refetchinactiveparallelsegments.refreshInactiveParallelSegments)({";
      replace(awaited,trace('stage:"next_inactive_begin"')+awaited);
      replace("mutable.cache = cache;",trace('stage:"next_inactive_done"')+"mutable.cache = cache;");
      replace("}, ()=>state);","}, (error)=>{"+trace('stage:"next_refresh_rejected",message:String(error)')+"return state;});");
    } else {
      replace("const actionResult = actionQueue.action(prevState, payload);",trace('stage:"next_action_begin",type:payload.type')+"const actionResult = actionQueue.action(prevState, payload);");
      replace("function handleResult(nextState) {","function handleResult(nextState) {"+trace('stage:"next_action_result",type:payload.type,discarded:!!action.discarded'));
    }
    writeFileSync(file,body);records.push({module,flavor,before:hash(before),after:hash(body)});
  }
}
const directory=path.resolve(".amm-run/pr324-linux-diagnostic");mkdirSync(directory,{recursive:true});
writeFileSync(path.join(directory,"stale-review-library-observers.json"),JSON.stringify({at:new Date().toISOString(),version:"15.5.26",kind:"passive CI-only library instrumentation, not correction",records},null,2),{mode:0o600});
