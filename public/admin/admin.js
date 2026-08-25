/**
 * 팀장 뷰 (팀 운영 노트북)
 * 
 * - 팀원 투자 현황 확인
 * - 만기 도래 시 주사위 정산
 * - 팀 내 결과 조회
 */

const TeamApp = (() => {
  let sessionId = null;
  let teamId = null;
  let teamName = '';
  let sessionData = null;
  let currentTab = 'status';

  function init() {
    sessionId = localStorage.getItem('mylife_team_session');
    teamId = localStorage.getItem('mylife_team_id');
    if (sessionId && teamId) {
      enterSession();
    } else {
      renderLogin();
    }
  }

  function renderLogin() {
    document.getElementById('app').innerHTML = `
      <div class="entry-screen">
        <h1>My Life<br><small>팀장 모드</small></h1>
        <div class="card" style="width:100%; max-width:320px;">
          <div class="form-group">
            <label class="form-label">세션 코드</label>
            <input type="text" class="form-input" id="sessionCode" placeholder="세션 코드" style="text-transform:uppercase">
          </div>
          <div class="form-group" id="teamSelectGroup" style="display:none">
            <label class="form-label">팀 선택</label>
            <select class="form-select" id="teamSelect">
              <option value="">팀을 선택하세요</option>
            </select>
          </div>
          <button class="btn btn-warning btn-block btn-lg" id="enterBtn">입장</button>
        </div>
      </div>
    `;

    document.getElementById('sessionCode').addEventListener('blur', e => {
      const code = e.target.value.trim().toUpperCase();
      if (code) {
        db.ref(`sessions/${code}/teams`).once('value').then(snap => {
          const teams = snap.val() || {};
          const arr = Object.entries(teams).map(([id, t]) => ({ id, ...t }));
          const group = document.getElementById('teamSelectGroup');
          const select = document.getElementById('teamSelect');
          if (arr.length > 0) {
            group.style.display = 'block';
            select.innerHTML = '<option value="">팀을 선택하세요</option>' +
              arr.map(t => `<option value="${t.id}">${t.name}</option>`).join('');
          }
        });
      }
    });

    document.getElementById('enterBtn').addEventListener('click', () => {
      const code = document.getElementById('sessionCode').value.trim().toUpperCase();
      const tid = document.getElementById('teamSelect').value;
      if (!code) { showToast('세션 코드를 입력해 주세요'); return; }
      if (!tid) { showToast('팀을 선택해 주세요'); return; }
      sessionId = code;
      teamId = tid;
      localStorage.setItem('mylife_team_session', sessionId);
      localStorage.setItem('mylife_team_id', teamId);
      enterSession();
    });
  }

  function enterSession() {
    db.ref(`sessions/${sessionId}`).on('value', snap => {
      if (!snap.exists()) {
        showToast('세션을 찾을 수 없습니다');
        localStorage.removeItem('mylife_team_session');
        renderLogin();
        return;
      }
      sessionData = snap.val();
      const teams = sessionData.teams || {};
      teamName = teams[teamId]?.name || '팀';
      renderMain();
    });
  }

  function renderMain() {
    const state = sessionData.state || { currentTurn: 1, phase: 'investing' };
    const players = sessionData.players || {};
    const investments = sessionData.investments || {};

    // 우리 팀 참가자만
    const teamPlayers = Object.entries(players)
      .filter(([id, p]) => p.teamId === teamId)
      .map(([id, p]) => ({ id, ...p }));

    // 우리 팀 투자만
    const teamInvestments = Object.entries(investments)
      .filter(([id, inv]) => inv.teamId === teamId)
      .map(([id, inv]) => ({ id, ...inv }));

    // 만기 도래 건
    const matured = teamInvestments.filter(i => i.maturityTurn <= state.currentTurn && i.result === 'pending');

    document.getElementById('app').innerHTML = `
      <header class="app-header" style="background:var(--warning);">
        <div>
          <h1>${teamName} - 팀장</h1>
          <div class="subtitle">세션: ${sessionId}</div>
        </div>
        <button class="btn btn-sm btn-secondary" id="exitBtn">나가기</button>
      </header>

      <div class="status-bar">
        <span class="turn-badge">턴 ${state.currentTurn}</span>
        <span>${state.phase === 'investing' ? '📝 투자 접수 중' : '🎲 정산 중'}</span>
        ${matured.length > 0 ? `<span class="badge badge-pending">${matured.length}건 만기</span>` : ''}
      </div>

      <nav class="tab-nav">
        <button class="tab-btn ${currentTab === 'status' ? 'active' : ''}" data-tab="status">팀 현황</button>
        <button class="tab-btn ${currentTab === 'maturity' ? 'active' : ''}" data-tab="maturity">만기 정산 ${matured.length > 0 ? `(${matured.length})` : ''}</button>
        <button class="tab-btn ${currentTab === 'records' ? 'active' : ''}" data-tab="records">전체 내역</button>
      </nav>

      <div id="tabContent" style="padding:16px;"></div>
    `;

    document.getElementById('exitBtn').addEventListener('click', () => {
      localStorage.removeItem('mylife_team_session');
      localStorage.removeItem('mylife_team_id');
      db.ref(`sessions/${sessionId}`).off();
      renderLogin();
    });

    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        currentTab = btn.dataset.tab;
        renderMain();
      });
    });

    const container = document.getElementById('tabContent');
    switch (currentTab) {
      case 'status': container.innerHTML = renderStatus(state, teamPlayers, teamInvestments); break;
      case 'maturity': container.innerHTML = renderMaturity(state, teamInvestments); bindMaturity(teamInvestments); break;
      case 'records': container.innerHTML = renderRecords(teamInvestments); break;
    }
  }

  // ===== 팀 현황 =====
  function renderStatus(state, teamPlayers, teamInvestments) {
    const thisT = teamInvestments.filter(i => i.turn === state.currentTurn);
    const settled = teamInvestments.filter(i => i.result && i.result !== 'pending');
    const totalProfit = settled.reduce((s, i) => s + (i.profitAmount || 0), 0);
    const totalLoss = settled.reduce((s, i) => s + (i.lossAmount || 0), 0);

    // 이번 턴 투자 여부 확인
    const investedPlayerIds = new Set(thisT.map(i => i.playerId));
    const notInvested = teamPlayers.filter(p => !investedPlayerIds.has(p.id));

    return `
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-value">${teamPlayers.length}</div>
          <div class="stat-label">팀원</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${thisT.length}/${teamPlayers.length}</div>
          <div class="stat-label">이번 턴 투자</div>
        </div>
        <div class="stat-card">
          <div class="stat-value amount-positive">+${formatAmount(totalProfit)}</div>
          <div class="stat-label">팀 총 수익</div>
        </div>
        <div class="stat-card">
          <div class="stat-value amount-negative">${formatAmount(totalLoss)}</div>
          <div class="stat-label">팀 총 손실</div>
        </div>
      </div>

      ${notInvested.length > 0 ? `
        <div class="card mt-16">
          <div class="card-title">⏳ 아직 투자하지 않은 팀원</div>
          ${notInvested.map(p => `<div style="padding:8px 0; border-bottom:1px solid var(--gray-100);">${p.name}</div>`).join('')}
        </div>
      ` : `
        <div class="card mt-16" style="text-align:center; padding:20px; background:var(--success-bg);">
          <strong style="color:var(--success);">✅ 모든 팀원 투자 완료</strong>
        </div>
      `}

      <div class="card mt-16">
        <div class="card-title">팀원별 현황</div>
        <div class="table-wrapper">
          <table>
            <thead><tr><th>이름</th><th class="text-center">투자</th><th class="text-center">성공</th><th class="text-center">실패</th><th class="text-right">순수익</th></tr></thead>
            <tbody>
              ${teamPlayers.map(p => {
                const myInv = teamInvestments.filter(i => i.playerId === p.id);
                const mySettled = myInv.filter(i => i.result && i.result !== 'pending');
                const suc = mySettled.filter(i => i.result === 'success').length;
                const fail = mySettled.filter(i => i.result === 'fail').length;
                const net = mySettled.reduce((s, i) => s + (i.profitAmount || 0) + (i.lossAmount || 0), 0);
                return `<tr>
                  <td><strong>${p.name}</strong></td>
                  <td class="text-center">${myInv.length}</td>
                  <td class="text-center">${suc}</td>
                  <td class="text-center">${fail}</td>
                  <td class="text-right ${net >= 0 ? 'amount-positive' : 'amount-negative'}">${net >= 0 ? '+' : ''}${formatAmount(net)}</td>
                </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  // ===== 만기 정산 =====
  function renderMaturity(state, teamInvestments) {
    const matured = teamInvestments.filter(i => i.maturityTurn <= state.currentTurn && i.result === 'pending');

    if (matured.length === 0) {
      return `<div style="text-align:center; padding:40px; color:var(--gray-400);"><p>만기 도래한 투자가 없습니다</p></div>`;
    }

    return `
      <div class="card">
        <div class="flex-between mb-16">
          <div class="card-title" style="margin:0">만기 도래 (${matured.length}건)</div>
          <button class="btn btn-sm btn-success" id="settleAllBtn">전체 주사위 굴리기</button>
        </div>

        ${matured.map(inv => {
          const product = getProductById(inv.productId);
          return `
            <div class="card" style="border:1px solid var(--gray-200); box-shadow:none; margin-bottom:12px;">
              <div class="flex-between">
                <div>
                  <strong>${inv.playerName}</strong>
                  <span style="color:var(--gray-500); font-size:13px;"> | ${inv.productName} | ${formatAmount(inv.amount)}만 원</span>
                </div>
                <span class="badge badge-pending">턴 ${inv.turn}→${inv.maturityTurn}</span>
              </div>
              <div class="mt-8" style="font-size:12px;">${product ? diceInfoHTML(product) : ''}</div>
              <div class="mt-12">
                <div class="dice-buttons">
                  ${[1,2,3,4,5,6].map(d => {
                    let style = '';
                    if (product) {
                      if (product.profitDice.includes(d)) style = 'style="color:var(--success)"';
                      else if (product.lossDice.includes(d)) style = 'style="color:var(--danger)"';
                      else if (product.preserveDice.includes(d)) style = 'style="color:var(--preserve)"';
                    }
                    return `<button class="dice-btn" data-dice="${d}" data-inv-id="${inv.id}" ${style}>${d}</button>`;
                  }).join('')}
                </div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  function bindMaturity(teamInvestments) {
    document.querySelectorAll('.dice-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const invId = btn.dataset.invId;
        const dice = parseInt(btn.dataset.dice);
        settleInvestment(invId, dice, teamInvestments);
      });
    });

    const settleAllBtn = document.getElementById('settleAllBtn');
    if (settleAllBtn) {
      settleAllBtn.addEventListener('click', () => {
        const state = sessionData.state || {};
        const matured = teamInvestments.filter(i => i.maturityTurn <= state.currentTurn && i.result === 'pending');
        matured.forEach(inv => {
          const dice = Math.floor(Math.random() * 6) + 1;
          settleInvestment(inv.id, dice, teamInvestments);
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

    db.ref(`sessions/${sessionId}/investments/${invId}`).update({
      diceValue, result,
      profitAmount: calc.profitAmount,
      lossAmount: calc.lossAmount,
      preserveAmount: calc.preserveAmount,
      settledAt: Date.now(),
    }).then(() => {
      showToast(`${inv.playerName}: ${resultLabel(result)} (주사위 ${diceValue})`);
    });
  }

  // ===== 전체 내역 =====
  function renderRecords(teamInvestments) {
    const sorted = [...teamInvestments].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    return `
      <div class="card">
        <div class="card-title">팀 전체 투자 내역 (${sorted.length}건)</div>
        <div class="table-wrapper">
          <table>
            <thead><tr><th>턴</th><th>참가자</th><th>상품</th><th class="text-right">금액</th><th class="text-center">결과</th><th class="text-right">수익/손실</th></tr></thead>
            <tbody>
              ${sorted.map(inv => {
                const net = (inv.profitAmount || 0) + (inv.lossAmount || 0);
                const display = inv.result === 'pending' ? '-' : inv.result === 'preserve' ? formatAmount(inv.preserveAmount) : `${net >= 0 ? '+' : ''}${formatAmount(net)}`;
                const cls = inv.result === 'success' ? 'amount-positive' : inv.result === 'fail' ? 'amount-negative' : '';
                return `<tr><td>${inv.turn}</td><td>${inv.playerName}</td><td>${inv.productName}</td><td class="text-right">${formatAmount(inv.amount)}</td><td class="text-center">${resultBadge(inv.result)}</td><td class="text-right ${cls}">${display}</td></tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  document.addEventListener('DOMContentLoaded', init);
  return { init };
})();
