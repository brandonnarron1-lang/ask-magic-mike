import "server-only";
import { NextResponse } from "next/server";
import { privateIngressResponse } from "../../../app/lib/growth/ingress-http";
import { consumerPrincipal } from "./auth";
import { consumerRuntimeReady } from "./runtime";
import { ConsumerWorkspaceError } from "./workspace";
import { checkRateLimit,LIMITS } from "../security/rate-limit";
import type { ConsumerPrincipal } from "./auth";

export function consumerResponse(value: unknown,status=200) {
  const response=privateIngressResponse(NextResponse.json(value,{status}));response.headers.set("Vary","Cookie");return response;
}
export async function authorizeConsumer(request: Request) {
  if(!consumerRuntimeReady())return {ok:false as const,response:consumerResponse({ok:false,error:"consumer_workspace_unavailable"},503)};
  try {const principal=await consumerPrincipal(request.headers);return principal?{ok:true as const,principal}:{ok:false as const,response:consumerResponse({ok:false,error:"session_unavailable"},401)};}
  catch {return {ok:false as const,response:consumerResponse({ok:false,error:"consumer_workspace_unavailable"},503)};}
}
export function consumerFailure(error: unknown) {
  return error instanceof ConsumerWorkspaceError?consumerResponse({ok:false,error:error.message},error.status):consumerResponse({ok:false,error:"consumer_workspace_unavailable"},503);
}
export async function consumerWriteLimit(principal:ConsumerPrincipal,kind:"consumerAccountDelete"|"consumerWorkspaceSave") {
  const config=LIMITS[kind],result=await checkRateLimit(principal.userId,config.limit,config.windowMs,kind);
  if(!result.durable)return consumerResponse({ok:false,error:"consumer_workspace_unavailable"},503);
  if(!result.allowed){const response=consumerResponse({ok:false,error:"too_many_attempts"},429);response.headers.set("Retry-After",String(Math.max(1,Math.ceil((result.resetAt-Date.now())/1000))));return response;}
  return null;
}
