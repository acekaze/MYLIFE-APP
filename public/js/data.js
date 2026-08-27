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
    case 'earlyTerm':
      return { profitAmount: Math.round(amount * (product.earlyTermRate || 0)), lossAmount: 0, preserveAmount: 0 };
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
    case 'earlyTerm': return '중도해약(수익)';
    case 'earlyTermFail': return '중도해약(손실)';
    case 'pending': return '진행중';
    default: return '';
  }
}

// 결과 배지
function resultBadge(result, settledBy) {
  const label = resultLabel(result);
  const cls = result === 'success' ? 'chip-success' :
              result === 'fail' ? 'chip-fail' :
              result === 'preserve' ? 'chip-preserve' :
              result === 'earlyTerm' ? 'bg-brand-orange-light text-brand-orange' :
              result === 'earlyTermFail' ? 'bg-brand-red-light text-brand-red' :
              'bg-brand-orange-light text-brand-orange';
  let badge = `<span class="${cls} px-2 py-0.5 rounded-full text-[11px] font-bold">${label}</span>`;
  if (settledBy === 'worldEvent') {
    badge += `<span class="bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full text-[10px] font-bold ml-1">⚡이벤트</span>`;
  }
  if (settledBy === 'gameEnd') {
    badge += `<span class="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-[10px] font-bold ml-1">종료정산</span>`;
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
function animateDice(container, finalValue, callback) {
  let count = 0;
  const totalFrames = 18;
  container.style.transition = 'transform 0.08s';

  // 실제 주사위 굴리기 사운드 재생
  const basePath = window.location.pathname.includes('/player/') ? '../' :
                   window.location.pathname.includes('/master/') ? '../' : '';
  const diceAudio = new Audio(basePath + 'dice-roll.mp3');
  diceAudio.volume = 0.7;
  diceAudio.play().catch(() => {}); // 자동재생 차단 시 무시

  // 배경 펄스 효과
  container.parentElement?.classList.add('dice-rolling');

  const interval = setInterval(() => {
    count++;
    const randomVal = Math.floor(Math.random() * 6) + 1;
    container.textContent = randomVal;

    // 속도 점점 느려지는 효과
    const progress = count / totalFrames;
    const shake = (1 - progress) * 15;
    const rotation = (Math.random() - 0.5) * shake * 2;
    const scale = 1 + (Math.random() * 0.3) * (1 - progress);
    container.style.transform = `scale(${scale}) rotate(${rotation}deg)`;

    if (count >= totalFrames) {
      clearInterval(interval);
      container.textContent = finalValue;
      container.style.transform = 'scale(1.4)';
      container.style.transition = 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)';

      // 결과 팡 효과
      addBurstEffect(container);

      setTimeout(() => {
        container.style.transform = 'scale(1.1)';
        container.parentElement?.classList.remove('dice-rolling');
        setTimeout(() => {
          container.style.transform = 'scale(1)';
          container.style.transition = 'transform 0.08s';
          if (callback) callback(finalValue);
        }, 200);
      }, 400);
    }
  }, 70 + (count * 3));
}

// 팡 터지는 파티클 효과
function addBurstEffect(container) {
  const rect = container.getBoundingClientRect();
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;

  const colors = ['#3182F6', '#00C48C', '#FF9F0A', '#FF4D4D', '#8B5CF6', '#FFD700'];
  const particles = 12;

  for (let i = 0; i < particles; i++) {
    const particle = document.createElement('div');
    const angle = (i / particles) * Math.PI * 2;
    const distance = 40 + Math.random() * 30;
    const size = 6 + Math.random() * 6;

    particle.style.cssText = `
      position: fixed; z-index: 99999;
      width: ${size}px; height: ${size}px;
      background: ${colors[i % colors.length]};
      border-radius: 50%;
      left: ${centerX}px; top: ${centerY}px;
      pointer-events: none;
      transition: all 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94);
      opacity: 1;
    `;
    document.body.appendChild(particle);

    requestAnimationFrame(() => {
      particle.style.transform = `translate(${Math.cos(angle) * distance}px, ${Math.sin(angle) * distance}px)`;
      particle.style.opacity = '0';
    });

    setTimeout(() => particle.remove(), 700);
  }
}

// 주사위 랜덤 굴리기 (애니메이션 포함)
function rollDiceWithAnimation(displayEl, callback) {
  const finalValue = Math.floor(Math.random() * 6) + 1;
  displayEl.style.transition = 'transform 0.08s';
  animateDice(displayEl, finalValue, callback);
  return finalValue;
}
