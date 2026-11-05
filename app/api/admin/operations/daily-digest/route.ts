import { NextRequest,NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { checkBearerSecret } from "@/lib/admin/auth";
import { assertDatabaseMutationAllowed,assertProviderDeliveryAllowed } from "@/lib/preview-security";
import { runDailyDigest } from "../../../../lib/operations/dailyDigest";
import { readTrafficReport } from "../../../../lib/persistence/neonTrafficReport";
import { selectEmailNotificationProvider } from "../../../../lib/leadNotificationProvider";
export const runtime="nodejs";
export const dynamic="force-dynamic";
export const maxDuration=30;
export async function GET(req:NextRequest) {
  const reply=(body:unknown,status=200)=>NextResponse.json(body,{status,headers:{"Cache-Control":"private, no-store"}});
  if(!checkBearerSecret(req,process.env.CRON_SECRET)) return reply({ok:false,error:"unauthorized"},401);
  if(process.env.OPERATOR_DAILY_DIGEST_ENABLED!=="true") return reply({ok:true,disabled:true});
  const mutation=assertDatabaseMutationAllowed(),delivery=assertProviderDeliveryAllowed();
  if(process.env.VERCEL_ENV!=="production" || !mutation.ok || !delivery.ok || !process.env.DATABASE_URL)
    return reply({ok:false,error:"digest_runtime_not_ready"},503);
  try {
    const sql={query:(text:string,params?:unknown[])=>neon(process.env.DATABASE_URL!,{fetchOptions:{signal:AbortSignal.timeout(8000)}}).query(text,params)};
    const result=await runDailyDigest({sql,env:process.env,now:new Date(),provider:selectEmailNotificationProvider("production"),
      report:(from,to)=>readTrafficReport(from,to)});
    return reply({ok:result.interventionRequired===0,...result},result.interventionRequired?503:200);
  } catch {return reply({ok:false,error:"digest_operator_or_storage_unavailable"},503);}
}
