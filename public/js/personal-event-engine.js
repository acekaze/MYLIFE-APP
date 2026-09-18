const PersonalEventEngine=(()=>{
  const find=id=>PERSONAL_EVENTS.find(c=>c.id===id);
  function effect(card,level,choice){
    if(card.kind==='tier')return {cash:card.values[level<=4?0:level<=8?1:2],time:0,score:0};
    if(card.kind==='choice'){if(![0,1].includes(choice))throw Error('선택지를 골라 주세요.');return {cash:card.values[choice],time:-(choice+1),score:0};}
    return {cash:card.cash||0,time:card.time||0,score:card.score||0};
  }
  function player(s,pid){s.integrated ||= {};return s.integrated[pid] ||= {cash:1000,time:8,score:0,salaryLevel:6,hand:[],achieved:[]};}
  function charge(p,delta,turn,id){
    p.eventDebts ||= {};const debt={cash:0,time:0,dueTurn:turn+1};
    for(const field of ['cash','time']){const amount=Number(delta[field])||0,available=Math.max(0,Number(p[field])||0);p[field]=Math.max(0,available+amount);debt[field]=Math.max(0,-amount-available);}
    p.score=(Number(p.score)||0)+(delta.score||0);
    if(debt.cash||debt.time)p.eventDebts[id]=debt;
    return debt;
  }
  function payDebts(p,turn){
    let cash=0,time=0;
    for(const debt of Object.values(p.eventDebts||{})){
      if(debt.dueTurn>turn)continue;
      for(const field of ['cash','time']){const paid=Math.min(Math.max(0,Number(p[field])||0),Number(debt[field])||0);p[field]-=paid;debt[field]-=paid;if(field==='cash')cash+=paid;else time+=paid;}
      if(debt.cash||debt.time)debt.dueTurn=turn+1;
    }
    return {cash,time};
  }
  function check(s,pid,turn){if(s?.gameVersion!=='integrated-v3'||s.state?.currentTurn!==turn||!s.players?.[pid]||![2,6,10,14,18].includes(turn)||!['investing','settling'].includes(s.state.phase))throw Error('현재 개인 이벤트를 처리할 수 없습니다.');}
  function draw(s,pid,turn,random){check(s,pid,turn);const p=player(s,pid);p.eventDraws ||= {};if(p.eventDraws[turn])return p.eventDraws[turn];const used=p.drawnEventIds||[],pool=PERSONAL_EVENTS.filter(c=>!used.includes(c.id));if(!pool.length)throw Error('이벤트 카드를 모두 사용했습니다.');const card=pool[Math.min(pool.length-1,Math.floor(random*pool.length))];p.drawnEventIds=[...used,card.id];return p.eventDraws[turn]={cardId:card.id,status:'revealed',drawnAt:Date.now()};}
  function replacement(s,pid,turn,index,random){check(s,pid,turn);const p=player(s,pid),r=p.eventDraws?.[turn];if(!r||r.status==='applied'||find(r.cardId)?.kind!=='replace')throw Error('교체 가능한 이벤트가 아닙니다.');if((r.drawCount||0)>=5)throw Error('최대 5번까지 뽑을 수 있습니다.');
    const hand=p.hand||[];if(r.swapIndex===undefined){if(!hand[index])throw Error('버릴 버킷을 골라 주세요.');r.swapIndex=index;r.swapTitle=hand[index][0];}
    const seen=new Set(p.drawnBucketIds||[]),titles=new Set([...hand,...(p.achieved||[])].map(c=>c[0]));const pool=BUCKET_CATALOG.filter(c=>!seen.has(c.id)&&!titles.has(c.title));if(!pool.length)throw Error('교체할 카드가 없습니다.');const card=pool[Math.min(pool.length-1,Math.floor(random*pool.length))];r.candidateId=card.id;r.drawCount=(r.drawCount||0)+1;p.drawnBucketIds=[...seen,card.id];return r;
  }
  function apply(s,pid,turn,choice){check(s,pid,turn);const p=player(s,pid),r=p.eventDraws?.[turn];if(!r)throw Error('카드를 먼저 공개하세요.');if(r.status==='applied')return r;const card=find(r.cardId);if(!card)throw Error('카드 정보가 없습니다.');
    if(card.kind==='replace'){const c=BUCKET_CATALOG.find(c=>c.id===r.candidateId);if(!c||p.hand?.[r.swapIndex]?.[0]!==r.swapTitle)throw Error('교체할 버킷을 확인하세요.');p.hand[r.swapIndex]=[c.title,c.cash,c.time,c.score,turn,c.id];}
    const team=s.players[pid].teamId;const targets=card.kind==='team'?Object.entries(s.players).filter(([id,x])=>team?x.teamId===team:id===pid).map(([id])=>id):[pid];
    r.effects={};for(const id of targets){const target=player(s,id),delta=effect(card,target.salaryLevel||6,choice);const debt=charge(target,delta,turn,pid+'_'+turn);target.eventHistory ||= {};target.eventHistory[pid+'_'+turn]={cardId:card.id,sourcePlayer:pid,turn,delta,debt:{...debt},keep:card.keep};r.effects[id]={...delta,debt:{...debt}};}
    r.status='applied';r.choice=choice??null;r.appliedAt=Date.now();p.turnActions ||= {};p.turnActions[turn]={...p.turnActions[turn],event:true};p.progress={...p.progress,[turn]:Math.max(p.progress?.[turn]||0,1)};return r;
  }
  return {effect,charge,payDebts,check,draw,replacement,apply,find};
})();
