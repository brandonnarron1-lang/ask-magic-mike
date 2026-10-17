import { toNextJsHandler } from "better-auth/next-js";
import { NextRequest } from "next/server";
import { getConsumerAuth } from "../../../../src/lib/consumer/auth";
import { consumerRuntimeReady } from "../../../../src/lib/consumer/runtime";
import { consumerResponse } from "../../../../src/lib/consumer/http";
import { ingressSameOrigin,readBoundedIngressJson,ingressRequestError } from "../../../lib/growth/ingress-http";

export const dynamic="force-dynamic";
const getPaths=new Set(["/get-session","/list-sessions"]);
const postPaths=new Set(["/sign-up/email","/sign-in/email","/sign-out","/revoke-sessions","/revoke-other-sessions","/revoke-session","/change-password"]);
function name(request: Request){return new URL(request.url).pathname.slice("/api/consumer-auth".length);}
function privateResponse(response: Response){response.headers.set("Cache-Control","private, no-store, max-age=0");response.headers.set("Vary","Cookie");response.headers.set("X-Robots-Tag","noindex, nofollow, noarchive");response.headers.set("Referrer-Policy","no-referrer");response.headers.set("Cross-Origin-Resource-Policy","same-origin");response.headers.set("X-Content-Type-Options","nosniff");return response;}
export async function GET(request: NextRequest){
  if(!consumerRuntimeReady())return consumerResponse({ok:false,error:"consumer_workspace_unavailable"},503);
  if(!getPaths.has(name(request)))return consumerResponse({ok:false,error:"not_available"},404);
  try{return privateResponse(await toNextJsHandler(await getConsumerAuth()).GET(request));}catch{return consumerResponse({ok:false,error:"consumer_workspace_unavailable"},503);}
}
export async function POST(request: NextRequest){
  if(!ingressSameOrigin(request))return consumerResponse({ok:false,error:"invalid_origin"},403);
  if(!consumerRuntimeReady())return consumerResponse({ok:false,error:"consumer_workspace_unavailable"},503);
  const path=name(request);if(!postPaths.has(path))return consumerResponse({ok:false,error:"not_available"},404);
  const body=await readBoundedIngressJson(request,{maxRequestBytes:2048});if(!body.ok)return ingressRequestError(body.status);
  const permitted=path==="/sign-up/email"?["name","email","password"]:path==="/sign-in/email"?["email","password"]:path==="/change-password"?["currentPassword","newPassword","revokeOtherSessions"]:path==="/revoke-session"?["token"]:[];
  if(Object.keys(body.value).some(key=>!permitted.includes(key))||Object.entries(body.value).some(([key,value])=>key!=="revokeOtherSessions"&&(typeof value!=="string"||value.length>254))||path==="/sign-up/email"&&(typeof body.value.name!=="string"||!body.value.name.trim()||body.value.name.length>80)||path==="/change-password"&&body.value.revokeOtherSessions!==true)return consumerResponse({ok:false,error:"invalid_request"},400);
  try{
    const headers=new Headers(request.headers);headers.delete("content-length");
    const native=new Request(request.url,{method:"POST",headers,body:JSON.stringify(body.value)});
    return privateResponse(await toNextJsHandler(await getConsumerAuth()).POST(native));
  }catch{return consumerResponse({ok:false,error:"consumer_workspace_unavailable"},503);}
}
