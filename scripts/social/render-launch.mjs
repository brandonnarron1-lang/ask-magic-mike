// Local-only deterministic derivatives. No network, credentials, model or audio.
// SVG typography is original repo-native artwork, not a synthetic property photo.
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
// Use Next's already-locked Sharp dependency; do not install another package.
const sharp = createRequire(require.resolve('next/package.json'))('sharp');

const root = process.cwd();
const content = JSON.parse(await fs.readFile(path.join(root, 'config/owned-social-content.json'), 'utf8'));
const out = path.join(root, 'public/social/owned-launch-v1');
await fs.mkdir(out, { recursive: true });
const gold = '#e8ca78', cream = '#fff8e9', dark = '#101212', ruby = '#9c3047';
const esc = s => String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
function text(x,y,size,lines,fill=cream,family='Arial',weight='400',gap=1.22) {
  return lines.map((s,i)=>`<text x="${x}" y="${y+i*size*gap}" fill="${fill}" font-family="${family}" font-size="${size}" font-weight="${weight}">${esc(s)}</text>`).join('');
}
function wrap(s, max=34) {
  const lines=[]; let line='';
  for (const w of s.split(' ')) { if ((line+' '+w).trim().length>max) { lines.push(line); line=w; } else line=(line+' '+w).trim(); }
  if(line) lines.push(line); return lines;
}
function svg(c, w, h, panel=0) {
  const portrait = c.id.startsWith('01-') && panel===0;
  const tall=h>1500, titleY=tall?350:275, titleSize=76;
  const pointY=tall?730:600;
  const points=panel? [c.points[panel-1]]:c.points;
  const decoration=`<path d="M790 0 L1080 0 L1080 410 Z" fill="${ruby}"/><circle cx="1000" cy="170" r="220" fill="none" stroke="${gold}" stroke-opacity=".22" stroke-width="2"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 1080 ${h}"><rect width="1080" height="${h}" fill="${dark}"/>${decoration}
  ${text(84,128,25,['ASK MAGIC MIKE'],gold,'Arial','700')}
  ${text(84,titleY-78,22,[c.eyebrow],gold)}
  ${text(80,titleY,titleSize,c.title,cream,'Georgia','700',1.13)}
  <rect x="84" y="${titleY+150}" width="110" height="6" rx="3" fill="${ruby}"/>
  ${portrait?`<rect x="600" y="${pointY-20}" width="390" height="${tall?650:480}" rx="26" fill="${cream}"/>`:''}
  ${points.map((p,i)=>`${text(84,pointY+i*145,28,[String(panel||i+1).padStart(2,'0')],gold)}${text(135,pointY+i*145,portrait?36:44,wrap(p,portrait?21:31),cream,'Arial','400',1.22)}`).join('')}
  <rect x="84" y="${h-(tall?560:290)}" width="912" height="108" rx="18" fill="${gold}"/>
  ${text(122,h-(tall?495:225),39,[c.cta],dark,'Arial','700')}
  ${text(84,h-(tall?250:118),28,['askmagicmike.com'],cream,'Arial','700')}
  ${text(84,h-(tall?195:70),30,['Our Town Properties, Inc.'],gold)}
  ${tall?text(84,h-148,20,['Request guidance. No guaranteed price, offer or appointment.'],'#e0dacd'):''}
  </svg>`;
}
const outputs=[];
async function render(c, filename, width,height,panel=0) {
  let im=sharp(Buffer.from(svg(c,width,height,panel)));
  const overlays=[{input:await sharp(path.join(root,content.logo)).resize({width:245}).toBuffer(),left:750,top:75}];
  if(c.id.startsWith('01-') && panel===0) {
    const portrait=await sharp(path.join(root,content.portrait)).resize(370,height>1500?630:460,{fit:'inside'}).png().toBuffer();
    overlays.push({input:portrait,left:610,top:(height>1500?730:600)});
  }
  im=im.composite(overlays);
  await im.jpeg({quality:91,mozjpeg:true}).toFile(path.join(out,filename)); outputs.push(filename);
}
for(const c of content.concepts) {
  await render(c,`${c.id}-feed.jpg`,1080,1350);
  await render(c,`${c.id}-story.jpg`,1080,1920);
  if(c.format==='carousel') for(let i=1;i<=3;i++) await render(c,`${c.id}-slide-${i}.jpg`,1080,1350,i);
  if(c.format==='video') {
    const cards=[];
    for(let i=1;i<=3;i++) { const n=`${c.id}-frame-${i}.jpg`; await render(c,n,1080,1920,i); cards.push(n); }
    // Three captioned cards; gentle fade per card; no imported music or voice.
    const args=cards.flatMap(n=>['-loop','1','-t','4','-i',path.join(out,n)]);
    const graph=cards.map((_,i)=>`[${i}:v]fps=24,format=yuv420p,${i?'fade=t=in:st=0:d=0.25,':''}fade=t=out:st=3.75:d=0.25,setpts=PTS-STARTPTS[v${i}]`).join(';')+';[v0][v1][v2]concat=n=3:v=1:a=0[out]';
    execFileSync('/opt/homebrew/bin/ffmpeg',['-hide_banner','-loglevel','error','-y',...args,'-filter_complex_threads','1','-filter_complex',graph,'-map','[out]','-c:v','libx264','-threads','2','-preset','fast','-crf','24','-pix_fmt','yuv420p','-movflags','+faststart','-an',path.join(out,`${c.id}.mp4`)],{stdio:'inherit'});
    outputs.push(`${c.id}.mp4`);
  }
}
const profile=`<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024"><rect width="1024" height="1024" rx="512" fill="${dark}"/><circle cx="512" cy="512" r="428" fill="none" stroke="${gold}" stroke-width="7"/><path d="M710 200 L825 315 L710 430 L595 315 Z" fill="${ruby}"/>${text(215,595,230,['AMM'],cream,'Georgia','700')}${text(280,700,34,['ASK MAGIC MIKE'],gold,'Arial','700')}</svg>`;
await sharp(Buffer.from(profile)).jpeg({quality:94}).toFile(path.join(out,'profile.jpg')); outputs.push('profile.jpg');
const cover=`<svg xmlns="http://www.w3.org/2000/svg" width="1640" height="624"><rect width="1640" height="624" fill="${dark}"/><path d="M1380 0 L1640 0 L1640 624 L1050 624 Z" fill="${ruby}"/>${text(150,200,28,['ASK MAGIC MIKE'],gold,'Arial','700')}${text(150,310,68,['Your next move.','Clear local guidance.'],cream,'Georgia','700')}${text(150,520,30,['Our Town Properties, Inc.  |  askmagicmike.com'],gold)}</svg>`;
await sharp(Buffer.from(cover)).composite([{input:await sharp(path.join(root,content.portrait)).resize({height:580}).toBuffer(),left:1170,top:44}]).jpeg({quality:92}).toFile(path.join(out,'facebook-cover.jpg')); outputs.push('facebook-cover.jpg');
const manifest={version:content.version,generatedAt:new Date().toISOString(),renderer:'SVG + Sharp; FFmpeg libx264; no generative API/audio',identity:'Existing approved portrait unchanged; no generated person',fonts:'System Arial/Georgia rasterized; no font binaries redistributed',sources:[],files:[]};
for(const file of [content.portrait,content.logo,'config/owned-social-content.json']) manifest.sources.push({file,sha256:crypto.createHash('sha256').update(await fs.readFile(path.join(root,file))).digest('hex')});
for(const name of outputs) { const b=await fs.readFile(path.join(out,name)); const metadata=name.endsWith('.jpg')?await sharp(b).metadata():null; manifest.files.push({name,sha256:crypto.createHash('sha256').update(b).digest('hex'),bytes:b.length,width:metadata?.width,height:metadata?.height}); }
await fs.writeFile(path.join(out,'asset-manifest.json'),JSON.stringify(manifest,null,2)+'\n');
const previews=await Promise.all(content.concepts.map(c=>sharp(path.join(out,`${c.id}-feed.jpg`)).resize(270,338).toBuffer()));
await sharp({create:{width:1080,height:676,channels:3,background:cream}}).composite(previews.map((input,i)=>({input,left:(i%4)*270,top:Math.floor(i/4)*338}))).jpeg({quality:90}).toFile(path.join(out,'contact-sheet.jpg'));
const gallery=`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Ask Magic Mike — owned social creative review</title><style>body{margin:0;background:#101212;color:#fff8e9;font:18px/1.5 Arial}main{max-width:1180px;margin:auto;padding:32px}h1,h2{font-family:Georgia}h1{font-size:clamp(32px,5vw,60px);line-height:1.1}a{color:#e8ca78}img,video{width:100%;height:auto;border-radius:12px}section{margin:48px 0;padding:24px;border:1px solid #55492b;border-radius:16px}.media{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:24px}.media video{max-height:650px}.note{color:#e8ca78}.copy{max-width:70ch}button{font:inherit}</style><main><p class="note">LOCAL REVIEW / NOT PUBLISHED / NOT SCHEDULED</p><h1>One recognizable brand.<br>Seven useful conversations.</h1><p>Ask Magic Mike · Our Town Properties, Inc.</p><p>Original graphics and silent captioned videos. Approved portrait only; no fabricated listings, results or endorsements. Profile and link availability are not yet verified.</p><div class="media"><img src="profile.jpg" alt="AMM monogram profile graphic"><img src="facebook-cover.jpg" alt="Ask Magic Mike cover with approved Mike Eatmon portrait"></div>${content.concepts.map(c=>`<section><p class="note">${esc(c.eyebrow)} · ${esc(c.id)}</p><h2>${esc(c.title.join(' '))}</h2><div class="media"><img src="${c.id}-feed.jpg" alt="${esc(c.points.join(' '))}">${c.format==='video'?`<video controls playsinline preload="metadata" poster="${c.id}-story.jpg"><source src="${c.id}.mp4" type="video/mp4"></video>`:`<img src="${c.id}-slide-1.jpg" alt="${esc(c.points[0])}">`}</div><p class="copy">${esc(c.caption)}</p><p>Facebook: tracked caption link. Instagram/TikTok: verified clickable profile website required. Native tags remain unavailable until actual identities/capabilities are verified.</p></section>`).join('')}<p>Preparation is not publication, traffic, an inquiry or a conversion.</p></main></html>`;
await fs.writeFile(path.join(out,'index.html'),gallery);
console.log(JSON.stringify({files:outputs.length,output:out,paidCalls:0}));
