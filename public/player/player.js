/**
 * 참가자 뷰 (Stitch 디자인 적용)
 */
const PlayerApp = (() => {
  let sessionId = null;
  let playerId = null;
  let playerName = '';
  let playerTeam = '';
  let currentTurn = 0;

  function init() {
    const params = new URLSearchParams(window.location.search);
    sessionId = params.get('session');
    const savedSession = localStorage.getItem('mylife_session_id');
    const savedPlayer = localStorage.getItem('mylife_player_id');
    const savedTeam = localStorage.getItem('mylife_player_team');

    if (sessionId && savedPlayer && savedTeam && savedSession === sessionId) {
      playerId = savedPlayer;
      playerName = localStorage.getItem('mylife_player_name') || '';
      playerTeam = savedTeam;
      enterSession();
    } else {
      renderLogin();
    }
  }

  // ===== LOGIN =====
  function renderLogin() {
    if (sessionId) {
      db.ref(`sessions/${sessionId}/teams`).once('value').then(snap => {
        const teams = snap.val() || {};
        renderLoginForm(Object.entries(teams).map(([id, t]) => ({ id, ...t })));
      }).catch(() => renderLoginForm([]));
    } else {
      renderLoginForm([]);
    }
  }

  function renderLoginForm(teams) {
    const showTeams = teams.length > 0;
    document.getElementById('app').innerHTML = `
      <div class="min-h-screen flex flex-col items-center justify-center p-5">
        <main class="w-full max-w-[320px] flex flex-col items-center">
          <header class="text-center mb-8 w-full">
            <h1 class="text-[28px] font-bold text-on-surface tracking-tight">My Life</h1>
            <p class="text-[14px] text-brand-gray-text mt-1">투자 보드게임</p>
          </header>
          <div class="bg-white rounded-2xl p-6 w-full shadow-card">
            <form id="loginForm" class="flex flex-col gap-5">
              <div class="flex flex-col gap-2">
                <label class="text-[13px] font-medium text-brand-gray-text">세션 코드</label>
                <input type="text" id="sessionCode" class="custom-input uppercase font-medium text-[16px]"
                  placeholder="진행자가 알려준 코드" value="${sessionId || ''}" ${sessionId ? 'readonly style="background:#F2F4F6;"' : ''}>
              </div>
              <div class="flex flex-col gap-2">
                <label class="text-[13px] font-medium text-brand-gray-text">이름</label>
                <input type="text" id="playerNameInput" class="custom-input font-medium text-[16px]"
                  placeholder="본인 이름 입력" value="${playerName}">
              </div>
              <div class="flex flex-col gap-2" id="teamSelectGroup" ${!showTeams ? 'style="display:none"' : ''}>
                <label class="text-[13px] font-medium text-brand-gray-text">팀 선택</label>
                <select id="teamSelect" class="custom-input custom-select font-medium text-[16px]">
                  <option value="" disabled selected>팀을 선택하세요</option>
                  ${teams.map(t => `<option value="${t.id}">${t.name}</option>`).join('')}
                </select>
              </div>
              <button type="submit" class="w-full h-[52px] bg-brand-blue text-white font-bold text-[16px] rounded-xl mt-2 hover:opacity-90 active:scale-[0.98] transition-all">
                입장
              </button>
            </form>
          </div>
          <footer class="mt-8 text-center">
            <p class="text-[12px] text-outline-variant">© My Life 투자 보드게임</p>
          </footer>
        </main>
      </div>
    `;

    document.getElementById('sessionCode').addEventListener('blur', e => {
      const code = e.target.value.trim().toUpperCase();
      if (code && code !== sessionId) {
        sessionId = code;
        db.ref(`sessions/${code}/teams`).once('value').then(snap => {
          const teams = snap.val() || {};
          const arr = Object.entries(teams).map(([id, t]) => ({ id, ...t }));
          if (arr.length > 0) {
            document.getElementById('teamSelectGroup').style.display = 'flex';
            document.getElementById('teamSelect').innerHTML = '<option value="" disabled selected>팀을 선택하세요</option>' +
              arr.map(t => `<option value="${t.id}">${t.name}</option>`).join('');
          }
        });
      }
    });

    document.getElementById('loginForm').addEventListener('submit', e => {
      e.preventDefault();
      joinSession();
    });
  }

  function joinSession() {
    const code = document.getElementById('sessionCode').value.trim().toUpperCase();
    const name = document.getElementById('playerNameInput').value.trim();
    const teamId = document.getElementById('teamSelect').value;

    if (!code) { showToast('세션 코드를 입력해 주세요'); return; }
    if (!name) { showToast('이름을 입력해 주세요'); return; }
    if (!teamId) { showToast('팀을 선택해 주세요'); return; }

    sessionId = code;
    playerName = name;
    playerTeam = teamId;

    db.ref(`sessions/${sessionId}`).once('value').then(snap => {
      if (!snap.exists()) { showToast('존재하지 않는 세션입니다'); return; }
      db.ref(`sessions/${sessionId}/players`).once('value').then(playersSnap => {
        const players = playersSnap.val() || {};
        let existingId = null;
        Object.entries(players).forEach(([id, p]) => {
          if (p.name === playerName && p.teamId === teamId) existingId = id;
        });
        if (existingId) {
          playerId = existingId;
        } else {
          const newRef = db.ref(`sessions/${sessionId}/players`).push();
          playerId = newRef.key;
          newRef.set({ name: playerName, teamId, joinedAt: Date.now() });
        }
        localStorage.setItem('mylife_player_id', playerId);
        localStorage.setItem('mylife_player_name', playerName);
        localStorage.setItem('mylife_player_team', playerTeam);
        localStorage.setItem('mylife_session_id', sessionId);
        enterSession();
      });
    }).catch(() => showToast('연결 실패'));
  }

  // ===== SESSION =====
  function enterSession() {
    db.ref(`sessions/${sessionId}/state`).on('value', snap => {
      const state = snap.val() || {};
      currentTurn = state.currentTurn || 1;
      renderMain(state.phase || 'investing');
    });
    db.ref(`sessions/${sessionId}/investments`).on('value', () => {
      db.ref(`sessions/${sessionId}/state`).once('value').then(snap => {
        const state = snap.val() || {};
        currentTurn = state.currentTurn || 1;
        renderMain(state.phase || 'investing');
      });
    });
  }

  // ===== MAIN RENDER =====
  function renderMain(phase) {
    db.ref(`sessions/${sessionId}/investments`).orderByChild('playerId').equalTo(playerId).once('value').then(snap => {
      const investments = [];
      snap.forEach(child => investments.push({ id: child.key, ...child.val() }));

      const myMatured = investments.filter(inv => inv.maturityTurn <= currentTurn && inv.result === 'pending');
      const active = investments.filter(inv => inv.result === 'pending');
      const settled = investments.filter(inv => inv.result && inv.result !== 'pending');
      const totalProfit = settled.reduce((s, i) => s + (i.profitAmount || 0), 0);
      const totalLoss = settled.reduce((s, i) => s + (i.lossAmount || 0), 0);
      const netResult = totalProfit + totalLoss;

      document.getElementById('app').innerHTML = `
        <div class="w-full max-w-[390px] mx-auto min-h-screen bg-background relative">
          <!-- Header -->
          <header class="sticky top-0 w-full z-50 bg-brand-blue h-[56px] flex items-center justify-between px-4 shadow-sm">
            <h1 class="text-white font-bold text-[17px]">My Life 투자</h1>
            <span class="text-white font-medium text-[14px]">${playerName}</span>
          </header>

          <!-- Status Strip -->
          <div class="bg-white h-[44px] flex items-center justify-between px-4 shadow-[0_2px_8px_rgba(0,0,0,0.02)]">
            <div class="bg-brand-blue text-white text-xs font-bold rounded-full px-3 py-1">턴 ${currentTurn}</div>
            <span class="text-brand-gray-text text-sm font-medium">${phase === 'investing' ? '투자 접수 중' : '결과 정산 중'}</span>
          </div>

          <!-- Content -->
          <main class="p-4 pb-20 space-y-4">
            ${myMatured.length > 0 ? renderDiceSection(myMatured) : ''}
            ${phase === 'investing' ? renderInvestForm() : ''}
            ${renderStats(investments.length, active.length, totalProfit, totalLoss)}
            ${active.length > 0 ? renderActiveInvestments(active) : ''}
            ${settled.length > 0 ? renderSettledInvestments(settled, netResult) : ''}
          </main>
        </div>
      `;

      if (phase === 'investing') bindInvestForm();
      if (myMatured.length > 0) bindDice(myMatured);
      if (settled.length > 0) bindShareResult();
    });
  }

  // ===== INVEST FORM =====
  function renderInvestForm() {
    return `
      <div class="bg-white rounded-2xl p-4 shadow-card">
        <h2 class="font-bold text-[16px] text-on-surface mb-3">투자할 상품을 선택하세요</h2>
        <div class="grid grid-cols-2 gap-3 mb-4" id="productGrid">
          ${PRODUCTS.map(p => `
            <button class="product-card bg-white rounded-xl p-4 flex flex-col justify-between text-left h-[180px] shadow-card border-2 border-transparent" data-id="${p.id}">
              <div>
                <h3 class="font-bold text-[15px] text-on-surface leading-tight">${p.name}</h3>
                <p class="text-[12px] text-on-surface-variant mt-1">${p.description}</p>
              </div>
              <div>
                <div class="flex flex-wrap gap-1 mb-2">
                  <span class="bg-brand-green-light text-brand-green text-[11px] font-bold px-2 py-0.5 rounded-full">+${(p.profitRate*100).toFixed(0)}%</span>
                  ${p.lossRate < 0 ? `<span class="bg-brand-red-light text-brand-red text-[11px] font-bold px-2 py-0.5 rounded-full">${(p.lossRate*100).toFixed(0)}%</span>` : ''}
                </div>
                <div class="text-[10px] text-on-surface-variant font-medium">
                  성공 <span class="text-brand-green font-bold">${p.profitDice.join(',')}</span>
                  ${p.preserveDice.length ? ` · 보존 <span class="text-brand-purple font-bold">${p.preserveDice.join(',')}</span>` : ''}
                  ${p.lossDice.length ? ` · 실패 <span class="text-brand-red font-bold">${p.lossDice.join(',')}</span>` : ''}
                </div>
                <div class="text-[11px] text-outline mt-2 pt-2 border-t border-surface-variant">최소 ${formatAmount(p.minAmount)}만 원</div>
              </div>
            </button>
          `).join('')}
        </div>

        <div id="amountSection" class="hidden">
          <div class="bg-white rounded-xl p-5 shadow-card border border-outline-variant/30 mb-4">
            <label class="block text-[13px] font-medium text-on-surface-variant mb-2">투자 금액</label>
            <div class="flex items-center justify-end border-b-2 border-brand-blue pb-2 mb-2">
              <input type="tel" id="amountInput" class="text-right text-[28px] font-bold text-on-surface border-none bg-transparent focus:ring-0 p-0 w-full" placeholder="0" inputmode="numeric">
              <span class="text-[14px] font-medium text-on-surface-variant ml-2 whitespace-nowrap">만 원</span>
            </div>
            <p class="text-[12px] text-brand-gray-text text-right" id="amountMinText">최소 500만 원</p>
          </div>
          <div class="flex flex-col gap-3">
            <button id="submitInvestBtn" class="w-full bg-brand-blue text-white h-[52px] rounded-xl font-bold text-[16px] active:scale-[0.98] transition-transform">투자하기</button>
            <button id="skipInvestBtn" class="w-full bg-brand-gray-light text-brand-gray-dark h-[44px] rounded-xl font-medium text-[15px] active:scale-[0.98] transition-transform">이번 턴 투자 안 함</button>
          </div>
        </div>
        <div id="skipOnlySection" class="mt-3">
          <button id="skipInvestBtn2" class="w-full bg-brand-gray-light text-brand-gray-dark h-[44px] rounded-xl font-medium text-[15px] active:scale-[0.98] transition-transform">이번 턴 투자 안 함</button>
        </div>
      </div>
    `;
  }

  function bindInvestForm() {
    let selectedProduct = null;

    document.getElementById('productGrid').addEventListener('click', e => {
      const card = e.target.closest('.product-card');
      if (!card) return;
      document.querySelectorAll('.product-card').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      selectedProduct = getProductById(card.dataset.id);
      document.getElementById('amountSection').classList.remove('hidden');
      document.getElementById('skipOnlySection').classList.add('hidden');
      document.getElementById('amountMinText').textContent = `최소 ${formatAmount(selectedProduct.minAmount)}만 원`;
      document.getElementById('amountInput').focus();
    });

    const amountInput = document.getElementById('amountInput');
    if (amountInput) {
      amountInput.addEventListener('input', e => {
        const raw = e.target.value.replace(/[^0-9]/g, '');
        e.target.value = raw ? parseInt(raw).toLocaleString('ko-KR') : '';
      });
    }

    const submitBtn = document.getElementById('submitInvestBtn');
    if (submitBtn) {
      submitBtn.addEventListener('click', () => {
        if (!selectedProduct) { showToast('상품을 선택해 주세요'); return; }
        const raw = amountInput.value.replace(/[^0-9]/g, '');
        const amount = parseInt(raw) || 0;
        if (amount < selectedProduct.minAmount) {
          showToast(`최소 ${formatAmount(selectedProduct.minAmount)}만 원 이상`); return;
        }
        const investment = {
          playerId, playerName, teamId: playerTeam, turn: currentTurn,
          productId: selectedProduct.id, productName: selectedProduct.name, amount,
          profitRate: selectedProduct.profitRate, lossRate: selectedProduct.lossRate,
          maturityTurn: currentTurn + MATURITY_TURNS, status: 'active', result: 'pending',
          profitAmount: 0, lossAmount: 0, preserveAmount: 0, createdAt: Date.now(),
        };
        db.ref(`sessions/${sessionId}/investments`).push(investment).then(() => showToast('투자 완료!'));
      });
    }

    // Skip buttons
    ['skipInvestBtn', 'skipInvestBtn2'].forEach(id => {
      const btn = document.getElementById(id);
      if (btn) {
        btn.addEventListener('click', () => {
          db.ref(`sessions/${sessionId}/skips/${currentTurn}_${playerId}`).set({
            playerId, playerName, teamId: playerTeam, turn: currentTurn, createdAt: Date.now(),
          }).then(() => showToast('이번 턴은 투자하지 않습니다'));
        });
      }
    });
  }

  // ===== DICE SECTION =====
  function renderDiceSection(matured) {
    return `
      <div class="bg-[#FFFBF5] rounded-2xl p-5 shadow-card border-l-4 border-brand-orange space-y-4">
        <h2 class="font-bold text-[16px] text-on-surface flex items-center gap-2">
          <span class="text-[20px]">🎲</span> 만기 도래! 주사위를 굴려주세요
        </h2>
        ${matured.map((inv, idx) => {
          const product = getProductById(inv.productId);
          return `
            ${idx > 0 ? '<hr class="border-outline-variant/30">' : ''}
            <div class="space-y-3" data-matured-id="${inv.id}">
              <div class="flex justify-between items-center">
                <div class="flex items-center gap-2">
                  <span class="font-bold text-[15px]">${inv.productName}</span>
                  <span class="bg-surface-variant text-on-surface-variant px-2 py-0.5 rounded-md text-[11px]">턴${inv.turn}→${inv.maturityTurn}</span>
                </div>
                <span class="font-bold text-[15px]">${formatAmount(inv.amount)}만 원</span>
              </div>
              <div class="flex gap-3 text-[12px] font-medium">
                <span class="text-brand-green">성공 ${product.profitDice.join(',')}</span>
                ${product.preserveDice.length ? `<span class="text-brand-purple">보존 ${product.preserveDice.join(',')}</span>` : ''}
                ${product.lossDice.length ? `<span class="text-brand-red">실패 ${product.lossDice.join(',')}</span>` : ''}
              </div>
              <div class="flex justify-between">
                ${[1,2,3,4,5,6].map(d => {
                  let borderColor = '#E5E8EB', textColor = '#4E5968';
                  if (product.profitDice.includes(d)) { borderColor = '#00C48C'; textColor = '#00C48C'; }
                  else if (product.preserveDice.includes(d)) { borderColor = '#8B5CF6'; textColor = '#8B5CF6'; }
                  else if (product.lossDice.includes(d)) { borderColor = '#FF4D4D'; textColor = '#FF4D4D'; }
                  return `<button class="dice-btn w-[48px] h-[48px] rounded-xl bg-white font-bold text-lg flex items-center justify-center shadow-sm border-[1.5px]"
                    style="border-color:${borderColor}; color:${textColor};"
                    data-dice="${d}" data-inv-id="${inv.id}" data-color="${borderColor}">${d}</button>`;
                }).join('')}
              </div>
              <button class="roll-random-btn w-full h-[44px] bg-brand-orange text-white rounded-xl font-bold text-[14px] active:scale-[0.98] transition-transform flex items-center justify-center gap-2" data-inv-id="${inv.id}">
                🎲 주사위 굴리기
              </button>
              <div class="dice-roll-result w-[56px] h-[56px] rounded-xl bg-surface-container-high flex items-center justify-center text-[28px] font-bold mx-auto transition-transform" data-roll-inv-id="${inv.id}" style="display:none;"></div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  function bindDice(matured) {
    document.querySelectorAll('.dice-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const invId = btn.dataset.invId;
        const dice = parseInt(btn.dataset.dice);
        submitDiceResult(invId, dice, matured);
      });
    });

    // 랜덤 굴리기 버튼
    document.querySelectorAll('.roll-random-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const invId = btn.dataset.invId;
        const displayEl = document.querySelector(`.dice-roll-result[data-roll-inv-id="${invId}"]`);
        displayEl.style.display = 'flex';
        btn.disabled = true;
        btn.textContent = '굴리는 중...';

        rollDiceWithAnimation(displayEl, (finalValue) => {
          btn.disabled = false;
          btn.innerHTML = '🎲 주사위 굴리기';
          // 잠시 후 자동 제출
          setTimeout(() => submitDiceResult(invId, finalValue, matured), 500);
        });
      });
    });
  }

  function submitDiceResult(invId, dice, matured) {
    const inv = matured.find(i => i.id === invId);
    if (!inv) return;
    const product = getProductById(inv.productId);
    if (!product) return;
    const result = judgeResult(product, dice);
    const calc = calculateResult(inv.amount, product, result);
    db.ref(`sessions/${sessionId}/investments/${invId}`).update({
      diceValue: dice, result,
      profitAmount: calc.profitAmount, lossAmount: calc.lossAmount, preserveAmount: calc.preserveAmount,
      settledAt: Date.now(),
    }).then(() => showToast(`${inv.productName}: ${resultLabel(result)} (주사위 ${dice})`));
  }

  // ===== STATS =====
  function renderStats(total, activeCount, totalProfit, totalLoss) {
    if (total === 0) return '';
    return `
      <div class="grid grid-cols-2 gap-3">
        <div class="bg-white rounded-2xl p-5 flex flex-col items-center justify-center shadow-card">
          <div class="text-[32px] font-bold text-on-surface">${total}</div>
          <div class="text-brand-gray-text text-xs mt-1">총 투자</div>
        </div>
        <div class="bg-white rounded-2xl p-5 flex flex-col items-center justify-center shadow-card">
          <div class="text-[32px] font-bold text-brand-orange">${activeCount}</div>
          <div class="text-brand-gray-text text-xs mt-1">진행중</div>
        </div>
        <div class="bg-white rounded-2xl p-5 flex flex-col items-center justify-center shadow-card">
          <div class="text-[24px] font-bold text-brand-green">+${formatAmount(totalProfit)}</div>
          <div class="text-brand-gray-text text-xs mt-1">총 수익</div>
        </div>
        <div class="bg-white rounded-2xl p-5 flex flex-col items-center justify-center shadow-card">
          <div class="text-[24px] font-bold text-brand-red">${formatAmount(totalLoss)}</div>
          <div class="text-brand-gray-text text-xs mt-1">총 손실</div>
        </div>
      </div>
    `;
  }

  // ===== ACTIVE INVESTMENTS =====
  function renderActiveInvestments(active) {
    return `
      <div class="bg-white rounded-2xl p-5 shadow-card">
        <h2 class="font-bold text-[16px] text-on-surface mb-4">📊 진행 중인 투자</h2>
        <div class="space-y-4">
          ${active.map((inv, idx) => `
            <div class="flex justify-between items-center ${idx < active.length - 1 ? 'pb-4 border-b border-brand-gray-light' : ''}">
              <div>
                <div class="font-bold text-[15px] text-on-surface">${inv.productName}</div>
                <div class="text-brand-gray-text text-[12px] mt-0.5">턴 ${inv.turn} → 턴 ${inv.maturityTurn} 만기</div>
              </div>
              <div class="text-right">
                <div class="font-bold text-[15px] text-on-surface">${formatAmount(inv.amount)}만 원</div>
                <div class="text-brand-orange text-[12px] mt-0.5">만기까지 ${Math.max(0, inv.maturityTurn - currentTurn)}턴</div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  // ===== SETTLED INVESTMENTS =====
  function renderSettledInvestments(settled, netResult) {
    return `
      <div class="bg-white rounded-2xl p-5 shadow-card">
        <h2 class="font-bold text-[16px] text-on-surface mb-4">📋 완료된 투자</h2>
        <div class="grid grid-cols-[1fr_2fr_1fr_1fr_1.5fr] gap-2 pb-2 text-[11px] text-brand-gray-text font-medium border-b border-brand-gray-light">
          <div>턴</div><div>상품</div><div class="text-right">금액</div><div class="text-center">결과</div><div class="text-right">수익/손실</div>
        </div>
        <div class="space-y-3 pt-3">
          ${settled.map(inv => {
            const net = (inv.profitAmount || 0) + (inv.lossAmount || 0);
            const display = inv.result === 'preserve' ? formatAmount(inv.preserveAmount) : `${net >= 0 ? '+' : ''}${formatAmount(net)}`;
            const colorCls = inv.result === 'success' ? 'text-brand-green' : inv.result === 'fail' ? 'text-brand-red' : 'text-brand-purple';
            const badgeBg = inv.result === 'success' ? 'bg-brand-green-light text-brand-green' : inv.result === 'fail' ? 'bg-brand-red-light text-brand-red' : 'bg-brand-purple-light text-brand-purple';
            return `
              <div class="grid grid-cols-[1fr_2fr_1fr_1fr_1.5fr] gap-2 items-center text-[13px] border-b border-brand-gray-light pb-3">
                <div class="text-on-surface-variant">턴${inv.turn}</div>
                <div class="font-medium text-on-surface">${inv.productName}</div>
                <div class="text-right font-medium">${formatAmount(inv.amount)}</div>
                <div class="flex justify-center"><span class="${badgeBg} px-2 py-0.5 rounded-full text-[10px] font-bold">${resultLabel(inv.result)}</span>${inv.settledBy === 'worldEvent' ? '<span class="bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full text-[9px] font-bold ml-1">⚡</span>' : ''}</div>
                <div class="text-right font-bold ${colorCls}">${display}</div>
              </div>
            `;
          }).join('')}
        </div>
        <div class="mt-4 pt-4 border-t border-brand-gray-light flex justify-between items-center">
          <div class="font-bold text-[15px] text-on-surface">순수익</div>
          <div class="font-bold text-[20px] ${netResult >= 0 ? 'text-brand-green' : 'text-brand-red'}">${netResult >= 0 ? '+' : ''}${formatAmount(netResult)}만 원</div>
        </div>
        <div class="mt-4 pt-4 border-t border-brand-gray-light">
          <button id="shareResultBtn" class="w-full h-[44px] bg-brand-blue/10 text-brand-blue rounded-xl font-bold text-[14px] active:scale-[0.98] transition-transform">📊 내 결과 공유하기</button>
        </div>
      </div>
    `;
  }

  // ===== 조별 순위 + 결과 공유 =====
  function renderTeamRanking() {
    // 전체 참가자 데이터 가져와서 조별 순위 표시
    return new Promise(resolve => {
      db.ref(`sessions/${sessionId}`).once('value').then(snap => {
        const data = snap.val() || {};
        const players = data.players || {};
        const investments = data.investments || {};
        const teams = data.teams || {};

        const playerArr = Object.entries(players).map(([id, p]) => ({ id, ...p }));
        const investArr = Object.entries(investments).map(([id, inv]) => ({ id, ...inv }));
        const teamArr = Object.entries(teams).map(([id, t]) => ({ id, ...t }));

        // 내 팀 찾기
        const myTeam = teamArr.find(t => t.id === playerTeam);
        const myTeamMembers = playerArr.filter(p => p.teamId === playerTeam);

        // 팀원별 순수익 계산
        const memberStats = myTeamMembers.map(p => {
          const pInv = investArr.filter(i => i.playerId === p.id && i.result && i.result !== 'pending');
          const net = pInv.reduce((s, i) => s + (i.profitAmount || 0) + (i.lossAmount || 0), 0);
          const totalInvested = investArr.filter(i => i.playerId === p.id).reduce((s, i) => s + (i.amount || 0), 0);
          return { ...p, netProfit: net, investCount: investArr.filter(i => i.playerId === p.id).length, totalInvested };
        }).sort((a, b) => b.netProfit - a.netProfit);

        // 내 순위
        const myRank = memberStats.findIndex(m => m.id === playerId) + 1;
        const myStats = memberStats.find(m => m.id === playerId) || { netProfit: 0, investCount: 0, totalInvested: 0 };

        resolve(`
          <div class="bg-white rounded-2xl p-5 shadow-card mt-4">
            <h2 class="font-bold text-[16px] text-on-surface mb-4">🏅 ${myTeam?.name || '우리 팀'} 순위</h2>
            
            <div class="bg-brand-blue/5 rounded-xl p-4 mb-4 text-center">
              <div class="text-brand-gray-text text-[12px]">내 순위</div>
              <div class="text-[28px] font-bold text-brand-blue">${myRank}위</div>
              <div class="text-[13px] text-brand-gray-text">${myTeamMembers.length}명 중</div>
            </div>

            <div class="space-y-2">
              ${memberStats.map((m, idx) => {
                const isMe = m.id === playerId;
                const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx + 1}`;
                return `
                  <div class="flex items-center justify-between p-3 rounded-lg ${isMe ? 'bg-brand-blue/10 border border-brand-blue/30' : 'bg-surface-container-low'}">
                    <div class="flex items-center gap-3">
                      <span class="text-[14px] w-6 text-center">${medal}</span>
                      <span class="font-medium text-[14px] ${isMe ? 'text-brand-blue font-bold' : ''}">${m.name}${isMe ? ' (나)' : ''}</span>
                    </div>
                    <span class="font-bold text-[14px] ${m.netProfit >= 0 ? 'text-brand-green' : 'text-brand-red'}">${m.netProfit >= 0 ? '+' : ''}${formatAmount(m.netProfit)}</span>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        `);
      });
    });
  }

  function bindShareResult() {
    document.getElementById('shareResultBtn')?.addEventListener('click', async () => {
      // 팀 순위 가져와서 모달로 표시
      const rankingHtml = await renderTeamRanking();
      
      // 공유 가능한 결과 카드 생성
      const shareCard = document.createElement('div');
      shareCard.innerHTML = `
        <div style="position:fixed; inset:0; background:rgba(0,0,0,0.5); z-index:9998; display:flex; align-items:center; justify-content:center; padding:16px;" id="shareModal">
          <div style="background:white; border-radius:16px; padding:24px; max-width:360px; width:100%; max-height:90vh; overflow-y:auto;">
            <div class="text-center mb-4">
              <h2 class="font-bold text-[18px]">📊 나의 투자 성적표</h2>
              <p class="text-brand-gray-text text-[13px] mt-1">${playerName} · My Life 투자 보드게임</p>
            </div>
            
            <div class="grid grid-cols-2 gap-3 mb-4">
              <div class="bg-brand-green-light rounded-xl p-3 text-center">
                <div class="text-[20px] font-bold text-brand-green" id="shareProfit"></div>
                <div class="text-[11px] text-brand-gray-text">총 수익</div>
              </div>
              <div class="bg-brand-red-light rounded-xl p-3 text-center">
                <div class="text-[20px] font-bold text-brand-red" id="shareLoss"></div>
                <div class="text-[11px] text-brand-gray-text">총 손실</div>
              </div>
            </div>

            ${rankingHtml}

            <div class="mt-6 space-y-3">
              <button id="copyShareLink" class="w-full h-[44px] bg-brand-blue text-white rounded-xl font-bold text-[14px] active:scale-[0.98] transition-transform">🔗 링크 복사</button>
              <button id="closeShareModal" class="w-full h-[40px] bg-brand-gray-light text-brand-gray-dark rounded-xl font-medium text-[14px]">닫기</button>
            </div>
          </div>
        </div>
      `;
      document.body.appendChild(shareCard);

      // 수치 채우기
      db.ref(`sessions/${sessionId}/investments`).orderByChild('playerId').equalTo(playerId).once('value').then(snap => {
        const invs = [];
        snap.forEach(c => invs.push(c.val()));
        const settled = invs.filter(i => i.result && i.result !== 'pending');
        const profit = settled.reduce((s, i) => s + (i.profitAmount || 0), 0);
        const loss = settled.reduce((s, i) => s + (i.lossAmount || 0), 0);
        const profitEl = document.getElementById('shareProfit');
        const lossEl = document.getElementById('shareLoss');
        if (profitEl) profitEl.textContent = '+' + formatAmount(profit);
        if (lossEl) lossEl.textContent = formatAmount(loss);
      });

      document.getElementById('closeShareModal')?.addEventListener('click', () => shareCard.remove());
      document.getElementById('copyShareLink')?.addEventListener('click', () => {
        const url = `${window.location.origin}/player/?session=${sessionId}`;
        navigator.clipboard.writeText(`${playerName}의 My Life 투자 성적표 🎲\n${url}`).then(() => showToast('링크 복사됨!'));
      });
    });
  }

  document.addEventListener('DOMContentLoaded', init);
  return { init };
})();
