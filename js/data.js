/**
 * 초기 상품 데이터 및 상수 정의
 */

const DEFAULT_PRODUCTS = [
  {
    id: 'prod-01',
    name: '정기적금',
    profitRate: 0.06,
    lossRate: 0,
    earlyTermRate: 0.03,
    profitDice: [1, 2, 3, 4, 5, 6],
    preserveDice: [],
    lossDice: [],
    isActive: true,
    sortOrder: 1,
  },
  {
    id: 'prod-02',
    name: '청약저축',
    profitRate: 0.06,
    lossRate: 0,
    earlyTermRate: 0.03,
    profitDice: [1, 2, 3, 4, 5, 6],
    preserveDice: [],
    lossDice: [],
    isActive: true,
    sortOrder: 2,
  },
  {
    id: 'prod-03',
    name: '채권형펀드',
    profitRate: 0.08,
    lossRate: 0,
    earlyTermRate: 0.04,
    profitDice: [1, 2, 3, 5, 6],
    preserveDice: [4],
    lossDice: [],
    isActive: true,
    sortOrder: 3,
  },
  {
    id: 'prod-04',
    name: '주식형펀드',
    profitRate: 0.16,
    lossRate: -0.20,
    earlyTermRate: 0.08,
    profitDice: [1, 2, 3, 6],
    preserveDice: [4],
    lossDice: [5],
    isActive: true,
    sortOrder: 4,
  },
  {
    id: 'prod-05',
    name: '고위험ETF',
    profitRate: 0.40,
    lossRate: -0.50,
    earlyTermRate: 0.20,
    profitDice: [1, 2, 3, 4],
    preserveDice: [5],
    lossDice: [6],
    isActive: true,
    sortOrder: 5,
  },
  {
    id: 'prod-06',
    name: '선물/옵션',
    profitRate: 0.60,
    lossRate: -0.60,
    earlyTermRate: 0.30,
    profitDice: [1, 2, 3],
    preserveDice: [4],
    lossDice: [5, 6],
    isActive: true,
    sortOrder: 6,
  },
];

// 턴/분기 기본 목록
const DEFAULT_TURNS = Array.from({ length: 20 }, (_, i) => `Q${i + 1}`);

// 삭제된 상품 (가져오기 시 과거 기록 보존용)
const LEGACY_PRODUCTS = ['NPL', '크라우드펀드'];

// ETF → 고위험ETF 매핑
const PRODUCT_NAME_MAP = {
  'ETF': '고위험ETF',
};

// 결과값 매핑 (엑셀 가져오기용)
const RESULT_MAP = {
  'o': 'success',
  'O': 'success',
  '성공': 'success',
  'x': 'fail',
  'X': 'fail',
  '실패': 'fail',
  '원금보존': 'preserve',
  '원금': 'preserve',
};
