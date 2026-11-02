// Extend the existing editable SVG campaign system using owner-supplied images.
// No network, new dependencies, generative API, voice, retouch or face animation.
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
const require=createRequire(import.meta.url);
const sharp=createRequire(require.resolve('next/package.json'))('sharp');
const args=process.argv.slice(2);
const inputArg=args.find(x=>x.startsWith('--inputs='));
const append=args.includes('--append');
if(!inputArg&&!append) throw Error('explicit_private_owner_input_manifest_required');
const inputs=inputArg?JSON.parse(await fs.readFile(inputArg.slice(9),'utf8')):{selected:{}};
const content=JSON.parse(await fs.readFile('config/owned-social-content.json','utf8'));
const visual=JSON.parse(await fs.readFile('config/owned-social-visuals.v2.json','utf8'));
const out=path.join('public/social',visual.edition);
await fs.mkdir(out,{recursive:true});
const onlyStills=args.includes('--stills');
const {ink,cream,gold,ruby}=visual.palette;
const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const hash=b=>createHash('sha256').update(b).digest('hex');
const prior=append?JSON.parse(await fs.readFile(path.join(out,'asset-manifest.json'),'utf8')):null;
// Append only: never regenerate an asset already published or queued.
if(prior)for(const f of prior.files){const b=await fs.readFile(path.join(out,f.name));if(hash(b)!==f.sha256)throw Error('existing_asset_changed_stop');}
const sources=prior?.sourceImages||[];
for(const [key,file] of Object.entries(inputs.selected)) {
  const bytes=await fs.readFile(file),m=await sharp(bytes).metadata();
  if(!m.width||!m.height||m.width<600||m.height<600) throw Error(`insufficient_source:${key}`);
  // Auto-orient and export pixels without EXIF, GPS or the owner's source paths.
  const name=`source-${key}.jpg`;
  await sharp(bytes).rotate().jpeg({quality:96,mozjpeg:true}).toFile(path.join(out,name));
  sources.push({role:key,originalSha256:hash(bytes),file:name,width:m.width,height:m.height,rights:'owner_supplied_brand_use',provenance:visual.sourceProvenance});
}
const logoMeta=await sharp(visual.logo).metadata();
// Trim only the legacy export's stray bottom rule, not the actual logo artwork.
const logo=await sharp(visual.logo).extract({left:0,top:0,width:logoMeta.width,height:logoMeta.height-12}).resize({width:230}).png().toBuffer();
function lines(x,y,size,words,fill=cream,weight=500,gap=1.13,tracking=0) {
  return words.map((s,i)=>`<text x="${x}" y="${y+i*size*gap}" fill="${fill}" font-family="Avenir Next,Helvetica Neue,Arial" font-weight="${weight}" font-size="${size}" letter-spacing="${tracking}">${esc(s)}</text>`).join('');
}
function wrap(s,max=27) {
  const out=[];let line='';
  for(const word of s.split(' ')){if((line+' '+word).trim().length>max){if(line)out.push(line);line=word;}else line=(line+' '+word).trim();}
  if(line)out.push(line);return out;
}
function overlay(c,h,panel=0) {
  const tall=h===1920,top=tall?220:145,title=tall?370:285;
  const points=panel?[c.points[panel-1]]:c.points;
  const pointTop=tall?760:575,cta=tall?1290:1055;
  const titleLines=visual.headlines[c.id];
  if(!titleLines||titleLines.some(x=>x.length>24))throw Error('headline_layout_not_reviewed');
  const body=points.map((p,i)=>{
    const n=panel||i+1,y=pointTop+i*(tall?130:125);
    return lines(78,y,26,[`0${n}`],gold,600)+lines(133,y,41,wrap(p,23),cream,500,1.2);
  }).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="${h}"><defs>
    <linearGradient id="top" x2="0" y2="1"><stop stop-color="${ink}" stop-opacity=".72"/><stop offset=".42" stop-color="${ink}" stop-opacity=".12"/><stop offset="1" stop-color="${ink}" stop-opacity="0"/></linearGradient>
    <linearGradient id="bottom" x2="0" y2="1"><stop offset=".5" stop-color="${ink}" stop-opacity="0"/><stop offset=".78" stop-color="${ink}" stop-opacity=".38"/><stop offset="1" stop-color="${ink}" stop-opacity=".94"/></linearGradient>
    <linearGradient id="left"><stop stop-color="${ink}" stop-opacity=".58"/><stop offset=".64" stop-color="${ink}" stop-opacity=".24"/><stop offset="1" stop-color="${ink}" stop-opacity="0"/></linearGradient></defs>
    <rect width="1080" height="${h}" fill="url(#top)"/><rect width="1080" height="${h}" fill="url(#bottom)"/><rect width="1080" height="${h}" fill="url(#left)"/>
    ${lines(78,top,27,['ASK MAGIC MIKE'],cream,650,1,2.8)}
    <path d="M78 ${top+30} H132" stroke="${ruby}" stroke-width="5"/>
    ${lines(73,title,86,titleLines,cream,650,1.1,-3.4)}
    ${body}
    <path d="M78 ${cta-54} H1002" stroke="${gold}" stroke-opacity=".55"/>
    ${lines(78,cta,40,wrap(c.cta,35),cream,650,1.15,-.4)}
    <path d="M955 ${cta-25} H988 V${cta+8} M958 ${cta+5} L988 ${cta-25}" fill="none" stroke="${gold}" stroke-width="3"/>
    ${lines(78,cta+112,38,['askmagicmike.com'],cream,550)}
    ${lines(78,cta+166,30,['Our Town Properties, Inc.'],gold,550)}
    ${lines(78,cta+210,26,[visual.conceptLabel],'#d5d4ce',450)}
  </svg>`;
}
const outputs=prior?prior.files.filter(f=>!f.name.startsWith('source-')).map(f=>f.name):[];
async function card(c,name,h,panel=0) {
  const background=await sharp(path.join(out,'source-portrait.jpg')).resize(1080,h,{fit:'cover',position:'centre'}).png().toBuffer();
  const layer=Buffer.from(overlay(c,h,panel));
  // A photographic field, native typography and one CTA; no portrait cutout box.
  const image=await sharp(background).composite([{input:layer}]).png().toBuffer();
  await sharp(image).composite([{input:logo,left:775,top:h===1920?180:102,blend:'screen'}]).jpeg({quality:91,mozjpeg:true}).toFile(path.join(out,name));
  outputs.push(name);
}
for(const c of content.concepts) {
  if(append&&prior.files.some(f=>f.name===`${c.id}-feed.jpg`))continue;
  await card(c,`${c.id}-feed.jpg`,1350);
  await card(c,`${c.id}-story.jpg`,1920);
  if(c.format==='carousel')for(let p=1;p<=3;p++)await card(c,`${c.id}-slide-${p}.jpg`,1350,p);
  if(c.format==='video') {
    const frames=[];
    for(let p=1;p<=3;p++){const name=`${c.id}-frame-${p}.jpg`;await card(c,name,1920,p);frames.push(name);}
    if(!onlyStills) {
      const ff=frames.flatMap(n=>['-loop','1','-t','4.25','-i',path.join(out,n)]);
      const tracks=frames.map((_,i)=>`[${i}:v]scale=1124:1998,crop=1080:1920:x='22+12*sin(t/4)':y='39-12*sin(t/4)',fps=24,format=yuv420p,settb=AVTB,setpts=PTS-STARTPTS[v${i}]`).join(';');
      const transitions=';[v0][v1]xfade=transition=fade:duration=0.375:offset=3.875[x];[x][v2]xfade=transition=fade:duration=0.375:offset=7.75[out]';
      execFileSync('/opt/homebrew/bin/ffmpeg',['-hide_banner','-loglevel','error','-y',...ff,'-filter_complex_threads','1','-filter_complex',tracks+transitions,'-map','[out]','-t','12','-c:v','libx264','-threads','2','-preset','fast','-crf','22','-pix_fmt','yuv420p','-movflags','+faststart','-an',path.join(out,`${c.id}.mp4`)],{stdio:'inherit'});
      outputs.push(`${c.id}.mp4`);
    }
  }
}
if(!append){
// Same supplied face as the campaign, without a substitute person or old monogram.
const avatarRing=Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024"><circle cx="512" cy="512" r="491" fill="none" stroke="${gold}" stroke-width="5"/></svg>`);
await sharp(path.join(out,'source-avatar.jpg')).resize(1024,1024).composite([{input:avatarRing}]).jpeg({quality:94,mozjpeg:true}).toFile(path.join(out,'profile.jpg'));outputs.push('profile.jpg');
const coverOverlay=Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1640" height="624"><defs><linearGradient id="shade"><stop stop-color="${ink}" stop-opacity=".82"/><stop offset=".63" stop-color="${ink}" stop-opacity=".55"/><stop offset="1" stop-color="${ink}" stop-opacity=".02"/></linearGradient></defs><rect width="1640" height="624" fill="url(#shade)"/>${lines(270,106,28,['OUR TOWN PROPERTIES, INC.'],gold,550,1,1)}${lines(265,235,78,['Your next move.','Made personal.'],cream,650,1.05,-3)}${lines(270,465,30,['askmagicmike.com'],cream,550)}${lines(270,520,24,['Brand concept imagery · Not a listing'],'#e0ddd5',450)}</svg>`);
const cover=await sharp(path.join(out,'source-wide.jpg')).resize(1640,624,{fit:'cover',position:'north'}).png().toBuffer();
await sharp(cover).composite([{input:coverOverlay}]).jpeg({quality:94,mozjpeg:true}).toFile(path.join(out,'facebook-cover.jpg'));outputs.push('facebook-cover.jpg');
}
const manifest={version:visual.version,generatedAt:new Date().toISOString(),renderer:'Existing SVG + Sharp and FFmpeg, owner-supplied source pixels; no generation/retouch/audio',stillsOnly:onlyStills,identity:visual.identityRule,provenance:visual.sourceProvenance,fonts:'Installed Avenir Next rasterized; no font binaries redistributed',sourceImages:sources,sources:[],files:[]};
for(const file of ['config/owned-social-content.json','config/owned-social-visuals.v2.json',visual.logo])manifest.sources.push({file,sha256:hash(await fs.readFile(file))});
for(const name of [...sources.map(s=>s.file),...outputs]){const b=await fs.readFile(path.join(out,name));const m=name.endsWith('.jpg')?await sharp(b).metadata():{};manifest.files.push({name,sha256:hash(b),bytes:b.length,width:m.width,height:m.height});}
await fs.writeFile(path.join(out,'asset-manifest.json'),JSON.stringify(manifest,null,2)+'\n');
const previews=await Promise.all(content.concepts.map(c=>sharp(path.join(out,`${c.id}-feed.jpg`)).resize(270,338).toBuffer()));
await sharp({create:{width:1080,height:Math.ceil(previews.length/4)*338,channels:3,background:ink}}).composite(previews.map((input,i)=>({input,left:i%4*270,top:Math.floor(i/4)*338}))).jpeg({quality:92}).toFile(path.join(out,'contact-sheet.jpg'));
const gallery=`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Ask Magic Mike · cinematic brand edition</title><style>body{margin:0;background:${ink};color:${cream};font:18px/1.5 'Avenir Next',Arial,sans-serif}main{max-width:1400px;padding:clamp(20px,5vw,70px);margin:auto}h1{font-size:clamp(38px,6vw,88px);letter-spacing:-.055em;line-height:1.03;max-width:12ch}h2{font-size:clamp(26px,3vw,42px);letter-spacing:-.035em}a{color:${gold}}.lead{color:#c8c8c2;max-width:66ch}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,310px),1fr));gap:24px}img,video{display:block;width:100%;height:auto}article{padding:50px 0;border-top:1px solid #ffffff24}.tag{color:${gold};letter-spacing:.14em;font-size:13px;text-transform:uppercase}.caption{max-width:72ch;color:#dbd8cf}.hero{width:100%;margin:40px 0}.identity{display:grid;grid-template-columns:160px 1fr;gap:30px;align-items:center}.identity img{border-radius:100%}.paths{display:flex;gap:20px;flex-wrap:wrap;margin:25px 0}.paths a{min-height:44px;display:inline-flex;align-items:center}video{max-height:720px;background:#101212}@media(max-width:500px){.identity{grid-template-columns:90px 1fr}}</style><main><p class="tag">Cinematic edition · local review, not deployed or queued</p><h1>Real questions.<br>A clearer next move.</h1><p class="lead">A consistent photographic direction for Ask Magic Mike and Our Town Properties, Inc. Owner-supplied concept imagery—not listings, documented locations or a promise of results. Supplied likeness preserved; no model/API call.</p><div class="paths"><a href="https://www.askmagicmike.com/home-value">Home value review ↗</a><a href="https://www.askmagicmike.com/buy">Buying help ↗</a><a href="https://www.askmagicmike.com/sell?seller_option=compare">Selling options ↗</a><a href="https://www.askmagicmike.com/ask">Other real-estate questions ↗</a></div><div class="identity"><img src="profile.jpg" alt="Owner-supplied Mike Eatmon brand portrait"><p>Same person. Same brokerage. One recognizable visual language.<br>Modern sans typography, photographic fields and one clear action.</p></div><img class="hero" src="facebook-cover.jpg" alt="Ask Magic Mike cinematic cover; illustrative lakeside brand scene">${content.concepts.map(c=>`<article><p class="tag">${esc(c.id)} · ${esc(c.category)}</p><h2>${esc(visual.headlines[c.id].join(' '))}</h2><div class="grid"><img src="${c.id}-feed.jpg" alt="${esc(c.points.join(' '))} Illustrative brand imagery, not a listing.">${c.format==='video'&&!onlyStills?`<video controls playsinline preload="metadata" poster="${c.id}-story.jpg"><source src="${c.id}.mp4" type="video/mp4"></video>`:`<img src="${c.id}-story.jpg" alt="Matching vertical Story layout">`}</div><p class="caption">${esc(c.caption)}</p><p class="lead">Profile website must actually be configured before using a “link in profile” caption. Preparation is not publication or demand.</p></article>`).join('')}</main></html>`;
await fs.writeFile(path.join(out,'index.html'),gallery);
console.log(JSON.stringify({status:onlyStills?'STILLS_PREVIEW_NOT_QUEUED':'RENDERED_NOT_QUEUED',output:out,derivatives:outputs.length,sourceImages:sources.length,paidCalls:0}));
