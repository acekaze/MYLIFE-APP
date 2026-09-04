# My Life 투자 보드게임 앱 — 인수인계 문서

이 문서는 다른 개발자/에이전트가 이 앱을 이어받아 개선할 수 있도록 정리한 것이다.
아래를 먼저 읽고, 실제 코드를 확인한 뒤 작업할 것.

---

## 1. 이 앱이 뭔가

기업 워크숍용 **My Life 보드게임**의 "투자 파트"를 담당하는 웹앱이다.

- 전체 보드게임: 직장 1년차 신입이 20턴(=5년)을 살며 시간·자산을 배분해 고과/연봉/투자/버킷리스트를 운영. 2시간 30분 플레이 + 30분 성찰.
- **이 앱의 범위: 투자를 통한 자산증식 파트만.** (연봉협상, 시간토큰, 업무능력, 버킷리스트, 청약추첨 등은 앱 범위 밖)
- 게임 철학: "자신만의 기준으로 원하는 삶을 설계한다." → **순위·경쟁으로 줄 세우지 않는다.** 참가자에게는 개인 지표만 보여준다. (관리자용 랭킹은 별개로 존재)

## 2. 사용자 3역할

| 역할 | 화면 | 기기 | 하는 일 |
|------|------|------|---------|
| 참가자 | `/player/` | 개인 폰 | 상품 선택 + 금액 입력, 만기 시 주사위 굴림 |
| 관리자(총관리자/트레이너) | `/master/` | 진행자 PC | 세션·팀·턴 관리, 월드이벤트, 최종 산출 |
| (진입) | `/` | - | 로고 + 관리자 로그인 진입만 (참가자는 QR로 직접 `/player/` 접속) |

## 3. 기술 스택

- **순수 HTML + Vanilla JS + Tailwind CDN** (빌드 과정 없음, npm 사용 안 함)
- **Firebase Realtime Database** (실시간 동기화)
- 호스팅: **Vercel** (GitHub `acekaze/MYLIFE-APP` main 브랜치 자동 배포, 1~2분 소요)
- 폰트: Hanken Grotesk, 아이콘: Material Symbols
- 디자인 톤: **토스(Toss) 스타일 + 벤토 그리드**. 배경 #F5F6F8, 카드 흰색 radius 16px, primary #3182F6, 성공 #00C48C, 실패 #FF4D4D, 원금보존/이벤트 #8B5CF6, 대기/경고 #FF9F0A

## 4. 파일 구조

```
public/
├── index.html          진입 페이지 (로고 + 관리자 로그인)
├── logo.png            로고 이미지
├── dice-roll.mp3       주사위 사운드
├── css/common.css      (구버전 스타일 잔재 — 현재는 Tailwind 위주)
├── js/
│   ├── tailwind-config.js   Tailwind 커스텀 컬러/폰트/토큰
│   ├── firebase-config.js   Firebase 설정 (실 프로젝트 키 들어있음)
│   └── data.js              상품 상수 + 계산/판정 + 유틸 + 연출 함수
├── player/
│   ├── index.html
│   └── player.js       참가자 뷰 전체 (약 680줄)
└── master/
    ├── index.html
    └── master.js       관리자 뷰 전체 (약 1460줄)
docs/
├── stitch-prompts.md   초기 디자인 프롬프트
└── HANDOFF.md          이 문서
```

## 5. 데이터 구조 (Firebase Realtime DB)

```
sessions/{CODE}/
  name, code, createdAt
  ownerId, ownerName          # 세션 소유자 (master 또는 트레이너 tid)
  state/
    currentTurn               # 현재 턴 (1부터)
    maxTurns                  # 최대 턴 (기본 20, 관리자 조정 가능)
    phase                     # 'investing' | 'quarterClosing' | 'settling' | 'finalSettling' | 'ended'
    autoTurn                  # 자동 턴 넘기기 on/off
    gameEnded                 # 종료 여부
  teams/{teamId}/             # name, createdAt
  players/{playerId}/         # name, teamId, joinedAt
  investments/{invId}/
    playerId, playerName, teamId
    turn, productId, productName, amount
    profitRate, lossRate      # 저장 당시 스냅샷
    maturityTurn              # turn + MATURITY_TURNS(4)
    status, result            # result: pending|success|fail|preserve|earlyTerm|earlyTermFail
    diceValue
    profitAmount, lossAmount, preserveAmount
    settledBy, finalSettlementFactor  # gameEnd 시 정산 비율(최소 25%)
    createdAt, settledAt
  skips/{turn}_{playerId}/    # 해당 턴 '투자 안 함' 기록
  preInvestmentChecks/{turn}_{playerId}/
    playerId, turn, completedAt  # 투자 전 단계 완료 확인
  bucketRecords/{playerId}/{period}/
    period, turn, bucketCount, bucketScore, updatedAt  # 4턴 단위 버킷 기록
  finalCash/{playerId}/
    amount, discardedTimeCount, turn, updatedAt  # 최종 턴 종료 전 참가자별 남은 현금(만원)과 버린 시간 개수
  eventAdjustments/{adjustmentId}/
    eventId, investmentId, playerId, productId, amount  # 강제 손실 등 투자와 분리된 이벤트 손익
  worldEvents/{eventId}/      # 월드이벤트 기록
    effectType, productNames, targetCount, affectedCount
    dice | fixedLossAmount, totalLossAmount  # 효과별 추가 정보

trainers/{base64(name_pin)}/
  name, tid, status           # status: pending|approved|rejected
  appliedAt
```

## 6. 게임 규칙 (data.js에 구현됨)

### 상품 4종 (초기값)
| 상품 | 수익률 | 손실률 | 성공 주사위 | 보존 | 실패 | 최소금액 |
|------|--------|--------|------|------|------|------|
| 채권형펀드 | 4% | 0% | 1,2,3,5,6 | 4 | - | 500 |
| 주식형펀드 | 8% | -10% | 1,2,3,6 | 4 | 5 | 500 |
| 고위험ETF | 20% | -30% | 1,2,3,4 | 5 | 6 | 500 |
| 선물/옵션 | 30% | -40% | 1,2,3 | 4 | 5,6 | 500 |

### 핵심 규칙
- 만기: 투자 후 **4턴 경과**(MATURITY_TURNS)
- 최소 투자금액: 전 상품 **500만 원**
- 한 턴에 **여러 번 투자 가능**, "투자 안 함"도 선택 가능
- 계산: 성공=금액×수익률(수익금만, 원금 별도), 실패=금액×손실률(음수), 원금보존=금액
- 게임 종료(최종 턴) 시 미만기 투자는 주사위 굴려 **경과 기간 비율 정산**: 17턴=75%, 18턴=50%, 19턴=25%, 20턴=25%(최소 적용). 성공·실패에 같은 비율을 적용하고, 보존은 원금
- 월드이벤트: 관리자가 종목 선택 후 주사위 즉시 정산, 영향 없이 기록, 투자 건당 강제 손실 중 효과 선택. 강제 손실은 투자를 계속 유지하고 별도 이벤트 손익으로 최종 결과에 합산

## 7. 관리자 로그인/권한

- **총관리자 마스터 PIN: `848614`** (master.js 상단 `MASTER_PIN` 상수) → 전체 세션 조회/관리 + 트레이너 승인
- **트레이너**: 이름+PIN 신청 → 총관리자 승인 후 로그인, 본인 세션(ownerId 일치)만 조회
- 인증은 간이 방식(Firebase 평문 저장). 진짜 보안 아님 — 운영 편의용.

## 8. 화면별 기능 요약

### 참가자 (`player/player.js`)
- 로그인: 세션코드(QR로 자동)+이름+팀 선택
- 헤더 로고 + 이름·팀, 턴 진행률 바
- 순수익 히어로(큰 숫자), 상품 선택 그리드, 투자 폼, "투자 안 함"
- 만기 도래 시 주사위 굴리기(직접 선택 또는 랜덤 애니메이션+사운드)
- 진행 중/완료 투자 목록, "내 결과 공유하기"(개인 지표만, 순위 없음)
- 연출: 성공 축하(색종이), 턴 전환("턴 N"), 게임 종료("당신의 5년")
- 분기 마감: 4·8·12·16턴 투자 완료 후 다음 턴으로 넘기기 전 `quarterClosing` 상태에서 해당 연차 버킷 개수·만족도 점수를 입력. 누락 항목은 참가자 화면에서 추후 보완 가능
- 최종 기록: 20턴 투자와 최종 정산이 끝나 게임이 종료된 뒤 5년차 버킷 개수·만족도 점수, 남은 현금, 버린 시간 개수를 입력
- 현황·최종 산출: 참가자 화면은 본인 누적 버킷 개수·만족도 점수와 최종 기록, 관리자 화면은 참가자별·팀별·전체 현황과 최종 산출의 개인별 버킷·만족도·현금·버린 시간 종합을 표시

### 관리자 (`master/master.js`)
- 로그인 → 세션 목록(전체/본인) + 트레이너 승인 관리 + 세션 삭제/종료세션 일괄정리
- 사이드바 탭: 현황 / 만기 정산 / 월드 이벤트 / 전체 내역 / 팀 관리 / 최종 산출
- 현황: 참가자·완료 카운트, 팀별 현황, 미완료자 대리처리(투자안함/대리투자), 접속 URL+QR
- 만기 정산: 대리 정산(주사위), 최근 정산 목록
- 월드 이벤트: 종목 선택 → 통합 주사위 → 즉시 정산 + 히스토리
- 팀 관리: 일괄 생성(숫자), 참가자 재배치, 개별/전체 삭제
- 최종 산출: 전체 순수익 랭킹(포디움) + 팀 내 1위(순수익/투자횟수/손실/투자액)
- 턴 관리: 다음 턴 / 자동 턴 넘기기(10초 카운트다운) / 게임 종료(→finalSettling→ended)

## 9. 알려진 주의사항 / 함정

1. **Firebase 쿼리**: `orderByChild().equalTo()`가 인덱스 없이 불안정해서 참가자 완료투자가 1건만 뜨던 버그가 있었음. → **전체 investments를 받아 JS로 필터**하는 방식으로 통일함. 새 조회 추가 시 같은 방식 쓸 것.
2. **경로**: player/master가 `../logo.png`, `../dice-roll.mp3`처럼 상위 참조. 새 하위폴더 만들면 경로 주의.
3. **연출 함수**는 data.js에 있고 `formatAmount` 등에 의존. data.js가 먼저 로드돼야 함 (HTML script 순서 유지).
4. **배포 지연**: Vercel 반영에 1~2분(가끔 더). 확인 시 강력 새로고침/시크릿 모드.
5. **커밋 규칙**: 이 환경에선 `git push`까지만. Vercel이 자동 배포. `gh pr create` 안 됨(REST API 써야 함).
6. **preview 폴더 패턴**: 큰 UI 변경은 `public/preview/`에 정적 데모를 먼저 만들어 사용자 확인 후 실제 반영하는 흐름을 써왔음. 결정 전 삭제하지 말 것.

## 10. 아직 안 한 것 / 개선 후보

- 실제 4인 테스트 세션 미실시 (기능은 다 만들었으나 현장 검증 전)
- 참가자 화면에 "가용 자산" 맥락 표시 (전체 게임의 자원배분 딜레마 반영 — 현재 이 앱은 투자만 다뤄서 없음)
- 빠른 재투자 UX (같은 상품 원클릭)
- 진행 중 투자에 "시장 분위기" 힌트
- PWA manifest (홈화면 추가 아이콘) — logo.png 있으나 manifest 미설정
- CSV/XLSX 내보내기 (구버전엔 있었으나 재설계 때 빠짐, 필요 시 복원)
- Firebase 보안 규칙 강화 (현재 테스트 모드 가정)

## 11. 작업 원칙 (사용자 선호)

- 기존 기능/구조를 먼저 읽고 수정할 것. 합의 없이 새 기능으로 범위 키우지 말 것.
- 큰 시각 변경은 preview로 먼저 보여주고 확인받을 것.
- 게임 철학(비경쟁, 자기 기준) 위배되는 UI(순위 강조 등) 지양.
- 모든 커뮤니케이션 한국어.
