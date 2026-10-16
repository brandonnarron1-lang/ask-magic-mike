// @vitest-environment node
import { describe, expect, it } from "vitest";
import { placements, verifyDestination } from "../../scripts/amm/wordpress-placement-resilience.mjs";
describe("read-only WordPress resilience destination contract",()=>{
  for(const p of placements)it(`uses existing owned destination/UTMs for ${p.key}`,()=>{
    p.routes.forEach((route:string,index:number)=>{
      const u=new URL(route,"https://www.askmagicmike.com");u.searchParams.set("utm_source","ourtownproperties");u.searchParams.set("utm_medium","owned_media");u.searchParams.set("utm_campaign","amm_owned_demand_2026");u.searchParams.set("utm_content",p.key);if(route==="/sell")u.searchParams.set("seller_option","compare");
      expect(()=>verifyDestination(u.href,p,index)).not.toThrow();
      for(const bad of [u.href.replace("www.askmagicmike.com","example.test"),u.href.replace("owned_media","seller_page_cta"),u.href.replace(p.key,"unregistered")])expect(()=>verifyDestination(bad,p,index)).toThrow();
    });
  });
});
