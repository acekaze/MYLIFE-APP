const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');const c={};vm.createContext(c);vm.runInContext(fs.readFileSync('public/js/world-event-catalog.js','utf8')+';this.cards=WORLD_EVENT_CATALOG;',c);vm.runInContext(fs.readFileSync('public/js/world-broadcast.js','utf8')+';this.w=WorldBroadcast;',c);
assert.deepEqual(Array.from({length:20},(_,i)=>i+1).filter(c.w.scheduled),[4,8,12,16,20]);
const s={gameVersion:'integrated-v3',state:{currentTurn:1,phase:'investing'},players:{a:{},b:{}}};assert.equal(c.w.drawInto(s,'x',0),undefined);
for(const turn of [4,8,12,16,20]){s.state.currentTurn=turn;assert(c.w.pending(s));assert(c.w.drawInto(s,'x'+turn,0));assert.equal(c.w.drawInto(s,'repeat'+turn,.9),undefined);assert(c.w.pending(s));c.w.current(s).status='applied';assert.equal(c.w.pending(s),false);}
assert.equal(new Set(Object.values(s.worldBroadcasts).map(e=>e.cardId)).size,5);assert.equal(Object.keys(s.worldBroadcasts.x4.recipients).length,2);
s.state.phase='quarterClosing';assert.equal(c.w.pending(s),false);assert.equal(c.w.drawInto(s,'after',.1),undefined);
assert.equal(c.w.pending({...s,gameVersion:'legacy'}),false);console.log('PASS: Q4/8/12/16/20, one draw each, no repeated cards, recipients, block until applied, legacy unchanged');
