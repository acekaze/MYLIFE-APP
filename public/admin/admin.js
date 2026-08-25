/**
 * 관리자 뷰
 * 
 * 기능:
 * 1. 세션 생성/관리
 * 2. 턴 진행 (투자접수 → 다음턴)
 * 3. 만기 도래 투자 목록 → 주사위 굴려서 결과 확정
 * 4. 전체 참가자/투자 현황 조회
 */

const AdminApp = (() => {
  let sessionId = null;
  let sessionData = null;
  let currentTab = 'dashboard';

  function init() {
    sessionId = localStorage.getItem('mylife_admin_session');
    if (sessionId) {
      enterSession();
    } else {
      renderSessionSelect();
    }
  }

  // ===== 세션 선택/생성 =====
  function renderSessionSelect() {
    document.getElementById('app').innerHTML = `
      <div class="entry-screen">
        <h1>My Life<br><small>관리자</small></h1>
        <div class="card" style="width:100%; max-width:360px;">
          <div class="card-title">새 세션 만들기</div>
          <div class="form-group">
            <label class="form-label">세션 이름</label>
            <input type="text" class="form-input" id="newSessionName" placeholder="예: 3월 워크숍">
          </div>
          <button class="btn btn-primary btn-block" id="createSessionBtn">세션 생성</button>
          
          <div class="mt-16">
            <div class="card-title">기존 세션 입장</div>
            <div class="form-group">
              <label class="form-label">세션 코드</label>
              <input type="text" class="form-input" id="existingCode" placeholder="세션 코드 입력" style="text-transform:uppercase">
            </div>
            <button class="btn btn-secondary btn-block" id="enterSessionBtn">입장</button>
          </div>
        </div>
      </div>
    `;

    document.getElementById('createSessionBtn').addEventListener('click', createSession);
    document.getElementById('enterSessionBtn').addEventListener('click', () => {
      const code = document.getElementById('existingCode').value.trim().toUpperCase();
      if (!code) { showToast('코드를 입력해 주세요'); return; }
      sessionId = code;
      localStorage.setItem('mylife_admin_session', sessionId);
      enterSession();
    });
  }

  function createSession() {
    const name = document.getElementById('newSessionName').value.trim();
    if (!name) { showToast('세션 이름을 입력해 주세요'); return; }

    // 6자리 코드 생성
    const code = generateCode();
    sessionId = code;

    const sessionInfo = {
      name: name,
      code: code,
      createdAt: Date.now(),
      state: {
        currentTurn: 1,
        phase: 'investing', // investing | settling
      },
    };

    db.ref(`sessions/${code}`).set(sessionInfo).then(() => {
      localStorage.setItem('mylife_admin_session', sessionId);
      showToast(`세션 생성 완료: ${code}`);
      enterSession();
    }).catch(err => {
      showToast('생성 실패');
      console.error(err);
    });
  }

  function generateCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
    return code;
  }

  // ===== 세션 진입 =====
  function enterSession() {
    db.ref(`sessions/${sessionId}`).on('value', snap => {
      if (!snap.exists()) {
        showToast('세션을 찾을 수 없습니다');
        localStorage.removeItem('mylife_admin_session');
        renderSessionSelect();
        return;
      }
      sessionData = snap.val();
      sessionData.id = sessionId;
      renderAdmin();
    });
  }

  function renderAdmin() {
    const state = sessionData.state || { currentTurn: 1, phase: 'investing' };
    const players = sessionData.players || {};
    const investments = sessionData.investments || {};
    const playerCount = Object.keys(players).length;

    document.getElementById('app').innerHTML = `
      <header class="app-header">
        <div>
          <h1>${sessionData.name}</h1>
          <div class="subtitle">코드: <strong>${sessionId}</strong> | 참가자: ${playerCount}명</div>
        </div>
        <button class="btn btn-sm btn-secondary" id="exitSessionBtn">나가기</button>
      </header>

      <div class="status-bar">
        <span class="turn-badge">턴 ${state.currentTurn}</span>
        <span>${state.phase === 'investing' ? '📝 투자 접수 중' : '🎲 결과 정산 중'}</span>
        <div class="flex gap-8">
          ${state.phase === 'investing' ? 
            `<button class="btn btn-sm btn-warning" id="startSettleBtn">만기 정산</button>
             <button class="btn btn-sm btn-primary" id="nextTurnBtn">다음 턴</button>` :
            `<button class="btn btn-sm btn-primary" id="finishSettleBtn">정산 완료 → 다음 턴</button>`
          }
        </div>
      </div>

      <nav class="tab-nav">
        <button class="tab-btn ${currentTab === 'dashboard' ? 'active' : ''}" data-tab="dashboard">현황</button>
        <button class="tab-btn ${currentTab === 'maturity' ? 'active' : ''}" data-tab="maturity">만기 도래</button>
        <button class="tab-btn ${currentTab === 'all' ? 'active' : ''}" data-tab="all">전체 내역</button>
        <button class="tab-btn ${currentTab === 'players' ? 'active' : ''}" data-tab="players">참가자</button>
      </nav>

      <div id="tabContent"></div>
    `;

    // 이벤트
    document.getElementById('exitSessionBtn').addEventListener('click', () => {
      localStorage.removeItem('mylife_admin_session');
      sessionId = null;
      db.ref(`sessions/${sessionData.id}`).off();
      renderSessionSelect();
    });

    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        currentTab = btn.dataset.tab;
        renderAdmin();
      });
    });

    const nextTurnBtn = document.getElementById('nextTurnBtn');
    if (nextTurnBtn) nextTurnBtn.addEventListener('click', nextTurn);

    const startSettleBtn = document.getElementById('startSettleBtn');
    if (startSettleBtn) startSettleBtn.addEventListener('click', startSettle);

    const finishSettleBtn = document.getElementById('finishSettleBtn');
    if (finishSettleBtn) finishSettleBtn.addEventListener('click', finishSettle);

    renderTabContent(state, players, investments);
  }

  function renderTabContent(state, players, investments) {
    const container = document.getElementById('tabContent');
    const investArr = Object.entries(investments).map(([id, inv]) => ({ id, ...inv }));

    switch (currentTab) {
      case 'dashboard': container.innerHTML = renderDashboard(state, players, investArr); break;
      case 'maturity': container.innerHTML = renderMaturity(state, investArr); bindMaturityEvents(investArr); break;
      case 'all': container.innerHTML = renderAllRecords(investArr, players); break;
      case 'players': container.innerHTML = renderPlayers(players, investArr); break;
    }
  }

  // ===== 현황 탭 =====
  function renderDashboard(state, players, investments) {
    const thisT = investments.filter(i => i.turn === state.currentTurn);
    const settled = investments.filter(i => i.result && i.result !== 'pending');
    const totalProfit = settled.reduce((s, i) => s + (i.profitAmount || 0), 0);
    const totalLoss = settled.reduce((s, i) => s + (i.lossAmount || 0), 0);
    const pendingMaturity = investments.filter(i => i.maturityTurn <= state.currentTurn && i.result === 'pending');

    return `
      <div style="padding:16px;">
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-value">${Object.keys(players).length}</div>
            <div class="stat-label">참가자</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${thisT.length}</div>
            <div class="stat-label">이번 턴 투자</div>
          </div>
          <div class="stat-card">
            <div class="stat-value" style="color:var(--warning)">${pendingMaturity.length}</div>
            <div class="stat-label">만기 대기</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${investments.length}</div>
            <div class="stat-label">총 투자 건</div>
          </div>
          <div class="stat-card">
            <div class="stat-value amount-positive">+${formatAmount(totalProfit)}</div>
            <div class="stat-label">총 수익</div>
          </div>
          <div class="stat-card">
            <div class="stat-value amount-negative">${formatAmount(totalLoss)}</div>
            <div class="stat-label">총 손실</div>
          </div>
        </div>

        <div class="card mt-16">
          <div class="card-title">참가자 접속 URL</div>
          <p style="font-size:13px; color:var(--gray-500); margin-bottom:8px;">참가자에게 이 주소를 공유하세요:</p>
          <div style="background:var(--gray-100); padding:12px; border-radius:var(--radius); font-family:monospace; font-size:13px; word-break:break-all;" id="playerUrl">
            ${window.location.origin}/player/?session=${sessionId}
          </div>
          <button class="btn btn-sm btn-secondary mt-8" id="copyUrlBtn">URL 복사</button>
        </div>
      </div>
    `;
  }

  // ===== 만기 도래 탭 =====
  function renderMaturity(state, investments) {
    const matured = investments.filter(i => i.maturityTurn <= state.currentTurn && i.result === 'pending');

    if (matured.length === 0) {
      return `<div style="padding:40px; text-align:center; color:var(--gray-400);">
        <p>만기 도래한 투자가 없습니다</p>
      </div>`;
    }

    return `
      <div style="padding:16px;">
        <div class="card">
          <div class="flex-between mb-16">
            <div class="card-title" style="margin:0">만기 도래 (${matured.length}건)</div>
            <button class="btn btn-sm btn-success" id="settleAllBtn">전체 주사위 굴리기</button>
          </div>
          
          ${matured.map(inv => {
            const product = getProductById(inv.productId);
            return `
              <div class="card" style="border:1px solid var(--gray-200); box-shadow:none; margin-bottom:12px;" data-inv-id="${inv.id}">
                <div class="flex-between">
                  <div>
                    <strong>${inv.playerName}</strong>
                    <span style="color:var(--gray-500); font-size:13px;">| ${inv.productName} | ${formatAmount(inv.amount)}만 원</span>
                  </div>
                  <span class="badge badge-pending">턴 ${inv.turn} → ${inv.maturityTurn}</span>
                </div>
                <div class="mt-12">
                  <div class="form-label">주사위 결과</div>
                  <div class="dice-buttons" data-inv-id="${inv.id}">
                    ${[1,2,3,4,5,6].map(d => {
                      let diceClass = '';
                      if (product) {
                        if (product.profitDice.includes(d)) diceClass = 'style="color:var(--success)"';
                        else if (product.lossDice.includes(d)) diceClass = 'style="color:var(--danger)"';
                        else if (product.preserveDice.includes(d)) diceClass = 'style="color:var(--preserve)"';
                      }
                      return `<button class="dice-btn" data-dice="${d}" data-inv-id="${inv.id}" ${diceClass}>${d}</button>`;
                    }).join('')}
                  </div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }

  function bindMaturityEvents(investments) {
    // 개별 주사위 클릭
    document.querySelectorAll('.dice-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const invId = btn.dataset.invId;
        const dice = parseInt(btn.dataset.dice);
        settleInvestment(invId, dice, investments);
      });
    });

    // 전체 굴리기
    const settleAllBtn = document.getElementById('settleAllBtn');
    if (settleAllBtn) {
      settleAllBtn.addEventListener('click', () => {
        const state = sessionData.state || {};
        const matured = investments.filter(i => i.maturityTurn <= state.currentTurn && i.result === 'pending');
        matured.forEach(inv => {
          const dice = Math.floor(Math.random() * 6) + 1;
          settleInvestment(inv.id, dice, investments);
        });
      });
    }
  }

  function settleInvestment(invId, diceValue, investments) {
    const inv = investments.find(i => i.id === invId);
    if (!inv) return;

    const product = getProductById(inv.productId);
    if (!product) return;

    const result = judgeResult(product, diceValue);
    const calc = calculateResult(inv.amount, product, result);

    const updates = {
      diceValue: diceValue,
      result: result,
      profitAmount: calc.profitAmount,
      lossAmount: calc.lossAmount,
      preserveAmount: calc.preserveAmount,
      settledAt: Date.now(),
    };

    db.ref(`sessions/${sessionId}/investments/${invId}`).update(updates).then(() => {
      showToast(`${inv.playerName}: ${resultLabel(result)} (주사위 ${diceValue})`);
    });
  }

  // ===== 전체 내역 탭 =====
  function renderAllRecords(investments, players) {
    const sorted = [...investments].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

    return `
      <div style="padding:16px;">
        <div class="card">
          <div class="card-title">전체 투자 내역 (${sorted.length}건)</div>
          <div class="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>턴</th>
                  <th>참가자</th>
                  <th>상품</th>
                  <th class="text-right">금액</th>
                  <th class="text-center">만기</th>
                  <th class="text-center">주사위</th>
                  <th class="text-center">결과</th>
                  <th class="text-right">수익/손실</th>
                </tr>
              </thead>
              <tbody>
                ${sorted.map(inv => {
                  const net = (inv.profitAmount || 0) + (inv.lossAmount || 0);
                  const netStr = inv.result === 'pending' ? '-' :
                    (inv.result === 'preserve' ? formatAmount(inv.preserveAmount) :
                    `${net >= 0 ? '+' : ''}${formatAmount(net)}`);
                  const netClass = inv.result === 'pending' ? '' :
                    (net > 0 ? 'amount-positive' : net < 0 ? 'amount-negative' : '');
                  return `<tr>
                    <td>${inv.turn}</td>
                    <td>${inv.playerName}</td>
                    <td>${inv.productName}</td>
                    <td class="text-right">${formatAmount(inv.amount)}</td>
                    <td class="text-center">턴 ${inv.maturityTurn}</td>
                    <td class="text-center">${inv.diceValue || '-'}</td>
                    <td class="text-center">${resultBadge(inv.result)}</td>
                    <td class="text-right ${netClass}">${netStr}</td>
                  </tr>`;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  }

  // ===== 참가자 탭 =====
  function renderPlayers(players, investments) {
    const playerArr = Object.entries(players).map(([id, p]) => ({ id, ...p }));

    return `
      <div style="padding:16px;">
        <div class="card">
          <div class="card-title">참가자 목록 (${playerArr.length}명)</div>
          <div class="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>이름</th>
                  <th class="text-center">투자 건</th>
                  <th class="text-center">성공</th>
                  <th class="text-center">실패</th>
                  <th class="text-right">총 수익</th>
                  <th class="text-right">총 손실</th>
                  <th class="text-right">순수익</th>
                </tr>
              </thead>
              <tbody>
                ${playerArr.map(p => {
                  const myInv = investments.filter(i => i.playerId === p.id);
                  const settled = myInv.filter(i => i.result && i.result !== 'pending');
                  const successCount = settled.filter(i => i.result === 'success').length;
                  const failCount = settled.filter(i => i.result === 'fail').length;
                  const totalProfit = settled.reduce((s, i) => s + (i.profitAmount || 0), 0);
                  const totalLoss = settled.reduce((s, i) => s + (i.lossAmount || 0), 0);
                  const net = totalProfit + totalLoss;
                  return `<tr>
                    <td><strong>${p.name}</strong></td>
                    <td class="text-center">${myInv.length}</td>
                    <td class="text-center">${successCount}</td>
                    <td class="text-center">${failCount}</td>
                    <td class="text-right amount-positive">+${formatAmount(totalProfit)}</td>
                    <td class="text-right amount-negative">${formatAmount(totalLoss)}</td>
                    <td class="text-right ${net >= 0 ? 'amount-positive' : 'amount-negative'}">${net >= 0 ? '+' : ''}${formatAmount(net)}</td>
                  </tr>`;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  }

  // ===== 턴 관리 =====
  function nextTurn() {
    const state = sessionData.state || {};
    const newTurn = (state.currentTurn || 1) + 1;

    // 다음 턴에서 만기 도래 건이 있는지 확인
    const investments = sessionData.investments || {};
    const investArr = Object.entries(investments).map(([id, inv]) => ({ id, ...inv }));
    const willMature = investArr.filter(i => i.maturityTurn <= newTurn && i.result === 'pending');

    if (willMature.length > 0) {
      // 만기 도래 건이 있으면 → 정산 모드로 진입
      db.ref(`sessions/${sessionId}/state`).update({
        currentTurn: newTurn,
        phase: 'settling',
      }).then(() => {
        currentTab = 'maturity';
        showToast(`턴 ${newTurn} — 만기 도래 ${willMature.length}건 정산 필요`);
      });
    } else {
      // 만기 도래 없으면 → 바로 투자 접수
      db.ref(`sessions/${sessionId}/state`).update({
        currentTurn: newTurn,
        phase: 'investing',
      }).then(() => {
        showToast(`턴 ${newTurn} 시작`);
      });
    }
  }

  function startSettle() {
    db.ref(`sessions/${sessionId}/state`).update({
      phase: 'settling',
    }).then(() => {
      currentTab = 'maturity';
      showToast('만기 정산 모드');
    });
  }

  function finishSettle() {
    // 아직 정산 안 된 건이 있는지 체크
    const investments = sessionData.investments || {};
    const investArr = Object.entries(investments).map(([id, inv]) => ({ id, ...inv }));
    const state = sessionData.state || {};
    const remaining = investArr.filter(i => i.maturityTurn <= state.currentTurn && i.result === 'pending');

    if (remaining.length > 0) {
      showToast(`아직 ${remaining.length}건 정산이 남았습니다`);
      return;
    }

    db.ref(`sessions/${sessionId}/state`).update({
      phase: 'investing',
    }).then(() => {
      currentTab = 'dashboard';
      showToast('정산 완료. 투자 접수 재개');
    });
  }

  document.addEventListener('DOMContentLoaded', init);

  // URL 복사 (DOM 이벤트 위임)
  document.addEventListener('click', e => {
    if (e.target.id === 'copyUrlBtn') {
      const url = document.getElementById('playerUrl')?.textContent?.trim();
      if (url) {
        navigator.clipboard.writeText(url).then(() => showToast('URL 복사됨'));
      }
    }
  });

  return { init };
})();
