/**
 * 참가자 검색 화면
 */

const UISearch = (() => {
  let selectedParticipantId = null;

  function render() {
    const panel = document.getElementById('tab-search');
    const participants = Store.getParticipants();

    panel.innerHTML = `
      <div class="card">
        <div class="card-title">참가자 검색</div>
        <div class="participant-buttons" id="searchParticipants">
          ${participants.map(p => `
            <button class="participant-btn ${p.id === selectedParticipantId ? 'active' : ''}" 
                    data-id="${p.id}">${p.name}</button>
          `).join('')}
        </div>
        ${participants.length === 0 ? '<div class="empty-state"><p>등록된 참가자가 없습니다</p></div>' : ''}
      </div>

      <div id="searchResult"></div>
    `;

    bindEvents();
    if (selectedParticipantId) showParticipantDetail(selectedParticipantId);
  }

  function bindEvents() {
    document.getElementById('searchParticipants').addEventListener('click', e => {
      if (e.target.classList.contains('participant-btn')) {
        selectedParticipantId = e.target.dataset.id;
        document.querySelectorAll('#searchParticipants .participant-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        showParticipantDetail(selectedParticipantId);
      }
    });
  }

  function showParticipantDetail(participantId) {
    const container = document.getElementById('searchResult');
    const participants = Store.getParticipants();
    const participant = participants.find(p => p.id === participantId);
    if (!participant) {
      container.innerHTML = '';
      return;
    }

    const summary = Store.getParticipantSummary(participantId);
    const records = Store.getRecords().filter(r => r.participantId === participantId);

    container.innerHTML = `
      <!-- 요약 통계 -->
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-value">${summary.totalCount}</div>
          <div class="stat-label">전체 투자</div>
        </div>
        <div class="stat-card">
          <div class="stat-value" style="color:var(--success)">${summary.successCount}</div>
          <div class="stat-label">성공</div>
        </div>
        <div class="stat-card">
          <div class="stat-value" style="color:var(--danger)">${summary.failCount}</div>
          <div class="stat-label">실패</div>
        </div>
        <div class="stat-card">
          <div class="stat-value" style="color:var(--preserve)">${summary.preserveCount}</div>
          <div class="stat-label">원금보존</div>
        </div>
        <div class="stat-card">
          <div class="stat-value amount-positive">+${Utils.formatAmount(summary.totalProfit)}</div>
          <div class="stat-label">총 수익금</div>
        </div>
        <div class="stat-card">
          <div class="stat-value amount-negative">${Utils.formatAmount(summary.totalLoss)}</div>
          <div class="stat-label">총 손실액</div>
        </div>
        <div class="stat-card">
          <div class="stat-value" style="color:var(--preserve)">${Utils.formatAmount(summary.totalPreserve)}</div>
          <div class="stat-label">총 원금보존</div>
        </div>
        <div class="stat-card">
          <div class="stat-value ${summary.netResult >= 0 ? 'amount-positive' : 'amount-negative'}">
            ${summary.netResult >= 0 ? '+' : ''}${Utils.formatAmount(summary.netResult)}
          </div>
          <div class="stat-label">순수익</div>
        </div>
      </div>

      <!-- 투자 내역 -->
      <div class="card">
        <div class="flex-between mb-12">
          <div class="card-title" style="margin:0">${participant.name}의 투자 내역</div>
          <div class="filter-bar" style="margin:0">
            <select class="form-select form-input-sm" id="searchFilterProduct">
              <option value="">상품 전체</option>
              ${getUniqueProducts(records).map(name => `<option value="${name}">${name}</option>`).join('')}
            </select>
            <select class="form-select form-input-sm" id="searchFilterResult">
              <option value="">결과 전체</option>
              <option value="success">성공</option>
              <option value="preserve">원금보존</option>
              <option value="fail">실패</option>
            </select>
          </div>
        </div>

        <div class="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>턴</th>
                <th>상품</th>
                <th class="text-right">투자금액</th>
                <th class="text-center">주사위</th>
                <th class="text-center">결과</th>
                <th class="text-right">수익금</th>
                <th class="text-right">손실액</th>
                <th class="text-right">원금보존</th>
              </tr>
            </thead>
            <tbody id="searchRecordsBody">
              ${renderRecordsRows(records)}
            </tbody>
          </table>
        </div>
        ${records.length === 0 ? '<div class="empty-state"><p>투자 기록이 없습니다</p></div>' : ''}
      </div>
    `;

    // 필터 이벤트
    ['searchFilterProduct', 'searchFilterResult'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.addEventListener('change', () => filterSearchRecords(records));
    });
  }

  function getUniqueProducts(records) {
    return [...new Set(records.map(r => r.productNameSnapshot))].filter(Boolean);
  }

  function filterSearchRecords(allRecords) {
    let records = [...allRecords];
    const productFilter = document.getElementById('searchFilterProduct').value;
    const resultFilter = document.getElementById('searchFilterResult').value;

    if (productFilter) records = records.filter(r => r.productNameSnapshot === productFilter);
    if (resultFilter) records = records.filter(r => r.result === resultFilter);

    document.getElementById('searchRecordsBody').innerHTML = renderRecordsRows(records);
  }

  function renderRecordsRows(records) {
    // 턴 순서로 정렬
    const sorted = [...records].sort((a, b) => {
      const turnA = a.turn.replace(/\D/g, '');
      const turnB = b.turn.replace(/\D/g, '');
      return (parseInt(turnA) || 0) - (parseInt(turnB) || 0);
    });

    return sorted.map(r => `
      <tr>
        <td>${r.turn}</td>
        <td>${r.productNameSnapshot || ''}</td>
        <td class="text-right amount">${Utils.formatAmount(r.amount)}</td>
        <td class="text-center">${r.diceValue || '-'}</td>
        <td class="text-center">${Utils.resultBadge(r.result)}</td>
        <td class="text-right ${r.profitAmount > 0 ? 'amount-positive' : ''}">${r.profitAmount ? '+' + Utils.formatAmount(r.profitAmount) : '-'}</td>
        <td class="text-right ${r.lossAmount < 0 ? 'amount-negative' : ''}">${r.lossAmount ? Utils.formatAmount(r.lossAmount) : '-'}</td>
        <td class="text-right">${r.preserveAmount ? Utils.formatAmount(r.preserveAmount) : '-'}</td>
      </tr>
    `).join('');
  }

  return { render };
})();
