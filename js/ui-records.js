/**
 * 전체 투자내역 화면
 */

const UIRecords = (() => {
  let editingId = null;

  function render() {
    const panel = document.getElementById('tab-records');
    const records = Store.getRecords();
    const participants = Store.getParticipants();
    const products = Store.getProducts();

    panel.innerHTML = `
      <div class="card">
        <div class="flex-between mb-12">
          <div class="card-title" style="margin:0">전체 투자내역 (${records.length}건)</div>
          <button class="btn btn-primary btn-sm" id="goToInvestBtn">+ 신규 입력</button>
        </div>

        <!-- 필터 -->
        <div class="filter-bar">
          <select class="form-select form-input-sm" id="filterParticipant">
            <option value="">참가자 전체</option>
            ${participants.map(p => `<option value="${p.id}">${p.name}</option>`).join('')}
          </select>
          <select class="form-select form-input-sm" id="filterProduct">
            <option value="">상품 전체</option>
            ${products.map(p => `<option value="${p.id}">${p.name}</option>`).join('')}
          </select>
          <select class="form-select form-input-sm" id="filterTurn">
            <option value="">턴 전체</option>
            ${getUniqueTurns(records).map(t => `<option value="${t}">${t}</option>`).join('')}
          </select>
          <select class="form-select form-input-sm" id="filterResult">
            <option value="">결과 전체</option>
            <option value="success">성공</option>
            <option value="preserve">원금보존</option>
            <option value="fail">실패</option>
          </select>
          <select class="form-select form-input-sm" id="sortOrder">
            <option value="desc">최신순</option>
            <option value="asc">과거순</option>
          </select>
          <input type="text" class="form-input form-input-sm" id="searchInput" 
                 placeholder="검색..." style="min-width:150px">
        </div>

        <!-- 테이블 -->
        <div class="table-wrapper">
          <table id="recordsTable">
            <thead>
              <tr>
                <th>턴</th>
                <th>참가자</th>
                <th>상품</th>
                <th class="text-right">투자금액</th>
                <th class="text-center">주사위</th>
                <th class="text-center">결과</th>
                <th class="text-right">수익금</th>
                <th class="text-right">손실액</th>
                <th class="text-right">원금보존</th>
                <th class="text-center">시각</th>
                <th class="text-center">작업</th>
              </tr>
            </thead>
            <tbody id="recordsBody"></tbody>
          </table>
        </div>

        <div id="recordsEmpty" class="empty-state" style="display:none">
          <p>투자 기록이 없습니다</p>
        </div>
      </div>
    `;

    bindEvents();
    applyFilters();
  }

  function getUniqueTurns(records) {
    const turns = [...new Set(records.map(r => r.turn))];
    return turns.sort();
  }

  function getParticipantName(participantId) {
    const participants = Store.getParticipants();
    const p = participants.find(p => p.id === participantId);
    return p ? p.name : '(삭제됨)';
  }

  function bindEvents() {
    document.getElementById('goToInvestBtn').addEventListener('click', () => {
      document.querySelector('[data-tab="invest"]').click();
    });

    ['filterParticipant', 'filterProduct', 'filterTurn', 'filterResult', 'sortOrder'].forEach(id => {
      document.getElementById(id).addEventListener('change', applyFilters);
    });

    document.getElementById('searchInput').addEventListener('input', applyFilters);

    document.getElementById('recordsBody').addEventListener('click', handleTableAction);
  }

  function applyFilters() {
    let records = Store.getRecords();
    const participantFilter = document.getElementById('filterParticipant').value;
    const productFilter = document.getElementById('filterProduct').value;
    const turnFilter = document.getElementById('filterTurn').value;
    const resultFilter = document.getElementById('filterResult').value;
    const sortOrder = document.getElementById('sortOrder').value;
    const search = document.getElementById('searchInput').value.trim().toLowerCase();

    if (participantFilter) records = records.filter(r => r.participantId === participantFilter);
    if (productFilter) records = records.filter(r => r.productId === productFilter);
    if (turnFilter) records = records.filter(r => r.turn === turnFilter);
    if (resultFilter) records = records.filter(r => r.result === resultFilter);

    if (search) {
      records = records.filter(r => {
        const name = getParticipantName(r.participantId).toLowerCase();
        const product = (r.productNameSnapshot || '').toLowerCase();
        return name.includes(search) || product.includes(search) || r.turn.toLowerCase().includes(search);
      });
    }

    records.sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
    });

    renderTable(records);
  }

  function renderTable(records) {
    const tbody = document.getElementById('recordsBody');
    const empty = document.getElementById('recordsEmpty');

    if (records.length === 0) {
      tbody.innerHTML = '';
      empty.style.display = 'block';
      return;
    }

    empty.style.display = 'none';
    tbody.innerHTML = records.map(r => `
      <tr data-id="${r.id}">
        <td>${r.turn}</td>
        <td>${getParticipantName(r.participantId)}</td>
        <td>${r.productNameSnapshot || ''}</td>
        <td class="text-right amount">${Utils.formatAmount(r.amount)}</td>
        <td class="text-center">${r.diceValue || '-'}</td>
        <td class="text-center">${Utils.resultBadge(r.result)}</td>
        <td class="text-right ${r.profitAmount > 0 ? 'amount-positive' : ''}">${r.profitAmount ? '+' + Utils.formatAmount(r.profitAmount) : '-'}</td>
        <td class="text-right ${r.lossAmount < 0 ? 'amount-negative' : ''}">${r.lossAmount ? Utils.formatAmount(r.lossAmount) : '-'}</td>
        <td class="text-right">${r.preserveAmount ? Utils.formatAmount(r.preserveAmount) : '-'}</td>
        <td class="text-center" style="font-size:11px">${Utils.formatDate(r.createdAt)}</td>
        <td class="text-center">
          <button class="btn btn-secondary btn-sm action-edit" data-id="${r.id}">수정</button>
          <button class="btn btn-danger btn-sm action-delete" data-id="${r.id}">삭제</button>
        </td>
      </tr>
    `).join('');
  }

  async function handleTableAction(e) {
    const editBtn = e.target.closest('.action-edit');
    const deleteBtn = e.target.closest('.action-delete');

    if (deleteBtn) {
      const id = deleteBtn.dataset.id;
      const confirmed = await Utils.showConfirm('이 투자 기록을 삭제하시겠습니까?');
      if (confirmed) {
        Store.deleteRecord(id);
        Utils.showToast('삭제됨');
        applyFilters();
      }
    }

    if (editBtn) {
      const id = editBtn.dataset.id;
      openEditModal(id);
    }
  }

  function openEditModal(recordId) {
    const records = Store.getRecords();
    const record = records.find(r => r.id === recordId);
    if (!record) return;

    const products = Store.getProducts();
    const participants = Store.getParticipants();

    const modal = document.getElementById('confirmModal');
    const content = modal.querySelector('.modal-content');

    content.innerHTML = `
      <h3 style="margin-bottom:12px">투자 기록 수정</h3>
      <div class="form-group">
        <label class="form-label">턴/분기</label>
        <input type="text" class="form-input" id="editTurn" value="${record.turn}">
      </div>
      <div class="form-group">
        <label class="form-label">투자 금액 (만 원)</label>
        <input type="text" class="form-input" id="editAmount" value="${Utils.formatAmount(record.amount)}">
      </div>
      <div class="form-group">
        <label class="form-label">주사위</label>
        <select class="form-select" id="editDice">
          <option value="">없음</option>
          ${[1,2,3,4,5,6].map(d => `<option value="${d}" ${record.diceValue === d ? 'selected' : ''}>${d}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">결과</label>
        <select class="form-select" id="editResult">
          <option value="success" ${record.result === 'success' ? 'selected' : ''}>성공</option>
          <option value="preserve" ${record.result === 'preserve' ? 'selected' : ''}>원금보존</option>
          <option value="fail" ${record.result === 'fail' ? 'selected' : ''}>실패</option>
        </select>
      </div>
      <div class="modal-actions">
        <button class="btn btn-primary" id="editSaveBtn">저장</button>
        <button class="btn btn-secondary" id="editCancelBtn">취소</button>
      </div>
    `;

    modal.classList.remove('hidden');

    document.getElementById('editCancelBtn').addEventListener('click', () => {
      modal.classList.add('hidden');
    });

    document.getElementById('editSaveBtn').addEventListener('click', () => {
      const turn = document.getElementById('editTurn').value.trim();
      const amount = Utils.parseAmount(document.getElementById('editAmount').value);
      const diceValue = parseInt(document.getElementById('editDice').value) || null;
      const result = document.getElementById('editResult').value;

      if (!amount || amount <= 0) {
        Utils.showToast('금액을 입력해 주세요');
        return;
      }

      const product = Store.getProductById(record.productId) || {
        profitRate: record.profitRateSnapshot,
        lossRate: record.lossRateSnapshot,
      };

      const calc = Utils.calculateResult(amount, {
        profitRate: record.profitRateSnapshot,
        lossRate: record.lossRateSnapshot,
      }, result);

      Store.updateRecord(recordId, {
        turn,
        amount,
        diceValue,
        result,
        profitAmount: calc.profitAmount,
        lossAmount: calc.lossAmount,
        preserveAmount: calc.preserveAmount,
      });

      modal.classList.add('hidden');
      Utils.showToast('수정 완료');
      applyFilters();
    });
  }

  return { render };
})();
