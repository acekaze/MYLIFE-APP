const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');const c={};vm.createContext(c);vm.runInContext(fs.readFileSync('public/js/world-event-catalog.js','utf8')+';this.cards=WORLD_EVENT_CATALOG;',c);vm.runInContext(fs.readFileSync('public/js/world-broadcast.js','utf8')+';this.w=WorldBroadcast;',c);
assert.deepEqual(Array.from({length:20},(_,i)=>i+1).filter(c.w.scheduled),[4,8,12,16,20]);
const s={gameVersion:'integrated-v3',state:{currentTurn:1,phase:'investing'},players:{a:{},b:{}}};assert.equal(c.w.drawInto(s,'x',0),undefined);
for(const turn of [4,8,12,16,20]){s.state.currentTurn=turn;assert(c.w.pending(s));assert(c.w.drawInto(s,'x'+turn,0));assert.equal(c.w.drawInto(s,'repeat'+turn,.9),undefined);assert(c.w.pending(s));c.w.current(s).status='applied';assert.equal(c.w.pending(s),false);}
assert.equal(new Set(Object.values(s.worldBroadcasts).map(e=>e.cardId)).size,5);assert.equal(Object.keys(s.worldBroadcasts.x4.recipients).length,2);
s.state.phase='quarterClosing';assert.equal(c.w.pending(s),false);assert.equal(c.w.drawInto(s,'after',.1),undefined);
assert.equal(c.w.pending({...s,gameVersion:'legacy'}),false);console.log('PASS: Q4/8/12/16/20, one draw each, no repeated cards, recipients, block until applied, legacy unchanged');
const empty={gameVersion:'integrated-v3',state:{currentTurn:4,phase:'investing'},players:{a:{}},integrated:{a:{cash:1000}}};
assert(c.w.skipWithoutInvestments(empty,'skip4',4));assert.equal(c.w.pending(empty),false);assert.equal(empty.integrated.a.cash,1000);assert.equal(c.w.skipWithoutInvestments(empty,'again',4),undefined);
const announced={gameVersion:'integrated-v3',state:{currentTurn:8,phase:'investing'},players:{a:{}}};c.w.drawInto(announced,'event8',0);const title=announced.worldBroadcasts.event8.title;c.w.skipWithoutInvestments(announced,'unused',8);assert.equal(c.w.current(announced).title,title);assert.equal(c.w.current(announced).revision,2);
const hasInvestment={gameVersion:'integrated-v3',state:{currentTurn:4,phase:'investing'},investments:{x:{result:'pending'}},players:{a:{}}};assert.equal(c.w.skipWithoutInvestments(hasInvestment,'x',4),undefined);assert.equal(c.w.skipWithoutInvestments({...empty,state:{currentTurn:8,phase:'investing'}},'stale',4),undefined);
console.log('PASS: no-investment skip before/after reveal, assets unchanged, double-click and stale-turn guards');
