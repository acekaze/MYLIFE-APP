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
    // URL에서 세션코드 확인
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

    // Firebase에서 세션 확인
    db.ref(`sessions/${sessionId}`).once('value').then(snap => {
      if (!snap.exists()) {
        showToast('존재하지 않는 세션 코드입니다');
        return;
      }

      // 참가자 등록 (같은 이름이 있으면 기존 ID 사용)
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
    // 세션 상태 실시간 감시
    db.ref(`sessions/${sessionId}/state`).on('value', snap => {
      const state = snap.val() || {};
      currentTurn = state.currentTurn || 1;
      const phase = state.phase || 'investing'; // investing | settling
      renderMain(phase);
    });
  }

  function renderMain(phase) {
    // 내 투자 기록 가져오기
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

          ${renderMyRecords(investments)}
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
      <div class="card" style="text-align:center; padding:40px 20px;">
        <div style="font-size:40px; margin-bottom:12px;">✅</div>
        <div style="font-size:18px; font-weight:700; margin-bottom:8px;">투자 완료</div>
        <div style="color:var(--gray-500)">턴 ${currentTurn} 투자가 접수됐습니다.<br>다음 턴을 기다려 주세요.</div>
      </div>
    `;
  }

  function renderSettling() {
    return `
      <div class="card" style="text-align:center; padding:40px 20px;">
        <div style="font-size:40px; margin-bottom:12px;">🎲</div>
        <div style="font-size:18px; font-weight:700; margin-bottom:8px;">결과 정산 중</div>
        <div style="color:var(--gray-500)">진행자가 주사위를 굴리고 있습니다.</div>
      </div>
    `;
  }

  function renderMyRecords(investments) {
    const settled = investments.filter(inv => inv.result && inv.result !== 'pending');
    if (settled.length === 0) return '';

    const totalProfit = settled.reduce((s, inv) => s + (inv.profitAmount || 0), 0);
    const totalLoss = settled.reduce((s, inv) => s + (inv.lossAmount || 0), 0);

    return `
      <div class="card mt-16">
        <div class="card-title">내 투자 결과</div>
        <div class="stats-grid mb-16">
          <div class="stat-card">
            <div class="stat-value amount-positive">+${formatAmount(totalProfit)}</div>
            <div class="stat-label">총 수익</div>
          </div>
          <div class="stat-card">
            <div class="stat-value amount-negative">${formatAmount(totalLoss)}</div>
            <div class="stat-label">총 손실</div>
          </div>
        </div>
        <div class="table-wrapper">
          <table>
            <thead>
              <tr><th>턴</th><th>상품</th><th class="text-right">금액</th><th class="text-center">결과</th><th class="text-right">수익/손실</th></tr>
            </thead>
            <tbody>
              ${settled.map(inv => {
                const net = (inv.profitAmount || 0) + (inv.lossAmount || 0);
                return `<tr>
                  <td>${inv.turn}</td>
                  <td>${inv.productName}</td>
                  <td class="text-right">${formatAmount(inv.amount)}</td>
                  <td class="text-center">${resultBadge(inv.result)}</td>
                  <td class="text-right ${net >= 0 ? 'amount-positive' : 'amount-negative'}">${net >= 0 ? '+' : ''}${formatAmount(net)}</td>
                </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  function bindInvestForm() {
    let selectedProduct = null;

    // 상품 선택
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

    // 금액 입력 포맷
    const amountInput = document.getElementById('amountInput');
    amountInput.addEventListener('input', e => {
      const raw = e.target.value.replace(/[^0-9]/g, '');
      if (raw) {
        e.target.value = parseInt(raw).toLocaleString('ko-KR');
      } else {
        e.target.value = '';
      }
    });

    // 투자 제출
    document.getElementById('submitInvestBtn').addEventListener('click', () => {
      if (!selectedProduct) { showToast('상품을 선택해 주세요'); return; }

      const raw = amountInput.value.replace(/[^0-9]/g, '');
      const amount = parseInt(raw) || 0;

      if (amount < selectedProduct.minAmount) {
        showToast(`최소 ${formatAmount(selectedProduct.minAmount)}만 원 이상 입력해 주세요`);
        return;
      }

      // Firebase에 저장
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
        renderMain('investing');
      }).catch(err => {
        showToast('저장 실패. 다시 시도해 주세요');
        console.error(err);
      });
    });
  }

  document.addEventListener('DOMContentLoaded', init);
  return { init };
})();
