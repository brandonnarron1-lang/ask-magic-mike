#!/usr/bin/env node
// Local, no-send composition for human QA; never a lead notification asset.
import { createRequire } from "node:module";
import { readFileSync,mkdirSync } from "node:fs";
import { createHash } from "node:crypto";
const require=createRequire(import.meta.url);
const sharp=createRequire(require.resolve("next/package.json"))("sharp");
const sources=[
 "/Users/brandonnarron/Downloads/ChatGPT Image Oct 4, 2026, 10_54_52 AM-1.png",
 "/Users/brandonnarron/Downloads/ChatGPT Image Oct 4, 2026, 10_54_53 AM-2.png",
];
const layers=[];
for(let i=0;i<sources.length;i++){
 const bytes=readFileSync(sources[i]),metadata=await sharp(bytes).metadata();
 console.log(JSON.stringify({source:i+1,sha256:createHash("sha256").update(bytes).digest("hex"),width:metadata.width,height:metadata.height}));
 layers.push({input:await sharp(bytes).resize(1672,945,{fit:"contain",background:"#080A0B"}).png().toBuffer(),left:0,top:i*965});
}
for(let i=0;i<6;i++){
 const subtype=["buyer","seller","cash_seller","investor_buyer","copilot","routing"][i];
 const input=await sharp(readFileSync(`output/playwright/reference-${subtype}-390.png`)).resize(360,1750,{fit:"contain",position:"top",background:"#080A0B"}).png().toBuffer();
 layers.push({input,left:1700+(i%3)*380,top:Math.floor(i/3)*1780});
}
mkdirSync("output/reference-allocation",{recursive:true});
await sharp({create:{width:2840,height:3570,channels:3,background:"#080A0B"}}).composite(layers).png().toFile("output/reference-allocation/reference-versus-render.png");
console.log("Saved output/reference-allocation/reference-versus-render.png (references left; six actual 390px cards right).");
// Focused phone-content crop, not surrounding poster/device bezel. Reference
// consumer facts/photos are illustrative; implementation is suppressed QA.
const reference=await sharp(readFileSync(sources[0])).extract({left:29,top:269,width:291,height:554}).resize(350,null).png().toBuffer();
const actual=await sharp(readFileSync("output/playwright/reference-buyer-assigned-390.png")).resize(350,null).png().toBuffer();
const heights=await Promise.all([reference,actual].map(input=>sharp(input).metadata()));
await sharp({create:{width:730,height:Math.max(...heights.map(meta=>meta.height)),channels:3,background:"#080A0B"}}).composite([{input:reference,left:0,top:0},{input:actual,left:380,top:0}]).png().toFile("output/reference-allocation/buyer-focused-reference-versus-render.png");
console.log("Saved buyer-focused-reference-versus-render.png (source phone-content crop left; real synthetic assigned card right).");
