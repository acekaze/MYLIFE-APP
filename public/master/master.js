/**
 * 총괄 관리자 뷰
 * 
 * - 세션 생성, 팀 개설
 * - 턴 진행 (모든 팀 투자 완료 확인 후)
 * - 전체 참가자/팀 조회
 * - 최종 산출 (순수익 랭킹, 팀 내 1위들)
 */

const MasterApp = (() => {
  let sessionId = null;
  let sessionData = null;
  let currentTab = 'dashboard';

  function init() {
    sessionId = localStorage.getItem('mylife_master_session');
    if (sessionId) {
      enterSession();
    } else {
      renderSessionSelect();
    }
  }

  function renderSessionSelect() {
    document.getElementById('app').innerHTML = `
      <div class="entry-screen">
        <h1>My Life<br><small>총괄 관리자</small></h1>
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
              <input type="text" class="form-input" id="existingCode" placeholder="코드 입력" style="text-transform:uppercase">
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
      state: { currentTurn: 1, phase: 'investing' },
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

  function renderAdmin() {
    const state = sessionData.state || { currentTurn: 1, phase: 'investing' };
    const players = sessionData.players || {};
    const investments = sessionData.investments || {};
    const teams = sessionData.teams || {};
    const playerCount = Object.keys(players).length;
    const teamCount = Object.keys(teams).length;

    // 전체 투자 완료 여부 체크
    const investArr = Object.entries(investments).map(([id, inv]) => ({ id, ...inv }));
    const thisTurnInvestors = new Set(investArr.filter(i => i.turn === state.currentTurn).map(i => i.playerId));
    const allInvested = playerCount > 0 && thisTurnInvestors.size >= playerCount;

    // 만기 도래 건
    const pendingMaturity = investArr.filter(i => i.maturityTurn <= state.currentTurn && i.result === 'pending');

    document.getElementById('app').innerHTML = `
      <header class="app-header" style="background:var(--gray-800);">
        <div>
          <h1>${sessionData.name}</h1>
          <div class="subtitle">코드: <strong>${sessionId}</strong> | ${teamCount}팀 ${playerCount}명</div>
        </div>
        <button class="btn btn-sm btn-secondary" id="exitBtn">나가기</button>
      </header>

      <div class="status-bar">
        <span class="turn-badge">턴 ${state.currentTurn}</span>
        <span>${state.phase === 'investing' ? '📝 투자 접수 중' : '🎲 정산 중'}</span>
        <div class="flex gap-8">
          ${state.phase === 'investing' ? `
            <button class="btn btn-sm btn-primary" id="nextTurnBtn" ${!allInvested ? 'disabled title="모든 참가자 투자 완료 후 가능"' : ''}>
              다음 턴 →
            </button>
          ` : `
            <button class="btn btn-sm btn-success" id="finishSettleBtn">정산 완료 → 투자 재개</button>
          `}
        </div>
      </div>

      <nav class="tab-nav">
        <button class="tab-btn ${currentTab === 'dashboard' ? 'active' : ''}" data-tab="dashboard">현황</button>
        <button class="tab-btn ${currentTab === 'teams' ? 'active' : ''}" data-tab="teams">팀 관리</button>
        <button class="tab-btn ${currentTab === 'maturity' ? 'active' : ''}" data-tab="maturity">만기 정산 ${pendingMaturity.length > 0 ? `(${pendingMaturity.length})` : ''}</button>
        <button class="tab-btn ${currentTab === 'all' ? 'active' : ''}" data-tab="all">전체 내역</button>
        <button class="tab-btn ${currentTab === 'ranking' ? 'active' : ''}" data-tab="ranking">최종 산출</button>
      </nav>

      <div id="tabContent" style="padding:16px;"></div>
    `;

    document.getElementById('exitBtn').addEventListener('click', () => {
      localStorage.removeItem('mylife_master_session');
      db.ref(`sessions/${sessionId}`).off();
      sessionId = null;
      renderSessionSelect();
    });

    const nextTurnBtn = document.getElementById('nextTurnBtn');
    if (nextTurnBtn) nextTurnBtn.addEventListener('click', nextTurn);

    const finishSettleBtn = document.getElementById('finishSettleBtn');
    if (finishSettleBtn) finishSettleBtn.addEventListener('click', finishSettle);

    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => { currentTab = btn.dataset.tab; renderAdmin(); });
    });

    const container = document.getElementById('tabContent');
    switch (currentTab) {
      case 'dashboard': container.innerHTML = renderDashboard(state, teams, players, investArr); break;
      case 'teams': container.innerHTML = renderTeams(teams, players); bindTeamEvents(); break;
      case 'maturity': container.innerHTML = renderMaturity(state, investArr); bindMaturityEvents(investArr); break;
      case 'all': container.innerHTML = renderAllRecords(investArr); break;
      case 'ranking': container.innerHTML = renderRanking(teams, players, investArr); break;
    }
  }

  // ===== 현황 =====
  function renderDashboard(state, teams, players, investments) {
    const teamArr = Object.entries(teams).map(([id, t]) => ({ id, ...t }));
    const playerArr = Object.entries(players).map(([id, p]) => ({ id, ...p }));

    const thisTurn = investments.filter(i => i.turn === state.currentTurn);
    const pendingMaturity = investments.filter(i => i.maturityTurn <= state.currentTurn && i.result === 'pending');

    // 팀별 투자 현황
    const teamStatus = teamArr.map(team => {
      const teamPlayers = playerArr.filter(p => p.teamId === team.id);
      const teamInvested = new Set(thisTurn.filter(i => i.teamId === team.id).map(i => i.playerId));
      return {
        ...team,
        total: teamPlayers.length,
        invested: teamInvested.size,
        done: teamPlayers.length > 0 && teamInvested.size >= teamPlayers.length,
      };
    });

    return `
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-value">${teamArr.length}</div>
          <div class="stat-label">팀</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${playerArr.length}</div>
          <div class="stat-label">참가자</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${thisTurn.length}/${playerArr.length}</div>
          <div class="stat-label">이번 턴 투자</div>
        </div>
        <div class="stat-card">
          <div class="stat-value" style="color:var(--warning)">${pendingMaturity.length}</div>
          <div class="stat-label">만기 대기</div>
        </div>
      </div>

      <div class="card mt-16">
        <div class="card-title">팀별 투자 현황 (턴 ${state.currentTurn})</div>
        ${teamStatus.map(t => `
          <div style="display:flex; justify-content:space-between; align-items:center; padding:10px 0; border-bottom:1px solid var(--gray-100);">
            <strong>${t.name}</strong>
            <div>
              <span style="margin-right:8px;">${t.invested}/${t.total}명</span>
              ${t.done ? '<span class="badge badge-success">완료</span>' : '<span class="badge badge-pending">대기</span>'}
            </div>
          </div>
        `).join('')}
      </div>

      <div class="card mt-16">
        <div class="card-title">참가자 접속 URL</div>
        <div style="background:var(--gray-100); padding:12px; border-radius:var(--radius); font-family:monospace; font-size:12px; word-break:break-all;" id="playerUrl">
          ${window.location.origin}/player/?session=${sessionId}
        </div>
        <button class="btn btn-sm btn-secondary mt-8" id="copyUrlBtn">URL 복사</button>
      </div>
    `;
  }

  // ===== 팀 관리 =====
  function renderTeams(teams, players) {
    const teamArr = Object.entries(teams).map(([id, t]) => ({ id, ...t }));
    const playerArr = Object.entries(players).map(([id, p]) => ({ id, ...p }));

    return `
      <div class="card">
        <div class="card-title">팀 일괄 생성</div>
        <div class="flex gap-8" style="align-items:end;">
          <div class="form-group" style="margin:0; flex:1;">
            <label class="form-label">몇 개 조?</label>
            <input type="number" class="form-input" id="teamCount" placeholder="예: 4" min="1" max="20" value="4">
          </div>
          <button class="btn btn-primary" id="bulkCreateTeamsBtn">생성</button>
        </div>
        <p style="font-size:12px; color:var(--gray-400); margin-top:6px;">기존 팀은 유지되고 새 팀이 추가됩니다.</p>
      </div>

      <div class="card">
        <div class="card-title">개별 팀 추가</div>
        <div class="flex gap-8">
          <input type="text" class="form-input" id="newTeamName" placeholder="팀 이름 (예: 5조)" style="flex:1">
          <button class="btn btn-secondary" id="addTeamBtn">추가</button>
        </div>
      </div>

      <!-- 참가자 재배치 -->
      ${playerArr.length > 0 ? `
        <div class="card">
          <div class="card-title">참가자 팀 배치</div>
          <div class="table-wrapper">
            <table>
              <thead><tr><th>이름</th><th>현재 팀</th><th>변경</th></tr></thead>
              <tbody>
                ${playerArr.map(p => {
                  const currentTeam = teamArr.find(t => t.id === p.teamId);
                  return `<tr>
                    <td><strong>${p.name}</strong></td>
                    <td>${currentTeam ? currentTeam.name : '<span style="color:var(--danger)">미배정</span>'}</td>
                    <td>
                      <select class="form-select form-input-sm reassign-team" data-player-id="${p.id}" style="width:auto; min-width:100px;">
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

      <!-- 팀 목록 -->
      ${teamArr.length > 0 ? `
        <div class="card">
          <div class="card-title">팀 현황</div>
          ${teamArr.map(team => {
            const members = playerArr.filter(p => p.teamId === team.id);
            return `
              <div style="padding:12px 0; border-bottom:1px solid var(--gray-100);">
                <div class="flex-between">
                  <strong>${team.name}</strong>
                  <span style="color:var(--gray-500); font-size:13px;">${members.length}명</span>
                </div>
                ${members.length > 0 ? `<div class="mt-8">${members.map(m => `<span class="badge" style="margin:2px; background:var(--gray-100); color:var(--gray-700);">${m.name}</span>`).join('')}</div>` : ''}
              </div>
            `;
          }).join('')}
        </div>
      ` : ''}
    `;
  }

  function bindTeamEvents() {
    // 일괄 생성
    const bulkBtn = document.getElementById('bulkCreateTeamsBtn');
    if (bulkBtn) {
      bulkBtn.addEventListener('click', () => {
        const count = parseInt(document.getElementById('teamCount').value) || 0;
        if (count < 1 || count > 20) { showToast('1~20 사이로 입력해 주세요'); return; }

        const existing = sessionData.teams ? Object.keys(sessionData.teams).length : 0;
        const updates = {};
        for (let i = 1; i <= count; i++) {
          const key = db.ref(`sessions/${sessionId}/teams`).push().key;
          updates[key] = { name: `${existing + i}조`, createdAt: Date.now() };
        }
        db.ref(`sessions/${sessionId}/teams`).update(updates).then(() => {
          showToast(`${count}개 팀 생성됨`);
        });
      });
    }

    // 개별 추가
    const addBtn = document.getElementById('addTeamBtn');
    if (addBtn) {
      addBtn.addEventListener('click', () => {
        const name = document.getElementById('newTeamName').value.trim();
        if (!name) { showToast('팀 이름을 입력해 주세요'); return; }
        db.ref(`sessions/${sessionId}/teams`).push({ name, createdAt: Date.now() }).then(() => {
          showToast(`${name} 추가됨`);
        });
      });
    }

    // 참가자 재배치
    document.querySelectorAll('.reassign-team').forEach(select => {
      select.addEventListener('change', e => {
        const playerId = e.target.dataset.playerId;
        const newTeamId = e.target.value;
        if (!newTeamId) return;
        db.ref(`sessions/${sessionId}/players/${playerId}/teamId`).set(newTeamId).then(() => {
          showToast('팀 변경됨');
        });
      });
    });

    // URL 복사
    const copyBtn = document.getElementById('copyUrlBtn');
    if (copyBtn) {
      copyBtn.addEventListener('click', () => {
        const url = document.getElementById('playerUrl')?.textContent?.trim();
        if (url) navigator.clipboard.writeText(url).then(() => showToast('URL 복사됨'));
      });
    }
  }

  // ===== 만기 정산 (모니터링 + 대리 정산) =====
  function renderMaturity(state, investments) {
    const matured = investments.filter(i => i.maturityTurn <= state.currentTurn && i.result === 'pending');
    const recentlySettled = investments.filter(i => i.settledAt && i.result !== 'pending')
      .sort((a, b) => (b.settledAt || 0) - (a.settledAt || 0)).slice(0, 10);

    if (matured.length === 0 && recentlySettled.length === 0) {
      return `<div style="text-align:center; padding:40px; color:var(--gray-400);"><p>만기 도래한 투자가 없습니다</p></div>`;
    }

    return `
      ${matured.length > 0 ? `
        <div class="card">
          <div class="flex-between mb-16">
            <div class="card-title" style="margin:0">⏳ 정산 대기 (${matured.length}건)</div>
            <button class="btn btn-sm btn-success" id="settleAllBtn">전체 대리 정산</button>
          </div>
          <p style="font-size:13px; color:var(--gray-500); margin-bottom:12px;">참가자가 직접 주사위를 입력합니다. 필요 시 관리자가 대리 정산할 수 있습니다.</p>

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
      ` : ''}

      ${recentlySettled.length > 0 ? `
        <div class="card">
          <div class="card-title">✅ 최근 정산 완료</div>
          <div class="table-wrapper">
            <table>
              <thead><tr><th>참가자</th><th>상품</th><th class="text-center">주사위</th><th class="text-center">결과</th><th class="text-right">수익/손실</th></tr></thead>
              <tbody>
                ${recentlySettled.map(inv => {
                  const net = (inv.profitAmount || 0) + (inv.lossAmount || 0);
                  const display = inv.result === 'preserve' ? formatAmount(inv.preserveAmount) : `${net >= 0 ? '+' : ''}${formatAmount(net)}`;
                  const cls = inv.result === 'success' ? 'amount-positive' : inv.result === 'fail' ? 'amount-negative' : '';
                  return `<tr><td>${inv.playerName}</td><td>${inv.productName}</td><td class="text-center">${inv.diceValue}</td><td class="text-center">${resultBadge(inv.result)}</td><td class="text-right ${cls}">${display}</td></tr>`;
                }).join('')}
              </tbody>
            </table>
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
  function renderAllRecords(investments) {
    const sorted = [...investments].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    return `
      <div class="card">
        <div class="card-title">전체 투자 내역 (${sorted.length}건)</div>
        <div class="table-wrapper">
          <table>
            <thead><tr><th>턴</th><th>참가자</th><th>상품</th><th class="text-right">금액</th><th class="text-center">만기</th><th class="text-center">결과</th><th class="text-right">수익/손실</th></tr></thead>
            <tbody>
              ${sorted.map(inv => {
                const net = (inv.profitAmount || 0) + (inv.lossAmount || 0);
                const display = inv.result === 'pending' ? '-' : inv.result === 'preserve' ? formatAmount(inv.preserveAmount) : `${net >= 0 ? '+' : ''}${formatAmount(net)}`;
                const cls = inv.result === 'success' ? 'amount-positive' : inv.result === 'fail' ? 'amount-negative' : '';
                return `<tr><td>${inv.turn}</td><td>${inv.playerName}</td><td>${inv.productName}</td><td class="text-right">${formatAmount(inv.amount)}</td><td class="text-center">턴${inv.maturityTurn}</td><td class="text-center">${resultBadge(inv.result)}</td><td class="text-right ${cls}">${display}</td></tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  // ===== 최종 산출 =====
  function renderRanking(teams, players, investments) {
    const teamArr = Object.entries(teams).map(([id, t]) => ({ id, ...t }));
    const playerArr = Object.entries(players).map(([id, p]) => ({ id, ...p }));
    const settled = investments.filter(i => i.result && i.result !== 'pending');

    // 참가자별 통계
    const playerStats = playerArr.map(p => {
      const myInv = investments.filter(i => i.playerId === p.id);
      const mySettled = myInv.filter(i => i.result && i.result !== 'pending');
      const totalProfit = mySettled.reduce((s, i) => s + (i.profitAmount || 0), 0);
      const totalLoss = mySettled.reduce((s, i) => s + (i.lossAmount || 0), 0);
      const totalAmount = myInv.reduce((s, i) => s + (i.amount || 0), 0);
      return {
        ...p,
        investCount: myInv.length,
        netProfit: totalProfit + totalLoss,
        totalLoss,
        totalAmount,
      };
    });

    // 전체 순수익 랭킹
    const ranked = [...playerStats].sort((a, b) => b.netProfit - a.netProfit);

    // 팀별 1위들
    const teamAwards = teamArr.map(team => {
      const members = playerStats.filter(p => p.teamId === team.id);
      if (members.length === 0) return { team, awards: {} };

      const byNet = [...members].sort((a, b) => b.netProfit - a.netProfit);
      const byCount = [...members].sort((a, b) => b.investCount - a.investCount);
      const byLoss = [...members].sort((a, b) => a.totalLoss - b.totalLoss); // 가장 큰 손실 (음수가 작을수록)
      const byAmount = [...members].sort((a, b) => b.totalAmount - a.totalAmount);

      return {
        team,
        awards: {
          netProfit: byNet[0],
          investCount: byCount[0],
          bigLoss: byLoss[0],
          totalAmount: byAmount[0],
        },
      };
    });

    return `
      <div class="card">
        <div class="card-title">🏆 전체 순수익 랭킹</div>
        <div class="table-wrapper">
          <table>
            <thead><tr><th>#</th><th>이름</th><th>팀</th><th class="text-center">투자 횟수</th><th class="text-right">순수익</th></tr></thead>
            <tbody>
              ${ranked.map((p, i) => {
                const teamName = teamArr.find(t => t.id === p.teamId)?.name || '';
                const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : (i + 1);
                return `<tr>
                  <td>${medal}</td>
                  <td><strong>${p.name}</strong></td>
                  <td>${teamName}</td>
                  <td class="text-center">${p.investCount}</td>
                  <td class="text-right ${p.netProfit >= 0 ? 'amount-positive' : 'amount-negative'}">${p.netProfit >= 0 ? '+' : ''}${formatAmount(p.netProfit)}</td>
                </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>

      ${teamAwards.map(({ team, awards }) => {
        if (!awards.netProfit) return '';
        return `
          <div class="card">
            <div class="card-title">🏅 ${team.name} 팀 내 1위</div>
            <div class="table-wrapper">
              <table>
                <tbody>
                  <tr><td>순수익 1위</td><td><strong>${awards.netProfit.name}</strong></td><td class="text-right amount-positive">${awards.netProfit.netProfit >= 0 ? '+' : ''}${formatAmount(awards.netProfit.netProfit)}</td></tr>
                  <tr><td>투자횟수 1위</td><td><strong>${awards.investCount.name}</strong></td><td class="text-right">${awards.investCount.investCount}회</td></tr>
                  <tr><td>손실 1위</td><td><strong>${awards.bigLoss.name}</strong></td><td class="text-right amount-negative">${formatAmount(awards.bigLoss.totalLoss)}</td></tr>
                  <tr><td>투자액 1위</td><td><strong>${awards.totalAmount.name}</strong></td><td class="text-right">${formatAmount(awards.totalAmount.totalAmount)}만 원</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        `;
      }).join('')}
    `;
  }

  // ===== 턴 관리 =====
  function nextTurn() {
    const state = sessionData.state || {};
    const newTurn = (state.currentTurn || 1) + 1;

    const investments = sessionData.investments || {};
    const investArr = Object.entries(investments).map(([id, inv]) => ({ id, ...inv }));
    const willMature = investArr.filter(i => i.maturityTurn <= newTurn && i.result === 'pending');

    if (willMature.length > 0) {
      db.ref(`sessions/${sessionId}/state`).update({
        currentTurn: newTurn,
        phase: 'settling',
      }).then(() => {
        currentTab = 'maturity';
        showToast(`턴 ${newTurn} — 만기 ${willMature.length}건 정산 필요`);
      });
    } else {
      db.ref(`sessions/${sessionId}/state`).update({
        currentTurn: newTurn,
        phase: 'investing',
      }).then(() => {
        showToast(`턴 ${newTurn} 시작`);
      });
    }
  }

  function finishSettle() {
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

  // URL 복사 이벤트 위임
  document.addEventListener('click', e => {
    if (e.target.id === 'copyUrlBtn') {
      const url = document.getElementById('playerUrl')?.textContent?.trim();
      if (url) navigator.clipboard.writeText(url).then(() => showToast('URL 복사됨'));
    }
  });

  document.addEventListener('DOMContentLoaded', init);
  return { init };
})();
