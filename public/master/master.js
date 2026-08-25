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
          ` : ''}
        </div>
      </div>

      <nav class="tab-nav">
        <button class="tab-btn ${currentTab === 'dashboard' ? 'active' : ''}" data-tab="dashboard">현황</button>
        <button class="tab-btn ${currentTab === 'teams' ? 'active' : ''}" data-tab="teams">팀 관리</button>
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

    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => { currentTab = btn.dataset.tab; renderAdmin(); });
    });

    const container = document.getElementById('tabContent');
    switch (currentTab) {
      case 'dashboard': container.innerHTML = renderDashboard(state, teams, players, investArr); break;
      case 'teams': container.innerHTML = renderTeams(teams, players); bindTeamEvents(); break;
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
        <div class="card-title">팀 추가</div>
        <div class="flex gap-8">
          <input type="text" class="form-input" id="newTeamName" placeholder="팀 이름 (예: 1조)" style="flex:1">
          <button class="btn btn-primary" id="addTeamBtn">추가</button>
        </div>
      </div>

      ${teamArr.map(team => {
        const members = playerArr.filter(p => p.teamId === team.id);
        return `
          <div class="card">
            <div class="flex-between">
              <div class="card-title" style="margin:0">${team.name} (${members.length}명)</div>
            </div>
            ${members.length > 0 ? `
              <div class="mt-8">
                ${members.map(m => `<span class="badge" style="margin:2px; background:var(--gray-100); color:var(--gray-700);">${m.name}</span>`).join('')}
              </div>
            ` : '<div class="mt-8" style="color:var(--gray-400); font-size:13px;">아직 참가자가 없습니다</div>'}
          </div>
        `;
      }).join('')}

      ${teamArr.length === 0 ? '<div style="text-align:center; color:var(--gray-400); padding:20px;">팀을 추가해 주세요</div>' : ''}
    `;
  }

  function bindTeamEvents() {
    document.getElementById('addTeamBtn').addEventListener('click', () => {
      const name = document.getElementById('newTeamName').value.trim();
      if (!name) { showToast('팀 이름을 입력해 주세요'); return; }
      const newRef = db.ref(`sessions/${sessionId}/teams`).push();
      newRef.set({ name, createdAt: Date.now() }).then(() => {
        showToast(`${name} 추가됨`);
      });
    });

    const copyBtn = document.getElementById('copyUrlBtn');
    if (copyBtn) {
      copyBtn.addEventListener('click', () => {
        const url = document.getElementById('playerUrl')?.textContent?.trim();
        if (url) navigator.clipboard.writeText(url).then(() => showToast('URL 복사됨'));
      });
    }
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
        showToast(`턴 ${newTurn} — 만기 ${willMature.length}건 정산 필요 (팀장에게 안내하세요)`);
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
