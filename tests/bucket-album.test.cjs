const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const c={};vm.createContext(c);vm.runInContext(fs.readFileSync('public/player-v3/bucket-ui.js','utf8')+';this.ui=BucketUI;',c);
const cards=[['a',10,1,2,1,'a',1],['b',20,1,3,2,'b',4],['c',30,1,4,5,'c',5],['old',10,1,1]];
let g=c.ui.groupAchievements(cards.slice(0,2),4);assert.equal(g.current.length,2);
g=c.ui.groupAchievements(cards,5);assert.equal(g.current.length,1);assert.equal(g.archive[1].length,2);assert.equal(g.archive[0].length,1);
g=c.ui.groupAchievements(cards,8);assert.equal(g.current.length,1);
g=c.ui.groupAchievements(cards,9);assert.equal(g.current.length,0);assert.equal(g.archive[2].length,1);
assert.equal(cards.length,4);console.log('PASS: Q4 retention, Q5 archive, Q8 retention, Q9 archive, undated records preserved');
