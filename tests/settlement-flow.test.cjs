const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');const c={};vm.createContext(c);vm.runInContext(fs.readFileSync('public/js/settlement-flow.js','utf8')+';this.flow=SettlementFlow;',c);
const s={state:{currentTurn:5,phase:'settling'},integrated:{p:{}},investments:{a:{playerId:'p',amount:500,maturityTurn:5,result:'pending'},b:{playerId:'other',maturityTurn:5,result:'pending'},future:{playerId:'p',maturityTurn:9,result:'pending'}}};
assert.equal(c.flow.inspect(s,'p').pending.length,1);
s.investments.a.result='success';s.investments.a.settledAt=100;s.investments.a.profitAmount=20;
assert.equal(c.flow.inspect(s,'p').pending.length,0);assert.equal(c.flow.inspect(s,'p').results.length,1);
s.integrated.p.settlementSeen={a:100};assert.equal(c.flow.inspect(s,'p').results.length,0);
s.investments.a.settledAt=101;assert.equal(c.flow.inspect(s,'p').results.length,1);
s.state.phase='finalSettling';assert.equal(c.flow.inspect(s,'p').pending.length,1);
console.log('PASS: own maturity only, others do not block, result survives reload until acknowledged, final maturity');
