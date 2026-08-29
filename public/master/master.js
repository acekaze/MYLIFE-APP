/**
 * 관리자 뷰 (Stitch 디자인 적용)
 */
const MasterApp = (() => {
  let sessionId = null;
  let sessionData = null;
  let currentTab = 'dashboard';

  function init() {
    sessionId = localStorage.getItem('mylife_master_session');
    if (sessionId) enterSession();
    else renderSessionSelect();
  }

  // ===== SESSION SELECT =====
  function renderSessionSelect() {
    document.getElementById('app').innerHTML = `
      <div class="min-h-screen flex flex-col items-center justify-center p-5 bg-background">
        <main class="w-full max-w-[360px] flex flex-col items-center">
          <header class="text-center mb-8">
            <h1 class="text-[28px] font-bold text-on-surface">My Life</h1>
            <p class="text-[14px] text-brand-gray-text mt-1">관리자</p>
          </header>
          <div class="bg-white rounded-2xl p-6 w-full shadow-card space-y-6">
            <div>
              <h2 class="font-bold text-[16px] mb-4">새 세션 만들기</h2>
              <div class="flex flex-col gap-3">
                <input type="text" id="newSessionName" class="h-[48px] rounded-xl border border-brand-border px-4 text-[16px] focus:border-brand-blue focus:ring-1 focus:ring-brand-blue outline-none" placeholder="세션 이름 (예: 3월 워크숍)">
                <button id="createSessionBtn" class="w-full h-[48px] bg-brand-blue text-white rounded-xl font-bold active:scale-[0.98] transition-transform">세션 생성</button>
              </div>
            </div>
            <hr class="border-brand-gray-light">
            <div>
              <h2 class="font-bold text-[16px] mb-4">기존 세션 입장</h2>
              <div class="flex flex-col gap-3">
                <input type="text" id="existingCode" class="h-[48px] rounded-xl border border-brand-border px-4 text-[16px] uppercase focus:border-brand-blue focus:ring-1 focus:ring-brand-blue outline-none" placeholder="세션 코드 입력">
                <button id="enterSessionBtn" class="w-full h-[48px] bg-brand-gray-light text-brand-gray-dark rounded-xl font-bold active:scale-[0.98] transition-transform">입장</button>
              </div>
            </div>
          </div>
        </main>
      </div>
    `;
    document.getElementById('createSessionBtn').addEventListener('click', createSession);
    document.getElementById('enterSessionBtn').addEventListener('click', () => {
      const code = document.getElementById('existingCode').value.trim().toUpperCase();
      if (!code) { showToast('코드를 입력해 주세요'); return; }
      sessionId = code;
      localStorage.setItem('mylife_master_session', sessionId);
      enterSession();
    });
  }

  function createSession() {
    const name = document.getElementById('newSessionName').value.trim();
    if (!name) { showToast('세션 이름을 입력해 주세요'); return; }
    const code = generateCode();
    sessionId = code;
    db.ref(`sessions/${code}`).set({
      name, code, createdAt: Date.now(),
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
        renderSessionSelect();
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
    const playerCount = Object.keys(players).length;
    const teamCount = Object.keys(teams).length;
    const investArr = Object.entries(investments).map(([id, inv]) => ({ id, ...inv }));

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
            <p class="text-brand-gray-text text-[13px]">Turn ${state.currentTurn} · ${state.phase === 'investing' ? '투자 접수' : '정산 중'}</p>
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
      renderSessionSelect();
    });

    document.querySelectorAll('.nav-item').forEach(item => {
      item.addEventListener('click', () => { currentTab = item.dataset.tab; renderAdmin(); });
    });

    const nextBtn = document.getElementById('nextTurnBtn');
    if (nextBtn) nextBtn.addEventListener('click', nextTurn);
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
      case 'dashboard': container.innerHTML = renderDashboard(state, teamArr, playerArr, investArr, thisTurnDone, pendingMaturity); bindDashboardEvents(state, playerArr, teamArr); break;
      case 'maturity': container.innerHTML = renderMaturity(state, investArr); bindMaturityEvents(investArr); break;
      case 'worldevent': container.innerHTML = renderWorldEvent(investArr); bindWorldEventEvents(investArr); break;
      case 'all': container.innerHTML = renderAllRecords(investArr); break;
      case 'teams': container.innerHTML = renderTeams(teamArr, playerArr); bindTeamEvents(); break;
      case 'ranking': container.innerHTML = renderRanking(teamArr, playerArr, investArr); break;
    }
  }

  // ===== DASHBOARD =====
  function renderDashboard(state, teamArr, playerArr, investArr, thisTurnDone, pendingMaturity) {
    const teamStatus = teamArr.map(team => {
      const members = playerArr.filter(p => p.teamId === team.id);
      const done = members.filter(p => thisTurnDone.has(p.id)).length;
      return { ...team, total: members.length, done, allDone: members.length > 0 && done >= members.length };
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
        <p class="text-brand-gray-text text-[14px] mb-6">이벤트 대상 종목을 선택하고, 대표 주사위를 굴려주세요.<br>해당 종목에 투자 중인 모든 참가자가 즉시 정산됩니다.</p>

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
          <p class="text-brand-gray-text text-[12px] mt-2 text-center">발동하면 선택한 종목의 모든 진행 중 투자가 즉시 정산됩니다.</p>
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
          ${sorted.map(ev => `
            <div class="p-3 rounded-lg bg-surface-container-low">
              <div class="flex justify-between items-center">
                <div>
                  <span class="font-bold text-[14px]">⚡ ${ev.productNames?.join(', ') || ''}</span>
                  <span class="text-brand-gray-text text-[12px] ml-2">턴 ${ev.turn}</span>
                </div>
                <span class="text-brand-gray-text text-[12px]">${ev.affectedCount || 0}명 정산</span>
              </div>
              <div class="text-[12px] text-brand-gray-text mt-1">
                ${ev.results ? ev.results.map(r => `${r.productName}: 주사위 ${r.dice} → ${resultLabel(r.result)}`).join(' | ') : ''}
              </div>
            </div>
          `).join('')}
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

    // 종목 체크박스
    document.querySelectorAll('.world-event-product').forEach(cb => {
      cb.addEventListener('change', () => {
        if (cb.checked) selectedProducts[cb.dataset.productId] = true;
        else delete selectedProducts[cb.dataset.productId];
        
        const hasSelection = Object.keys(selectedProducts).length > 0;
        document.getElementById('worldEventDiceArea').classList.toggle('hidden', !hasSelection);
        document.getElementById('switchToManualBtn').classList.toggle('hidden', !hasSelection);
        document.getElementById('worldEventConfirmBtn').disabled = true;
        finalDice = null;
        document.getElementById('diceDisplay').style.display = 'none';
        document.getElementById('diceResultPreview').classList.add('hidden');
      });
    });

    // 주사위 굴리기 버튼
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
        document.getElementById('worldEventConfirmBtn').disabled = false;
      });
    });

    // 직접 지정 전환
    document.getElementById('switchToManualBtn')?.addEventListener('click', () => {
      document.getElementById('worldEventDiceArea').classList.add('hidden');
      document.getElementById('worldEventManualDice').classList.remove('hidden');
      document.getElementById('switchToManualBtn').classList.add('hidden');
    });

    document.getElementById('switchToRollBtn')?.addEventListener('click', () => {
      document.getElementById('worldEventDiceArea').classList.remove('hidden');
      document.getElementById('worldEventManualDice').classList.add('hidden');
      document.getElementById('switchToManualBtn').classList.remove('hidden');
    });

    // 직접 지정 버튼
    document.querySelectorAll('.manual-dice').forEach(btn => {
      btn.addEventListener('click', () => {
        finalDice = parseInt(btn.dataset.dice);
        document.querySelectorAll('.manual-dice').forEach(b => {
          b.classList.remove('border-brand-blue', 'bg-brand-blue', 'text-white');
          b.classList.add('border-outline-variant');
        });
        btn.classList.remove('border-outline-variant');
        btn.classList.add('border-brand-blue', 'bg-brand-blue', 'text-white');
        
        const display = document.getElementById('diceDisplay');
        display.style.display = 'flex';
        display.textContent = finalDice;

        showDiceResult(finalDice);
        document.getElementById('worldEventConfirmBtn').disabled = false;
      });
    });

    function showDiceResult(dice) {
      const preview = document.getElementById('diceResultPreview');
      const text = document.getElementById('diceResultText');
      const list = document.getElementById('diceAffectedList');
      preview.classList.remove('hidden');

      const pids = Object.keys(selectedProducts);
      let totalAffected = 0;
      let lines = [];

      pids.forEach(pid => {
        const product = getProductById(pid);
        const result = judgeResult(product, dice);
        const count = (byProduct[pid] || []).length;
        totalAffected += count;
        const colorCls = result === 'success' ? 'text-brand-green' : result === 'fail' ? 'text-brand-red' : 'text-brand-purple';
        lines.push(`<div><span class="font-bold">${product.name}</span> → <span class="${colorCls} font-bold">${resultLabel(result)}</span> (${count}명)</div>`);
      });

      text.innerHTML = `주사위 <span class="text-brand-blue text-[28px]">${dice}</span> · ${totalAffected}명 즉시 정산`;
      list.innerHTML = lines.join('');
    }

    // 발동 버튼
    document.getElementById('worldEventConfirmBtn')?.addEventListener('click', () => {
      if (!finalDice) return;
      const pids = Object.keys(selectedProducts);
      if (pids.length === 0) return;

      const state = sessionData.state || {};
      let affectedCount = 0;
      const eventResults = [];
      const updates = {};

      pids.forEach(pid => {
        const product = getProductById(pid);
        if (!product) return;
        const result = judgeResult(product, finalDice);
        const targets = byProduct[pid] || [];

        targets.forEach(inv => {
          const calc = calculateResult(inv.amount, product, result);
          updates[`sessions/${sessionId}/investments/${inv.id}/diceValue`] = finalDice;
          updates[`sessions/${sessionId}/investments/${inv.id}/result`] = result;
          updates[`sessions/${sessionId}/investments/${inv.id}/profitAmount`] = calc.profitAmount;
          updates[`sessions/${sessionId}/investments/${inv.id}/lossAmount`] = calc.lossAmount;
          updates[`sessions/${sessionId}/investments/${inv.id}/preserveAmount`] = calc.preserveAmount;
          updates[`sessions/${sessionId}/investments/${inv.id}/settledAt`] = Date.now();
          updates[`sessions/${sessionId}/investments/${inv.id}/settledBy`] = 'worldEvent';
          affectedCount++;
        });

        eventResults.push({ productId: pid, productName: product.name, dice: finalDice, result });
      });

      const eventKey = db.ref(`sessions/${sessionId}/worldEvents`).push().key;
      updates[`sessions/${sessionId}/worldEvents/${eventKey}`] = {
        turn: state.currentTurn, dice: finalDice,
        productNames: eventResults.map(r => r.productName),
        results: eventResults, affectedCount, createdAt: Date.now(),
      };

      db.ref().update(updates).then(() => {
        showToast(`⚡ 월드 이벤트 발동! 주사위 ${finalDice} · ${affectedCount}건 정산`);
        currentTab = 'worldevent';
      });
    });
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
          <p class="text-brand-gray-text text-[13px] mb-6">${isFinalSettling ? '미만기 투자입니다. 주사위를 굴려주세요. 성공=중도해약 이율 수익, 실패=손실률 절반, 보존=원금.' : '참가자가 직접 입력합니다. 필요 시 대리 정산 가능합니다.'}</p>
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
        <h2 class="font-bold text-[18px] mb-4">팀 현황</h2>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          ${teamArr.map((team, idx) => {
            const members = playerArr.filter(p => p.teamId === team.id);
            const colors = ['brand-blue', 'brand-green', 'brand-orange', 'brand-purple'];
            const color = colors[idx % colors.length];
            return `
              <div class="bento-card border-l-4 border-l-${color}">
                <div class="flex items-center justify-between mb-3">
                  <h3 class="font-bold text-[16px]">${team.name}</h3>
                  <span class="text-brand-gray-text text-[13px]">${members.length}명</span>
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
      const existing = sessionData.teams ? Object.keys(sessionData.teams).length : 0;
      const updates = {};
      for (let i = 1; i <= count; i++) {
        const key = db.ref(`sessions/${sessionId}/teams`).push().key;
        updates[key] = { name: `${existing + i}조`, createdAt: Date.now() };
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
  }

  // ===== RANKING =====
  function renderRanking(teamArr, playerArr, investments) {
    const settled = investments.filter(i => i.result && i.result !== 'pending');
    const playerStats = playerArr.map(p => {
      const myInv = investments.filter(i => i.playerId === p.id);
      const mySettled = myInv.filter(i => i.result && i.result !== 'pending');
      const totalProfit = mySettled.reduce((s, i) => s + (i.profitAmount || 0), 0);
      const totalLoss = mySettled.reduce((s, i) => s + (i.lossAmount || 0), 0);
      return { ...p, investCount: myInv.length, netProfit: totalProfit + totalLoss, totalLoss, totalAmount: myInv.reduce((s, i) => s + (i.amount || 0), 0) };
    });
    const ranked = [...playerStats].sort((a, b) => b.netProfit - a.netProfit);
    const medals = ['🥇', '🥈', '🥉'];
    const borderColors = ['border-[#FFD700]', 'border-[#C0C0C0]', 'border-[#CD7F32]'];

    return `
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
    const newTurn = (state.currentTurn || 1) + 1;
    const investments = sessionData.investments || {};
    const investArr = Object.entries(investments).map(([id, inv]) => ({ id, ...inv }));
    const willMature = investArr.filter(i => i.maturityTurn <= newTurn && i.result === 'pending');

    if (willMature.length > 0) {
      db.ref(`sessions/${sessionId}/state`).update({ currentTurn: newTurn, phase: 'settling' }).then(() => {
        currentTab = 'maturity';
        showToast(`턴 ${newTurn} — 만기 ${willMature.length}건 정산 필요`);
      });
    } else {
      db.ref(`sessions/${sessionId}/state`).update({ currentTurn: newTurn, phase: 'investing' }).then(() => showToast(`턴 ${newTurn} 시작`));
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
    if (!confirm('게임을 종료하시겠습니까?\n미만기 투자는 주사위를 굴려 중도해약 이율로 정산됩니다.')) return;

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

    const result = judgeResult(product, diceValue);
    let calc;
    if (result === 'success') {
      // 중도해약 이율 적용
      calc = { profitAmount: Math.round(inv.amount * product.earlyTermRate), lossAmount: 0, preserveAmount: 0 };
    } else if (result === 'fail') {
      // 원래 손실률의 절반 적용
      calc = { profitAmount: 0, lossAmount: Math.round(inv.amount * (product.lossRate / 2)), preserveAmount: 0 };
    } else {
      calc = { profitAmount: 0, lossAmount: 0, preserveAmount: inv.amount };
    }

    db.ref(`sessions/${sessionId}/investments/${invId}`).update({
      diceValue, result: result === 'success' ? 'earlyTerm' : result === 'fail' ? 'earlyTermFail' : 'preserve',
      profitAmount: calc.profitAmount, lossAmount: calc.lossAmount, preserveAmount: calc.preserveAmount,
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
