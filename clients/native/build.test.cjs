const {test}=require('node:test');
const assert=require('node:assert/strict');
const {execFileSync}=require('node:child_process');
const fs=require('node:fs');
const path=require('node:path');
test('iOS typography applies the full OS preference once, without a cap or smaller fit',()=>{
 const ts=require('typescript');const compiled={exports:{}};
 new Function('exports','module',ts.transpileModule(fs.readFileSync(path.join(__dirname,'textScale.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText)(compiled.exports,compiled);
 for(const scale of[1,1.79,2,2.35,3.1,4])assert.deepEqual(compiled.exports.textScale('ios',scale,16),{allowFontScaling:false,style:{fontSize:16*scale}});
 assert.deepEqual(compiled.exports.textScale('android',2,16),{allowFontScaling:true,style:{}});
 assert.throws(()=>compiled.exports.textScale('ios',NaN,16));
});
test('real Metro transform identity separates disconnected and each public synthetic binding',()=>{
 const version=value=>execFileSync(process.execPath,['-e','console.log(require("./metro.config.cjs").cacheVersion)'],{cwd:__dirname,env:{PATH:process.env.PATH,HOME:process.env.HOME,...(value?{EXPO_PUBLIC_AMM_NATIVE_QA_BINDING:value}:{})},encoding:'utf8'}).trim();
 const off=version(),a=version('SYNTHETIC-A'),b=version('SYNTHETIC-B');
 assert.notEqual(off,a);assert.notEqual(a,b);assert.equal(version('SYNTHETIC-A'),a);
});
test('local packaging keeps simulator entitlements and loopback exception out of distribution claims',()=>{
 const build=fs.readFileSync(path.resolve(__dirname,'../../scripts/amm/native-local-build.mjs'),'utf8');
 assert.match(build,/-sdk["'], ["']iphonesimulator/);
 assert.match(build,/CODE_SIGN_IDENTITY=-/);assert.doesNotMatch(build,/DEVELOPMENT_TEAM=/);
 assert.match(build,/assertBundleBinding/);assert.match(build,/compiled_bundle_backend_identity_mismatch/);
 assert.match(build,/base-config cleartextTrafficPermitted=\\?"false/);
 assert.match(build,/10\.0\.2\.2/);assert.doesNotMatch(build,/\.\.\.process\.env|eas build|eas update|simctl launch|adb install/);
 const entitlements=fs.readFileSync(path.join(__dirname,'simulator.entitlements'),'utf8');
 assert.match(entitlements,/com\.askmagicmike\.r3preview/);assert.doesNotMatch(entitlements,/com\.apple\.developer\.team-identifier/);
});
