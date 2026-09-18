const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');const c={};vm.createContext(c);
for(const file of ['bucket-catalog','personal-event-catalog','personal-event-engine'])vm.runInContext(fs.readFileSync('public/js/'+file+'.js','utf8'),c);
vm.runInContext('this.engine=PersonalEventEngine;this.cards=PERSONAL_EVENTS;',c);const e=c.engine;
assert.equal(c.cards.length,32);assert.equal(new Set(c.cards.map(x=>x.id)).size,32);assert.equal(c.cards.filter(x=>x.college).length,4);
for(const card of c.cards)assert(fs.existsSync('public'+card.image));
function session(cardId){return {gameVersion:'integrated-v3',state:{currentTurn:2,phase:'investing'},players:{a:{teamId:'one'},b:{teamId:'one'},c:{teamId:'two'}},integrated:{a:{cash:20,time:0,score:0,salaryLevel:6,hand:[['original',10,1,1,1,'old']],eventDraws:cardId?{2:{cardId,status:'revealed'}}:{}},b:{cash:100,time:3,score:0,salaryLevel:6},c:{cash:100,time:3,score:0,salaryLevel:6}}};}
let s=session('personal-18');e.apply(s,'a',2,0);assert.equal(s.integrated.a.cash,0);assert.equal(s.integrated.a.eventDebts.a_2.cash,10);assert.equal(s.integrated.a.eventDebts.a_2.time,1);e.apply(s,'a',2,0);assert.equal(s.integrated.a.eventDebts.a_2.cash,10);
s.integrated.a.cash=100;s.integrated.a.time=4;e.payDebts(s.integrated.a,2);assert.equal(s.integrated.a.cash,100);e.payDebts(s.integrated.a,3);assert.equal(s.integrated.a.cash,90);assert.equal(s.integrated.a.time,3);e.payDebts(s.integrated.a,3);assert.equal(s.integrated.a.cash,90);
s=session('personal-24');e.apply(s,'a',2,0);assert.equal(s.integrated.a.cash,120);assert.equal(s.integrated.b.cash,200);assert.equal(s.integrated.c.cash,100);e.apply(s,'a',2,0);assert.equal(s.integrated.b.cash,200);
for(const [level,amount] of [[1,-200],[4,-200],[5,-400],[8,-400],[9,-600],[13,-600]])assert.equal(e.effect(e.find('personal-23'),level).cash,amount);
assert.equal(e.effect(e.find('personal-33'),6,1).cash,100);assert.equal(e.effect(e.find('personal-33'),6,1).time,-2);assert.throws(()=>e.effect(e.find('personal-33'),6,8));
s=session();const first=e.draw(s,'a',2,.2).cardId;assert.equal(e.draw(s,'a',2,.8).cardId,first);s.state.currentTurn=6;assert.notEqual(e.draw(s,'a',6,.2).cardId,first);
s=session('personal-45');for(let i=0;i<5;i++)e.replacement(s,'a',2,0,.2);assert.throws(()=>e.replacement(s,'a',2,0,.2));const expected=s.integrated.a.eventDraws[2].candidateId;e.apply(s,'a',2,0);assert.equal(s.integrated.a.hand[0][5],expected);assert.equal(s.integrated.a.score,3);e.apply(s,'a',2,0);assert.equal(s.integrated.a.score,3);assert.equal(s.integrated.a.turnActions[2].discard,undefined);
for(const card of c.cards){if(['replace'].includes(card.kind))continue;const fixture=session(card.id);e.apply(fixture,'a',2,0);assert.equal(fixture.integrated.a.eventDraws[2].status,'applied');}
console.log('PASS: all 32 cards, images, tier boundaries, team isolation, choices, debts carried once, draw persistence, five replacement draws, no double effects');
