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
function resultBadge(result) {
  const label = resultLabel(result);
  const cls = result === 'success' ? 'badge-success' :
              result === 'fail' ? 'badge-fail' :
              result === 'preserve' ? 'badge-preserve' : 'badge-pending';
  return `<span class="badge ${cls}">${label}</span>`;
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
  setTimeout(() => toast.classList.add('hidden'), duration);
}
