/**
 * 게임 데이터 상수
 */

const PRODUCTS = [
  {
    id: 'bond-fund',
    name: '채권형펀드',
    profitRate: 0.08,
    lossRate: 0,
    earlyTermRate: 0.04,
    profitDice: [1, 2, 3, 5, 6],
    preserveDice: [4],
    lossDice: [],
    minAmount: 500,
    description: '안정적 수익, 손실 없음',
  },
  {
    id: 'stock-fund',
    name: '주식형펀드',
    profitRate: 0.16,
    lossRate: -0.20,
    earlyTermRate: 0.08,
    profitDice: [1, 2, 3, 6],
    preserveDice: [4],
    lossDice: [5],
    minAmount: 500,
    description: '중위험 중수익',
  },
  {
    id: 'high-etf',
    name: '고위험ETF',
    profitRate: 0.40,
    lossRate: -0.50,
    earlyTermRate: 0.20,
    profitDice: [1, 2, 3, 4],
    preserveDice: [5],
    lossDice: [6],
    minAmount: 500,
    description: '고위험 고수익',
  },
  {
    id: 'futures',
    name: '선물/옵션',
    profitRate: 0.60,
    lossRate: -0.60,
    earlyTermRate: 0.30,
    profitDice: [1, 2, 3],
    preserveDice: [4],
    lossDice: [5, 6],
    minAmount: 500,
    description: '최고위험 최고수익',
  },
];

// 만기까지 필요한 턴 수
const MATURITY_TURNS = 4;

// 주사위 판정
function judgeResult(product, diceValue) {
  if (product.profitDice.includes(diceValue)) return 'success';
  if (product.preserveDice.includes(diceValue)) return 'preserve';
  if (product.lossDice.includes(diceValue)) return 'fail';
  return 'success';
}

// 수익/손실 계산
function calculateResult(amount, product, result) {
  switch (result) {
    case 'success':
      return { profitAmount: Math.round(amount * product.profitRate), lossAmount: 0, preserveAmount: 0 };
    case 'fail':
      return { profitAmount: 0, lossAmount: Math.round(amount * product.lossRate), preserveAmount: 0 };
    case 'preserve':
      return { profitAmount: 0, lossAmount: 0, preserveAmount: amount };
    default:
      return { profitAmount: 0, lossAmount: 0, preserveAmount: 0 };
  }
}

// 상품 ID로 찾기
function getProductById(id) {
  return PRODUCTS.find(p => p.id === id) || null;
}

// 금액 포맷
function formatAmount(num) {
  if (!num && num !== 0) return '0';
  return num.toLocaleString('ko-KR');
}

// 결과 라벨
function resultLabel(result) {
  switch (result) {
    case 'success': return '성공';
    case 'fail': return '실패';
    case 'preserve': return '원금보존';
    case 'pending': return '진행중';
    default: return '';
  }
}

// 결과 배지
function resultBadge(result, settledBy) {
  const label = resultLabel(result);
  const cls = result === 'success' ? 'chip-success' :
              result === 'fail' ? 'chip-fail' :
              result === 'preserve' ? 'chip-preserve' : 'bg-brand-orange-light text-brand-orange';
  let badge = `<span class="${cls} px-2 py-0.5 rounded-full text-[11px] font-bold">${label}</span>`;
  if (settledBy === 'worldEvent') {
    badge += `<span class="bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full text-[10px] font-bold ml-1">⚡이벤트</span>`;
  }
  return badge;
}

// 주사위 판정 표시 HTML (상품 카드용)
function diceInfoHTML(product) {
  let lines = [];
  if (product.profitDice.length > 0) {
    lines.push(`<span style="color:var(--success)">성공: ${product.profitDice.join(',')}</span>`);
  }
  if (product.preserveDice.length > 0) {
    lines.push(`<span style="color:var(--preserve)">원금보존: ${product.preserveDice.join(',')}</span>`);
  }
  if (product.lossDice.length > 0) {
    lines.push(`<span style="color:var(--danger)">실패: ${product.lossDice.join(',')}</span>`);
  }
  return lines.join(' · ');
}

// 토스트
function showToast(message, duration = 2000) {
  let toast = document.getElementById('toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    toast.className = 'toast hidden';
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.classList.remove('hidden');
  toast.style.opacity = '1';
  setTimeout(() => { toast.style.opacity = '0'; }, duration);
}

// 주사위 굴리기 애니메이션
// container: 숫자가 표시될 DOM 요소
// finalValue: 최종 주사위 값 (1~6)
// callback: 애니메이션 완료 후 실행할 함수
function animateDice(container, finalValue, callback) {
  let count = 0;
  const totalFrames = 15;
  const interval = setInterval(() => {
    count++;
    const randomVal = Math.floor(Math.random() * 6) + 1;
    container.textContent = randomVal;
    container.style.transform = `scale(${1 + Math.random() * 0.2}) rotate(${Math.random() * 20 - 10}deg)`;

    if (count >= totalFrames) {
      clearInterval(interval);
      container.textContent = finalValue;
      container.style.transform = 'scale(1.2)';
      setTimeout(() => {
        container.style.transform = 'scale(1)';
        if (callback) callback(finalValue);
      }, 200);
    }
  }, 80);
}

// 주사위 랜덤 굴리기 (애니메이션 포함) - 버튼 엘리먼트에서 사용
function rollDiceWithAnimation(displayEl, callback) {
  const finalValue = Math.floor(Math.random() * 6) + 1;
  displayEl.style.transition = 'transform 0.1s';
  animateDice(displayEl, finalValue, callback);
  return finalValue;
}
