import {describe,expect,it} from "vitest";
import {consumerInterestWrite,readConsumerWorkspaceWrite} from "../../app/lib/consumerWorkspaceContract";
import {isExternalAnalyticsEligibleContext} from "../../app/lib/externalAnalytics";
const id="00000000-0000-4000-8000-000000009901";
const item={id,kind:"search",value:"Wilson SYNTHETIC FIXTURE",budget:"Under $300,000"};
describe("own consumer comparison contract, not another intake",()=>{
 it("normalizes declared references and round-trips without authority fields",()=>{
  const value=readConsumerWorkspaceWrite({revision:0,interests:[item]});
  expect(value.interests[0]).toMatchObject({id,provenance:"user_reported_unverified",declared:{kind:"search",desired_area:item.value}});
  expect(consumerInterestWrite(value.interests)).toEqual([item]);
  expect(Object.keys(value).sort()).toEqual(["interests","revision"]);
 });
 it.each(["userId","role","lead_id","consent","emailVerified","assigned_agent_id"])("rejects client authority field %s",field=>{
  expect(()=>readConsumerWorkspaceWrite({revision:0,interests:[],[field]:"injected"})).toThrow();
 });
 it.each([-1,0.5,2147483647,"0",null])("refuses unsupported revision %s",revision=>{
  expect(()=>readConsumerWorkspaceWrite({revision,interests:[]})).toThrow();
 });
 it("bounds the array and rejects duplicate IDs or claimed facts",()=>{
  expect(()=>readConsumerWorkspaceWrite({revision:0,interests:Array(9).fill(item)})).toThrow();
  expect(()=>readConsumerWorkspaceWrite({revision:0,interests:[item,item]})).toThrow();
  expect(()=>readConsumerWorkspaceWrite({revision:0,interests:[{...item,price:250000}]})).toThrow();
 });
 it.each(["javascript:alert(1)","https://user:secret@example.test/x","line\nbreak", "x".repeat(501)])("refuses unsafe property reference %s",value=>{
  expect(()=>readConsumerWorkspaceWrite({revision:0,interests:[{...item,kind:"property",value}]})).toThrow();
 });
 it("keeps empty saved state honest and excludes account routes from analytics",()=>{
  expect(readConsumerWorkspaceWrite({revision:0,interests:[]})).toEqual({revision:0,interests:[]});
  expect(isExternalAnalyticsEligibleContext({hostname:"www.askmagicmike.com",pathname:"/my/account",search:"",webdriver:false})).toBe(false);
 });
});
