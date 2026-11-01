// @vitest-environment node
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read=(file:string)=>readFileSync(file,"utf8");
const visual=JSON.parse(read("config/owned-social-visuals.v2.json"));
const content=JSON.parse(read("config/owned-social-content.json"));
const manifest=JSON.parse(read("public/social/owned-launch-v2/asset-manifest.json"));
const base="public/social/owned-launch-v2/";

describe("Cinematic owned-brand edition: source rights, privacy and export contracts",()=>{
  it("preserves the published first-edition asset rather than silently replacing it",()=>expect(createHash("sha256").update(readFileSync("public/social/owned-launch-v1/01-your-next-move-feed.jpg")).digest("hex")).toBe("8ae68763d6c3e9cb403ddf9520cb7790d20ca7930fb3e8f7d9917f6ab4c9dc3f"));
  it("has a deliberate modern title and both formats for every existing concept",()=>{expect(Object.keys(visual.headlines)).toHaveLength(7);for(const c of content.concepts){expect(visual.headlines[c.id]).toHaveLength(2);for(const [kind,height]of[["feed",1350],["story",1920]]as const){expect(manifest.files.find((f:{name:string})=>f.name===`${c.id}-${kind}.jpg`)).toMatchObject({width:1080,height});}}});
  it("retains four real video exports, three carousels and their actual hashes",()=>{expect(manifest.stillsOnly).toBe(false);expect(manifest.files.filter((f:{name:string})=>f.name.endsWith(".mp4"))).toHaveLength(4);for(const f of manifest.files){const bytes=readFileSync(base+f.name);expect(bytes.length).toBe(f.bytes);expect(createHash("sha256").update(bytes).digest("hex")).toBe(f.sha256);}});
  it("keeps Photos Library paths and private identifiers out of the public manifest/gallery",()=>{for(const file of[base+"asset-manifest.json",base+"index.html"]){expect(read(file)).not.toMatch(/\/Users\/|photoslibrary|77db29f9|DATABASE_URL|Bearer\s+[A-Za-z0-9]/i);}});
  it("records owner-supplied illustrative provenance instead of asserting a listing or documentary scene",()=>{expect(manifest.sourceImages).toHaveLength(4);for(const source of manifest.sourceImages){expect(source.rights).toBe("owner_supplied_brand_use");expect(source.originalSha256).toMatch(/^[a-f0-9]{64}$/);expect(source.provenance).toContain("not established");}expect(visual.conceptLabel).toContain("Not a listing");});
  it("uses editable native typography and never a replacement generated person",()=>{expect(visual.font).toBe("Avenir Next");expect(visual.identityRule).toContain("no face/body reconstruction");expect(read("scripts/social/render-cinematic.mjs")).not.toMatch(/font-family=\\"Georgia|api\.openai|OPENAI_API_KEY/);});
  it("keeps intake destinations and broader questions within existing contracts",()=>{expect(visual.currentConsumerPaths).toEqual({seller:"/home-value",buyer:"/buy",compare:"/sell?seller_option=compare",other_questions:"/ask"});expect(visual.widerNeeds).toContain("Do not invent listings");});
  it("leaves the actual publisher paused while selecting the reviewed edition",()=>{expect(JSON.parse(read("config/owned-social-policy.json"))).toMatchObject({masterPaused:true,mediaEdition:"owned-launch-v2",channels:[],spendCapUsd:0});});
});
