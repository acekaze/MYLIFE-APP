const BucketUI = (() => {
  const escape = s => String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function photo(card) {
    const entry=BUCKET_CATALOG.find(c=>c.id===card[5])||BUCKET_CATALOG.find(c=>c.title===card[0]);
    return entry?'/assets/buckets/'+entry.id+'.jpg':null;
  }
  function cardMarkup(card) {
    const src=photo(card);
    return (src?'<img src="'+src+'" alt="" loading="lazy" style="width:100%;aspect-ratio:1.68;object-fit:cover;border-radius:12px">':'')+'<h3>'+escape(card[0])+'</h3><p>💵 '+card[1]+'만 원 · ◷ '+card[2]+'개</p><p>만족도 +'+card[3]+'점</p>'+(Number(card[6])>0?'<small>Q'+Number(card[6])+' 달성</small>':'');
  }
  function groupAchievements(cards,turn) {
    const currentPeriod=Math.ceil(turn/4),current=[],archive={};
    for(const card of cards){
      const achievedTurn=Number(card[6]);
      const period=achievedTurn>0?Math.ceil(achievedTurn/4):0;
      if(period===currentPeriod)current.push(card);
      else (archive[period] ||= []).push(card);
    }
    return {currentPeriod,current,archive};
  }
  function summary(cards){return cards.length+'개 · '+new Set(cards.map(c=>c[0])).size+'종 · 만족도 '+cards.reduce((n,c)=>n+(Number(c[3])||0),0)+'점';}
  function periodLabel(period){return period?'Q'+((period-1)*4+1)+'–Q'+period*4:'이전 기록 · 달성 턴 미기록';}
  function review(cards,period){
    const node=overlay('bucketReview');
    node.innerHTML='<section style="max-width:1000px;margin:auto"><h2>'+periodLabel(period)+' 버킷 나누기</h2><p>'+summary(cards)+'</p><p>카드를 크게 열어 서로 보여주며 이야기하세요.</p><div id="reviewCards"></div><button id="closeReview" style="width:100%;margin-top:20px">공유 화면 닫기</button></section>';
    gallery(node.querySelector('#reviewCards'),cards,'이 기간에 이룬 버킷');
    if(!cards.length)node.querySelector('#reviewCards').innerHTML='<p>이 기간에 이룬 버킷이 없습니다.</p>';
    node.querySelector('#closeReview').onclick=()=>node.remove();
  }
  function album(target,cards,turn,isClosing){
    const groups=groupAchievements(cards,turn);
    target.innerHTML='<h2>'+(isClosing?'버킷 나누기':'이번 기간에 이룬 버킷')+'</h2><p>'+periodLabel(groups.currentPeriod)+' · '+summary(groups.current)+'</p><div data-current></div><button data-share style="margin:16px 0">이번 기간 크게 보여주기</button><details data-album><summary style="cursor:pointer;padding:16px">이룬 버킷 앨범 · 전체 '+summary(cards)+'</summary><div data-history></div></details>';
    gallery(target.querySelector('[data-current]'),groups.current,'');
    if(!groups.current.length)target.querySelector('[data-current]').textContent='아직 이 기간에 이룬 버킷이 없습니다.';
    target.querySelector('[data-share]').onclick=()=>review(groups.current,groups.currentPeriod);
    const history=target.querySelector('[data-history]');
    for(const period of Object.keys(groups.archive).sort((a,b)=>b-a)){
      const list=groups.archive[period],section=document.createElement('details');
      section.innerHTML='<summary style="cursor:pointer;padding:14px">'+periodLabel(Number(period))+' · '+summary(list)+'</summary><div></div>';
      history.append(section);gallery(section.querySelector('div'),list,'');
    }
    if(!history.children.length)history.textContent='이전 기간의 기록이 없습니다. 현재 기간은 위에 전시됩니다.';
  }
  function gallery(target,cards,title) {
    target.innerHTML=(title?'<h3>'+escape(title)+'</h3>':'')+'<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px">'+cards.map((c,i)=>'<button data-card="'+i+'" style="text-align:left">'+cardMarkup(c)+'</button>').join('')+'</div>';
    target.querySelectorAll('[data-card]').forEach(b=>b.onclick=()=>detail(cards[+b.dataset.card]));
  }
  function overlay(id) {
    document.getElementById(id)?.remove();
    const node=document.createElement('div');node.id=id;node.setAttribute('role','dialog');node.setAttribute('aria-modal','true');node.setAttribute('aria-label','버킷 카드');
    node.style.cssText='position:fixed;inset:0;z-index:1100;background:#102238f5;color:white;overflow:auto;padding:20px;box-sizing:border-box';document.body.append(node);return node;
  }
  function detail(card,choices) {
    const node=overlay('bucketDetail');node.style.zIndex=1200;
    node.innerHTML='<section style="max-width:540px;margin:4vh auto;background:white;color:#17243d;border-radius:22px;padding:24px">'+cardMarkup(card)+'<div id="bucketChoices"></div><button id="closeBucketDetail">'+(choices?'선택 취소 · 카드 목록':'닫기')+'</button></section>';
    node.querySelector('#closeBucketDetail').onclick=()=>node.remove();
    if(choices)for(const [label,disabled,callback] of choices){const b=document.createElement('button');b.textContent=label;b.disabled=disabled;b.style.margin='8px';b.onclick=()=>{node.remove();callback();};node.querySelector('#bucketChoices').append(b);}
  }
  function choose(cards,used,busy,act,finish) {
    const node=overlay('bucketChooser');
    node.innerHTML='<section style="max-width:980px;margin:auto"><h2>이번 턴의 버킷 선택</h2><p>이루기 '+(used.done?1:0)+'/1 · 버리기 '+(used.discard?1:0)+'/1</p><p>카드를 눌러 크게 확인하세요. 아무것도 선택하지 않아도 됩니다.</p><div id="bucketPhotoGrid" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:16px"></div><button id="finishBucket" style="margin:24px 0;width:100%">선택 완료 · 투자 단계로</button></section>';
    cards.forEach((card,i)=>{const b=document.createElement('button');b.innerHTML=cardMarkup(card);b.style.textAlign='left';b.onclick=()=>detail(card,[['이루기 확정',busy||!!used.done,()=>act('done',i)],['버리기 확정',busy||!!used.discard,()=>act('discard',i)]]);node.querySelector('#bucketPhotoGrid').append(b);});
    node.querySelector('#finishBucket').onclick=()=>{node.remove();finish();};
  }
  return {gallery,choose,photo,album,review,groupAchievements};
})();
