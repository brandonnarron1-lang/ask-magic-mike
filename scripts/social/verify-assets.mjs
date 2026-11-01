import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
const require=createRequire(import.meta.url);
const sharp=createRequire(require.resolve('next/package.json'))('sharp');
const base='public/social/owned-launch-v1';
const manifest=JSON.parse(await fs.readFile(`${base}/asset-manifest.json`,'utf8'));
let images=0,videos=0;
for(const source of manifest.sources) {
  const bytes=await fs.readFile(source.file);
  if(createHash('sha256').update(bytes).digest('hex')!==source.sha256)throw Error(`source_hash_mismatch:${source.file}`);
}
for(const file of manifest.files) {
  if(!/^[a-z0-9-]+\.(jpg|mp4)$/.test(file.name))throw Error('unsafe_asset_filename');
  const p=`${base}/${file.name}`,bytes=await fs.readFile(p);
  if(createHash('sha256').update(bytes).digest('hex')!==file.sha256||bytes.length!==file.bytes)throw Error(`asset_hash_mismatch:${file.name}`);
  if(file.name.endsWith('.mp4')){
    const probe=JSON.parse(execFileSync('/opt/homebrew/bin/ffprobe',['-v','error','-show_entries','format=duration:stream=codec_name,codec_type,width,height,r_frame_rate','-of','json',p],{encoding:'utf8'}));
    if(probe.streams.length!==1||probe.streams[0].codec_name!=='h264'||probe.streams[0].width!==1080||probe.streams[0].height!==1920||Math.abs(Number(probe.format.duration)-12)>.1)throw Error(`video_contract_failed:${file.name}`);
    videos++;
  }else{
    const m=await sharp(bytes).metadata();if(m.width!==file.width||m.height!==file.height)throw Error(`image_contract_failed:${file.name}`);images++;
  }
}
if(images!==37||videos!==4)throw Error('expected_launch_asset_count_mismatch');
const privateOut='.amm-run/home-value-lead-loop-20261029/owned-social-launch-20261101';
await fs.mkdir(privateOut,{recursive:true});
await sharp(`${base}/02-value-conversation-feed.jpg`).resize(390).png().toFile(`${privateOut}/mobile-feed-390.png`);
await sharp(`${base}/04-selling-options-story.jpg`).resize(390).png().toFile(`${privateOut}/mobile-video-cover-390.png`);
execFileSync('/opt/homebrew/bin/ffmpeg',['-hide_banner','-loglevel','error','-y','-i',`${base}/04-selling-options.mp4`,'-frames:v','1','-vf','scale=390:-1',`${privateOut}/actual-video-first-frame-390.png`]);
const result={status:'PASS',observedAt:new Date().toISOString(),command:'node scripts/social/verify-assets.mjs',images,videos,fixture:'owned marketing derivatives only; no customer data',networkCalls:0};
await fs.writeFile(`${privateOut}/asset-verification.json`,JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result));
