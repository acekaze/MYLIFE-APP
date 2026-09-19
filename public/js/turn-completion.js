const TurnCompletion=(()=>{
  function status(s,pid,now=Date.now()){
    const turn=s.state?.currentTurn||1,p=s.integrated?.[pid];
    const rows=Object.entries(s.investments||{}).filter(([,i])=>i.playerId===pid&&i.turn===turn);
    const skip=s.skips?.[turn+'_'+pid];
    const fingerprint=JSON.stringify([rows.sort(([a],[b])=>a.localeCompare(b)).map(([id,i])=>[id,i.productId,i.amount,i.updatedAt||i.createdAt||0]),skip?.createdAt||0]);
    const last=Math.max(0,...rows.map(([,i])=>i.updatedAt||i.createdAt||0),skip?.createdAt||0);
    const decided=rows.length>0||!!skip,remaining=Math.max(0,Math.ceil((last+3000-now)/1000));
    const completed=p?.turnCompletions?.[turn]?.fingerprint===fingerprint&&decided;
    const phase=s.state?.phase==='investing';
    const blocked=(typeof WorldBroadcast!=='undefined'&&WorldBroadcast.pending(s))||(typeof TeamPlay!=='undefined'&&TeamPlay.settlement(s,pid).hasResults&&!TeamPlay.settlement(s,pid).complete);
    return {turn,fingerprint,remaining,decided,completed,ready:phase&&!blocked&&decided&&remaining===0&&Number(p?.progress?.[turn]||0)>=5};
  }
  async function finish(sid,pid,turn){const ref=firebase.database().ref('sessions/'+sid);await ref.once('value');const result=await ref.transaction(s=>{if(s?.gameVersion!=='integrated-v3'||s.state?.currentTurn!==turn)return;const st=status(s,pid);if(!st.ready||st.completed)return;const p=s.integrated[pid];p.turnCompletions={...p.turnCompletions,[turn]:{fingerprint:st.fingerprint,completedAt:Date.now()}};return s;});if(!result.committed)throw Error('투자 내용이나 턴 상태가 변경되었습니다.');}
  function watch(sid,pid,board){let session=null,busy=false;firebase.database().ref('sessions/'+sid).on('value',snap=>{session=snap.val();paint();});
    function paint(){if(session?.gameVersion!=='integrated-v3')return;const host=board?document.getElementById('assetView'):document.querySelector('#app main');if(!host)return;let box=document.getElementById('turnCompletionPanel');if(!box){box=document.createElement('section');box.id='turnCompletionPanel';box.style.cssText='padding:18px;margin:16px 0;background:#e4eee8;color:#173342;border-radius:16px';box.innerHTML='<p data-note></p><button data-finish style="width:100%;padding:16px;border:0;border-radius:12px;background:#167366;color:white">이번 턴 종료</button>';host.prepend(box);}
      const st=status(session,pid),note=box.querySelector('[data-note]'),button=box.querySelector('[data-finish]');const text=st.completed?'이번 턴 완료 · 강사 화면에 전달했습니다.':!st.decided?'투자를 접수하거나 투자하지 않기를 선택하면 턴을 마칠 수 있습니다.':st.remaining?'투자 내역을 확인하세요. '+st.remaining+'초 뒤 종료할 수 있습니다.':st.ready?'선택을 마쳤다면 이번 턴을 종료하세요.':'앞 단계와 공유를 마친 뒤 종료할 수 있습니다.';if(note.textContent!==text)note.textContent=text;button.disabled=busy||!st.ready||st.completed;button.style.opacity=button.disabled?'.5':'1';button.textContent=st.completed?'✓ 이번 턴 완료':st.remaining?'이번 턴 종료 ('+st.remaining+'초)':'이번 턴 종료';button.onclick=async()=>{busy=true;paint();try{await finish(sid,pid,st.turn);}catch(e){note.textContent='저장하지 못했습니다. 상태를 확인하고 다시 눌러 주세요.';}finally{busy=false;paint();}};
    }const timer=setInterval(paint,400);window.addEventListener('pagehide',()=>clearInterval(timer),{once:true});
  }
  return {status,finish,watch};
})();
