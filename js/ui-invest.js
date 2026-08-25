/**
 * 투자 입력 화면
 */

const UIInvest = (() => {
  let selectedParticipantId = null;
  let selectedResult = null;
  let saveButtonLocked = false;

  function render() {
    const panel = document.getElementById('tab-invest');
    const participants = Store.getParticipants();
    const products = Store.getActiveProducts();

    panel.innerHTML = `
      <div class="card">
        <div class="card-title">참가자 선택</div>
        <div class="participant-buttons" id="investParticipants">
          ${participants.map(p => `
            <button class="participant-btn ${p.id === selectedParticipantId ? 'active' : ''}" 
                    data-id="${p.id}">${p.name}</button>
          `).join('')}
        </div>
        <div class="flex gap-8">
          <input type="text" class="form-input" id="newParticipantName" 
                 placeholder="새 참가자 이름 입력" style="flex:1">
          <button class="btn btn-secondary" id="addParticipantBtn">추가</button>
        </div>
      </div>

      <div class="card">
        <div class="card-title">투자 정보 입력</div>
        <div class="inline-form">
          <div class="form-group">
            <label class="form-label">턴/분기</label>
            <select class="form-select" id="investTurn">
              ${DEFAULT_TURNS.map(t => `<option value="${t}">${t}</option>`).join('')}
              <option value="__custom">직접 입력</option>
            </select>
          </div>
          <div class="form-group" id="customTurnGroup" style="display:none">
            <label class="form-label">턴 직접 입력</label>
            <input type="text" class="form-input" id="customTurnInput" placeholder="예: Q21">
          </div>
          <div class="form-group">
            <label class="form-label">투자상품</label>
            <select class="form-select" id="investProduct">
              <option value="">선택하세요</option>
              ${products.map(p => `<option value="${p.id}">${p.name}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">투자 금액 (만 원)</label>
            <input type="text" class="form-input" id="investAmount" placeholder="예: 1000" inputmode="numeric">
          </div>
          <div class="form-group">
            <label class="form-label">주사위 값</label>
            <select class="form-select" id="investDice">
              <option value="">선택</option>
              <option value="1">1</option>
              <option value="2">2</option>
              <option value="3">3</option>
              <option value="4">4</option>
              <option value="5">5</option>
              <option value="6">6</option>
            </select>
          </div>
        </div>

        <!-- 상품 정보 표시 -->
        <div id="productInfoBox" class="product-info" style="display:none"></div>

        <!-- 투자 결과 선택 -->
        <div class="form-group mt-12">
          <label class="form-label">투자 결과</label>
          <div class="result-buttons" id="resultButtons">
            <button class="result-btn success" data-result="success">성공</button>
            <button class="result-btn preserve" data-result="preserve">원금보존</button>
            <button class="result-btn fail" data-result="fail">실패</button>
          </div>
        </div>

        <!-- 결과 미리보기 -->
        <div id="previewBox" class="preview-box" style="display:none"></div>

        <!-- 저장 버튼 -->
        <div class="mt-16">
          <button class="btn btn-primary btn-lg" id="saveInvestBtn" style="width:100%">저장</button>
        </div>
      </div>
    `;

    bindEvents();
    restoreLastSelections();
  }

  function bindEvents() {
    // 참가자 선택
    document.getElementById('investParticipants').addEventListener('click', e => {
      if (e.target.classList.contains('participant-btn')) {
        selectedParticipantId = e.target.dataset.id;
        document.querySelectorAll('#investParticipants .participant-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        localStorage.setItem('mylife_last_participant', selectedParticipantId);
      }
    });

    // 참가자 추가
    document.getElementById('addParticipantBtn').addEventListener('click', () => {
      const input = document.getElementById('newParticipantName');
      const name = input.value.trim();
      if (!name) return;
      const p = Store.addParticipant(name);
      if (p) {
        selectedParticipantId = p.id;
        localStorage.setItem('mylife_last_participant', selectedParticipantId);
        render();
        Utils.showToast(`${name} 추가됨`);
      }
      input.value = '';
    });

    // 새 참가자 Enter 키
    document.getElementById('newParticipantName').addEventListener('keydown', e => {
      if (e.key === 'Enter') document.getElementById('addParticipantBtn').click();
    });

    // 턴 직접입력 전환
    document.getElementById('investTurn').addEventListener('change', e => {
      const customGroup = document.getElementById('customTurnGroup');
      customGroup.style.display = e.target.value === '__custom' ? 'block' : 'none';
      localStorage.setItem('mylife_last_turn', e.target.value);
    });

    // 상품 선택 시 정보 표시
    document.getElementById('investProduct').addEventListener('change', updateProductInfo);

    // 주사위 선택 시 결과 자동 제안
    document.getElementById('investDice').addEventListener('change', suggestResult);

    // 금액 입력 시 천단위 구분 + 미리보기
    document.getElementById('investAmount').addEventListener('input', e => {
      const raw = e.target.value.replace(/[^0-9]/g, '');
      if (raw) {
        e.target.value = parseInt(raw).toLocaleString('ko-KR');
      }
      updatePreview();
    });

    // 결과 버튼
    document.getElementById('resultButtons').addEventListener('click', e => {
      const btn = e.target.closest('.result-btn');
      if (!btn) return;
      selectedResult = btn.dataset.result;
      document.querySelectorAll('.result-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      updatePreview();
    });

    // 저장
    document.getElementById('saveInvestBtn').addEventListener('click', saveInvestment);
  }

  function restoreLastSelections() {
    // 마지막 참가자 복원
    const lastParticipant = localStorage.getItem('mylife_last_participant');
    if (lastParticipant) {
      const btn = document.querySelector(`#investParticipants [data-id="${lastParticipant}"]`);
      if (btn) {
        selectedParticipantId = lastParticipant;
        btn.classList.add('active');
      }
    }

    // 마지막 턴 복원
    const lastTurn = localStorage.getItem('mylife_last_turn');
    if (lastTurn) {
      const turnSelect = document.getElementById('investTurn');
      if (turnSelect.querySelector(`option[value="${lastTurn}"]`)) {
        turnSelect.value = lastTurn;
        if (lastTurn === '__custom') {
          document.getElementById('customTurnGroup').style.display = 'block';
        }
      }
    }
  }

  function updateProductInfo() {
    const productId = document.getElementById('investProduct').value;
    const box = document.getElementById('productInfoBox');
    if (!productId) {
      box.style.display = 'none';
      return;
    }
    const product = Store.getProductById(productId);
    if (!product) return;

    box.style.display = 'block';
    box.innerHTML = `
      <div class="product-info-row">
        <span class="product-info-label">만기 수익률</span>
        <span class="product-info-value amount-positive">${Utils.formatPercent(product.profitRate)}</span>
      </div>
      <div class="product-info-row">
        <span class="product-info-label">손실률</span>
        <span class="product-info-value ${product.lossRate < 0 ? 'amount-negative' : ''}">${Utils.formatPercent(product.lossRate)}</span>
      </div>
      <div class="product-info-row">
        <span class="product-info-label">중도해약 이율</span>
        <span class="product-info-value">${Utils.formatPercent(product.earlyTermRate)}</span>
      </div>
      <div class="product-info-row">
        <span class="product-info-label">주사위 판정</span>
        <span class="product-info-value">${Utils.diceDisplay(product)}</span>
      </div>
    `;
    suggestResult();
  }

  function suggestResult() {
    const productId = document.getElementById('investProduct').value;
    const diceValue = parseInt(document.getElementById('investDice').value);
    if (!productId || !diceValue) return;

    const product = Store.getProductById(productId);
    const suggested = Utils.judgeResult(product, diceValue);
    if (suggested) {
      selectedResult = suggested;
      document.querySelectorAll('.result-btn').forEach(b => {
        b.classList.toggle('selected', b.dataset.result === suggested);
      });
      updatePreview();
    }
  }

  function updatePreview() {
    const box = document.getElementById('previewBox');
    const productId = document.getElementById('investProduct').value;
    const amountStr = document.getElementById('investAmount').value;
    const amount = Utils.parseAmount(amountStr);

    if (!productId || !amount || !selectedResult) {
      box.style.display = 'none';
      return;
    }

    const product = Store.getProductById(productId);
    const calc = Utils.calculateResult(amount, product, selectedResult);

    box.style.display = 'block';
    if (selectedResult === 'success') {
      box.innerHTML = `<div>수익금</div><div class="preview-amount positive">+${Utils.formatAmount(calc.profitAmount)} 만 원</div>`;
    } else if (selectedResult === 'fail') {
      box.innerHTML = `<div>손실액</div><div class="preview-amount negative">${Utils.formatAmount(calc.lossAmount)} 만 원</div>`;
    } else {
      box.innerHTML = `<div>원금보존액</div><div class="preview-amount neutral">${Utils.formatAmount(calc.preserveAmount)} 만 원</div>`;
    }
  }

  function saveInvestment() {
    if (saveButtonLocked) return;

    // 검증
    if (!selectedParticipantId) {
      Utils.showToast('참가자를 선택해 주세요');
      return;
    }

    const turnSelect = document.getElementById('investTurn');
    let turn = turnSelect.value;
    if (turn === '__custom') {
      turn = document.getElementById('customTurnInput').value.trim();
      if (!turn) {
        Utils.showToast('턴을 입력해 주세요');
        return;
      }
    }

    const productId = document.getElementById('investProduct').value;
    if (!productId) {
      Utils.showToast('투자상품을 선택해 주세요');
      return;
    }

    const amount = Utils.parseAmount(document.getElementById('investAmount').value);
    if (!amount || amount <= 0) {
      Utils.showToast('투자 금액을 입력해 주세요');
      return;
    }

    if (!selectedResult) {
      Utils.showToast('투자 결과를 선택해 주세요');
      return;
    }

    const diceValue = parseInt(document.getElementById('investDice').value) || null;
    if (diceValue && (diceValue < 1 || diceValue > 6)) {
      Utils.showToast('주사위 값은 1~6만 가능합니다');
      return;
    }

    const product = Store.getProductById(productId);
    const calc = Utils.calculateResult(amount, product, selectedResult);

    const record = {
      participantId: selectedParticipantId,
      turn: turn,
      productId: productId,
      productNameSnapshot: product.name,
      amount: amount,
      profitRateSnapshot: product.profitRate,
      lossRateSnapshot: product.lossRate,
      diceValue: diceValue,
      result: selectedResult,
      profitAmount: calc.profitAmount,
      lossAmount: calc.lossAmount,
      preserveAmount: calc.preserveAmount,
    };

    // 중복 체크
    if (Store.isDuplicate(record)) {
      Utils.showToast('동일한 투자가 방금 저장됐습니다');
      return;
    }

    // 저장 버튼 잠금
    saveButtonLocked = true;
    const btn = document.getElementById('saveInvestBtn');
    btn.disabled = true;
    btn.textContent = '저장 중...';

    Store.addRecord(record);
    Utils.showToast('저장 완료');

    // 입력 초기화 (참가자, 턴은 유지)
    document.getElementById('investProduct').value = '';
    document.getElementById('investAmount').value = '';
    document.getElementById('investDice').value = '';
    selectedResult = null;
    document.querySelectorAll('.result-btn').forEach(b => b.classList.remove('selected'));
    document.getElementById('productInfoBox').style.display = 'none';
    document.getElementById('previewBox').style.display = 'none';

    // 1초 후 버튼 잠금 해제
    setTimeout(() => {
      saveButtonLocked = false;
      btn.disabled = false;
      btn.textContent = '저장';
    }, 1000);
  }

  return { render };
})();
