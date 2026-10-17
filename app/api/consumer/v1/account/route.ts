import type { NextRequest } from "next/server";
import { authorizeConsumer,consumerResponse,consumerFailure,consumerWriteLimit } from "../../../../../src/lib/consumer/http";
import { deleteConsumerAccount,readConsumerWorkspace } from "../../../../../src/lib/consumer/workspace";
import { ingressSameOrigin,readBoundedIngressJson,ingressRequestError } from "../../../../lib/growth/ingress-http";

export const dynamic="force-dynamic";
export async function GET(request: NextRequest) {
  const auth=await authorizeConsumer(request);if(!auth.ok)return auth.response;
  try{return consumerResponse({version:"amm.consumer-account.v1",...await readConsumerWorkspace(auth.principal),scope:"Own consumer profile/comparison only. No prior inquiry linkage or staff records.",retention:"Account deletion removes active consumer data and sessions. Separate submitted inquiries and required brokerage/audit records follow existing record-handling controls."});}catch(error){return consumerFailure(error);}
}
export async function DELETE(request: NextRequest) {
  if(!ingressSameOrigin(request))return consumerResponse({ok:false,error:"invalid_origin"},403);
  const auth=await authorizeConsumer(request);if(!auth.ok)return auth.response;
  const body=await readBoundedIngressJson(request,{maxRequestBytes:1024});if(!body.ok)return ingressRequestError(body.status);
  if(Object.keys(body.value).some(k=>k!=="password")||typeof body.value.password!=="string"||body.value.password.length<1||body.value.password.length>128)return consumerResponse({ok:false,error:"confirmation_required"},400);
  const limit=await consumerWriteLimit(auth.principal,"consumerAccountDelete");if(limit)return limit;
  try{return consumerResponse(await deleteConsumerAccount(auth.principal,body.value.password));}catch(error){return consumerFailure(error);}
}
