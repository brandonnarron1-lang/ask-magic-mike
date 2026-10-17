import type { NextRequest } from "next/server";
import { authorizeConsumer,consumerResponse,consumerFailure,consumerWriteLimit } from "../../../../../src/lib/consumer/http";
import { readConsumerWorkspace,saveConsumerWorkspace } from "../../../../../src/lib/consumer/workspace";
import { readConsumerWorkspaceWrite } from "../../../../lib/consumerWorkspaceContract";
import { ingressSameOrigin,readBoundedIngressJson,ingressRequestError } from "../../../../lib/growth/ingress-http";

export const dynamic="force-dynamic";
export async function GET(request: NextRequest) {
  const auth=await authorizeConsumer(request);if(!auth.ok)return auth.response;
  try{return consumerResponse(await readConsumerWorkspace(auth.principal));}catch(error){return consumerFailure(error);}
}
export async function PUT(request: NextRequest) {
  if(!ingressSameOrigin(request))return consumerResponse({ok:false,error:"invalid_origin"},403);
  const auth=await authorizeConsumer(request);if(!auth.ok)return auth.response;
  const body=await readBoundedIngressJson(request,{maxRequestBytes:16384});if(!body.ok)return ingressRequestError(body.status);
  let input;try{input=readConsumerWorkspaceWrite(body.value);}catch{return consumerResponse({ok:false,error:"invalid_workspace"},400);}
  const limit=await consumerWriteLimit(auth.principal,"consumerWorkspaceSave");if(limit)return limit;
  try{return consumerResponse({workspace:await saveConsumerWorkspace(auth.principal,input)});}catch(error){return consumerFailure(error);}
}
