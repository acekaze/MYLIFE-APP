const SalaryRoulette = (() => {
  const sound=new Audio('/assets/audio/game-show-wheel-spin.mp3');
  sound.preload='auto';sound.volume=0.55;
  let muted=false,spinGeneration=0;
  function unlock(){
    // Prime playback in the click gesture before the database round trip.
    if(muted)return;
    const generation=spinGeneration;
    sound.muted=true;
    const attempt=sound.play();
    if(attempt)attempt.then(()=>{if(generation===spinGeneration){sound.pause();sound.currentTime=0;}sound.muted=false;}).catch(()=>{sound.muted=false;});
  }
  function randomFace(){const values=new Uint32Array(1);do{crypto.getRandomValues(values);}while(values[0]>=4294967292);return values[0]%6+1;}
  function mount(host){
    host.innerHTML='<div style="position:relative;width:min(300px,70vw);aspect-ratio:1;margin:24px auto"><div style="position:absolute;top:-12px;left:calc(50% - 14px);z-index:2;color:#13283f;font-size:38px;line-height:1;filter:drop-shadow(0 2px 1px white)" data-pointer>▼</div><div data-wheel style="position:absolute;inset:0;border-radius:50%;border:8px solid #e4bd69;box-shadow:0 12px 30px #13283f35;background:conic-gradient(#294879 0deg 60deg,#137c78 60deg 120deg,#7660ae 120deg 180deg,#294879 180deg 240deg,#137c78 240deg 300deg,#7660ae 300deg 360deg)">'+[1,2,3,4,5,6].map((n,i)=>'<span style="position:absolute;left:calc(50% - 20px);top:calc(50% - 20px);width:40px;height:40px;line-height:40px;font-size:28px;color:white;font-weight:800;transform:rotate('+(30+i*60)+'deg) translateY(-92px) rotate('+(-30-i*60)+'deg)">'+n+'</span>').join('')+'</div><div style="position:absolute;inset:39%;background:#fff7df;border:4px solid #e4bd69;border-radius:50%;display:grid;place-items:center;color:#17243d;font-size:16px;font-weight:bold">연봉</div></div><p data-status aria-live="polite" style="min-height:26px">1~6 동일 확률 · 보정은 결과에 더해집니다</p>';
  }
  function decorate(popup,result,period){
    if(!document.getElementById('salaryPresentationStyle')){
      const css=document.createElement('style');css.id='salaryPresentationStyle';css.textContent=`
      :is(#negotiationPopup,#teamSalaryPopup){box-sizing:border-box;overflow:auto!important;padding:20px!important}
      :is(#negotiationPopup,#teamSalaryPopup) .salary-panel{position:relative;box-sizing:border-box;width:min(520px,100%)!important;max-height:calc(100dvh - 40px);overflow:auto;padding:52px 28px 22px!important;box-shadow:0 24px 80px #0003;text-align:center}
      .salary-tools{position:absolute;right:12px;top:10px;display:flex;align-items:center;gap:2px}
      :is(#negotiationPopup,#teamSalaryPopup) .salary-tools button,:is(#negotiationPopup,#teamSalaryPopup) .salary-tools a{box-sizing:border-box;display:grid;place-items:center;min-width:44px;height:44px;padding:10px;border:0;border-radius:50%;background:transparent;color:#65758a;cursor:pointer}
      :is(#negotiationPopup,#teamSalaryPopup) .salary-tools a{font-size:11px;min-width:64px;text-decoration:none;border-radius:8px}
      :is(#negotiationPopup,#teamSalaryPopup) .salary-tools button:hover,:is(#negotiationPopup,#teamSalaryPopup) .salary-tools a:hover{background:#edf2f8}
      :is(#negotiationPopup,#teamSalaryPopup) button:focus-visible,:is(#negotiationPopup,#teamSalaryPopup) a:focus-visible{outline:3px solid #327cf0;outline-offset:2px}
      .salary-eyebrow{font-size:12px;letter-spacing:.1em;color:#69798d;margin:8px 0 24px}
      .salary-grade{display:inline-flex;align-items:center;gap:10px;padding:8px 16px;border-radius:30px;background:#ede9fb;color:#6246a3;font-size:13px;font-weight:700}
      .salary-grade b{font-size:22px}.salary-outcome{font-size:40px;letter-spacing:-1.5px;line-height:1.2;margin:18px 0 8px;color:#142e49}.salary-caption{font-size:14px;color:#69798d;margin:0 0 26px}
      .salary-equation{display:flex;justify-content:center;align-items:center;gap:18px;padding:18px;background:#f3f6fa;border-radius:16px;margin:22px 0}
      .salary-equation small{display:block;font-size:12px;color:#63758a;margin-bottom:8px}.salary-equation strong{font-size:28px;color:#253e57}.salary-equation .total{color:#6951bb}.salary-equation i{font-style:normal;color:#98a6b5}
      .salary-change{display:grid;grid-template-columns:1fr 24px 1fr;align-items:center;margin:24px 0;padding:4px 0}.salary-change small{display:block;font-size:12px;color:#69798d;margin-bottom:8px}.salary-change b{display:block;font-size:22px}.salary-change em{font-style:normal;font-size:13px;color:#63758a}.salary-change .salary-new{color:#2866ca}
      :is(#negotiationPopup,#teamSalaryPopup) #confirmNegotiation,:is(#negotiationPopup,#teamSalaryPopup) #rollNegotiation{width:100%;border:0;border-radius:14px;background:#327cf0;color:white;padding:17px!important;font-size:16px!important;font-weight:700;cursor:pointer}
      .salary-result{animation:salaryReveal .45s ease-out}@keyframes salaryReveal{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
      @media(max-width:420px){:is(#negotiationPopup,#teamSalaryPopup) .salary-panel{padding:52px 20px 20px!important}.salary-outcome{font-size:34px}.salary-equation{gap:14px}}
      @media(prefers-reduced-motion:reduce){.salary-result{animation:none}}`;document.head.append(css);
    }
    const panel=popup.querySelector('section');panel.classList.add('salary-panel');
    if(result){
      const rise=result.after-result.before,grade=!result.ability?'—':result.total<=2?'C':result.total<=4?'B':result.total<=6?'A':'S';
      const salary=n=>(4000+(n-1)*400).toLocaleString('ko-KR');
      panel.innerHTML='<div class="salary-result"><p class="salary-eyebrow">Q'+period+' · 연봉협상 결과</p><span class="salary-grade"><b>'+grade+'</b> '+(!result.ability?'협상 미참여':'협상 결과')+'</span><h2 class="salary-outcome">'+(rise?'연봉 '+rise+'단계 상승':'현재 연봉 유지')+'</h2><p class="salary-caption">'+(result.after===13?'연봉 최고 단계에 도달했습니다.':'다음 턴부터 새 연봉이 적용됩니다.')+'</p>'+(result.ability?'<div class="salary-equation"><div><small>룰렛</small><strong>'+result.dice+'</strong></div><i>+</i><div><small>업무능력</small><strong>'+result.bonus+'</strong></div><i>=</i><div><small>최종 수치</small><strong class="total">'+result.total+'</strong></div></div>':'<p class="salary-caption">업무능력 투자 0칸 · 연봉 동결</p>')+'<div class="salary-change"><div><small>현재 연봉</small><b>'+result.before+'단계</b><em>'+salary(result.before)+'만 원</em></div><span>→</span><div class="salary-new"><small>Q'+result.effectiveTurn+' 적용</small><b>'+result.after+'단계</b><em>'+salary(result.after)+'만 원</em></div></div><button id="confirmNegotiation">확인 · 분기 마감 완료</button><p style="font-size:11px;color:#69798d;margin:14px 0 0">업무능력 투자 칸 반납 완료</p></div>';
    }
    const tools=document.createElement('div');tools.className='salary-tools';tools.innerHTML='<button type="button" data-sound></button><a href="/credits.html" target="_blank" rel="noopener">사용 자료 ↗</a>';panel.append(tools);
    const toggle=tools.querySelector('button');
    const update=()=>{toggle.setAttribute('aria-label',muted?'소리 켜기':'소리 끄기');toggle.setAttribute('aria-pressed',String(!muted));toggle.title=muted?'소리 꺼짐':'소리 켜짐';toggle.innerHTML='<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M11 5 6 9H3v6h3l5 4z"/>'+(muted?'<path d="m16 9 5 6m0-6-5 6"/>':'<path d="M15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/>')+'</svg>';};
    update();toggle.onclick=()=>{muted=!muted;update();if(muted)sound.pause();};
  }
  function spin(host,face){
    spinGeneration++;
    const wheel=host.querySelector('[data-wheel]'),pointer=host.querySelector('[data-pointer]'),status=host.querySelector('[data-status]');
    if(!wheel)return Promise.resolve();
    // Stop four degrees inside the winning sector; final settle never changes the result.
    const offset=Math.random()<.5?4:56;
    const target=360*7+(360-((face-1)*60+offset));
    const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
    const duration=reduced?350:5600;
    sound.pause();sound.currentTime=0;sound.muted=false;
    sound.playbackRate=Number.isFinite(sound.duration)&&sound.duration>0?sound.duration/(duration/1000):0.93;
    if(!muted&&!reduced)sound.play().catch(()=>{});
    status.textContent='돌아가는 중…';
    return new Promise(resolve=>{let start,lastSector=-1;function frame(now){
      if(start===undefined)start=now;const p=Math.min(1,(now-start)/duration);
      const rotation=target*(1-Math.pow(1-p,4));wheel.style.transform='rotate('+rotation+'deg)';
      const sector=Math.floor(rotation/60);if(sector!==lastSector){lastSector=sector;if(!reduced)pointer.animate([{transform:'rotate(-12deg)'},{transform:'rotate(0deg)'}],{duration:110});}
      status.textContent=p>.7?'어디에 멈출까요…':'돌아가는 중…';
      if(p<1){requestAnimationFrame(frame);return;}
      if(!reduced)wheel.animate([{transform:'rotate('+target+'deg)'},{transform:'rotate('+(target+1.2)+'deg)'},{transform:'rotate('+target+'deg)'}],{duration:360,easing:'ease-out'});
      sound.pause();sound.currentTime=0;
      status.textContent='룰렛 '+face+' · 결과 확정';setTimeout(resolve,reduced?150:850);
    }requestAnimationFrame(frame);});
  }
  return {mount,spin,randomFace,unlock,decorate};
})();
