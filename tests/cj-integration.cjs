const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'), source=fs.readFileSync(path.join(root,'gameplay.js'),'utf8');
const adapter=source.slice(source.indexOf('let leavingGameplay = false;'),source.indexOf('function safeParseJSON'));
const boundary=source.slice(source.indexOf('const resetActivityFrame ='),source.indexOf('let impacts ='));
const calls=[],events={},docEvents={};let focused=true,blocked=false,suspends=0;
const c={window:null,ui:{gameOver:false},runMetricsCommitted:false,lastFrameTime:123,
 document:{hidden:false,hasFocus:()=>focused,getElementById:id=>id==='orientationLock'?{}:null,addEventListener:(n,f)=>docEvents[n]=f},
 getComputedStyle:()=>({display:blocked?'flex':'none'}),addEventListener:(n,f)=>events[n]=f,
 CJEngine:{tracksPlayTime:true,tick:(d,k)=>{calls.push([d,k]);return d;},suspend:()=>suspends++}};
c.window=c;vm.createContext(c);vm.runInContext(adapter+boundary,c);
assert.equal(vm.runInContext('tickGlobalCJ(100)',c),100);assert.deepEqual(calls.pop(),[100,'velocity']);
for(const value of [0,-1,201,Infinity,NaN])assert.equal(vm.runInContext(`tickGlobalCJ(${value})`,c),0);
for(const condition of ['ui.gameOver=true','runMetricsCommitted=true','leavingGameplay=true']){
 vm.runInContext(condition,c);assert.equal(c.getGameState().running,false);assert.equal(vm.runInContext('tickGlobalCJ(100)',c),0);vm.runInContext(condition.replace('true','false'),c);
}
for(const set of [v=>c.document.hidden=v,v=>focused=!v,v=>blocked=v]){set(true);assert.equal(c.getGameState().paused,true);assert.equal(vm.runInContext('tickGlobalCJ(100)',c),0);set(false);}
for(const name of ['blur','focus','pagehide','pageshow','resize','orientationchange']){c.lastFrameTime=123;events[name]();assert.equal(c.lastFrameTime,null);}
c.lastFrameTime=123;docEvents.visibilitychange();assert.equal(c.lastFrameTime,null);assert.equal(suspends,7);
c.CJEngine.suspend=()=>{throw Error('unavailable')};events.focus();
assert.equal(calls.length,0);
assert.equal((source.match(/runMetrics\.playTime \+= tickGlobalCJ/g)||[]).length,1);
assert.ok(source.includes('tickGlobalCJ(rawDeltaTime * 1000)'));
for(const file of ['game.html','profil.html']){
 const html=fs.readFileSync(path.join(root,file),'utf8');
 assert.equal((html.match(/core\/cjAccount\.js/g)||[]).length,1);assert.equal((html.match(/core\/cjEngine\.js/g)||[]).length,1);
 assert.ok(html.indexOf('core/cjAccount.js')<html.indexOf('core/cjEngine.js'));assert.ok(html.includes('data-universal="true"'));
}
const profile=fs.readFileSync(path.join(root,'profile.js'),'utf8');assert.doesNotMatch(profile,/setInterval\s*\(|addPlayTime\s*\(|addCJ\s*\(|CJEngine\.tick\s*\(/);
assert.doesNotMatch(source,/addPlayTime\s*\(|addCJ\s*\(|spendCJ\s*\(|setItem\s*\(\s*['"]cjPlayerData/);
console.log('PASS: velocity key; active/game-over/committed/leaving/hidden/focus/overlay; delta bounds; clean boundaries; one tick site; script order; profile without time writer.');
