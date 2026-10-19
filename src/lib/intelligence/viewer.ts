import "server-only";
import {createHash,randomBytes} from "node:crypto";
import {neon} from "@neondatabase/serverless";
import type {WorkerQuery} from "./bounded-workers";

export type R2Viewer={ownerScope:string;consumerUserId:string|null;consumerSessionId:string|null};
const COOKIE="amm-r2-guest";
export function r2Enabled(){return process.env.R2_SOURCE_GOVERNANCE_ENABLED==="true";}
export function r2Query():WorkerQuery {
 if(!r2Enabled()||!process.env.DATABASE_URL)throw Error("intelligence_unavailable");
 return neon(process.env.DATABASE_URL);
}
function guestToken(request:Request){return request.headers.get("cookie")?.split(";").map(c=>c.trim()).find(c=>c.startsWith(COOKIE+"="))?.slice(COOKIE.length+1);}
export async function readR2Viewer(request:Request):Promise<R2Viewer|null>{
 if(!r2Enabled())return null;
 if(/(?:^|;\s*)(?:__Secure-)?amm-consumer\./.test(request.headers.get("cookie")||"")){
  const {consumerPrincipal}=await import("../consumer/auth");
  const principal=await consumerPrincipal(request.headers);
  return principal?{ownerScope:`consumer:${principal.userId}`,consumerUserId:principal.userId,consumerSessionId:principal.sessionId}:null;
 }
 const token=guestToken(request);if(!token||!/^[A-Za-z0-9_-]{43}$/.test(token))return null;
 const viewer={ownerScope:"guest:"+createHash("sha256").update(token).digest("hex"),consumerUserId:null,consumerSessionId:null};
 const rows=await r2Query().query("SELECT public.r2_viewer_valid_v1($1,$2,$3) AS valid",[viewer.ownerScope,null,null]);
 return rows[0]?.valid===true?viewer:null;
}
/** Called only by the deliberate, origin-checked answer POST after mutation
 * and rate guards. GET/prefetch never installs a session or performs a write. */
export async function ensureR2Viewer(request:Request){
 const prior=await readR2Viewer(request);if(prior)return {viewer:prior,cookie:null};
 if(guestToken(request)||/amm-consumer\./.test(request.headers.get("cookie")||""))throw Error("session_unavailable");
 const token=randomBytes(32).toString("base64url");
 const viewer:R2Viewer={ownerScope:"guest:"+createHash("sha256").update(token).digest("hex"),consumerUserId:null,consumerSessionId:null};
 await r2Query().query("INSERT INTO public.r2_guest_sessions(owner_scope) VALUES($1)",[viewer.ownerScope]);
 return {viewer,cookie:`${COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000${process.env.NODE_ENV==="production"?"; Secure":""}`};
}
