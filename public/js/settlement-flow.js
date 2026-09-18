const SettlementFlow = (() => {
  function returnToBoard(sid){
    if(window.parent!==window&&new URLSearchParams(location.search).get('embed')==='1'){
      window.parent.postMessage({type:'mylife-return-board'},location.origin);return;
    }
    location.replace('/player-v3/?session='+encodeURIComponent(sid));
  }
  function inspect(session,pid){
    const turn=session.state?.currentTurn||1,final=['finalSettling','ended'].includes(session.state?.phase);
    const records=Object.entries(session.investments||{}).filter(([,i])=>i.playerId===pid);
    const pending=records.filter(([,i])=>i.result==='pending'&&(final||i.maturityTurn<=turn));
    const seen=session.integrated?.[pid]?.settlementSeen||{};
    const results=records.filter(([id,i])=>i.result!=='pending'&&i.settledAt&&Number(i.settledTurn??i.maturityTurn)===Number(turn)&&seen[id]!==i.settledAt);
    return {pending,results};
  }
  function watch(sid,pid,board){
    const db=firebase.database(),ref=db.ref('sessions/'+sid);let navigating=false;
    ref.on('value',snap=>{
      const s=snap.val();if(s?.gameVersion!=='integrated-v3')return;
      const {pending}=inspect(s,pid),team=TeamPlay.settlement(s,pid),own=team.list.find(p=>p.id===pid);
      if(!pending.length)navigating=false;
      if(board&&pending.length&&!own?.skipped&&!navigating){navigating=true;if(typeof BoardShell!=='undefined')BoardShell.openInvestment(true);else location.replace('/player/?session='+encodeURIComponent(sid)+'&module=investment');return;}
      const wasShowing=!!document.getElementById('settlementSummary');
      document.getElementById('settlementSummary')?.remove();
      if(team.complete&&wasShowing&&!board){returnToBoard(sid);return;}
      if((pending.length&&!own?.skipped)||!team.hasResults||team.complete)return;
      const overlay=document.createElement('div');overlay.id='settlementSummary';overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');overlay.setAttribute('aria-label','팀 투자 결과');
      overlay.style.cssText='position:fixed;inset:0;z-index:5000;background:#102238f5;color:white;overflow:auto;padding:24px;box-sizing:border-box';
      const section=document.createElement('section');section.style.cssText='max-width:650px;margin:3vh auto';overlay.append(section);
      const heading=document.createElement('h2');heading.textContent='Q'+team.turn+' · 우리 팀 투자 결과';section.append(heading);
      for(const member of team.list){
        const row=document.createElement('details');row.style.cssText='background:white;color:#17243d;padding:18px;border-radius:16px;margin:12px 0';
        const title=document.createElement('summary');title.textContent=member.name+' · '+(member.skipped?'진행자 건너뛰기':member.pending.length?'정산 중':member.results.length?(member.net>=0?'+':'')+member.net+'만 원':'만기 없음');row.append(title);
        for(const [,inv] of member.results){const p=document.createElement('p');p.textContent=inv.productName+' · 원금 '+inv.amount+'만 · '+inv.result+' · 손익 '+((inv.profitAmount||0)+(inv.lossAmount||0))+'만';row.append(p);}section.append(row);
      }
      const hint=document.createElement('p');hint.textContent=team.ready?'팀 결과를 함께 이야기한 뒤 완료를 눌러 주세요.':'팀원의 정산 결과가 여기에 실시간으로 표시됩니다.';section.append(hint);
      const next=document.createElement('button');next.textContent='함께 확인 완료 · 개인판으로';next.disabled=!team.ready;next.style.cssText='width:100%;padding:20px;border:0;border-radius:14px;font-size:18px';section.append(next);
      next.onclick=async()=>{next.disabled=true;try{await TeamPlay.confirmSettlement(sid,pid);returnToBoard(sid);}catch(e){hint.textContent=e.message;next.disabled=false;}};
      document.body.append(overlay);
    });
  }
  return {inspect,watch,returnToBoard};
})();
