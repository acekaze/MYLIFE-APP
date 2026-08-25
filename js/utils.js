/**
 * 유틸리티 함수
 */

const Utils = (() => {

  // 숫자를 천 단위 구분 표시 (만 원 단위)
  function formatAmount(num) {
    if (num === 0 || num === null || num === undefined) return '0';
    return num.toLocaleString('ko-KR');
  }

  // 퍼센트 표시
  function formatPercent(rate) {
    return (rate * 100).toFixed(0) + '%';
  }

  // 주사위 판정
  function judgeResult(product, diceValue) {
    if (!diceValue || !product) return null;
    if (product.profitDice.includes(diceValue)) return 'success';
    if (product.preserveDice.includes(diceValue)) return 'preserve';
    if (product.lossDice.includes(diceValue)) return 'fail';
    return 'success'; // 기본값 (정기적금 등)
  }

  // 투자 결과 계산
  function calculateResult(amount, product, result) {
    switch (result) {
      case 'success':
        return {
          profitAmount: Math.round(amount * product.profitRate),
          lossAmount: 0,
          preserveAmount: 0,
        };
      case 'fail':
        return {
          profitAmount: 0,
          lossAmount: Math.round(amount * product.lossRate),
          preserveAmount: 0,
        };
      case 'preserve':
        return {
          profitAmount: 0,
          lossAmount: 0,
          preserveAmount: amount,
        };
      default:
        return { profitAmount: 0, lossAmount: 0, preserveAmount: 0 };
    }
  }

  // 결과 한글 표시
  function resultLabel(result) {
    switch (result) {
      case 'success': return '성공';
      case 'fail': return '실패';
      case 'preserve': return '원금보존';
      default: return '';
    }
  }

  // 결과 배지 HTML
  function resultBadge(result) {
    const label = resultLabel(result);
    const cls = result === 'success' ? 'badge-success' :
                result === 'fail' ? 'badge-fail' : 'badge-preserve';
    return `<span class="badge ${cls}">${label}</span>`;
  }

  // 토스트 메시지
  function showToast(message, duration = 2000) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.classList.remove('hidden');
    setTimeout(() => toast.classList.add('hidden'), duration);
  }

  // 확인 모달
  function showConfirm(message) {
    return new Promise(resolve => {
      const modal = document.getElementById('confirmModal');
      const msg = document.getElementById('confirmMessage');
      const yes = document.getElementById('confirmYes');
      const no = document.getElementById('confirmNo');
      msg.textContent = message;
      modal.classList.remove('hidden');
      const cleanup = () => {
        modal.classList.add('hidden');
        yes.removeEventListener('click', onYes);
        no.removeEventListener('click', onNo);
      };
      const onYes = () => { cleanup(); resolve(true); };
      const onNo = () => { cleanup(); resolve(false); };
      yes.addEventListener('click', onYes);
      no.addEventListener('click', onNo);
    });
  }

  // 주사위 표시 HTML
  function diceDisplay(product) {
    if (!product) return '';
    let html = '<div class="dice-display">';
    for (let i = 1; i <= 6; i++) {
      let cls = 'dice-num ';
      if (product.profitDice.includes(i)) cls += 'dice-profit';
      else if (product.preserveDice.includes(i)) cls += 'dice-preserve';
      else if (product.lossDice.includes(i)) cls += 'dice-loss';
      html += `<span class="${cls}">${i}</span>`;
    }
    html += '</div>';
    return html;
  }

  // 날짜 포맷
  function formatDate(isoString) {
    if (!isoString) return '';
    const d = new Date(isoString);
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
  }

  // CSV 생성
  function toCSV(headers, rows) {
    const escape = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const lines = [headers.map(escape).join(',')];
    rows.forEach(row => lines.push(row.map(escape).join(',')));
    return '\ufeff' + lines.join('\n'); // BOM for Korean
  }

  // 파일 다운로드
  function downloadFile(content, filename, type = 'text/csv') {
    const blob = new Blob([content], { type: type + ';charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // JSON 다운로드
  function downloadJSON(data, filename) {
    downloadFile(JSON.stringify(data, null, 2), filename, 'application/json');
  }

  // 금액 입력 시 숫자만 추출
  function parseAmount(value) {
    const num = parseInt(String(value).replace(/[^0-9]/g, ''), 10);
    return isNaN(num) ? 0 : num;
  }

  return {
    formatAmount,
    formatPercent,
    judgeResult,
    calculateResult,
    resultLabel,
    resultBadge,
    showToast,
    showConfirm,
    diceDisplay,
    formatDate,
    toCSV,
    downloadFile,
    downloadJSON,
    parseAmount,
  };
})();
