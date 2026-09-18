/* Shared projection: investment records are the only source for investment cash flow. */
const IntegratedAssets = (() => {
  function resetTime(player, state) {
    const turn=Number(state?.currentTurn)||1;
    const closed=state?.phase==='quarterClosing'||state?.phase==='ended';
    const boundary=closed&&turn%4===0?turn:Math.floor((turn-1)/4)*4;
    if(!boundary||(player.timeResetTurn||0)>=boundary)return false;
    const unused=Math.max(0,Number(player.time)||0);
    player.time=0;
    player.discardedTimeCount=(Number(player.discardedTimeCount)||0)+unused;
    player.timeResetTurn=boundary;
    player.timeResets={...player.timeResets,[boundary]:{discarded:unused}};
    return true;
  }
  function totals(session, pid) {
    let cashFlow=0, principal=0, profit=0;
    for(const inv of Object.values(session.investments||{})) {
      if(inv.playerId!==pid) continue;
      const forced=Number(inv.forcedLossTotal)||0;
      if(inv.result==='pending') { principal+=Number(inv.amount)||0; cashFlow-=(Number(inv.amount)||0)+forced; }
      else { const net=(Number(inv.profitAmount)||0)+(Number(inv.lossAmount)||0)-forced; cashFlow+=net; profit+=net; }
    }
    return {cashFlow,principal,profit};
  }
  function reconcile(s) {
    if(!s||s.gameVersion!=='integrated-v3') return false;
    let changed=false;
    for(const [pid,p] of Object.entries(s.integrated||{})) {
      if(resetTime(p,s.state))changed=true;
      const t=totals(s,pid), previous=p.investmentCashFlow||0;
      if(previous!==t.cashFlow||p.investmentPrincipal!==t.principal||p.investmentProfit!==t.profit) {
        p.cash=(Number(p.cash)||0)+t.cashFlow-previous;
        p.investmentCashFlow=t.cashFlow;p.investmentPrincipal=t.principal;p.investmentProfit=t.profit;changed=true;
      }
      const count=(p.achieved||[]).length, score=Number(p.score)||0;
      if(p.bucketCount!==count||p.satisfactionScore!==score){p.bucketCount=count;p.satisfactionScore=score;changed=true;}
    }
    if(s.state?.phase==='settling'&&!Object.values(s.investments||{}).some(i=>i.result==='pending'&&i.maturityTurn<=s.state.currentTurn)) {s.state.phase='investing';changed=true;}
    return changed;
  }
  const watching=new Set();
  function watch(sid) {
    if(watching.has(sid))return;watching.add(sid);
    const ref=firebase.database().ref('sessions/'+sid);
    ref.on('value',snap=>{const s=snap.val();if(!reconcile(s))return;ref.transaction(current=>{if(reconcile(current))return current;}).catch(console.error);});
  }
  async function invest(sid,investment) {
    const ref=firebase.database().ref('sessions/'+sid), key=ref.child('investments').push().key;
    await ref.once('value');
    const result=await ref.transaction(s=>{
      if(!s||s.gameVersion!=='integrated-v3'||s.state.phase!=='investing'||s.state.currentTurn!==investment.turn)return;
      reconcile(s);const p=s.integrated?.[investment.playerId];if(!p||p.cash<investment.amount)return;
      s.investments=s.investments||{};s.investments[key]=investment;reconcile(s);return s;
    });
    if(!result.committed)throw new Error('보유 현금이나 현재 턴 상태를 확인해 주세요.');
  }
  return {totals,reconcile,watch,invest,resetTime};
})();
