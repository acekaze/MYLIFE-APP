const SalaryRoulette = (() => {
  const sound=new Audio('/assets/audio/game-show-wheel-spin.mp3');
  sound.preload='auto';sound.volume=0.55;
  let muted=false;
  function unlock(){
    // Prime playback in the click gesture before the database round trip.
    if(muted)return;
    sound.muted=true;
    const attempt=sound.play();
    if(attempt)attempt.then(()=>{sound.pause();sound.currentTime=0;sound.muted=false;}).catch(()=>{sound.muted=false;});
  }
  function randomFace(){const values=new Uint32Array(1);do{crypto.getRandomValues(values);}while(values[0]>=4294967292);return values[0]%6+1;}
  function mount(host){
    host.innerHTML='<div style="position:relative;width:min(300px,70vw);aspect-ratio:1;margin:24px auto"><div style="position:absolute;top:-12px;left:calc(50% - 14px);z-index:2;color:#13283f;font-size:38px;line-height:1;filter:drop-shadow(0 2px 1px white)" data-pointer>▼</div><div data-wheel style="position:absolute;inset:0;border-radius:50%;border:8px solid #e4bd69;box-shadow:0 12px 30px #13283f35;background:conic-gradient(#294879 0deg 60deg,#137c78 60deg 120deg,#7660ae 120deg 180deg,#294879 180deg 240deg,#137c78 240deg 300deg,#7660ae 300deg 360deg)">'+[1,2,3,4,5,6].map((n,i)=>'<span style="position:absolute;left:calc(50% - 20px);top:calc(50% - 20px);width:40px;height:40px;line-height:40px;font-size:28px;color:white;font-weight:800;transform:rotate('+(30+i*60)+'deg) translateY(-92px) rotate('+(-30-i*60)+'deg)">'+n+'</span>').join('')+'</div><div style="position:absolute;inset:39%;background:#fff7df;border:4px solid #e4bd69;border-radius:50%;display:grid;place-items:center;color:#17243d;font-size:16px;font-weight:bold">연봉</div></div><p data-status aria-live="polite" style="min-height:26px">1~6 동일 확률 · 보정은 결과에 더해집니다</p>';
    const controls=document.createElement('div');
    controls.innerHTML='<button type="button" data-sound>소리 켜짐</button> <a href="/credits.html" target="_blank" rel="noopener" style="font-size:12px">사용 자료</a>';
    host.append(controls);const toggle=controls.querySelector('[data-sound]');
    toggle.textContent=muted?'소리 꺼짐':'소리 켜짐';
    toggle.onclick=()=>{muted=!muted;toggle.textContent=muted?'소리 꺼짐':'소리 켜짐';if(muted)sound.pause();};
  }
  function spin(host,face){
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
  return {mount,spin,randomFace,unlock};
})();
