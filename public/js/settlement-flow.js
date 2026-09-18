const SettlementFlow = (() => {
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
      const {pending,results}=inspect(s,pid);
      if(board&&pending.length&&!navigating){navigating=true;location.replace('/player/?session='+encodeURIComponent(sid)+'&module=investment');return;}
      document.getElementById('settlementSummary')?.remove();
      if(pending.length||!results.length)return;
      const overlay=document.createElement('div');overlay.id='settlementSummary';overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');overlay.setAttribute('aria-label','투자 정산 결과');
      overlay.style.cssText='position:fixed;inset:0;z-index:5000;background:#102238f5;color:white;overflow:auto;padding:24px;box-sizing:border-box';
      const section=document.createElement('section');section.style.cssText='max-width:620px;margin:3vh auto';overlay.append(section);
      const heading=document.createElement('h2');heading.textContent='Q'+s.state.currentTurn+' 투자 손익';section.append(heading);
      let netTotal=0;
      for(const [,inv] of results){const net=(Number(inv.profitAmount)||0)+(Number(inv.lossAmount)||0);netTotal+=net;const card=document.createElement('article');card.style.cssText='background:white;color:#17243d;padding:20px;border-radius:16px;margin:12px 0';const title=document.createElement('h3');title.textContent=inv.productName;card.append(title);const body=document.createElement('p');body.textContent=(net>=0?'+':'')+net.toLocaleString('ko-KR')+'만 원';card.append(body);section.append(card);}
      const summary=document.createElement('p');summary.textContent='이번 쿼터 손익 합계 '+(netTotal>=0?'+':'')+netTotal.toLocaleString('ko-KR')+'만 원';section.append(summary);
      const next=document.createElement('button');next.textContent='결과 확인 · 개인판으로';next.style.cssText='width:100%;padding:20px;border:0;border-radius:14px;font-size:18px';section.append(next);
      next.onclick=async()=>{next.disabled=true;try{const updates={};for(const [id,i] of results)updates[id]=i.settledAt;await ref.child('integrated/'+pid+'/settlementSeen').update(updates);location.replace('/player-v3/?session='+encodeURIComponent(sid));}catch(e){next.disabled=false;next.textContent='저장 실패 · 다시 확인';}};
      document.body.append(overlay);
    });
  }
  return {inspect,watch};
})();
