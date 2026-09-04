/**
 * 관리자 뷰 (Stitch 디자인 적용)
 */
const MasterApp = (() => {
  const MASTER_PIN = '848614';
  let sessionId = null;
  let sessionData = null;
  let currentTab = 'dashboard';
  let authRole = null;   // 'master' | 'trainer'
  let authName = null;   // 트레이너 이름 (master는 null)
  let authId = null;     // ownerId (트레이너 식별용)

  function init() {
    // 저장된 인증 복원
    authRole = localStorage.getItem('mylife_auth_role');
    authName = localStorage.getItem('mylife_auth_name');
    authId = localStorage.getItem('mylife_auth_id');

    if (!authRole) {
      renderLogin();
      return;
    }

    // 세션에 이미 들어가 있으면 그 세션으로
    sessionId = localStorage.getItem('mylife_master_session');
    if (sessionId) enterSession();
    else renderSessionList();
  }

  // ===== 로그인 =====
  function renderLogin() {
    document.getElementById('app').innerHTML = `
      <div class="min-h-screen flex flex-col items-center justify-center p-5 bg-background">
        <main class="w-full max-w-[360px] flex flex-col items-center">
          <header class="text-center mb-8 flex flex-col items-center">
            <img src="../logo.png" alt="My Life" width="80" height="80" class="mb-3" style="filter: drop-shadow(0 8px 20px rgba(49,130,246,0.15));">
            <h1 class="text-[28px] font-bold text-on-surface">My Life</h1>
            <p class="text-[14px] text-brand-gray-text mt-1">관리자 로그인</p>
          </header>
          <div class="bg-white rounded-2xl p-6 w-full shadow-card space-y-6">
            <!-- 총관리자 -->
            <div>
              <h2 class="font-bold text-[16px] mb-3">총관리자</h2>
              <div class="flex flex-col gap-3">
                <input type="password" id="masterPin" class="h-[48px] rounded-xl border border-brand-border px-4 text-[16px] focus:border-brand-blue focus:ring-1 focus:ring-brand-blue outline-none" placeholder="마스터 PIN" inputmode="numeric">
                <button id="masterLoginBtn" class="w-full h-[48px] bg-brand-blue text-white rounded-xl font-bold active:scale-[0.98] transition-transform">총관리자 로그인</button>
              </div>
            </div>
            <hr class="border-brand-gray-light">
            <!-- 트레이너 -->
            <div>
              <h2 class="font-bold text-[16px] mb-3">트레이너</h2>
              <div class="flex flex-col gap-3">
                <input type="text" id="trainerName" class="h-[48px] rounded-xl border border-brand-border px-4 text-[16px] focus:border-brand-blue focus:ring-1 focus:ring-brand-blue outline-none" placeholder="이름">
                <input type="password" id="trainerPin" class="h-[48px] rounded-xl border border-brand-border px-4 text-[16px] focus:border-brand-blue focus:ring-1 focus:ring-brand-blue outline-none" placeholder="PIN" inputmode="numeric">
                <button id="trainerLoginBtn" class="w-full h-[48px] bg-brand-gray-light text-brand-gray-dark rounded-xl font-bold active:scale-[0.98] transition-transform">트레이너 로그인</button>
                <button id="trainerApplyBtn" class="text-brand-blue text-[13px] font-medium mt-1">트레이너 신청하기</button>
              </div>
            </div>
          </div>
        </main>
      </div>
    `;

    document.getElementById('masterLoginBtn').addEventListener('click', () => {
      const pin = document.getElementById('masterPin').value.trim();
      if (pin !== MASTER_PIN) { showToast('PIN이 올바르지 않습니다'); return; }
      authRole = 'master'; authName = null; authId = 'master';
      localStorage.setItem('mylife_auth_role', 'master');
      localStorage.setItem('mylife_auth_id', 'master');
      localStorage.removeItem('mylife_auth_name');
      showToast('총관리자 로그인');
      renderSessionList();
    });

    document.getElementById('trainerLoginBtn').addEventListener('click', trainerLogin);
    document.getElementById('trainerApplyBtn').addEventListener('click', renderTrainerApply);
  }

  function trainerLogin() {
    const name = document.getElementById('trainerName').value.trim();
    const pin = document.getElementById('trainerPin').value.trim();
    if (!name || !pin) { showToast('이름과 PIN을 입력해 주세요'); return; }

    const tid = `${name}_${pin}`;
    db.ref(`trainers/${btoa(unescape(encodeURIComponent(tid)))}`).once('value').then(snap => {
      const trainer = snap.val();
      if (!trainer) { showToast('신청 내역이 없습니다. 먼저 신청해 주세요'); return; }
      if (trainer.status === 'pending') { showToast('아직 승인 대기 중입니다'); return; }
      if (trainer.status === 'rejected') { showToast('승인이 거절되었습니다'); return; }
      if (trainer.status === 'approved') {
        authRole = 'trainer'; authName = name; authId = tid;
        localStorage.setItem('mylife_auth_role', 'trainer');
        localStorage.setItem('mylife_auth_name', name);
        localStorage.setItem('mylife_auth_id', tid);
        showToast(`${name} 트레이너 로그인`);
        renderSessionList();
      }
    });
  }

  function renderTrainerApply() {
    document.getElementById('app').innerHTML = `
      <div class="min-h-screen flex flex-col items-center justify-center p-5 bg-background">
        <main class="w-full max-w-[360px] flex flex-col items-center">
          <header class="text-center mb-8">
            <h1 class="text-[28px] font-bold text-on-surface">트레이너 신청</h1>
            <p class="text-[14px] text-brand-gray-text mt-1">총관리자 승인 후 사용 가능</p>
          </header>
          <div class="bg-white rounded-2xl p-6 w-full shadow-card">
            <div class="flex flex-col gap-3">
              <input type="text" id="applyName" class="h-[48px] rounded-xl border border-brand-border px-4 text-[16px] focus:border-brand-blue outline-none" placeholder="이름">
              <input type="password" id="applyPin" class="h-[48px] rounded-xl border border-brand-border px-4 text-[16px] focus:border-brand-blue outline-none" placeholder="사용할 PIN (기억하세요)" inputmode="numeric">
              <button id="submitApplyBtn" class="w-full h-[48px] bg-brand-blue text-white rounded-xl font-bold active:scale-[0.98] transition-transform">신청하기</button>
              <button id="backToLoginBtn" class="text-brand-gray-text text-[13px] font-medium mt-1">← 로그인으로 돌아가기</button>
            </div>
          </div>
        </main>
      </div>
    `;
    document.getElementById('submitApplyBtn').addEventListener('click', () => {
      const name = document.getElementById('applyName').value.trim();
      const pin = document.getElementById('applyPin').value.trim();
      if (!name || !pin) { showToast('이름과 PIN을 입력해 주세요'); return; }
      const tid = `${name}_${pin}`;
      const key = btoa(unescape(encodeURIComponent(tid)));
      db.ref(`trainers/${key}`).once('value').then(snap => {
        if (snap.exists()) { showToast('이미 신청되었습니다'); return; }
        db.ref(`trainers/${key}`).set({
          name, tid, status: 'pending', appliedAt: Date.now(),
        }).then(() => {
          showToast('신청 완료! 총관리자 승인을 기다려 주세요');
          renderLogin();
        });
      });
    });
    document.getElementById('backToLoginBtn').addEventListener('click', renderLogin);
  }

  // ===== 세션 목록 =====
  function renderSessionList() {
    db.ref('sessions').once('value').then(snap => {
      const all = snap.val() || {};
      let sessions = Object.entries(all).map(([id, s]) => ({ id, ...s }));

      // 트레이너는 본인 세션만
      if (authRole === 'trainer') {
        sessions = sessions.filter(s => s.ownerId === authId);
      }
      sessions.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

      document.getElementById('app').innerHTML = `
        <div class="min-h-screen flex flex-col items-center p-5 bg-background">
          <main class="w-full max-w-[480px] flex flex-col">
            <header class="text-center my-6">
              <h1 class="text-[28px] font-bold text-on-surface">My Life</h1>
              <p class="text-[14px] text-brand-gray-text mt-1">${authRole === 'master' ? '총관리자' : authName + ' 트레이너'}</p>
            </header>

            <!-- 새 세션 -->
            <div class="bg-white rounded-2xl p-6 w-full shadow-card mb-4">
              <h2 class="font-bold text-[16px] mb-3">새 세션 만들기</h2>
              <div class="flex flex-col gap-3">
                <input type="text" id="newSessionName" class="h-[48px] rounded-xl border border-brand-border px-4 text-[16px] focus:border-brand-blue outline-none" placeholder="세션 이름 (예: 3월 워크숍)">
                <button id="createSessionBtn" class="w-full h-[48px] bg-brand-blue text-white rounded-xl font-bold active:scale-[0.98] transition-transform">세션 생성</button>
              </div>
            </div>

            ${authRole === 'master' ? renderPendingTrainersPlaceholder() : ''}

            <!-- 세션 목록 -->
            <div class="bg-white rounded-2xl p-6 w-full shadow-card mb-4">
              <div class="flex items-center justify-between mb-3">
                <h2 class="font-bold text-[16px]">${authRole === 'master' ? '전체 세션' : '내 세션'} (${sessions.length})</h2>
                ${sessions.some(s => s.state?.gameEnded) ? '<button id="cleanEndedBtn" class="text-brand-red text-[13px] font-medium hover:underline">종료 세션 정리</button>' : ''}
              </div>
              ${sessions.length === 0 ? '<p class="text-brand-gray-text text-[14px] text-center py-6">세션이 없습니다</p>' : `
                <div class="space-y-2">
                  ${sessions.map(s => `
                    <div class="flex items-center gap-2 p-4 rounded-xl border border-outline-variant hover:border-brand-blue transition-colors">
                      <button class="session-item flex-1 flex items-center justify-between text-left" data-id="${s.id}">
                        <div>
                          <div class="font-bold text-[15px]">${s.name || '(이름 없음)'}</div>
                          <div class="text-brand-gray-text text-[12px] mt-0.5">
                            코드 ${s.id} · ${s.players ? Object.keys(s.players).length : 0}명 · 턴 ${s.state?.currentTurn || 1}
                            ${s.state?.gameEnded ? ' · 🏁종료' : ''}
                          </div>
                        </div>
                        <span class="material-symbols-outlined text-brand-gray-text">chevron_right</span>
                      </button>
                      <button class="delete-session shrink-0 text-brand-gray-text hover:text-brand-red transition-colors p-1" data-id="${s.id}" data-name="${s.name || '(이름 없음)'}" title="세션 삭제">
                        <span class="material-symbols-outlined text-[20px]">delete</span>
                      </button>
                    </div>
                  `).join('')}
                </div>
              `}
            </div>

            <!-- 코드로 직접 입장 -->
            <div class="bg-white rounded-2xl p-6 w-full shadow-card mb-4">
              <h2 class="font-bold text-[16px] mb-3">코드로 입장</h2>
              <div class="flex gap-2">
                <input type="text" id="existingCode" class="flex-1 h-[48px] rounded-xl border border-brand-border px-4 text-[16px] uppercase focus:border-brand-blue outline-none" placeholder="세션 코드">
                <button id="enterSessionBtn" class="px-5 h-[48px] bg-brand-gray-light text-brand-gray-dark rounded-xl font-bold">입장</button>
              </div>
            </div>

            <button id="logoutBtn" class="text-brand-gray-text text-[13px] font-medium py-2">로그아웃</button>
          </main>
        </div>
      `;

      document.getElementById('createSessionBtn').addEventListener('click', createSession);
      document.querySelectorAll('.session-item').forEach(btn => {
        btn.addEventListener('click', () => {
          sessionId = btn.dataset.id;
          localStorage.setItem('mylife_master_session', sessionId);
          enterSession();
        });
      });
      document.querySelectorAll('.delete-session').forEach(btn => {
        btn.addEventListener('click', () => {
          const id = btn.dataset.id;
          const name = btn.dataset.name;
          if (!confirm(`'${name}' 세션을 삭제하시겠습니까?\n참가자·투자 기록이 모두 사라지며 되돌릴 수 없습니다.`)) return;
          db.ref(`sessions/${id}`).remove().then(() => {
            if (localStorage.getItem('mylife_master_session') === id) {
              localStorage.removeItem('mylife_master_session');
            }
            showToast(`'${name}' 삭제됨`);
            renderSessionList();
          });
        });
      });

      // 종료된 세션 일괄 정리
      const cleanBtn = document.getElementById('cleanEndedBtn');
      if (cleanBtn) {
        cleanBtn.addEventListener('click', () => {
          const ended = sessions.filter(s => s.state?.gameEnded);
          if (ended.length === 0) return;
          if (!confirm(`종료된 세션 ${ended.length}개를 모두 삭제하시겠습니까?\n되돌릴 수 없습니다.`)) return;
          const updates = {};
          ended.forEach(s => { updates[`sessions/${s.id}`] = null; });
          db.ref().update(updates).then(() => {
            showToast(`종료 세션 ${ended.length}개 정리됨`);
            renderSessionList();
          });
        });
      }
      document.getElementById('enterSessionBtn').addEventListener('click', () => {
        const code = document.getElementById('existingCode').value.trim().toUpperCase();
        if (!code) { showToast('코드를 입력해 주세요'); return; }
        sessionId = code;
        localStorage.setItem('mylife_master_session', sessionId);
        enterSession();
      });
      document.getElementById('logoutBtn').addEventListener('click', logout);

      // 총관리자면 승인 대기 목록 채우기
      if (authRole === 'master') loadPendingTrainers();
    });
  }

  function renderPendingTrainersPlaceholder() {
    return `<div id="pendingTrainersBox" class="mb-4"></div>`;
  }

  function loadPendingTrainers() {
    db.ref('trainers').once('value').then(snap => {
      const all = snap.val() || {};
      const trainers = Object.entries(all).map(([key, t]) => ({ key, ...t }));
      const pending = trainers.filter(t => t.status === 'pending');
      const approved = trainers.filter(t => t.status === 'approved');

      const box = document.getElementById('pendingTrainersBox');
      if (!box) return;

      box.innerHTML = `
        <div class="bg-white rounded-2xl p-6 w-full shadow-card">
          <h2 class="font-bold text-[16px] mb-3">트레이너 관리</h2>
          ${pending.length > 0 ? `
            <p class="text-[13px] text-brand-orange font-medium mb-2">승인 대기 (${pending.length})</p>
            <div class="space-y-2 mb-4">
              ${pending.map(t => `
                <div class="flex items-center justify-between p-3 rounded-xl bg-brand-orange-light">
                  <span class="font-medium text-[14px]">${t.name}</span>
                  <div class="flex gap-2">
                    <button class="approve-trainer h-8 px-3 bg-brand-green text-white rounded-lg text-[13px] font-bold" data-key="${t.key}">승인</button>
                    <button class="reject-trainer h-8 px-3 bg-brand-gray-light text-brand-gray-dark rounded-lg text-[13px]" data-key="${t.key}">거절</button>
                  </div>
                </div>
              `).join('')}
            </div>
          ` : '<p class="text-brand-gray-text text-[13px] mb-2">승인 대기 없음</p>'}
          ${approved.length > 0 ? `
            <p class="text-[13px] text-brand-gray-text font-medium mb-2">승인된 트레이너 (${approved.length})</p>
            <div class="flex flex-wrap gap-2">
              ${approved.map(t => `
                <span class="inline-flex items-center gap-1 bg-brand-green-light text-brand-green px-3 py-1 rounded-full text-[13px] font-medium">
                  ${t.name}
                  <button class="revoke-trainer text-brand-red ml-1" data-key="${t.key}" title="권한 회수">×</button>
                </span>
              `).join('')}
            </div>
          ` : ''}
        </div>
      `;

      box.querySelectorAll('.approve-trainer').forEach(btn => {
        btn.addEventListener('click', () => {
          db.ref(`trainers/${btn.dataset.key}/status`).set('approved').then(() => {
            showToast('승인 완료'); loadPendingTrainers();
          });
        });
      });
      box.querySelectorAll('.reject-trainer').forEach(btn => {
        btn.addEventListener('click', () => {
          db.ref(`trainers/${btn.dataset.key}/status`).set('rejected').then(() => {
            showToast('거절됨'); loadPendingTrainers();
          });
        });
      });
      box.querySelectorAll('.revoke-trainer').forEach(btn => {
        btn.addEventListener('click', () => {
          if (!confirm('이 트레이너의 권한을 회수하시겠습니까?')) return;
          db.ref(`trainers/${btn.dataset.key}`).remove().then(() => {
            showToast('권한 회수됨'); loadPendingTrainers();
          });
        });
      });
    });
  }

  function logout() {
    localStorage.removeItem('mylife_auth_role');
    localStorage.removeItem('mylife_auth_name');
    localStorage.removeItem('mylife_auth_id');
    localStorage.removeItem('mylife_master_session');
    authRole = authName = authId = sessionId = null;
    renderLogin();
  }

  function createSession() {
    const name = document.getElementById('newSessionName').value.trim();
    if (!name) { showToast('세션 이름을 입력해 주세요'); return; }
    const code = generateCode();
    sessionId = code;
    db.ref(`sessions/${code}`).set({
      name, code, createdAt: Date.now(),
      ownerId: authId, ownerName: authName || '총관리자',
      state: { currentTurn: 1, phase: 'investing', maxTurns: 20, gameEnded: false },
    }).then(() => {
      localStorage.setItem('mylife_master_session', sessionId);
      showToast(`세션 생성: ${code}`);
      enterSession();
    });
  }

  function generateCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
    return code;
  }

  function enterSession() {
    db.ref(`sessions/${sessionId}`).on('value', snap => {
      if (!snap.exists()) {
        showToast('세션을 찾을 수 없습니다');
        localStorage.removeItem('mylife_master_session');
        renderSessionList();
        return;
      }
      sessionData = snap.val();
      renderAdmin();
    });
  }

  // ===== ADMIN LAYOUT =====
  function renderAdmin() {
    const state = sessionData.state || { currentTurn: 1, phase: 'investing' };
    const players = sessionData.players || {};
    const investments = sessionData.investments || {};
    const teams = sessionData.teams || {};
    const skips = sessionData.skips || {};
    const bucketRecords = sessionData.bucketRecords || {};
    const finalCash = sessionData.finalCash || {};
    const eventAdjustments = sessionData.eventAdjustments || {};
    const playerCount = Object.keys(players).length;
    const teamCount = Object.keys(teams).length;
    const investArr = Object.entries(investments).map(([id, inv]) => ({ id, ...inv }));
    const adjustmentArr = Object.entries(eventAdjustments).map(([id, adjustment]) => ({ id, ...adjustment }));

    // 완료 카운트
    const thisTurnInvestors = new Set(investArr.filter(i => i.turn === state.currentTurn).map(i => i.playerId));
    const thisTurnSkippers = new Set(Object.values(skips).filter(s => s.turn === state.currentTurn).map(s => s.playerId));
    const thisTurnDone = new Set([...thisTurnInvestors, ...thisTurnSkippers]);
    const allDone = playerCount > 0 && thisTurnDone.size >= playerCount;
    const pendingMaturity = investArr.filter(i => i.maturityTurn <= state.currentTurn && i.result === 'pending');

    document.getElementById('app').innerHTML = `
      <!-- Header -->
      <header class="bg-header-bg h-[64px] flex items-center justify-between px-6 shrink-0 shadow-sm z-50">
        <span class="font-bold text-[18px] text-white">${sessionData.name || 'My Life'}</span>
        <div class="flex items-center gap-4">
          <span class="text-white/80 font-mono text-sm">코드: ${sessionId}</span>
          <span class="text-brand-gray-text text-sm">${teamCount}팀 ${playerCount}명</span>
          <button id="exitBtn" class="text-brand-gray-text text-sm px-3 py-1.5 rounded-lg border border-gray-600 hover:bg-gray-800 transition-colors">나가기</button>
        </div>
      </header>

      <div class="flex flex-1 overflow-hidden">
        <!-- Sidebar -->
        <aside class="w-64 bg-white border-r border-outline-variant/30 p-4 flex flex-col gap-2 shrink-0 overflow-y-auto">
          <div class="mb-4 px-2">
            <p class="text-brand-gray-text text-[13px]">Turn ${state.currentTurn} · ${state.phase === 'quarterClosing' ? '분기 마감 기록' : state.phase === 'investing' ? '투자 접수' : '정산 중'}</p>
          </div>
          <div class="nav-item ${currentTab === 'dashboard' ? 'active' : ''}" data-tab="dashboard">
            <span class="material-symbols-outlined">analytics</span> 현황
          </div>
          <div class="nav-item ${currentTab === 'maturity' ? 'active' : ''}" data-tab="maturity">
            <span class="material-symbols-outlined">payments</span> 만기 정산
            ${pendingMaturity.length > 0 ? `<span class="ml-auto bg-brand-orange text-white text-[11px] font-bold px-2 py-0.5 rounded-full">${pendingMaturity.length}</span>` : ''}
          </div>
          <div class="nav-item ${currentTab === 'worldevent' ? 'active' : ''}" data-tab="worldevent">
            <span class="material-symbols-outlined">bolt</span> 월드 이벤트
          </div>
          <div class="nav-item ${currentTab === 'all' ? 'active' : ''}" data-tab="all">
            <span class="material-symbols-outlined">history</span> 전체 내역
          </div>
          <div class="nav-item ${currentTab === 'teams' ? 'active' : ''}" data-tab="teams">
            <span class="material-symbols-outlined">groups</span> 팀 관리
          </div>
          <div class="nav-item ${currentTab === 'ranking' ? 'active' : ''}" data-tab="ranking">
            <span class="material-symbols-outlined">leaderboard</span> 최종 산출
          </div>
          <div class="mt-auto pt-4 space-y-3">
            <div class="flex items-center justify-between px-2">
              <span class="text-[12px] text-brand-gray-text">자동 턴 넘기기</span>
              <label class="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" id="autoTurnToggle" class="sr-only peer" ${sessionData?.state?.autoTurn ? 'checked' : ''}>
                <div class="w-9 h-5 bg-brand-gray-light rounded-full peer peer-checked:bg-brand-blue transition-colors after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-full"></div>
              </label>
            </div>
            <div class="flex items-center justify-between px-2">
              <span class="text-[12px] text-brand-gray-text">최대 턴</span>
              <input type="number" id="maxTurnsInput" value="${state.maxTurns || 20}" min="1" max="100" class="w-[60px] h-[28px] text-center text-[13px] font-bold border border-outline-variant rounded-lg focus:border-brand-blue outline-none">
            </div>
            <div id="autoTurnCountdown" class="text-center text-[12px] text-brand-orange font-bold hidden"></div>
            ${state.gameEnded ? `
              <div class="text-center text-[13px] text-brand-red font-bold py-2">🏁 게임 종료됨</div>
            ` : state.phase === 'investing' ? `
              ${state.currentTurn >= (state.maxTurns || 20) ?
                `<button id="endGameBtn" class="w-full h-[44px] bg-brand-red text-white rounded-xl font-bold text-[14px] transition-colors">🏁 게임 종료</button>` :
                `<button id="nextTurnBtn" class="w-full h-[44px] ${allDone ? 'bg-brand-blue text-white' : 'bg-brand-gray-light text-brand-gray-text cursor-not-allowed'} rounded-xl font-bold text-[14px] transition-colors" ${!allDone ? 'disabled' : ''}>다음 턴 →</button>`
              }
            ` : state.phase === 'quarterClosing' ? `
              <button id="advanceQuarterBtn" class="w-full h-[44px] bg-brand-purple text-white rounded-xl font-bold text-[14px] transition-colors">${state.currentTurn + 1}턴 시작 →</button>
            ` : `
              <button id="finishSettleBtn" class="w-full h-[44px] bg-brand-green text-white rounded-xl font-bold text-[14px]">정산 완료 → 투자 재개</button>
            `}
          </div>
        </aside>

        <!-- Main Content -->
        <main class="flex-1 overflow-y-auto p-6 bg-background">
          <div class="max-w-[1200px] mx-auto" id="tabContent"></div>
        </main>
      </div>
    `;

    // Events
    document.getElementById('exitBtn').addEventListener('click', () => {
      localStorage.removeItem('mylife_master_session');
      db.ref(`sessions/${sessionId}`).off();
      sessionId = null;
      renderSessionList();
    });

    document.querySelectorAll('.nav-item').forEach(item => {
      item.addEventListener('click', () => { currentTab = item.dataset.tab; renderAdmin(); });
    });

    const nextBtn = document.getElementById('nextTurnBtn');
    if (nextBtn) nextBtn.addEventListener('click', nextTurn);
    const advanceQuarterBtn = document.getElementById('advanceQuarterBtn');
    if (advanceQuarterBtn) advanceQuarterBtn.addEventListener('click', nextTurn);
    const finishBtn = document.getElementById('finishSettleBtn');
    if (finishBtn) finishBtn.addEventListener('click', finishSettle);
    const endGameBtn = document.getElementById('endGameBtn');
    if (endGameBtn) endGameBtn.addEventListener('click', endGame);

    // 최대 턴 수 변경
    const maxTurnsInput = document.getElementById('maxTurnsInput');
    if (maxTurnsInput) {
      maxTurnsInput.addEventListener('change', () => {
        const val = parseInt(maxTurnsInput.value) || 20;
        db.ref(`sessions/${sessionId}/state/maxTurns`).set(val);
        showToast(`최대 턴: ${val}`);
      });
    }

    // 자동 턴 넘기기 토글
    const autoToggle = document.getElementById('autoTurnToggle');
    if (autoToggle) {
      autoToggle.addEventListener('change', () => {
        db.ref(`sessions/${sessionId}/state/autoTurn`).set(autoToggle.checked);
        if (autoToggle.checked && allDone && state.phase === 'investing' && state.currentTurn < (state.maxTurns || 20)) {
          startAutoTurnCountdown();
        } else {
          stopAutoTurnCountdown();
        }
      });
      if (autoToggle.checked && allDone && state.phase === 'investing' && state.currentTurn < (state.maxTurns || 20)) {
        startAutoTurnCountdown();
      }
    }

    // Render tab
    const container = document.getElementById('tabContent');
    const teamArr = Object.entries(teams).map(([id, t]) => ({ id, ...t }));
    const playerArr = Object.entries(players).map(([id, p]) => ({ id, ...p }));

    switch (currentTab) {
      case 'dashboard': container.innerHTML = renderDashboard(state, teamArr, playerArr, investArr, thisTurnDone, pendingMaturity, bucketRecords); bindDashboardEvents(state, playerArr, teamArr); break;
      case 'maturity': container.innerHTML = renderMaturity(state, investArr); bindMaturityEvents(investArr); break;
      case 'worldevent': container.innerHTML = renderWorldEvent(investArr); bindWorldEventEvents(investArr); break;
      case 'all': container.innerHTML = renderAllRecords(investArr); break;
      case 'teams': container.innerHTML = renderTeams(teamArr, playerArr); bindTeamEvents(); break;
      case 'ranking': container.innerHTML = renderRanking(teamArr, playerArr, investArr, bucketRecords, finalCash, adjustmentArr); break;
    }
  }

  // ===== DASHBOARD =====
  function renderDashboard(state, teamArr, playerArr, investArr, thisTurnDone, pendingMaturity, bucketRecords) {
    const bucketByPlayer = playerArr.map(player => {
      const records = Object.values(bucketRecords[player.id] || {});
      return {
        ...player,
        recordCount: records.length,
        bucketCount: records.reduce((sum, record) => sum + (Number(record.bucketCount) || 0), 0),
        bucketScore: records.reduce((sum, record) => sum + (Number(record.bucketScore) || 0), 0),
      };
    });
    const playersWithBucketRecords = bucketByPlayer.filter(player => player.recordCount > 0).length;
    const totalBucketCount = bucketByPlayer.reduce((sum, player) => sum + player.bucketCount, 0);
    const totalBucketScore = bucketByPlayer.reduce((sum, player) => sum + player.bucketScore, 0);
    const isQuarterClosing = state.phase === 'quarterClosing';
    const quarterClosingPeriod = state.quarterClosingPeriod || Math.floor(state.currentTurn / 4);
    const quarterMissingPlayers = isQuarterClosing ? bucketByPlayer.filter(player => !bucketRecords[player.id]?.[quarterClosingPeriod]) : [];
    const teamStatus = teamArr.map(team => {
      const members = playerArr.filter(p => p.teamId === team.id);
      const done = members.filter(p => thisTurnDone.has(p.id)).length;
      const bucketMembers = bucketByPlayer.filter(p => p.teamId === team.id);
      return {
        ...team, total: members.length, done, allDone: members.length > 0 && done >= members.length,
        bucketCount: bucketMembers.reduce((sum, player) => sum + player.bucketCount, 0),
        bucketScore: bucketMembers.reduce((sum, player) => sum + player.bucketScore, 0),
      };
    });
    const notDone = playerArr.filter(p => !thisTurnDone.has(p.id));

    return `
      <!-- Stats -->
      <div class="grid grid-cols-3 gap-4 mb-6">
        <div class="bento-card flex flex-col justify-between h-[120px]">
          <span class="text-brand-gray-text text-[13px]">참가자</span>
          <span class="text-[32px] font-bold">${playerArr.length}</span>
        </div>
        <div class="bento-card flex flex-col justify-between h-[120px]">
          <span class="text-brand-gray-text text-[13px]">이번 턴 완료</span>
          <div class="flex items-end gap-1">
            <span class="text-[32px] font-bold">${thisTurnDone.size}</span>
            <span class="text-brand-gray-text text-[16px] mb-1">/${playerArr.length}</span>
          </div>
        </div>
        <div class="bento-card flex flex-col justify-between h-[120px]">
          <span class="text-brand-gray-text text-[13px] flex items-center gap-1">만기 대기 <span class="w-2 h-2 rounded-full bg-brand-orange"></span></span>
          <span class="text-[32px] font-bold text-brand-orange">${pendingMaturity.length}</span>
        </div>
      </div>

      ${isQuarterClosing ? `
        <div class="bento-card mb-6 border border-brand-purple/20 bg-brand-purple-light/30">
          <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-4"><div><h3 class="font-bold text-[18px] text-brand-purple">${quarterClosingPeriod}년차 분기 마감</h3><p class="text-brand-gray-dark text-[13px] mt-1">${state.currentTurn}턴 투자가 끝났습니다. ${state.currentTurn + 1}턴으로 넘어가기 전 버킷 기록을 입력합니다.</p></div><span class="w-fit px-3 py-1 rounded-full bg-white text-brand-purple text-[12px] font-bold">${playerArr.length - quarterMissingPlayers.length}/${playerArr.length}명 입력</span></div>
          ${quarterMissingPlayers.length > 0 ? `<div class="grid grid-cols-1 md:grid-cols-2 gap-3">${quarterMissingPlayers.map(player => { const teamName = teamArr.find(team => team.id === player.teamId)?.name || ''; return `<div class="flex items-center justify-between rounded-xl bg-white p-3 border border-brand-purple/15"><span><span class="bg-brand-gray-light text-brand-gray-dark text-[11px] font-bold px-2 py-1 rounded mr-2">${teamName}</span><span class="font-medium">${player.name}</span></span><span class="text-[12px] font-bold text-brand-orange">미입력</span></div>`; }).join('')}</div>` : '<div class="rounded-xl bg-white p-4 text-[13px] font-bold text-brand-green">모든 참가자가 버킷 기록을 입력했습니다.</div>'}
        </div>
      ` : ''}

      <!-- Bucket Status -->
      <div class="bento-card mb-6 border border-brand-purple/15">
        <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-4">
          <div>
            <h3 class="font-bold text-[18px] flex items-center gap-2"><span class="material-symbols-outlined text-brand-purple">workspace_premium</span>버킷 현황</h3>
            <p class="text-brand-gray-text text-[13px] mt-1">참가자가 입력한 누적 개수와 점수입니다.</p>
          </div>
          <span class="w-fit px-3 py-1 rounded-full bg-brand-purple-light text-brand-purple text-[12px] font-bold">${playersWithBucketRecords}/${playerArr.length}명 입력</span>
        </div>
        <div class="grid grid-cols-2 gap-3 mb-4">
          <div class="rounded-xl bg-brand-purple-light/60 p-4"><p class="text-[12px] text-brand-gray-dark">전체 버킷 개수</p><p class="mt-1 text-[24px] font-bold">${totalBucketCount.toLocaleString('ko-KR')}<span class="ml-1 text-[13px] font-medium text-brand-gray-text">개</span></p></div>
          <div class="rounded-xl bg-brand-purple-light/60 p-4"><p class="text-[12px] text-brand-gray-dark">전체 만족도 점수</p><p class="mt-1 text-[24px] font-bold">${totalBucketScore.toLocaleString('ko-KR')}<span class="ml-1 text-[13px] font-medium text-brand-gray-text">점</span></p></div>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          ${bucketByPlayer.map(player => {
            const teamName = teamArr.find(team => team.id === player.teamId)?.name || '';
            return `
              <div class="flex items-center justify-between rounded-xl border border-outline-variant bg-white p-4">
                <div class="min-w-0"><div class="flex items-center gap-2"><span class="bg-brand-gray-light text-brand-gray-dark text-[11px] font-bold px-2 py-1 rounded">${teamName}</span><span class="font-medium truncate">${player.name}</span></div><p class="mt-1 text-[12px] text-brand-gray-text">${player.recordCount}회 기록</p></div>
                <div class="text-right shrink-0"><p class="font-bold text-[15px]">${player.bucketCount.toLocaleString('ko-KR')}개</p><p class="mt-1 text-[12px] text-brand-purple font-bold">만족도 ${player.bucketScore.toLocaleString('ko-KR')}점</p></div>
              </div>
            `;
          }).join('')}
        </div>
      </div>

      <!-- Team Status -->
      <div class="bento-card mb-6">
        <h3 class="font-bold text-[18px] mb-4">팀별 현황</h3>
        <div class="space-y-3">
          ${teamStatus.map(t => `
            <div class="flex items-center justify-between p-4 rounded-xl border ${t.allDone ? 'border-outline-variant bg-white' : 'border-brand-orange/20 bg-orange-50/30'}">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-full ${t.allDone ? 'bg-brand-blue/10 text-brand-blue' : 'bg-brand-orange/10 text-brand-orange'} flex items-center justify-center font-bold text-sm">${t.name.replace('조','')}</div>
                <span class="font-medium">${t.name}</span>
              </div>
              <div class="flex items-center gap-4">
                <span class="text-on-surface-variant">${t.done}/${t.total}명</span>
                <span class="text-brand-purple text-[12px] font-bold">버킷 ${t.bucketCount}개 · 만족도 ${t.bucketScore}점</span>
                ${t.allDone ?
                  '<span class="px-3 py-1 rounded-full bg-brand-green-light text-brand-green text-[12px] font-bold">완료</span>' :
                  '<span class="px-3 py-1 rounded-full bg-brand-orange-light text-brand-orange text-[12px] font-bold">대기</span>'}
              </div>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- Not Done -->
      ${notDone.length > 0 ? `
        <div class="bento-card mb-6">
          <h3 class="font-bold text-[18px] mb-2">미완료 참가자 <span class="text-brand-orange font-medium text-[16px]">(${notDone.length}명)</span></h3>
          <p class="text-brand-gray-text text-[13px] mb-4">대리 처리할 수 있습니다.</p>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
            ${notDone.map(p => {
              const teamName = teamArr.find(t => t.id === p.teamId)?.name || '';
              return `
                <div class="flex items-center justify-between p-4 rounded-xl border border-outline-variant bg-white">
                  <div class="flex items-center gap-3">
                    <span class="bg-brand-gray-light text-brand-gray-dark text-[11px] font-bold px-2 py-1 rounded">${teamName}</span>
                    <span class="font-medium">${p.name}</span>
                  </div>
                  <div class="flex gap-2">
                    <button class="proxy-skip h-9 px-3 rounded-lg text-[13px] font-medium border border-outline-variant hover:bg-surface-variant transition-colors" data-player-id="${p.id}" data-player-name="${p.name}" data-team-id="${p.teamId || ''}">투자 안 함</button>
                    <button class="proxy-invest h-9 px-3 bg-brand-blue/10 text-brand-blue font-bold text-[13px] rounded-lg hover:bg-brand-blue/20 transition-colors" data-player-id="${p.id}" data-player-name="${p.name}" data-team-id="${p.teamId || ''}">대리 투자</button>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      ` : ''}

      <!-- URL + QR -->
      <div class="bento-card">
        <span class="text-brand-gray-text text-[13px] font-medium">참가자 접속</span>
        <div class="flex flex-col-reverse sm:flex-row gap-5 mt-3 items-center sm:items-start">
          <div class="flex-1 w-full">
            <div class="flex gap-2">
              <div class="flex-1 bg-surface-container-low border border-outline-variant rounded-lg px-4 flex items-center text-outline font-mono text-[13px] overflow-hidden text-ellipsis whitespace-nowrap h-[48px]" id="playerUrl">${window.location.origin}/player/?session=${sessionId}</div>
              <button id="copyUrlBtn" class="bg-surface-container-high text-on-surface font-medium px-5 rounded-lg h-[48px] hover:bg-surface-variant transition-colors border border-outline-variant text-[13px]">복사</button>
            </div>
            <p class="text-brand-gray-text text-[12px] mt-2">참가자는 QR을 찍거나 위 주소로 접속하세요.</p>
          </div>
          <div class="text-center shrink-0">
            <img src="https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(window.location.origin + '/player/?session=' + sessionId)}"
              alt="접속 QR코드" width="140" height="140" class="rounded-lg border border-outline-variant bg-white p-1" />
            <p class="text-brand-gray-text text-[11px] mt-1">QR 스캔</p>
          </div>
        </div>
      </div>
    `;
  }

  function bindDashboardEvents(state, playerArr, teamArr) {
    document.querySelectorAll('.proxy-skip').forEach(btn => {
      btn.addEventListener('click', () => {
        const { playerId, playerName, teamId } = btn.dataset;
        db.ref(`sessions/${sessionId}/skips/${state.currentTurn}_${playerId}`).set({
          playerId, playerName, teamId, turn: state.currentTurn, proxy: true, createdAt: Date.now(),
        }).then(() => showToast(`${playerName}: 투자 안 함 처리`));
      });
    });
    document.querySelectorAll('.proxy-invest').forEach(btn => {
      btn.addEventListener('click', () => {
        const { playerId, playerName, teamId } = btn.dataset;
        showProxyInvestModal(playerId, playerName, teamId, sessionData.state.currentTurn);
      });
    });
    document.getElementById('copyUrlBtn')?.addEventListener('click', () => {
      const url = document.getElementById('playerUrl')?.textContent?.trim();
      if (url) navigator.clipboard.writeText(url).then(() => showToast('URL 복사됨'));
    });
  }

  function showProxyInvestModal(playerId, playerName, teamId, turn) {
    const names = PRODUCTS.map((p, i) => `${i+1}. ${p.name} (+${(p.profitRate*100).toFixed(0)}%)`).join('\n');
    const choice = prompt(`${playerName} 대리 투자\n\n${names}`);
    if (!choice) return;
    const idx = parseInt(choice) - 1;
    if (idx < 0 || idx >= PRODUCTS.length) { showToast('올바른 번호를 입력해 주세요'); return; }
    const product = PRODUCTS[idx];
    const amountStr = prompt(`투자 금액 (만 원, 최소 ${product.minAmount}):`);
    if (!amountStr) return;
    const amount = parseInt(amountStr.replace(/[^0-9]/g, '')) || 0;
    if (amount < product.minAmount) { showToast(`최소 ${product.minAmount}만 원`); return; }
    db.ref(`sessions/${sessionId}/investments`).push({
      playerId, playerName, teamId, turn,
      productId: product.id, productName: product.name, amount,
      profitRate: product.profitRate, lossRate: product.lossRate,
      maturityTurn: turn + MATURITY_TURNS, status: 'active', result: 'pending',
      profitAmount: 0, lossAmount: 0, preserveAmount: 0, proxy: true, createdAt: Date.now(),
    }).then(() => showToast(`${playerName}: ${product.name} ${formatAmount(amount)}만 원 대리 투자`));
  }

  // ===== WORLD EVENT =====
  function renderWorldEvent(investments) {
    const pending = investments.filter(i => i.result === 'pending');
    // 종목별로 진행 중인 투자 그룹화
    const byProduct = {};
    pending.forEach(inv => {
      if (!byProduct[inv.productId]) byProduct[inv.productId] = [];
      byProduct[inv.productId].push(inv);
    });

    const productIds = Object.keys(byProduct);

    if (productIds.length === 0) {
      return `<div class="bento-card text-center py-12 text-brand-gray-text">진행 중인 투자가 없어 월드 이벤트를 발동할 수 없습니다.</div>`;
    }

    return `
      <div class="bento-card mb-6">
        <div class="flex items-center gap-3 mb-2">
          <span class="text-[24px]">⚡</span>
          <h2 class="font-bold text-[20px]">월드 이벤트</h2>
        </div>
        <p class="text-brand-gray-text text-[14px] mb-6">대상 종목과 이벤트 효과를 선택하세요. 모든 이벤트는 히스토리에 남습니다.</p>

        <!-- 종목 선택 -->
        <div class="space-y-3 mb-6">
          ${productIds.map(pid => {
            const product = getProductById(pid);
            const invList = byProduct[pid];
            return `
              <label class="flex items-center justify-between p-4 rounded-xl border border-outline-variant bg-white cursor-pointer hover:border-brand-blue transition-colors has-[:checked]:border-brand-blue has-[:checked]:bg-brand-blue-light">
                <div class="flex items-center gap-3">
                  <input type="checkbox" class="world-event-product w-5 h-5 rounded border-outline-variant text-brand-blue focus:ring-brand-blue" data-product-id="${pid}">
                  <div>
                    <span class="font-bold text-[15px]">${product?.name || pid}</span>
                    <span class="text-brand-gray-text text-[13px] ml-2">${invList.length}명 투자 중</span>
                  </div>
                </div>
                <div class="flex gap-2 text-[11px] font-medium">
                  ${product ? `
                    <span class="chip-success px-2 py-0.5 rounded-md">성공 ${product.profitDice.join(',')}</span>
                    ${product.preserveDice.length ? `<span class="chip-preserve px-2 py-0.5 rounded-md">보존 ${product.preserveDice.join(',')}</span>` : ''}
                    ${product.lossDice.length ? `<span class="chip-fail px-2 py-0.5 rounded-md">실패 ${product.lossDice.join(',')}</span>` : ''}
                  ` : ''}
                </div>
              </label>
            `;
          }).join('')}
        </div>

        <!-- 이벤트 효과 -->
        <div class="mb-6">
          <h3 class="font-bold text-[16px] mb-3">이벤트 효과</h3>
          <div class="space-y-3">
            <label class="flex gap-3 p-4 rounded-xl border border-outline-variant bg-white cursor-pointer has-[:checked]:border-brand-blue has-[:checked]:bg-brand-blue-light">
              <input type="radio" name="worldEventEffect" value="diceSettlement" class="world-event-effect mt-0.5 w-5 h-5 text-brand-blue" checked>
              <div><p class="font-bold text-[14px]">주사위 즉시 정산</p><p class="mt-1 text-[13px] text-brand-gray-text">대표 주사위 결과로 선택한 모든 투자를 즉시 정산합니다.</p></div>
            </label>
            <label class="flex gap-3 p-4 rounded-xl border border-outline-variant bg-white cursor-pointer has-[:checked]:border-brand-blue has-[:checked]:bg-brand-blue-light">
              <input type="radio" name="worldEventEffect" value="recordOnly" class="world-event-effect mt-0.5 w-5 h-5 text-brand-blue">
              <div><p class="font-bold text-[14px]">영향 없이 기록만</p><p class="mt-1 text-[13px] text-brand-gray-text">진행 중인 투자값은 바꾸지 않고 이벤트 발생 사실만 남깁니다.</p></div>
            </label>
            <label class="flex gap-3 p-4 rounded-xl border border-outline-variant bg-white cursor-pointer has-[:checked]:border-brand-blue has-[:checked]:bg-brand-blue-light">
              <input type="radio" name="worldEventEffect" value="forcedLoss" class="world-event-effect mt-0.5 w-5 h-5 text-brand-blue">
              <div class="flex-1"><p class="font-bold text-[14px]">강제 손실 적용</p><p class="mt-1 text-[13px] text-brand-gray-text">선택한 각 투자 건에 같은 손실액을 반영하고, 투자는 계속 진행합니다.</p>
                <div id="worldEventLossOptions" class="hidden mt-3"><label class="text-[12px] font-medium text-brand-gray-dark">투자 건당 강제 손실액 (만 원)<input id="worldEventLossAmount" type="number" min="1" inputmode="numeric" class="mt-1 w-full h-[44px] rounded-xl border-outline-variant text-[15px] font-bold focus:border-brand-blue focus:ring-brand-blue" placeholder="0"></label></div>
              </div>
            </label>
          </div>
        </div>

        <!-- 통합 주사위 영역 -->
        <div id="worldEventDiceArea" class="hidden">
          <div class="bg-white rounded-2xl p-8 border border-outline-variant text-center">
            <h3 class="font-bold text-[16px] mb-2">대표 주사위</h3>
            <p class="text-brand-gray-text text-[13px] mb-6">선택한 모든 종목에 동일하게 적용됩니다</p>
            
            <div class="flex justify-center mb-6">
              <div id="diceDisplay" class="w-[100px] h-[100px] rounded-2xl bg-surface-container flex items-center justify-center text-[48px] font-bold text-on-surface transition-transform shadow-inner" style="display:none;">?</div>
            </div>

            <button id="rollDiceBtn" class="h-[56px] px-8 bg-brand-orange text-white rounded-xl font-bold text-[18px] hover:bg-orange-600 active:scale-[0.95] transition-all mx-auto flex items-center gap-3">
              🎲 주사위 굴리기
            </button>

            <div id="diceResultPreview" class="mt-6 hidden">
              <div id="diceResultText" class="text-[20px] font-bold"></div>
              <div id="diceAffectedList" class="mt-4 text-left text-[13px] text-brand-gray-text space-y-1"></div>
            </div>
          </div>
        </div>

        <!-- 또는 직접 선택 -->
        <div id="worldEventManualDice" class="hidden">
          <div class="bg-white rounded-2xl p-6 border border-outline-variant">
            <div class="flex justify-between items-center mb-4">
              <h3 class="font-bold text-[16px]">직접 지정</h3>
              <button id="switchToRollBtn" class="text-brand-blue text-[13px] font-medium">← 굴리기로 돌아가기</button>
            </div>
            <div class="flex justify-center gap-3" id="manualDiceButtons">
              ${[1,2,3,4,5,6].map(d => `<button class="manual-dice w-[56px] h-[56px] rounded-xl bg-surface-container border-2 border-outline-variant text-[22px] font-bold hover:border-brand-blue hover:scale-105 transition-all" data-dice="${d}">${d}</button>`).join('')}
            </div>
          </div>
        </div>

        <div class="text-center mt-2">
          <button id="switchToManualBtn" class="text-brand-gray-text text-[12px] underline hidden">숫자 직접 지정하기</button>
        </div>

        <!-- 발동 버튼 -->
        <div class="mt-6">
          <button id="worldEventConfirmBtn" class="w-full h-[52px] bg-brand-red text-white rounded-xl font-bold text-[16px] active:scale-[0.98] transition-transform disabled:opacity-50 disabled:cursor-not-allowed" disabled>
            ⚡ 월드 이벤트 발동
          </button>
          <p id="worldEventConfirmHint" class="text-brand-gray-text text-[12px] mt-2 text-center">발동하면 선택한 종목의 모든 진행 중 투자가 즉시 정산됩니다.</p>
        </div>
      </div>

      <!-- 이벤트 히스토리 -->
      ${renderWorldEventHistory()}
    `;
  }

  function renderWorldEventHistory() {
    const events = sessionData.worldEvents ? Object.values(sessionData.worldEvents) : [];
    if (events.length === 0) return '';
    const sorted = events.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

    return `
      <div class="bento-card">
        <h3 class="font-bold text-[16px] mb-4">📋 이벤트 히스토리</h3>
        <div class="space-y-3">
          ${sorted.map(ev => {
            const effectType = ev.effectType || 'diceSettlement';
            const effectText = effectType === 'recordOnly' ? '영향 없이 기록' :
              effectType === 'forcedLoss' ? `강제 손실 · 건당 -${formatAmount(ev.fixedLossAmount || 0)}만 원` :
              `주사위 ${ev.dice} 즉시 정산`;
            const affectedText = effectType === 'recordOnly' ? `${ev.targetCount || ev.affectedCount || 0}건 대상 · 정산 없음` :
              effectType === 'forcedLoss' ? `${ev.affectedCount || 0}건 · 총 ${formatAmount(-(ev.totalLossAmount || 0))}만 원` :
              `${ev.affectedCount || 0}건 정산`;
            return `
            <div class="p-3 rounded-lg bg-surface-container-low">
              <div class="flex justify-between items-center">
                <div>
                  <span class="font-bold text-[14px]">⚡ ${ev.productNames?.join(', ') || ''}</span>
                  <span class="text-brand-gray-text text-[12px] ml-2">턴 ${ev.turn}</span>
                </div>
                <span class="text-brand-gray-text text-[12px]">${affectedText}</span>
              </div>
              <div class="text-[12px] text-brand-gray-text mt-1">
                ${effectText}${effectType === 'diceSettlement' && ev.results ? ` · ${ev.results.map(r => `${r.productName}: ${resultLabel(r.result)}`).join(' | ')}` : ''}
              </div>
            </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }

  function bindWorldEventEvents(investments) {
    const pending = investments.filter(i => i.result === 'pending');
    const byProduct = {};
    pending.forEach(inv => {
      if (!byProduct[inv.productId]) byProduct[inv.productId] = [];
      byProduct[inv.productId].push(inv);
    });

    let selectedProducts = {};
    let finalDice = null;
    let effectType = 'diceSettlement';
    let useManualDice = false;
    const getSelectedIds = () => Object.keys(selectedProducts);
    const getTargetCount = () => getSelectedIds().reduce((sum, pid) => sum + (byProduct[pid] || []).length, 0);

    function resetDice() {
      finalDice = null;
      useManualDice = false;
      document.getElementById('diceDisplay').style.display = 'none';
      document.getElementById('diceResultPreview').classList.add('hidden');
      document.querySelectorAll('.manual-dice').forEach(button => {
        button.classList.remove('border-brand-blue', 'bg-brand-blue', 'text-white');
        button.classList.add('border-outline-variant');
      });
    }

    function updateWorldEventUI() {
      const hasSelection = getSelectedIds().length > 0;
      const needsDice = effectType === 'diceSettlement';
      const lossAmount = Number(document.getElementById('worldEventLossAmount')?.value || 0);
      document.getElementById('worldEventDiceArea').classList.toggle('hidden', !hasSelection || !needsDice || useManualDice);
      document.getElementById('worldEventManualDice').classList.toggle('hidden', !hasSelection || !needsDice || !useManualDice);
      document.getElementById('switchToManualBtn').classList.toggle('hidden', !hasSelection || !needsDice || useManualDice);
      document.getElementById('worldEventLossOptions').classList.toggle('hidden', effectType !== 'forcedLoss');

      const confirm = document.getElementById('worldEventConfirmBtn');
      const hint = document.getElementById('worldEventConfirmHint');
      confirm.disabled = !hasSelection || (needsDice && !finalDice) || (effectType === 'forcedLoss' && (!Number.isInteger(lossAmount) || lossAmount <= 0));
      if (effectType === 'diceSettlement') {
        confirm.textContent = '⚡ 주사위 정산 발동';
        hint.textContent = '발동하면 선택한 종목의 모든 진행 중 투자가 즉시 정산됩니다.';
      } else if (effectType === 'recordOnly') {
        confirm.textContent = '⚡ 영향 없이 이벤트 기록';
        hint.textContent = '선택한 투자값은 바꾸지 않고 이벤트 히스토리에만 남깁니다.';
      } else {
        confirm.textContent = '⚡ 강제 손실 적용';
        hint.textContent = `선택한 ${getTargetCount()}건에 투자 건당 손실액을 적용하고, 투자는 계속 진행합니다.`;
      }
    }

    document.querySelectorAll('.world-event-product').forEach(cb => {
      cb.addEventListener('change', () => {
        if (cb.checked) selectedProducts[cb.dataset.productId] = true;
        else delete selectedProducts[cb.dataset.productId];
        resetDice();
        updateWorldEventUI();
      });
    });
    document.querySelectorAll('.world-event-effect').forEach(radio => {
      radio.addEventListener('change', () => {
        effectType = radio.value;
        resetDice();
        updateWorldEventUI();
      });
    });
    document.getElementById('worldEventLossAmount')?.addEventListener('input', updateWorldEventUI);

    document.getElementById('rollDiceBtn')?.addEventListener('click', () => {
      const display = document.getElementById('diceDisplay');
      const btn = document.getElementById('rollDiceBtn');
      display.style.display = 'flex';
      btn.disabled = true;
      btn.textContent = '굴리는 중...';
      rollDiceWithAnimation(display, (value) => {
        finalDice = value;
        btn.disabled = false;
        btn.innerHTML = '🎲 다시 굴리기';
        showDiceResult(value);
        updateWorldEventUI();
      });
    });
    document.getElementById('switchToManualBtn')?.addEventListener('click', () => { useManualDice = true; updateWorldEventUI(); });
    document.getElementById('switchToRollBtn')?.addEventListener('click', () => { useManualDice = false; updateWorldEventUI(); });
    document.querySelectorAll('.manual-dice').forEach(btn => {
      btn.addEventListener('click', () => {
        finalDice = parseInt(btn.dataset.dice);
        document.querySelectorAll('.manual-dice').forEach(button => {
          button.classList.remove('border-brand-blue', 'bg-brand-blue', 'text-white');
          button.classList.add('border-outline-variant');
        });
        btn.classList.remove('border-outline-variant');
        btn.classList.add('border-brand-blue', 'bg-brand-blue', 'text-white');
        useManualDice = false;
        showDiceResult(finalDice);
        updateWorldEventUI();
      });
    });

    function showDiceResult(dice) {
      const preview = document.getElementById('diceResultPreview');
      const text = document.getElementById('diceResultText');
      const list = document.getElementById('diceAffectedList');
      preview.classList.remove('hidden');
      const lines = [];
      getSelectedIds().forEach(pid => {
        const product = getProductById(pid);
        const result = judgeResult(product, dice);
        const count = (byProduct[pid] || []).length;
        const colorCls = result === 'success' ? 'text-brand-green' : result === 'fail' ? 'text-brand-red' : 'text-brand-purple';
        lines.push(`<div><span class="font-bold">${product.name}</span> → <span class="${colorCls} font-bold">${resultLabel(result)}</span> (${count}건)</div>`);
      });
      text.innerHTML = `주사위 <span class="text-brand-blue text-[28px]">${dice}</span> · ${getTargetCount()}건 즉시 정산`;
      list.innerHTML = lines.join('');
    }

    document.getElementById('worldEventConfirmBtn')?.addEventListener('click', () => {
      const pids = getSelectedIds();
      if (pids.length === 0 || (effectType === 'diceSettlement' && !finalDice)) return;
      const fixedLossAmount = Number(document.getElementById('worldEventLossAmount')?.value || 0);
      if (effectType === 'forcedLoss' && (!Number.isInteger(fixedLossAmount) || fixedLossAmount <= 0)) {
        showToast('투자 건당 강제 손실액을 1만 원 이상 입력해 주세요');
        return;
      }

      const state = sessionData.state || {};
      const updates = {};
      const eventKey = db.ref(`sessions/${sessionId}/worldEvents`).push().key;
      const targets = pids.flatMap(pid => byProduct[pid] || []);
      const productNames = pids.map(pid => getProductById(pid)?.name || pid);
      const now = Date.now();
      let eventData = { turn: state.currentTurn, effectType, productNames, targetCount: targets.length, createdAt: now };

      if (effectType === 'diceSettlement') {
        const eventResults = [];
        targets.forEach(inv => {
          const product = getProductById(inv.productId);
          const result = judgeResult(product, finalDice);
          const calc = calculateResult(inv.amount, product, result);
          updates[`sessions/${sessionId}/investments/${inv.id}/diceValue`] = finalDice;
          updates[`sessions/${sessionId}/investments/${inv.id}/result`] = result;
          updates[`sessions/${sessionId}/investments/${inv.id}/profitAmount`] = calc.profitAmount;
          updates[`sessions/${sessionId}/investments/${inv.id}/lossAmount`] = calc.lossAmount;
          updates[`sessions/${sessionId}/investments/${inv.id}/preserveAmount`] = calc.preserveAmount;
          updates[`sessions/${sessionId}/investments/${inv.id}/settledAt`] = now;
          updates[`sessions/${sessionId}/investments/${inv.id}/settledBy`] = 'worldEvent';
        });
        pids.forEach(pid => {
          const product = getProductById(pid);
          eventResults.push({ productId: pid, productName: product.name, dice: finalDice, result: judgeResult(product, finalDice) });
        });
        eventData = { ...eventData, dice: finalDice, results: eventResults, affectedCount: targets.length };
      } else if (effectType === 'forcedLoss') {
        let totalLossAmount = 0;
        targets.forEach(inv => {
          const lossAmount = Math.min(fixedLossAmount, Number(inv.amount) || 0);
          const adjustmentKey = db.ref(`sessions/${sessionId}/eventAdjustments`).push().key;
          updates[`sessions/${sessionId}/eventAdjustments/${adjustmentKey}`] = {
            eventId: eventKey, investmentId: inv.id, playerId: inv.playerId, playerName: inv.playerName,
            productId: inv.productId, productName: inv.productName, amount: -lossAmount,
            turn: state.currentTurn, createdAt: now,
          };
          totalLossAmount += lossAmount;
        });
        eventData = { ...eventData, fixedLossAmount, totalLossAmount, affectedCount: targets.length };
      } else {
        eventData = { ...eventData, affectedCount: 0 };
      }
      updates[`sessions/${sessionId}/worldEvents/${eventKey}`] = eventData;

      const confirm = document.getElementById('worldEventConfirmBtn');
      confirm.disabled = true;
      confirm.textContent = '저장 중...';
      db.ref().update(updates).then(() => {
        const message = effectType === 'diceSettlement' ? `주사위 ${finalDice} · ${targets.length}건 정산` :
          effectType === 'forcedLoss' ? `${targets.length}건 강제 손실 적용` : `${targets.length}건 영향 없이 기록`;
        showToast(`⚡ 월드 이벤트 발동! ${message}`);
        currentTab = 'worldevent';
      }).catch(() => {
        confirm.disabled = false;
        updateWorldEventUI();
        showToast('월드 이벤트를 저장하지 못했습니다. 다시 시도해 주세요');
      });
    });
    updateWorldEventUI();
  }

  // ===== MATURITY =====
  function renderMaturity(state, investments) {
    const isFinalSettling = state.phase === 'finalSettling' || state.gameEnding;
    
    // 일반 만기 + 게임 종료 시 미만기 모두 포함
    let matured;
    if (isFinalSettling) {
      matured = investments.filter(i => i.result === 'pending');
    } else {
      matured = investments.filter(i => i.maturityTurn <= state.currentTurn && i.result === 'pending');
    }
    const recentlySettled = investments.filter(i => i.settledAt && i.result !== 'pending')
      .sort((a, b) => (b.settledAt || 0) - (a.settledAt || 0)).slice(0, 10);

    return `
      ${matured.length > 0 ? `
        <div class="bento-card mb-6">
          <div class="flex justify-between items-center mb-4">
            <h2 class="font-bold text-[18px]">${isFinalSettling ? '🏁 게임 종료 정산' : '⏳ 정산 대기'} ${matured.length}건</h2>
            <button id="settleAllBtn" class="h-[40px] px-5 bg-brand-green text-white rounded-xl font-bold text-[14px] hover:bg-green-600 transition-colors">전체 대리 정산</button>
          </div>
            <p class="text-brand-gray-text text-[13px] mb-6">${isFinalSettling ? '미만기 투자입니다. 주사위를 굴려주세요. 성공·실패 모두 경과 기간 비율(최소 25%)로 정산하고, 보존은 원금입니다.' : '참가자가 직접 입력합니다. 필요 시 대리 정산 가능합니다.'}</p>
          <div class="space-y-3">
            ${matured.map(inv => {
              const product = getProductById(inv.productId);
              return `
                <div class="bg-white rounded-xl p-5 border border-outline-variant/50">
                  <div class="flex justify-between items-start mb-3">
                    <div class="flex items-center gap-3">
                      <div class="w-10 h-10 bg-surface-container rounded-full flex items-center justify-center font-bold text-on-surface">${inv.playerName.charAt(0)}</div>
                      <div>
                        <span class="font-bold">${inv.playerName}</span>
                        <span class="text-[13px] text-brand-gray-text ml-2">${inv.productName} · ${formatAmount(inv.amount)}만 원</span>
                      </div>
                    </div>
                    <span class="bg-brand-gray-light text-brand-gray-dark px-2 py-1 rounded text-[11px] font-medium">턴${inv.turn}→${inv.maturityTurn}</span>
                  </div>
                  <div class="flex gap-2 text-[12px] font-medium mb-3">
                    ${product ? `
                      <span class="chip-success px-2 py-1 rounded-md">성공 ${product.profitDice.join(',')}</span>
                      ${product.preserveDice.length ? `<span class="chip-preserve px-2 py-1 rounded-md">보존 ${product.preserveDice.join(',')}</span>` : ''}
                      ${product.lossDice.length ? `<span class="chip-fail px-2 py-1 rounded-md">실패 ${product.lossDice.join(',')}</span>` : ''}
                    ` : ''}
                  </div>
                  <div class="flex justify-between items-center pt-3 border-t border-outline-variant/30">
                    <span class="text-[13px] text-brand-gray-text">주사위 결과 입력</span>
                    <div class="flex gap-2">
                      ${[1,2,3,4,5,6].map(d => {
                        let cls = '';
                        if (product?.profitDice.includes(d)) cls = 'dice-success';
                        else if (product?.preserveDice.includes(d)) cls = 'dice-preserve';
                        else if (product?.lossDice.includes(d)) cls = 'dice-fail';
                        return `<button class="dice-btn ${cls}" data-dice="${d}" data-inv-id="${inv.id}">${d}</button>`;
                      }).join('')}
                    </div>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      ` : '<div class="bento-card text-center py-12 text-brand-gray-text">만기 도래한 투자가 없습니다</div>'}

      ${recentlySettled.length > 0 ? `
        <div class="bento-card">
          <h3 class="font-bold text-[16px] mb-4 flex items-center gap-2">
            <span class="material-symbols-outlined text-brand-green fill">check_circle</span> 최근 정산 완료
          </h3>
          <div class="space-y-3">
            ${recentlySettled.map(inv => {
              const net = (inv.profitAmount || 0) + (inv.lossAmount || 0);
              const display = inv.result === 'preserve' ? `${formatAmount(inv.preserveAmount)}만` : `${net >= 0 ? '+' : ''}${formatAmount(net)}만`;
              const color = inv.result === 'success' ? 'text-brand-green' : inv.result === 'fail' ? 'text-brand-red' : 'text-brand-purple';
              return `
                <div class="flex items-center justify-between p-3 rounded-lg bg-surface-container-low">
                  <div class="flex items-center gap-3">
                    <div class="w-8 h-8 bg-white border border-outline-variant rounded-full flex items-center justify-center font-bold text-sm">${inv.diceValue || '?'}</div>
                    <div>
                      <div class="font-bold text-[14px]">${inv.playerName}</div>
                      <div class="text-[12px] text-brand-gray-text">${inv.productName}</div>
                    </div>
                  </div>
                  <div class="text-right">
                    <div class="text-[12px] font-bold ${color}">${resultLabel(inv.result)}${inv.settledBy === 'worldEvent' ? ' ⚡' : ''}</div>
                    <div class="font-bold ${color}">${display}</div>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      ` : ''}
    `;
  }

  function bindMaturityEvents(investments) {
    document.querySelectorAll('.dice-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const invId = btn.dataset.invId;
        const dice = parseInt(btn.dataset.dice);
        settleInvestment(invId, dice, investments);
      });
    });
    document.getElementById('settleAllBtn')?.addEventListener('click', () => {
      const state = sessionData.state || {};
      const matured = investments.filter(i => i.maturityTurn <= state.currentTurn && i.result === 'pending');
      matured.forEach(inv => settleInvestment(inv.id, Math.floor(Math.random() * 6) + 1, investments));
    });
  }

  function settleInvestment(invId, diceValue, investments) {
    const inv = investments.find(i => i.id === invId);
    if (!inv) return;
    const product = getProductById(inv.productId);
    if (!product) return;
    const state = sessionData.state || {};
    const isFinalSettling = state.phase === 'finalSettling' || state.gameEnding;
    const isEarlyTerm = isFinalSettling && inv.maturityTurn > state.currentTurn;

    if (isEarlyTerm) {
      endGameFinalSettle(invId, diceValue, investments);
    } else {
      // 일반 만기 정산
      const result = judgeResult(product, diceValue);
      const calc = calculateResult(inv.amount, product, result);
      db.ref(`sessions/${sessionId}/investments/${invId}`).update({
        diceValue, result, profitAmount: calc.profitAmount, lossAmount: calc.lossAmount, preserveAmount: calc.preserveAmount, settledAt: Date.now(),
      }).then(() => {
        showToast(`${inv.playerName}: ${resultLabel(result)} (주사위 ${diceValue})`);
        if (isFinalSettling) checkFinalSettleComplete();
      });
    }
  }

  // ===== ALL RECORDS =====
  function renderAllRecords(investments) {
    const sorted = [...investments].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    return `
      <div class="bento-card">
        <h3 class="font-bold text-[18px] mb-4">전체 투자 내역 (${sorted.length}건)</h3>
        <div class="overflow-x-auto">
          <table class="w-full text-left">
            <thead>
              <tr class="border-b border-outline-variant text-[13px] text-brand-gray-text">
                <th class="p-3">턴</th><th class="p-3">참가자</th><th class="p-3">상품</th><th class="p-3 text-right">금액</th><th class="p-3 text-center">만기</th><th class="p-3 text-center">결과</th><th class="p-3 text-right">수익/손실</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-outline-variant/50">
              ${sorted.map(inv => {
                const net = (inv.profitAmount || 0) + (inv.lossAmount || 0);
                const display = inv.result === 'pending' ? '-' : inv.result === 'preserve' ? formatAmount(inv.preserveAmount) : `${net >= 0 ? '+' : ''}${formatAmount(net)}`;
                const color = inv.result === 'success' ? 'text-brand-green' : inv.result === 'fail' ? 'text-brand-red' : '';
                const badgeCls = inv.result === 'success' ? 'chip-success' : inv.result === 'fail' ? 'chip-fail' : inv.result === 'preserve' ? 'chip-preserve' : 'bg-brand-orange-light text-brand-orange';
                return `<tr class="hover:bg-surface-container-low/50 text-[14px]">
                  <td class="p-3">${inv.turn}</td><td class="p-3 font-medium">${inv.playerName}</td><td class="p-3">${inv.productName}</td>
                  <td class="p-3 text-right">${formatAmount(inv.amount)}</td><td class="p-3 text-center text-brand-gray-text">턴${inv.maturityTurn}</td>
                  <td class="p-3 text-center"><span class="${badgeCls} px-2 py-0.5 rounded-full text-[11px] font-bold">${resultLabel(inv.result)}</span>${inv.settledBy === 'worldEvent' ? '<span class="bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full text-[9px] font-bold ml-1">⚡</span>' : ''}</td>
                  <td class="p-3 text-right font-bold ${color}">${display}</td>
                </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  // ===== TEAMS =====
  function renderTeams(teamArr, playerArr) {
    return `
      <div class="bento-card mb-6">
        <h2 class="font-bold text-[18px] mb-4">팀 일괄 생성</h2>
        <div class="flex items-center gap-3 mb-2">
          <label class="text-[14px] text-brand-gray-dark font-medium">몇 개 조?</label>
          <input type="number" id="teamCount" value="4" min="1" max="20" class="w-[80px] h-[44px] rounded-lg border-brand-border text-[16px] font-bold px-3 text-center focus:border-brand-blue focus:ring-1 focus:ring-brand-blue outline-none">
          <button id="bulkCreateTeamsBtn" class="bg-brand-blue text-white font-bold rounded-lg h-[44px] px-5 hover:bg-blue-600 transition-colors">생성</button>
        </div>
        <p class="text-[12px] text-brand-gray-text">기존 팀은 유지되고 새 팀이 추가됩니다.</p>
      </div>

      ${playerArr.length > 0 ? `
        <div class="bento-card mb-6">
          <h2 class="font-bold text-[18px] mb-2">참가자 팀 배치</h2>
          <p class="text-[13px] text-brand-gray-text mb-4">참가자를 다른 팀으로 이동할 수 있습니다</p>
          <div class="overflow-x-auto">
            <table class="w-full text-left">
              <thead><tr class="border-b border-brand-border/50 text-[13px] text-brand-gray-text"><th class="py-3 px-4">이름</th><th class="py-3 px-4">현재 팀</th><th class="py-3 px-4 text-right">변경</th></tr></thead>
              <tbody class="divide-y divide-brand-border/30">
                ${playerArr.map(p => {
                  const team = teamArr.find(t => t.id === p.teamId);
                  const colors = ['brand-blue', 'brand-green', 'brand-orange', 'brand-purple'];
                  const teamIdx = teamArr.findIndex(t => t.id === p.teamId);
                  const color = colors[teamIdx % colors.length] || 'brand-gray-text';
                  return `<tr class="hover:bg-surface-container-low/50">
                    <td class="py-3 px-4 font-medium">${p.name}</td>
                    <td class="py-3 px-4">${team ? `<span class="bg-${color}/10 text-${color} px-2.5 py-1 rounded-full text-[12px] font-bold">${team.name}</span>` : '<span class="bg-brand-red-light text-brand-red px-2.5 py-1 rounded-full text-[12px] font-bold">미배정</span>'}</td>
                    <td class="py-3 px-4 text-right">
                      <select class="reassign-team h-9 rounded-lg border-brand-border text-[13px] py-0 pl-3 pr-8 cursor-pointer focus:border-brand-blue" data-player-id="${p.id}">
                        <option value="">이동</option>
                        ${teamArr.map(t => `<option value="${t.id}" ${t.id === p.teamId ? 'disabled' : ''}>${t.name}</option>`).join('')}
                      </select>
                    </td>
                  </tr>`;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>
      ` : ''}

      ${teamArr.length > 0 ? `
        <div class="flex items-center justify-between mb-4">
          <h2 class="font-bold text-[18px]">팀 현황</h2>
          <button id="deleteAllTeamsBtn" class="text-brand-red text-[13px] font-medium hover:underline">전체 팀 삭제</button>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          ${teamArr.map((team, idx) => {
            const members = playerArr.filter(p => p.teamId === team.id);
            const colors = ['brand-blue', 'brand-green', 'brand-orange', 'brand-purple'];
            const color = colors[idx % colors.length];
            return `
              <div class="bento-card border-l-4 border-l-${color}">
                <div class="flex items-center justify-between mb-3">
                  <h3 class="font-bold text-[16px]">${team.name}</h3>
                  <div class="flex items-center gap-3">
                    <span class="text-brand-gray-text text-[13px]">${members.length}명</span>
                    <button class="delete-team text-brand-gray-text hover:text-brand-red transition-colors" data-team-id="${team.id}" data-team-name="${team.name}" title="팀 삭제">
                      <span class="material-symbols-outlined text-[20px]">delete</span>
                    </button>
                  </div>
                </div>
                <div class="flex flex-wrap gap-2">
                  ${members.length > 0 ? members.map(m => `<span class="bg-brand-gray-light text-brand-gray-dark rounded-full px-3 py-1 text-[13px] font-medium">${m.name}</span>`).join('') : '<span class="text-brand-gray-text/70 text-[13px] italic">배정된 팀원 없음</span>'}
                </div>
              </div>
            `;
          }).join('')}
        </div>
      ` : '<div class="bento-card text-center py-12 text-brand-gray-text">팀을 추가해 주세요</div>'}
    `;
  }

  function bindTeamEvents() {
    document.getElementById('bulkCreateTeamsBtn')?.addEventListener('click', () => {
      const count = parseInt(document.getElementById('teamCount').value) || 0;
      if (count < 1 || count > 20) { showToast('1~20 사이'); return; }
      // 기존 팀 이름에서 최대 번호를 찾아 이어서 매김
      const teams = sessionData.teams || {};
      let maxNum = 0;
      Object.values(teams).forEach(t => {
        const m = String(t.name || '').match(/(\d+)/);
        if (m) maxNum = Math.max(maxNum, parseInt(m[1]));
      });
      const updates = {};
      for (let i = 1; i <= count; i++) {
        const key = db.ref(`sessions/${sessionId}/teams`).push().key;
        updates[key] = { name: `${maxNum + i}조`, createdAt: Date.now() };
      }
      db.ref(`sessions/${sessionId}/teams`).update(updates).then(() => showToast(`${count}개 팀 생성됨`));
    });
    document.querySelectorAll('.reassign-team').forEach(select => {
      select.addEventListener('change', e => {
        const playerId = e.target.dataset.playerId;
        const newTeamId = e.target.value;
        if (!newTeamId) return;
        db.ref(`sessions/${sessionId}/players/${playerId}/teamId`).set(newTeamId).then(() => showToast('팀 변경됨'));
      });
    });

    // 개별 팀 삭제
    document.querySelectorAll('.delete-team').forEach(btn => {
      btn.addEventListener('click', () => {
        const teamId = btn.dataset.teamId;
        const teamName = btn.dataset.teamName;
        const players = sessionData.players || {};
        const memberCount = Object.values(players).filter(p => p.teamId === teamId).length;

        const msg = memberCount > 0
          ? `${teamName}을(를) 삭제하시겠습니까?\n소속 참가자 ${memberCount}명은 '미배정' 상태가 됩니다.`
          : `${teamName}을(를) 삭제하시겠습니까?`;
        if (!confirm(msg)) return;

        const updates = {};
        // 소속 참가자 미배정 처리
        Object.entries(players).forEach(([pid, p]) => {
          if (p.teamId === teamId) {
            updates[`sessions/${sessionId}/players/${pid}/teamId`] = '';
          }
        });
        // 팀 삭제
        updates[`sessions/${sessionId}/teams/${teamId}`] = null;

        db.ref().update(updates).then(() => showToast(`${teamName} 삭제됨`));
      });
    });

    // 전체 팀 삭제
    document.getElementById('deleteAllTeamsBtn')?.addEventListener('click', () => {
      const teams = sessionData.teams || {};
      const teamCount = Object.keys(teams).length;
      if (teamCount === 0) return;
      if (!confirm(`전체 팀 ${teamCount}개를 모두 삭제하시겠습니까?\n모든 참가자가 '미배정' 상태가 됩니다.`)) return;

      const players = sessionData.players || {};
      const updates = {};
      Object.keys(players).forEach(pid => {
        updates[`sessions/${sessionId}/players/${pid}/teamId`] = '';
      });
      updates[`sessions/${sessionId}/teams`] = null;

      db.ref().update(updates).then(() => showToast('전체 팀 삭제됨'));
    });
  }

  // ===== RANKING =====
  function renderRanking(teamArr, playerArr, investments, bucketRecords, finalCash, eventAdjustments) {
    const settled = investments.filter(i => i.result && i.result !== 'pending');
    const playerStats = playerArr.map(p => {
      const myInv = investments.filter(i => i.playerId === p.id);
      const mySettled = myInv.filter(i => i.result && i.result !== 'pending');
      const bucketHistory = Object.values((bucketRecords || {})[p.id] || {});
      const finalCashRecord = (finalCash || {})[p.id];
      const eventAdjustmentTotal = (eventAdjustments || []).filter(adjustment => adjustment.playerId === p.id)
        .reduce((sum, adjustment) => sum + (Number(adjustment.amount) || 0), 0);
      const totalProfit = mySettled.reduce((s, i) => s + (i.profitAmount || 0), 0);
      const totalLoss = mySettled.reduce((s, i) => s + (i.lossAmount || 0), 0) + eventAdjustmentTotal;
      return {
        ...p, investCount: myInv.length, netProfit: totalProfit + totalLoss, totalLoss,
        totalAmount: myInv.reduce((s, i) => s + (i.amount || 0), 0),
        bucketCount: bucketHistory.reduce((sum, record) => sum + (Number(record.bucketCount) || 0), 0),
        satisfactionScore: bucketHistory.reduce((sum, record) => sum + (Number(record.bucketScore) || 0), 0),
        hasFinalCash: Boolean(finalCashRecord),
        finalCash: Number(finalCashRecord?.amount) || 0,
        hasDiscardedTime: finalCashRecord?.discardedTimeCount !== undefined,
        discardedTimeCount: Number(finalCashRecord?.discardedTimeCount) || 0,
      };
    });
    const ranked = [...playerStats].sort((a, b) => b.netProfit - a.netProfit);
    const totalBucketCount = playerStats.reduce((sum, player) => sum + player.bucketCount, 0);
    const totalSatisfactionScore = playerStats.reduce((sum, player) => sum + player.satisfactionScore, 0);
    const totalFinalCash = playerStats.reduce((sum, player) => sum + player.finalCash, 0);
    const playersWithFinalCash = playerStats.filter(player => player.hasFinalCash).length;
    const totalDiscardedTimeCount = playerStats.reduce((sum, player) => sum + player.discardedTimeCount, 0);
    const playersWithDiscardedTime = playerStats.filter(player => player.hasDiscardedTime).length;
    const medals = ['🥇', '🥈', '🥉'];
    const borderColors = ['border-[#FFD700]', 'border-[#C0C0C0]', 'border-[#CD7F32]'];

    return `
      <h2 class="font-bold text-[20px] mb-4">📌 버킷·만족도·최종 기록 종합</h2>
      <div class="bento-card mb-8 border border-brand-purple/15">
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
          <div class="rounded-xl bg-brand-purple-light/60 p-4"><p class="text-[12px] text-brand-gray-dark">전체 버킷 개수</p><p class="mt-1 text-[26px] font-bold">${totalBucketCount.toLocaleString('ko-KR')}<span class="ml-1 text-[13px] font-medium text-brand-gray-text">개</span></p></div>
          <div class="rounded-xl bg-brand-purple-light/60 p-4"><p class="text-[12px] text-brand-gray-dark">전체 만족도 점수</p><p class="mt-1 text-[26px] font-bold">${totalSatisfactionScore.toLocaleString('ko-KR')}<span class="ml-1 text-[13px] font-medium text-brand-gray-text">점</span></p></div>
          <div class="rounded-xl bg-brand-blue-light p-4"><p class="text-[12px] text-brand-gray-dark">전체 남은 현금 <span class="text-brand-gray-text">${playersWithFinalCash}/${playerStats.length}명</span></p><p class="mt-1 text-[26px] font-bold">${formatAmount(totalFinalCash)}<span class="ml-1 text-[13px] font-medium text-brand-gray-text">만 원</span></p></div>
          <div class="rounded-xl bg-brand-orange-light p-4"><p class="text-[12px] text-brand-gray-dark">전체 버린 시간 <span class="text-brand-gray-text">${playersWithDiscardedTime}/${playerStats.length}명</span></p><p class="mt-1 text-[26px] font-bold">${totalDiscardedTimeCount.toLocaleString('ko-KR')}<span class="ml-1 text-[13px] font-medium text-brand-gray-text">개</span></p></div>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          ${playerStats.map(player => {
            const teamName = teamArr.find(team => team.id === player.teamId)?.name || '';
            return `
              <div class="flex items-center justify-between rounded-xl border border-outline-variant bg-white p-4">
                <div><div class="flex items-center gap-2"><span class="bg-brand-gray-light text-brand-gray-dark text-[11px] font-bold px-2 py-1 rounded">${teamName}</span><span class="font-medium">${player.name}</span></div></div>
                <div class="grid grid-cols-4 gap-4 text-right"><div><p class="text-[11px] text-brand-gray-text">버킷</p><p class="mt-1 text-[15px] font-bold">${player.bucketCount.toLocaleString('ko-KR')}개</p></div><div><p class="text-[11px] text-brand-gray-text">만족도</p><p class="mt-1 text-[15px] font-bold text-brand-purple">${player.satisfactionScore.toLocaleString('ko-KR')}점</p></div><div><p class="text-[11px] text-brand-gray-text">남은 현금</p><p class="mt-1 text-[15px] font-bold text-brand-blue">${player.hasFinalCash ? `${formatAmount(player.finalCash)}만` : '미입력'}</p></div><div><p class="text-[11px] text-brand-gray-text">버린 시간</p><p class="mt-1 text-[15px] font-bold text-brand-orange">${player.hasDiscardedTime ? `${player.discardedTimeCount}개` : '미입력'}</p></div></div>
              </div>
            `;
          }).join('')}
        </div>
      </div>

      <h2 class="font-bold text-[20px] mb-6">🏆 전체 순수익 랭킹</h2>

      <!-- Podium -->
      ${ranked.length >= 3 ? `
        <div class="grid grid-cols-3 gap-4 mb-8">
          ${[1, 0, 2].map(i => {
            const p = ranked[i];
            if (!p) return '';
            const teamName = teamArr.find(t => t.id === p.teamId)?.name || '';
            const scale = i === 0 ? 'scale-105 z-10 shadow-lg' : i === 2 ? 'translate-y-6' : 'translate-y-3';
            return `
              <div class="bento-card border-t-4 ${borderColors[i]} flex flex-col items-center text-center ${scale} transition-transform">
                <span class="text-[${i === 0 ? '48' : '36'}px] mb-2">${medals[i]}</span>
                <h3 class="font-bold text-[${i === 0 ? '18' : '16'}px]">${p.name}</h3>
                <span class="bg-surface-container-high text-on-surface-variant px-2 py-0.5 rounded text-[11px] mt-1 mb-3">${teamName}</span>
                <div class="text-brand-green font-bold text-[${i === 0 ? '28' : '24'}px]">${p.netProfit >= 0 ? '+' : ''}${formatAmount(p.netProfit)}<span class="text-brand-gray-text text-[13px] font-normal ml-1">만 원</span></div>
              </div>
            `;
          }).join('')}
        </div>
      ` : ''}

      <!-- Table -->
      ${ranked.length > 3 ? `
        <div class="bento-card mb-8">
          <div class="overflow-x-auto">
            <table class="w-full text-left">
              <thead><tr class="border-b border-outline-variant text-[13px] text-brand-gray-text"><th class="p-3 w-16 text-center">#</th><th class="p-3">이름</th><th class="p-3">팀</th><th class="p-3 text-center">투자 횟수</th><th class="p-3 text-right">순수익</th></tr></thead>
              <tbody class="divide-y divide-outline-variant/50">
                ${ranked.slice(3).map((p, i) => {
                  const teamName = teamArr.find(t => t.id === p.teamId)?.name || '';
                  return `<tr class="hover:bg-surface-container-low/50"><td class="p-3 text-center text-outline">${i + 4}</td><td class="p-3 font-medium">${p.name}</td><td class="p-3"><span class="bg-surface-container-high text-on-surface-variant px-2 py-1 rounded text-[12px]">${teamName}</span></td><td class="p-3 text-center">${p.investCount}회</td><td class="p-3 text-right font-bold ${p.netProfit >= 0 ? 'text-brand-green' : 'text-brand-red'}">${p.netProfit >= 0 ? '+' : ''}${formatAmount(p.netProfit)}</td></tr>`;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>
      ` : ''}

      <!-- Team Awards -->
      <h2 class="font-bold text-[20px] mb-4 mt-8">🏅 팀 내 1위</h2>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        ${teamArr.map((team, idx) => {
          const members = playerStats.filter(p => p.teamId === team.id);
          if (members.length === 0) return '';
          const byNet = [...members].sort((a, b) => b.netProfit - a.netProfit);
          const byCount = [...members].sort((a, b) => b.investCount - a.investCount);
          const byLoss = [...members].sort((a, b) => a.totalLoss - b.totalLoss);
          const byAmount = [...members].sort((a, b) => b.totalAmount - a.totalAmount);
          const colors = ['brand-blue', 'brand-green', 'brand-orange', 'brand-purple'];
          const color = colors[idx % colors.length];
          return `
            <div class="bento-card border-l-4 border-l-${color}">
              <div class="flex items-center gap-2 mb-4 pb-3 border-b border-outline-variant/30">
                <span class="material-symbols-outlined text-${color}">groups</span>
                <h3 class="font-bold">${team.name}</h3>
              </div>
              <ul class="space-y-2 text-[14px]">
                <li class="flex justify-between"><span class="text-outline">순수익 1위</span><span class="font-medium">${byNet[0]?.name || '-'} <span class="text-brand-green ml-1">(${byNet[0]?.netProfit >= 0 ? '+' : ''}${formatAmount(byNet[0]?.netProfit || 0)})</span></span></li>
                <li class="flex justify-between"><span class="text-outline">투자횟수 1위</span><span class="font-medium">${byCount[0]?.name || '-'} <span class="text-brand-blue ml-1">(${byCount[0]?.investCount || 0}회)</span></span></li>
                <li class="flex justify-between"><span class="text-outline">손실 1위</span><span class="font-medium">${byLoss[0]?.name || '-'} <span class="text-brand-red ml-1">(${formatAmount(byLoss[0]?.totalLoss || 0)})</span></span></li>
                <li class="flex justify-between"><span class="text-outline">투자액 1위</span><span class="font-medium">${byAmount[0]?.name || '-'} <span class="text-on-surface-variant ml-1">(${formatAmount(byAmount[0]?.totalAmount || 0)}만)</span></span></li>
              </ul>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  // ===== TURN MANAGEMENT =====
  let autoTurnTimer = null;
  let autoTurnSeconds = 10;

  function startAutoTurnCountdown() {
    stopAutoTurnCountdown();
    autoTurnSeconds = 10;
    const el = document.getElementById('autoTurnCountdown');
    if (el) {
      el.classList.remove('hidden');
      el.textContent = `${autoTurnSeconds}초 후 다음 턴`;
    }
    autoTurnTimer = setInterval(() => {
      autoTurnSeconds--;
      const el = document.getElementById('autoTurnCountdown');
      if (el) el.textContent = `${autoTurnSeconds}초 후 다음 턴`;
      if (autoTurnSeconds <= 0) {
        stopAutoTurnCountdown();
        nextTurn();
      }
    }, 1000);
  }

  function stopAutoTurnCountdown() {
    if (autoTurnTimer) {
      clearInterval(autoTurnTimer);
      autoTurnTimer = null;
    }
    const el = document.getElementById('autoTurnCountdown');
    if (el) el.classList.add('hidden');
  }

  function nextTurn() {
    const state = sessionData.state || {};
    const currentTurn = state.currentTurn || 1;
    const maxTurns = state.maxTurns || 20;
    if (state.phase === 'investing' && currentTurn % 4 === 0 && currentTurn < maxTurns) {
      db.ref(`sessions/${sessionId}/state`).update({ phase: 'quarterClosing', quarterClosingPeriod: currentTurn / 4 }).then(() => {
        currentTab = 'dashboard';
        showToast(`${currentTurn / 4}년차 분기 마감 기록을 시작합니다.`);
      });
      return;
    }
    const newTurn = (state.currentTurn || 1) + 1;
    const investments = sessionData.investments || {};
    const investArr = Object.entries(investments).map(([id, inv]) => ({ id, ...inv }));
    const willMature = investArr.filter(i => i.maturityTurn <= newTurn && i.result === 'pending');

    if (willMature.length > 0) {
      db.ref(`sessions/${sessionId}/state`).update({ currentTurn: newTurn, phase: 'settling', quarterClosingPeriod: null }).then(() => {
        currentTab = 'maturity';
        showToast(`턴 ${newTurn} — 만기 ${willMature.length}건 정산 필요`);
      });
    } else {
      db.ref(`sessions/${sessionId}/state`).update({ currentTurn: newTurn, phase: 'investing', quarterClosingPeriod: null }).then(() => showToast(`턴 ${newTurn} 시작`));
    }
  }

  function finishSettle() {
    const investments = sessionData.investments || {};
    const investArr = Object.entries(investments).map(([id, inv]) => ({ id, ...inv }));
    const state = sessionData.state || {};
    const remaining = investArr.filter(i => i.maturityTurn <= state.currentTurn && i.result === 'pending');
    if (remaining.length > 0) { showToast(`아직 ${remaining.length}건 정산 남음`); return; }
    db.ref(`sessions/${sessionId}/state`).update({ phase: 'investing' }).then(() => {
      currentTab = 'dashboard';
      showToast('정산 완료. 투자 접수 재개');
    });
  }

  function endGame() {
    if (!confirm('게임을 종료하시겠습니까?\n미만기 투자는 주사위를 굴려 경과 기간 비율로 정산됩니다.')) return;

    // 미만기 투자를 정산 대기 상태로 전환하고, 정산 phase로 변경
    const state = sessionData.state || {};
    db.ref(`sessions/${sessionId}/state`).update({
      phase: 'finalSettling',
      gameEnding: true,
    }).then(() => {
      currentTab = 'maturity';
      showToast('🏁 게임 종료 정산을 시작합니다. 미만기 투자의 주사위를 굴려주세요.');
    });
  }

  function endGameFinalSettle(invId, diceValue, investments) {
    const inv = investments.find(i => i.id === invId);
    if (!inv) return;
    const product = getProductById(inv.productId);
    if (!product) return;

    const state = sessionData.state || {};
    const result = judgeResult(product, diceValue);
    const settlementFactor = getFinalSettlementFactor(inv.turn, state.currentTurn);
    const calc = calculateFinalSettlement(inv.amount, product, result, settlementFactor);

    db.ref(`sessions/${sessionId}/investments/${invId}`).update({
      diceValue, result: result === 'success' ? 'earlyTerm' : result === 'fail' ? 'earlyTermFail' : 'preserve',
      profitAmount: calc.profitAmount, lossAmount: calc.lossAmount, preserveAmount: calc.preserveAmount,
      finalSettlementFactor: settlementFactor,
      settledAt: Date.now(), settledBy: 'gameEnd',
    }).then(() => {
      const resultText = result === 'success' ? `중도해약 수익 +${formatAmount(calc.profitAmount)}` :
                         result === 'fail' ? `중도해약 손실 ${formatAmount(calc.lossAmount)}` : '원금보존';
      showToast(`${inv.playerName}: ${resultText} (주사위 ${diceValue})`);

      // 모든 미만기 정산 완료됐는지 체크
      checkFinalSettleComplete();
    });
  }

  function checkFinalSettleComplete() {
    const investments = sessionData.investments || {};
    const investArr = Object.entries(investments).map(([id, inv]) => ({ id, ...inv }));
    const remaining = investArr.filter(i => i.result === 'pending');
    if (remaining.length === 0) {
      db.ref(`sessions/${sessionId}/state`).update({
        gameEnded: true, phase: 'ended', endedAt: Date.now(), gameEnding: false,
      }).then(() => {
        currentTab = 'ranking';
        showToast('🏁 전체 정산 완료! 최종 산출을 확인하세요.');
      });
    }
  }

  document.addEventListener('DOMContentLoaded', init);
  return { init };
})();
