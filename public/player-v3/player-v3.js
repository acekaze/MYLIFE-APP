(()=>{const q=new URLSearchParams(location.search),sid=q.get('session'),pid=localStorage.getItem('mylife_player_id');if(!sid||!pid){document.getElementById('title').textContent='참가자 링크로 입장해 주세요';const link=document.createElement('a');link.href='/player/'+(sid?'?session='+encodeURIComponent(sid):'');link.textContent='참가자 입장';document.getElementById('content').append(link);return;}const db=firebase.database(),root=db.ref(`sessions/${sid}/integrated/${pid}`),state=db.ref(`sessions/${sid}/state`);IntegratedAssets.watch(sid);WorldBroadcast.watch(sid,pid);SettlementFlow.watch(sid,pid,true);TeamPlay.watchSalary(sid,pid);TurnCompletion.watch(sid,pid,true);let turn=1,step=0,open=false,cash=1000,time=8,score=0,achieved=[],hand=[],products=[['채권형펀드',4,0],['주식형펀드',8,-10],['고위험ETF',20,-30],['선물/옵션',30,-40]];const el=id=>document.getElementById(id),c=el('content'),save=x=>root.update({...x,cash,time,score,turn,achieved,hand,updatedAt:Date.now()});function frame(){BoardShell.paint({sid,turn,phase:sessionPhase,closing:closingTurn,furthest,salaryLevel,salaryRows,cash,time,score,achieved,ability:window.abilityCount||0,principal:window.principal||0,profit:window.investmentProfit||0,eventDebts,name:localStorage.getItem('mylife_player_name')||'참가자',teamName,discardedTime,maxTurns});BucketUI.gallery(el('handFrame'),hand,'내 버킷 '+hand.length+'/5');BoardShell.decorateHand(hand.length);BucketUI.album(el('achievedFrame'),achieved,turn,!!closingTurn||sessionPhase==='ended');}let furthest=0,turnActions={},busy=false,sessionPhase='investing',closingTurn=0,negotiations={},quarterReviews={},salaryLevel=6,eventDraws={},eventDebts={},teamName='',discardedTime=0,maxTurns=20;
const shuffledBucketIds=BucketDeck.shuffle(BUCKET_CATALOG);
const salaryRows=[[340,400,480],[430,500,600],[510,600,720],[550,650,780],[640,750,900],[720,850,1020],[770,900,1080],[850,1000,1200],[940,1100,1320],[980,1150,1380],[1060,1250,1500],[1150,1350,1620],[1230,1450,1740]];
function raiseFor(total){return total<=2?0:total<=4?1:total<=6?2:3;}
function hydrate(d){eventDraws=d.eventDraws||{};eventDebts=d.eventDebts||{};discardedTime=d.discardedTimeCount||0;window.principal=d.investmentPrincipal||0;window.investmentProfit=d.investmentProfit||0;salaryLevel=d.salaryLevel||6;cash=d.cash??cash;time=d.time??time;score=d.score??score;hand=d.hand||[];achieved=d.achieved||[];turnActions=d.turnActions||{};window.abilityCount=d.abilityLevel||0;negotiations=d.negotiations||{};quarterReviews=d.quarterReviews||{};furthest=Math.max(furthest,d.progress?.[turn]||0);}
async function onceAction(key,change,next){
 if(busy)return;busy=true;
 try{const session=(await db.ref('sessions/'+sid).once('value')).val();if(WorldBroadcast.pending(session))throw new Error('월드 이벤트 적용 대기');const liveState=session?.state;const settlement=SettlementFlow.inspect(session||{},pid);if((liveState?.currentTurn||1)!==turn||!['investing','settling'].includes(liveState?.phase)||(!TeamPlay.settlement(session,pid).list.find(p=>p.id===pid)?.skipped&&settlement.pending.length)||(TeamPlay.settlement(session,pid).hasResults&&!TeamPlay.settlement(session,pid).complete))throw new Error('턴 변경');await root.once('value');const result=await root.transaction(d=>{
 d=d||{cash,time,score,hand,achieved};
 IntegratedAssets.resetTime(d,liveState);
 const a=d.turnActions?.[turn]||{};
 if(a[key])return;
 const changed=change(d,a);if(!changed)return;
 return {...changed,turnActions:{...d.turnActions,[turn]:{...a,[key]:true}},progress:{...d.progress,[turn]:Math.max(d.progress?.[turn]||0,next)},updatedAt:Date.now()};
 });if(result.committed){hydrate(result.snapshot.val());step=next;}else{const snap=await root.once('value');if(snap.val())hydrate(snap.val());if(actions()[key])step=next;}
 }catch(e){alert('저장 실패: 다시 시도해 주세요.');}finally{busy=false;render();}
}
function actions(){return turnActions[turn]||{done:false,discard:false};}
async function bucketAction(kind,i){if(busy||actions()[kind]||!hand[i])return;busy=true;const card=hand[i];try{await root.once('value');const result=await root.transaction(data=>{data=data||{cash,time,score,hand,achieved};const all=data.turnActions||{},a=all[turn]||{done:false,discard:false};if(a[kind])return;const cards=data.hand||hand,x=cards[i];if(!x||x[0]!==card[0])return;if(kind==='done'&&(x[1]>data.cash||x[2]>data.time))return;const nextCards=cards.slice();nextCards.splice(i,1);return {...data,hand:nextCards,achieved:kind==='done'?[...(data.achieved||[]),[...x.slice(0,4),x[4]??turn,x[5]??'',turn]]:(data.achieved||[]),cash:data.cash-(kind==='done'?x[1]:0),time:data.time-(kind==='done'?x[2]:0),score:data.score+(kind==='done'?x[3]:0),turnActions:{...all,[turn]:{...a,[kind]:true}},updatedAt:Date.now()};});if(result.committed){const d=result.snapshot.val();hand=d.hand||[];achieved=d.achieved||[];cash=d.cash;time=d.time;score=d.score;turnActions=d.turnActions||{};}else {const latest=(await root.once('value')).val();if(latest)hydrate(latest);const x=hand[i];alert(actions()[kind]?'이번 턴의 '+(kind==='done'?'이루기':'버리기')+' 1회를 이미 사용했습니다.':kind==='done'&&x&&(cash<x[1]||time<x[2])?'현금 또는 시간 토큰이 부족합니다.':'카드 상태가 변경되었습니다. 다시 선택해 주세요.');}}catch(e){alert('저장하지 못했습니다. 다시 시도해 주세요.');}finally{busy=false;render();}}
async function applySalary(nextTurn){
 await root.once('value');
 const result=await root.transaction(d=>{if(!d)return;const ready=Object.values(d.negotiations||{}).filter(r=>r.status==='settled'&&r.effectiveTurn<=nextTurn).sort((a,b)=>b.effectiveTurn-a.effectiveTurn)[0];if(!ready||(d.salaryAppliedTurn||0)>=ready.effectiveTurn)return;return {...d,salaryLevel:ready.after,salaryAppliedTurn:ready.effectiveTurn};});
 if(result.snapshot.val())hydrate(result.snapshot.val());
}
function negotiationScreen(){c.innerHTML='<h2>팀 연봉협상</h2><p>팀 순서에 따라 룰렛을 돌리고 결과를 공유합니다.</p>';}
function personalEventDue(n){return [2,6,10,14,18].includes(Number(n));}
function render(){if(busy&&el('salaryWheel'))return;el('negotiationPopup')?.remove();if(!closingTurn)el('bucketReview')?.remove();el('bucketChooser')?.remove();el('bucketDetail')?.remove();el('abilityPopup')?.remove();el('salaryReceivePopup')?.remove();el('personalEventPopup')?.remove();if(!personalEventDue(turn)&&step===0)step=1;if(personalEventDue(turn)&&!actions().event&&sessionPhase==='investing')step=0;if(!el('handFrame')){for(const id of ['handFrame','achievedFrame']){const section=document.createElement('section');section.id=id;section.className='card';c.after(section);}}if(sessionPhase==='ended'){frame();return;}if(BoardShell.view!=='board'){frame();return;}if(closingTurn){frame();
 if(!quarterReviews[closingTurn]){
 c.innerHTML='<h2>버킷 나누기</h2><p>이번 4턴 동안 이룬 버킷을 공유하세요.</p>';
 if(!el('bucketReview')){const period=closingTurn,group=BucketUI.groupAchievements(achieved,period);BucketUI.review(group.current,group.currentPeriod,async()=>{await root.child('quarterReviews/'+period).set({completedAt:Date.now()});quarterReviews[period]={completedAt:Date.now()};render();});}
 return;
 }
 el('bucketReview')?.remove();negotiationScreen();const reviewButton=document.createElement('button');reviewButton.textContent='이번 4턴 버킷 나누기';reviewButton.onclick=()=>{const group=BucketUI.groupAchievements(achieved,turn);BucketUI.review(group.current,group.currentPeriod);};c.prepend(reviewButton);return;}furthest=Math.max(furthest,step);for(let i=0;i<6;i++){const t=el('s'+i);t.classList.toggle('on',i===step);t.disabled=i>furthest;t.setAttribute('aria-current',i===step?'step':'false');t.style.display=i===0&&!personalEventDue(turn)?'none':'';t.onclick=()=>{if(i<=furthest){step=i;render()}}}el('title').textContent=`Q${turn} · ${['개인 이벤트','임금 수령','버킷 채우기','업무능력 투자','버킷 처리','상품 투자'][step]}`;frame();if(step===0){
c.innerHTML='<h2>개인 이벤트</h2><p>카드의 효과를 확인하고 함께 이야기하세요.</p>';
if(actions().event&&!eventDraws[turn]){c.innerHTML='<h2>개인 이벤트 처리 완료</h2><button id="eventContinue">임금 수령으로</button>';el('eventContinue').onclick=()=>{step=1;render();};}
else PersonalEventUI.show({sid,pid,turn,record:eventDraws[turn],resources:{cash,time,salaryLevel,hand},onRefresh:record=>{if(record)eventDraws[turn]=record;render();},onDone:()=>{step=1;render();}});
}else if(step===1){
const amounts=salaryRows[salaryLevel-1];
c.innerHTML='<h2>임금 수령</h2><p>'+(actions().pay?'이번 턴 수령 완료':'휴가·기본근무·야근 중 선택하세요.')+'</p>';
if(actions().pay){
 c.innerHTML+='<button id="payContinue">버킷 채우기로</button>';el('payContinue').onclick=()=>{step=2;render()};
}else{
 c.innerHTML+='<button id="openPay">수령 선택 →</button>';el('openPay').onclick=()=>{
 const popup=document.createElement('div');popup.id='salaryReceivePopup';popup.setAttribute('role','dialog');popup.setAttribute('aria-modal','true');popup.setAttribute('aria-label','임금과 시간 수령');
 popup.style.cssText='position:fixed;inset:0;z-index:1000;background:#102238f5;display:flex;align-items:center;justify-content:center;padding:20px;overflow:auto';
 popup.innerHTML='<section style="width:min(560px,100%);color:white;text-align:center"><p>Q'+turn+' · 임금 수령</p><h2>이번 턴의 근무 형태</h2><p>현재 현금 '+cash.toLocaleString()+'만 원 · 시간 '+time+'개</p>'+['휴가','기본근무','야근'].map((name,i)=>'<button data-pay="'+i+'" style="width:100%;display:block;margin:12px 0;padding:22px;border-radius:18px;text-align:left"><strong style="font-size:21px">'+name+'</strong><span style="display:block;margin-top:12px;font-size:19px">💵 '+amounts[i].toLocaleString()+'만 원　◷ '+(5-i)+'개</span></button>').join('')+'</section>';
 document.body.append(popup);
 const dismiss=()=>{if(busy)return;popup.remove();el('openPay')?.focus();};
 const close=document.createElement('button');close.type='button';close.textContent='✕';close.setAttribute('aria-label','임금 선택 닫기 · 개인판 보기');close.style.cssText='float:right;background:transparent;border:0;padding:10px;font-size:20px';close.onclick=dismiss;popup.querySelector('section').prepend(close);
 popup.addEventListener('click',event=>{if(event.target===popup)dismiss();});
 popup.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();dismiss();}});
 close.focus();
 popup.querySelectorAll('[data-pay]').forEach(b=>{b.disabled=busy;b.onclick=()=>{const i=+b.dataset.pay;popup.querySelectorAll('button').forEach(x=>x.disabled=true);onceAction('pay',d=>{const next={...d,cash:d.cash+salaryRows[(d.salaryLevel||6)-1][i],time:d.time+5-i,payAmount:salaryRows[(d.salaryLevel||6)-1][i]};const paid=PersonalEventEngine.payDebts(next,turn);next.eventDebtPayments={...next.eventDebtPayments,[turn]:paid};return next;},2);};});
 };
}
}else if(step===2){c.innerHTML='<h2>버킷 카드 채우기</h2><p>받은 카드는 위 개인판에서 확인할 수 있습니다.</p><button class="primary" id="next">카드 확인 완료</button>';el('next').textContent=actions().fill?'보충 완료 · 계속':'빈 자리 카드 받기';el('next').onclick=()=>onceAction('fill',d=>BucketDeck.fill(d,turn,BUCKET_CATALOG,shuffledBucketIds),3)}else if(step===3){

const count=window.abilityCount||0,cost=(count+1)*50,completed=!!actions().ability;
c.innerHTML='<h2>업무능력 투자</h2><p>현재 '+count+'/4칸 · '+(count?'협상 보정 +'+(count-1):'협상 자격 미획득')+'</p><button id="showAbility">투자 상태 확인</button><button id="abilityContinue">버킷 처리로</button>';
function showAbility(){
 el('abilityPopup')?.remove();
 const popup=document.createElement('div');popup.id='abilityPopup';popup.setAttribute('role','dialog');popup.setAttribute('aria-modal','true');popup.setAttribute('aria-label','업무능력 투자');
 popup.style.cssText='position:fixed;inset:0;z-index:1000;background:#102238f5;display:flex;align-items:center;justify-content:center;padding:20px;overflow:auto';
 const allowed=!completed&&count<4&&cash>=cost&&time>=2;
 popup.innerHTML='<section style="width:min(620px,100%);color:white;max-height:95vh;overflow:auto"><p>Q'+turn+' · 업무능력 투자</p><h2>올해 투자 상태 <span style="color:#9fe4ce">'+count+'/4칸</span></h2><p>현금 '+cash.toLocaleString()+'만 원 · 시간 '+time+'개</p><div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px">'+[1,2,3,4].map(n=>'<div style="border:2px solid '+(n<=count?'#59d7b2':n===count+1?'#98baff':'#516078')+';background:'+(n<=count?'#145447':'#1d3150')+';border-radius:18px;padding:18px"><strong>'+n+'칸 '+(n<=count?'✓ 투자 완료':n===count+1?'· 다음 투자':'')+'</strong><p>'+n*50+'만 원 · 시간 2개</p><small>'+(n===1?'연봉협상 자격 획득':'협상 보정 +'+(n-1))+'</small></div>').join('')+'</div><p style="padding:16px;background:#ffffff12;border-radius:12px">현재: '+(count?'협상 가능 · 보정 +'+(count-1):'협상 자격 없음')+(count<4?'<br>다음 칸 투자 후: 협상 가능 · 보정 +'+count:'<br>4칸 투자 완료')+'</p><p>'+(completed?'이번 턴 투자 선택을 마쳤습니다.':count>=4?'이번 4턴의 투자 한도에 도달했습니다.':!allowed?'현금 또는 시간이 부족합니다.':'이번 턴에는 1칸 투자할 수 있습니다.')+'</p>'+(!completed&&count<4?'<button id="abilityAdd" '+(!allowed||busy?'disabled':'')+' style="width:100%;padding:18px;background:'+(allowed?'#327cf0':'#667085')+';color:white">1칸 투자 · '+cost+'만 원 + 시간 2개</button>':'')+'<button id="skip" style="width:100%;padding:18px;margin-top:10px">'+(completed?'확인 · 버킷 처리로':'투자하지 않고 계속')+'</button></section>';
 document.body.append(popup);
 if(el('abilityAdd'))el('abilityAdd').onclick=()=>{el('abilityAdd').disabled=true;el('skip').disabled=true;onceAction('ability',d=>{const count=d.abilityLevel||0,cost=(count+1)*50;if(count>=4||d.cash<cost||d.time<2)return;return {...d,abilityLevel:count+1,cash:d.cash-cost,time:d.time-2};},4);};
 el('skip').onclick=()=>{if(completed){step=4;render();}else{el('skip').disabled=true;onceAction('ability',d=>d,4);}};
}
el('showAbility').onclick=showAbility;
el('abilityContinue').onclick=()=>{if(completed){step=4;render();}else showAbility();};


}else if(step===4){
const used=actions();
c.innerHTML='<h2>버킷 이루기·버리기</h2><p>사진을 눌러 카드를 선택하세요.</p>';
c.innerHTML+='<button id="openBuckets">사진으로 선택 →</button>';el('openBuckets').onclick=()=>BucketUI.choose(hand,used,busy,async(kind,i)=>{await bucketAction(kind,i);if(step===4)el('openBuckets')?.click();},()=>onceAction('bucketReviewed',d=>d,5),{cash,time});

}else{
c.innerHTML='<h2>상품 투자</h2><p>기존 투자 화면에서 상품과 금액을 선택하고 접수합니다.</p><button class="primary" id="openInvestment">투자 화면으로 이동</button>';
el('openInvestment').onclick=()=>BoardShell.openInvestment();
}}
BoardShell.init(render);
db.ref(`sessions/${sid}`).once('value').then(snap=>{const session=snap.val();if(!session||session.gameVersion!=='integrated-v3'){location.replace('/player/?session='+encodeURIComponent(sid));return;}const player=session.players?.[pid];if(!player){location.replace('/player/?session='+encodeURIComponent(sid));return;}teamName=session.teams?.[player.teamId]?.name||'';maxTurns=session.state?.maxTurns||20;frame();});
db.ref('.info/connected').on('value',snap=>{el('connectionState').textContent=snap.val()?'':'연결을 기다리고 있습니다. 저장 완료 전에는 창을 닫지 마세요.';});
Promise.all([state.once('value'),root.once('value')]).then(async ([st,snap])=>{turn=st.val()?.currentTurn||1;sessionPhase=st.val()?.phase||'investing';closingTurn=sessionPhase==='quarterClosing'?turn:0;const d=snap.val();if(d){eventDraws=d.eventDraws||{};eventDebts=d.eventDebts||{};cash=d.cash??cash;time=d.time??time;score=d.score??score;hand=d.hand||[];achieved=d.achieved||[];turnActions=d.turnActions||{};window.abilityCount=d.abilityLevel||0;negotiations=d.negotiations||{};quarterReviews=d.quarterReviews||{};salaryLevel=d.salaryLevel||6;}await applySalary(turn);furthest=snap.val()?.progress?.[turn]||0;step=furthest;render();root.on('value',snapshot=>{if(snapshot.val()){hydrate(snapshot.val());render();}});state.on('value',async next=>{const n=next.val()?.currentTurn||1;sessionPhase=next.val()?.phase||'investing';closingTurn=sessionPhase==='quarterClosing'?n:0;if(n!==turn){await applySalary(n);turn=n;furthest=0;step=0;open=false;}render();})})})();
document.addEventListener('DOMContentLoaded',()=>{if(document.getElementById('handFrame'))return;const c=document.getElementById('content'),h=document.createElement('section'),a=document.createElement('section');h.id='handFrame';a.id='achievedFrame';h.className=a.className='card';c.after(h,a)});
