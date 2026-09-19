const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');const c={};vm.createContext(c);vm.runInContext(fs.readFileSync('public/js/turn-completion.js','utf8')+';this.turn=TurnCompletion;',c);
const s={gameVersion:'integrated-v3',state:{currentTurn:1,phase:'investing'},integrated:{p:{progress:{1:5}}},investments:{a:{playerId:'p',turn:1,amount:500,productId:'bond-fund',createdAt:1000}}};
assert.equal(c.turn.status(s,'p',3999).ready,false);assert.equal(c.turn.status(s,'p',4000).ready,true);assert.equal(c.turn.status(s,'p',4000).completed,false);
s.integrated.p.turnCompletions={1:{fingerprint:c.turn.status(s,'p',4000).fingerprint,completedAt:4000}};assert.equal(c.turn.status(s,'p',5000).completed,true);
s.investments.a.amount=600;s.investments.a.updatedAt=5000;assert.equal(c.turn.status(s,'p',6000).completed,false);assert.equal(c.turn.status(s,'p',7999).ready,false);assert.equal(c.turn.status(s,'p',8000).ready,true);
delete s.investments;s.skips={'1_p':{createdAt:9000}};assert.equal(c.turn.status(s,'p',11999).ready,false);assert.equal(c.turn.status(s,'p',12000).ready,true);
s.integrated.p.progress[1]=3;assert.equal(c.turn.status(s,'p',12000).ready,false);s.state.currentTurn=2;assert.equal(c.turn.status(s,'p',20000).ready,false);assert.equal(c.turn.status(s,'p',20000).completed,false);
console.log('PASS: 3-second gate, explicit completion, edit invalidation, skip, step prerequisite, per-turn isolation');
