/**
 * 세션/백업 화면
 */

const UISettings = (() => {

  function render() {
    const panel = document.getElementById('tab-settings');
    const sessions = Store.getSessions();
    const currentId = Store.getCurrentSessionId();
    const currentSession = Store.getCurrentSession();

    panel.innerHTML = `
      <!-- 현재 세션 정보 -->
      <div class="card">
        <div class="card-title">현재 세션</div>
        ${currentSession ? `
          <div class="inline-form">
            <div class="form-group">
              <label class="form-label">세션명</label>
              <input type="text" class="form-input" id="sessionName" value="${currentSession.name}">
            </div>
            <div class="form-group">
              <label class="form-label">진행일</label>
              <input type="date" class="form-input" id="sessionDate" value="${currentSession.date}">
            </div>
            <div class="form-group" style="align-self:end">
              <button class="btn btn-primary" id="updateSessionBtn">세션 정보 저장</button>
            </div>
          </div>
          <div class="mt-12 flex gap-8" style="flex-wrap:wrap">
            <button class="btn btn-secondary" id="duplicateSessionBtn">세션 복제</button>
            <button class="btn btn-warning" id="resetSessionBtn">세션 초기화</button>
            <button class="btn btn-danger" id="deleteSessionBtn">세션 삭제</button>
          </div>
        ` : '<p>세션이 없습니다. 새 세션을 만들어 주세요.</p>'}
      </div>

      <!-- 세션 목록 -->
      <div class="card">
        <div class="flex-between mb-12">
          <div class="card-title" style="margin:0">세션 목록</div>
          <button class="btn btn-primary btn-sm" id="newSessionBtn">+ 새 세션</button>
        </div>
        ${sessions.length > 0 ? `
          <table>
            <thead>
              <tr>
                <th>세션명</th>
                <th>진행일</th>
                <th class="text-center">참가자</th>
                <th class="text-center">기록수</th>
                <th class="text-center">선택</th>
              </tr>
            </thead>
            <tbody>
              ${sessions.map(s => `
                <tr>
                  <td>${s.name} ${s.id === currentId ? '<span class="badge badge-success">현재</span>' : ''}</td>
                  <td>${s.date}</td>
                  <td class="text-center">${s.participants ? s.participants.length : 0}명</td>
                  <td class="text-center">${s.records ? s.records.length : 0}건</td>
                  <td class="text-center">
                    ${s.id !== currentId ? `<button class="btn btn-secondary btn-sm switch-session" data-id="${s.id}">전환</button>` : '-'}
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        ` : '<div class="empty-state"><p>세션이 없습니다</p></div>'}
      </div>

      <!-- 참가자 관리 -->
      <div class="card">
        <div class="card-title">참가자 관리</div>
        <div class="flex gap-8 mb-12">
          <input type="text" class="form-input" id="bulkParticipants" 
                 placeholder="참가자 이름을 쉼표로 구분 (예: 홍길동, 김철수, 이영희)" style="flex:1">
          <button class="btn btn-primary" id="bulkAddBtn">일괄 추가</button>
        </div>
        <div id="participantList">
          ${renderParticipantList()}
        </div>
      </div>

      <!-- 내보내기 -->
      <div class="card">
        <div class="card-title">내보내기</div>
        <div class="flex gap-8" style="flex-wrap:wrap">
          <button class="btn btn-secondary" id="exportCSVBtn">CSV 내보내기</button>
          <button class="btn btn-secondary" id="exportSummaryBtn">참가자별 요약 CSV</button>
          <button class="btn btn-secondary" id="exportJSONBtn">JSON 백업</button>
        </div>
      </div>

      <!-- 가져오기 -->
      <div class="card">
        <div class="card-title">가져오기 / 복원</div>
        <div class="form-group">
          <label class="form-label">JSON 백업 파일 복원</label>
          <input type="file" class="form-input" id="importJSONFile" accept=".json">
        </div>
        <button class="btn btn-primary mt-8" id="importJSONBtn">JSON 복원</button>
      </div>
    `;

    bindEvents();
  }

  function renderParticipantList() {
    const participants = Store.getParticipants();
    if (participants.length === 0) return '<p style="color:var(--gray-400)">참가자가 없습니다</p>';
    return `<div class="participant-buttons">
      ${participants.map(p => `
        <span class="participant-btn" style="cursor:default">
          ${p.name}
          <button class="btn btn-sm" style="padding:2px 6px;margin-left:4px;font-size:11px;background:var(--danger);color:white;border-radius:50%" 
                  data-remove-id="${p.id}">×</button>
        </span>
      `).join('')}
    </div>`;
  }

  function bindEvents() {
    // 세션 정보 저장
    const updateBtn = document.getElementById('updateSessionBtn');
    if (updateBtn) {
      updateBtn.addEventListener('click', () => {
        const name = document.getElementById('sessionName').value.trim();
        const date = document.getElementById('sessionDate').value;
        if (name) {
          Store.updateSession(Store.getCurrentSessionId(), { name, date });
          Utils.showToast('세션 정보 저장됨');
          App.updateSessionInfo();
        }
      });
    }

    // 새 세션
    document.getElementById('newSessionBtn').addEventListener('click', () => {
      const name = prompt('새 세션 이름을 입력하세요:', '새 워크숍');
      if (name) {
        Store.createSession(name);
        Utils.showToast('새 세션 생성됨');
        render();
        App.updateSessionInfo();
      }
    });

    // 세션 전환
    document.querySelectorAll('.switch-session').forEach(btn => {
      btn.addEventListener('click', () => {
        Store.setCurrentSession(btn.dataset.id);
        Utils.showToast('세션 전환됨');
        render();
        App.updateSessionInfo();
      });
    });

    // 세션 복제
    const dupBtn = document.getElementById('duplicateSessionBtn');
    if (dupBtn) {
      dupBtn.addEventListener('click', () => {
        Store.duplicateSession(Store.getCurrentSessionId());
        Utils.showToast('세션 복제됨');
        render();
      });
    }

    // 세션 초기화
    const resetBtn = document.getElementById('resetSessionBtn');
    if (resetBtn) {
      resetBtn.addEventListener('click', async () => {
        const confirmed1 = await Utils.showConfirm('세션의 모든 참가자와 투자 기록이 삭제됩니다. 계속하시겠습니까?');
        if (!confirmed1) return;
        const confirmed2 = await Utils.showConfirm('정말로 초기화하시겠습니까? 이 작업은 되돌릴 수 없습니다.');
        if (!confirmed2) return;

        // 자동 백업
        const backup = Store.exportFullJSON();
        Utils.downloadJSON(backup, `mylife_backup_before_reset_${Date.now()}.json`);

        Store.resetCurrentSession();
        Utils.showToast('세션 초기화 완료 (백업 파일 다운로드됨)');
        render();
      });
    }

    // 세션 삭제
    const delBtn = document.getElementById('deleteSessionBtn');
    if (delBtn) {
      delBtn.addEventListener('click', async () => {
        const confirmed = await Utils.showConfirm('이 세션을 완전히 삭제하시겠습니까?');
        if (!confirmed) return;
        Store.deleteSession(Store.getCurrentSessionId());
        Utils.showToast('세션 삭제됨');
        render();
        App.updateSessionInfo();
      });
    }

    // 참가자 일괄 추가
    document.getElementById('bulkAddBtn').addEventListener('click', () => {
      const input = document.getElementById('bulkParticipants');
      const names = input.value.split(',').map(n => n.trim()).filter(n => n);
      if (names.length === 0) return;
      names.forEach(name => Store.addParticipant(name));
      Utils.showToast(`${names.length}명 추가됨`);
      input.value = '';
      render();
    });

    // 참가자 삭제
    document.getElementById('participantList').addEventListener('click', async e => {
      const btn = e.target.closest('[data-remove-id]');
      if (!btn) return;
      const confirmed = await Utils.showConfirm('이 참가자를 삭제하시겠습니까?');
      if (confirmed) {
        Store.removeParticipant(btn.dataset.removeId);
        Utils.showToast('참가자 삭제됨');
        render();
      }
    });

    // CSV 내보내기
    document.getElementById('exportCSVBtn').addEventListener('click', exportCSV);

    // 참가자별 요약 CSV
    document.getElementById('exportSummaryBtn').addEventListener('click', exportSummaryCSV);

    // JSON 백업
    document.getElementById('exportJSONBtn').addEventListener('click', () => {
      const data = Store.exportFullJSON();
      const session = Store.getCurrentSession();
      const filename = `mylife_backup_${session ? session.name : 'all'}_${new Date().toISOString().slice(0,10)}.json`;
      Utils.downloadJSON(data, filename);
      Utils.showToast('JSON 백업 다운로드됨');
    });

    // JSON 복원
    document.getElementById('importJSONBtn').addEventListener('click', importJSON);
  }

  function exportCSV() {
    const records = Store.getRecords();
    const participants = Store.getParticipants();
    if (records.length === 0) {
      Utils.showToast('내보낼 기록이 없습니다');
      return;
    }

    const headers = ['턴', '참가자', '상품', '투자금액(만원)', '주사위', '결과', '수익금', '손실액', '원금보존액', '입력시각'];
    const rows = records.map(r => {
      const pName = participants.find(p => p.id === r.participantId)?.name || '';
      return [
        r.turn, pName, r.productNameSnapshot, r.amount,
        r.diceValue || '', Utils.resultLabel(r.result),
        r.profitAmount, r.lossAmount, r.preserveAmount,
        Utils.formatDate(r.createdAt)
      ];
    });

    const csv = Utils.toCSV(headers, rows);
    const session = Store.getCurrentSession();
    Utils.downloadFile(csv, `투자내역_${session?.name || ''}_${new Date().toISOString().slice(0,10)}.csv`);
    Utils.showToast('CSV 다운로드됨');
  }

  function exportSummaryCSV() {
    const participants = Store.getParticipants();
    if (participants.length === 0) {
      Utils.showToast('참가자가 없습니다');
      return;
    }

    const headers = ['참가자', '투자횟수', '성공', '실패', '원금보존', '총수익금', '총손실액', '총원금보존', '순수익'];
    const rows = participants.map(p => {
      const s = Store.getParticipantSummary(p.id);
      return [p.name, s.totalCount, s.successCount, s.failCount, s.preserveCount,
              s.totalProfit, s.totalLoss, s.totalPreserve, s.netResult];
    });

    const csv = Utils.toCSV(headers, rows);
    const session = Store.getCurrentSession();
    Utils.downloadFile(csv, `참가자요약_${session?.name || ''}_${new Date().toISOString().slice(0,10)}.csv`);
    Utils.showToast('참가자 요약 CSV 다운로드됨');
  }

  function importJSON() {
    const fileInput = document.getElementById('importJSONFile');
    const file = fileInput.files[0];
    if (!file) {
      Utils.showToast('파일을 선택해 주세요');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = JSON.parse(e.target.result);
        const confirmed = await Utils.showConfirm('현재 데이터를 백업 파일로 덮어씌웁니다. 계속하시겠습니까?');
        if (!confirmed) return;
        Store.importFullJSON(data);
        Utils.showToast('복원 완료');
        render();
        App.updateSessionInfo();
      } catch (err) {
        Utils.showToast('파일 형식이 올바르지 않습니다');
      }
    };
    reader.readAsText(file);
  }

  return { render };
})();
