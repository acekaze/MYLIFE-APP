/**
 * 참가자 뷰
 * 
 * 흐름:
 * 1. 세션코드 + 이름 입력 → 입장
 * 2. 현재 턴에 투자상품 선택 + 금액 입력 → 제출
 * 3. 만기 도래 시 결과 확인 (관리자가 주사위 굴려서 확정)
 */

const PlayerApp = (() => {
  let sessionId = null;
  let playerId = null;
  let playerName = '';
  let currentTurn = 0;

  function init() {
    const params = new URLSearchParams(window.location.search);
    sessionId = params.get('session');

    if (sessionId && localStorage.getItem('mylife_player_id')) {
      playerId = localStorage.getItem('mylife_player_id');
      playerName = localStorage.getItem('mylife_player_name') || '';
      enterSession();
    } else {
      renderLogin();
    }
  }

  function renderLogin() {
    document.getElementById('app').innerHTML = `
      <div class="entry-screen">
        <h1>My Life<br><small>투자 보드게임</small></h1>
        <div class="card" style="width:100%; max-width:320px;">
          <div class="form-group">
            <label class="form-label">세션 코드</label>
            <input type="text" class="form-input" id="sessionCode" 
                   placeholder="진행자가 알려준 코드" value="${sessionId || ''}" 
                   style="text-transform:uppercase">
          </div>
          <div class="form-group">
            <label class="form-label">이름</label>
            <input type="text" class="form-input" id="playerNameInput" 
                   placeholder="본인 이름 입력" value="${playerName}">
          </div>
          <button class="btn btn-primary btn-block btn-lg" id="joinBtn">입장</button>
        </div>
      </div>
    `;

    document.getElementById('joinBtn').addEventListener('click', joinSession);
    document.getElementById('playerNameInput').addEventListener('keydown', e => {
      if (e.key === 'Enter') joinSession();
    });
  }

  function joinSession() {
    const code = document.getElementById('sessionCode').value.trim().toUpperCase();
    const name = document.getElementById('playerNameInput').value.trim();

    if (!code) { showToast('세션 코드를 입력해 주세요'); return; }
    if (!name) { showToast('이름을 입력해 주세요'); return; }

    sessionId = code;
    playerName = name;

    db.ref(`sessions/${sessionId}`).once('value').then(snap => {
      if (!snap.exists()) {
        showToast('존재하지 않는 세션 코드입니다');
        return;
      }

      db.ref(`sessions/${sessionId}/players`).once('value').then(playersSnap => {
        const players = playersSnap.val() || {};
        let existingId = null;

        Object.entries(players).forEach(([id, p]) => {
          if (p.name === playerName) existingId = id;
        });

        if (existingId) {
          playerId = existingId;
        } else {
          const newRef = db.ref(`sessions/${sessionId}/players`).push();
          playerId = newRef.key;
          newRef.set({ name: playerName, joinedAt: Date.now() });
        }

        localStorage.setItem('mylife_player_id', playerId);
        localStorage.setItem('mylife_player_name', playerName);
        localStorage.setItem('mylife_session_id', sessionId);

        enterSession();
      });
    }).catch(err => {
      showToast('연결 실패. 네트워크를 확인해 주세요');
      console.error(err);
    });
  }

  function enterSession() {
    // 세션 상태 + 투자 기록 실시간 감시
    db.ref(`sessions/${sessionId}/state`).on('value', snap => {
      const state = snap.val() || {};
      currentTurn = state.currentTurn || 1;
      const phase = state.phase || 'investing';
      renderMain(phase);
    });

    // 투자 기록 변경 시에도 화면 갱신
    db.ref(`sessions/${sessionId}/investments`).on('value', () => {
      const stateRef = db.ref(`sessions/${sessionId}/state`);
      stateRef.once('value').then(snap => {
        const state = snap.val() || {};
        currentTurn = state.currentTurn || 1;
        const phase = state.phase || 'investing';
        renderMain(phase);
      });
    });
  }

  function renderMain(phase) {
    db.ref(`sessions/${sessionId}/investments`).orderByChild('playerId').equalTo(playerId).once('value').then(snap => {
      const investments = [];
      snap.forEach(child => {
        investments.push({ id: child.key, ...child.val() });
      });

      const myThisTurn = investments.filter(inv => inv.turn === currentTurn && inv.status === 'active');
      const hasInvested = myThisTurn.length > 0;

      document.getElementById('app').innerHTML = `
        <header class="app-header">
          <div>
            <h1>My Life 투자</h1>
          </div>
          <div class="subtitle">${playerName}</div>
        </header>

        <div class="status-bar">
          <span class="turn-badge">턴 ${currentTurn}</span>
          <span>${phase === 'investing' ? '투자 접수 중' : '결과 정산 중'}</span>
        </div>

        <div style="padding:16px;">
          ${phase === 'investing' && !hasInvested ? renderInvestForm() : ''}
          ${phase === 'investing' && hasInvested ? renderWaiting() : ''}
          ${phase === 'settling' ? renderSettling() : ''}

          ${renderPortfolio(investments)}
        </div>
      `;

      if (phase === 'investing' && !hasInvested) bindInvestForm();
    });
  }

  function renderInvestForm() {
    return `
      <div class="card">
        <div class="card-title">투자할 상품을 선택하세요</div>
        <div class="product-grid" id="productGrid">
          ${PRODUCTS.map(p => `
            <div class="product-card" data-id="${p.id}">
              <div class="name">${p.name}</div>
              <div class="meta">${p.description}</div>
              <div class="rates">
                <span class="rate-profit">수익 ${(p.profitRate * 100).toFixed(0)}%</span>
                ${p.lossRate < 0 ? `<span class="rate-loss">손실 ${(p.lossRate * 100).toFixed(0)}%</span>` : ''}
              </div>
              <div class="meta mt-8">최소 ${formatAmount(p.minAmount)}만 원</div>
            </div>
          `).join('')}
        </div>

        <div id="amountSection" class="mt-16" style="display:none">
          <div class="form-group">
            <label class="form-label">투자 금액</label>
            <div class="amount-input-wrapper">
              <input type="tel" class="form-input" id="amountInput" placeholder="0" inputmode="numeric">
              <span class="unit">만 원</span>
            </div>
            <div class="amount-min" id="amountMinText">최소 500만 원</div>
          </div>
          <button class="btn btn-primary btn-block btn-lg mt-12" id="submitInvestBtn">투자하기</button>
        </div>
      </div>
    `;
  }

  function renderWaiting() {
    return `
      <div class="card" style="text-align:center; padding:30px 20px;">
        <div style="font-size:32px; margin-bottom:8px;">✅</div>
        <div style="font-size:16px; font-weight:700; margin-bottom:6px;">턴 ${currentTurn} 투자 완료</div>
        <div style="color:var(--gray-500); font-size:14px;">다음 턴을 기다려 주세요.</div>
      </div>
    `;
  }

  function renderSettling() {
    return `
      <div class="card" style="text-align:center; padding:30px 20px;">
        <div style="font-size:32px; margin-bottom:8px;">🎲</div>
        <div style="font-size:16px; font-weight:700; margin-bottom:6px;">결과 정산 중</div>
        <div style="color:var(--gray-500); font-size:14px;">진행자가 주사위를 굴리고 있습니다.</div>
      </div>
    `;
  }

  // ===== 내 투자 현황 (항상 표시) =====
  function renderPortfolio(investments) {
    if (investments.length === 0) return '';

    const active = investments.filter(inv => inv.result === 'pending');
    const settled = investments.filter(inv => inv.result && inv.result !== 'pending');

    const totalProfit = settled.reduce((s, inv) => s + (inv.profitAmount || 0), 0);
    const totalLoss = settled.reduce((s, inv) => s + (inv.lossAmount || 0), 0);
    const totalPreserve = settled.reduce((s, inv) => s + (inv.preserveAmount || 0), 0);
    const netResult = totalProfit + totalLoss;

    return `
      <!-- 요약 통계 -->
      <div class="stats-grid mt-16">
        <div class="stat-card">
          <div class="stat-value">${investments.length}</div>
          <div class="stat-label">총 투자</div>
        </div>
        <div class="stat-card">
          <div class="stat-value" style="color:var(--warning)">${active.length}</div>
          <div class="stat-label">진행중</div>
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

      <!-- 진행 중인 투자 -->
      ${active.length > 0 ? `
        <div class="card mt-16">
          <div class="card-title">📊 진행 중인 투자</div>
          ${active.map(inv => `
            <div style="display:flex; justify-content:space-between; align-items:center; padding:10px 0; border-bottom:1px solid var(--gray-100);">
              <div>
                <strong>${inv.productName}</strong>
                <div style="font-size:12px; color:var(--gray-500);">턴 ${inv.turn} 투자 → 턴 ${inv.maturityTurn} 만기</div>
              </div>
              <div style="text-align:right;">
                <div style="font-weight:700;">${formatAmount(inv.amount)}만 원</div>
                <div style="font-size:12px; color:var(--warning);">만기까지 ${Math.max(0, inv.maturityTurn - currentTurn)}턴</div>
              </div>
            </div>
          `).join('')}
        </div>
      ` : ''}

      <!-- 완료된 투자 -->
      ${settled.length > 0 ? `
        <div class="card mt-16">
          <div class="card-title">📋 완료된 투자</div>
          <div class="table-wrapper">
            <table>
              <thead>
                <tr><th>턴</th><th>상품</th><th class="text-right">금액</th><th class="text-center">결과</th><th class="text-right">수익/손실</th></tr>
              </thead>
              <tbody>
                ${settled.map(inv => {
                  const net = (inv.profitAmount || 0) + (inv.lossAmount || 0);
                  const display = inv.result === 'preserve' ? formatAmount(inv.preserveAmount) :
                    `${net >= 0 ? '+' : ''}${formatAmount(net)}`;
                  const cls = inv.result === 'success' ? 'amount-positive' :
                    inv.result === 'fail' ? 'amount-negative' : '';
                  return `<tr>
                    <td>${inv.turn}</td>
                    <td>${inv.productName}</td>
                    <td class="text-right">${formatAmount(inv.amount)}</td>
                    <td class="text-center">${resultBadge(inv.result)}</td>
                    <td class="text-right ${cls}">${display}</td>
                  </tr>`;
                }).join('')}
              </tbody>
            </table>
          </div>
          <div style="margin-top:12px; padding-top:12px; border-top:1px solid var(--gray-200); display:flex; justify-content:space-between;">
            <span style="font-weight:600;">순수익</span>
            <span class="${netResult >= 0 ? 'amount-positive' : 'amount-negative'}" style="font-size:18px; font-weight:700;">${netResult >= 0 ? '+' : ''}${formatAmount(netResult)}만 원</span>
          </div>
        </div>
      ` : ''}
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

      document.getElementById('amountSection').style.display = 'block';
      document.getElementById('amountMinText').textContent = `최소 ${formatAmount(selectedProduct.minAmount)}만 원`;
      document.getElementById('amountInput').focus();
    });

    const amountInput = document.getElementById('amountInput');
    amountInput.addEventListener('input', e => {
      const raw = e.target.value.replace(/[^0-9]/g, '');
      if (raw) {
        e.target.value = parseInt(raw).toLocaleString('ko-KR');
      } else {
        e.target.value = '';
      }
    });

    document.getElementById('submitInvestBtn').addEventListener('click', () => {
      if (!selectedProduct) { showToast('상품을 선택해 주세요'); return; }

      const raw = amountInput.value.replace(/[^0-9]/g, '');
      const amount = parseInt(raw) || 0;

      if (amount < selectedProduct.minAmount) {
        showToast(`최소 ${formatAmount(selectedProduct.minAmount)}만 원 이상 입력해 주세요`);
        return;
      }

      const investment = {
        playerId: playerId,
        playerName: playerName,
        turn: currentTurn,
        productId: selectedProduct.id,
        productName: selectedProduct.name,
        amount: amount,
        profitRate: selectedProduct.profitRate,
        lossRate: selectedProduct.lossRate,
        maturityTurn: currentTurn + MATURITY_TURNS,
        status: 'active',
        result: 'pending',
        profitAmount: 0,
        lossAmount: 0,
        preserveAmount: 0,
        createdAt: Date.now(),
      };

      db.ref(`sessions/${sessionId}/investments`).push(investment).then(() => {
        showToast('투자 완료!');
      }).catch(err => {
        showToast('저장 실패. 다시 시도해 주세요');
        console.error(err);
      });
    });
  }

  document.addEventListener('DOMContentLoaded', init);
  return { init };
})();
