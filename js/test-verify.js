/**
 * 검수 예시 테스트 - 요청서 14번 기반 검증
 * 브라우저 콘솔에서 TestVerify.runAll() 실행
 */

const TestVerify = (() => {
  let passed = 0;
  let failed = 0;
  const results = [];

  function assert(testName, actual, expected) {
    if (actual === expected) {
      passed++;
      results.push(`✅ ${testName}: ${actual}`);
    } else {
      failed++;
      results.push(`❌ ${testName}: 기대값=${expected}, 실제값=${actual}`);
    }
  }

  function runAll() {
    passed = 0;
    failed = 0;
    results.length = 0;

    testCalculation();
    testProductRules();
    testDiceJudgment();

    console.log('===== 검수 결과 =====');
    results.forEach(r => console.log(r));
    console.log(`\n합계: ${passed}건 통과, ${failed}건 실패`);
    return { passed, failed, results };
  }

  function testCalculation() {
    const 주식형펀드 = { profitRate: 0.16, lossRate: -0.20, profitDice: [1,2,3,6], preserveDice: [4], lossDice: [5] };
    const 고위험ETF = { profitRate: 0.40, lossRate: -0.50, profitDice: [1,2,3,4], preserveDice: [5], lossDice: [6] };

    // 주식형펀드 성공: 1000 × 16% = 160
    let calc = Utils.calculateResult(1000, 주식형펀드, 'success');
    assert('주식형펀드 성공 수익금', calc.profitAmount, 160);
    assert('주식형펀드 성공 손실액', calc.lossAmount, 0);
    assert('주식형펀드 성공 원금보존액', calc.preserveAmount, 0);

    // 주식형펀드 실패: 1000 × (-20%) = -200
    calc = Utils.calculateResult(1000, 주식형펀드, 'fail');
    assert('주식형펀드 실패 수익금', calc.profitAmount, 0);
    assert('주식형펀드 실패 손실액', calc.lossAmount, -200);
    assert('주식형펀드 실패 원금보존액', calc.preserveAmount, 0);

    // 주식형펀드 원금보존: 1000
    calc = Utils.calculateResult(1000, 주식형펀드, 'preserve');
    assert('주식형펀드 원금보존 수익금', calc.profitAmount, 0);
    assert('주식형펀드 원금보존 손실액', calc.lossAmount, 0);
    assert('주식형펀드 원금보존 원금보존액', calc.preserveAmount, 1000);

    // 고위험ETF 성공: 5000 × 40% = 2000
    calc = Utils.calculateResult(5000, 고위험ETF, 'success');
    assert('고위험ETF 성공 수익금', calc.profitAmount, 2000);

    // 고위험ETF 실패: 5000 × (-50%) = -2500
    calc = Utils.calculateResult(5000, 고위험ETF, 'fail');
    assert('고위험ETF 실패 손실액', calc.lossAmount, -2500);
  }

  function testProductRules() {
    const products = Store.getProducts();
    const activeProducts = Store.getActiveProducts();

    // NPL, 크라우드펀드가 초기 목록에 없어야 함
    const npl = activeProducts.find(p => p.name === 'NPL');
    const crowd = activeProducts.find(p => p.name === '크라우드펀드');
    assert('NPL 신규선택 불가', npl, undefined);
    assert('크라우드펀드 신규선택 불가', crowd, undefined);

    // 고위험ETF가 있어야 함
    const etf = activeProducts.find(p => p.name === '고위험ETF');
    assert('고위험ETF 존재', !!etf, true);

    // ETF라는 이름이 없어야 함
    const oldEtf = activeProducts.find(p => p.name === 'ETF');
    assert('ETF 표기 없음', oldEtf, undefined);
  }

  function testDiceJudgment() {
    const 주식형펀드 = { profitDice: [1,2,3,6], preserveDice: [4], lossDice: [5] };
    const 채권형펀드 = { profitDice: [1,2,3,5,6], preserveDice: [4], lossDice: [] };
    const 선물옵션 = { profitDice: [1,2,3], preserveDice: [4], lossDice: [5,6] };

    // 주식형펀드 주사위 판정
    assert('주식형 주사위1=성공', Utils.judgeResult(주식형펀드, 1), 'success');
    assert('주식형 주사위4=원금보존', Utils.judgeResult(주식형펀드, 4), 'preserve');
    assert('주식형 주사위5=실패', Utils.judgeResult(주식형펀드, 5), 'fail');
    assert('주식형 주사위6=성공', Utils.judgeResult(주식형펀드, 6), 'success');

    // 채권형펀드 주사위 판정
    assert('채권형 주사위4=원금보존', Utils.judgeResult(채권형펀드, 4), 'preserve');
    assert('채권형 주사위5=성공', Utils.judgeResult(채권형펀드, 5), 'success');

    // 선물/옵션 주사위 판정
    assert('선물옵션 주사위3=성공', Utils.judgeResult(선물옵션, 3), 'success');
    assert('선물옵션 주사위4=원금보존', Utils.judgeResult(선물옵션, 4), 'preserve');
    assert('선물옵션 주사위5=실패', Utils.judgeResult(선물옵션, 5), 'fail');
    assert('선물옵션 주사위6=실패', Utils.judgeResult(선물옵션, 6), 'fail');
  }

  return { runAll };
})();
