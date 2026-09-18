const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const c={};vm.createContext(c);vm.runInContext(fs.readFileSync('public/js/integrated-assets.js','utf8')+';this.api=IntegratedAssets;',c);
const p={time:9};
assert.equal(c.api.resetTime(p,{currentTurn:4,phase:'investing'}),false);
assert.equal(p.time,9);
for(const end of [4,8,12,16,20]){
 p.time=9;
 const st={currentTurn:end,phase:end===20?'ended':'quarterClosing'};
 assert.equal(c.api.resetTime(p,st),true);assert.equal(p.time,0);
 assert.equal(c.api.resetTime(p,st),false);
 if(end<20){p.time+=4;assert.equal(c.api.resetTime(p,{currentTurn:end+1,phase:'investing'}),false);assert.equal(p.time,4);}
}
assert.equal(p.discardedTimeCount,45);
const offline={time:7};assert.equal(c.api.resetTime(offline,{currentTurn:5,phase:'investing'}),true);assert.equal(offline.time,0);
console.log('PASS: quarterly reset, one-time discard count, next-turn income preserved, reconnect catch-up');
