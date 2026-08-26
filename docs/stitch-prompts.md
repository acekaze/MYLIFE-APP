# Google Stitch 프롬프트 — My Life 투자 보드게임

## 디자인 톤

Toss(토스) 스타일. 벤토 그리드 레이아웃. 둥근 카드, 넉넉한 여백, 큰 숫자 강조, 미니멀 아이콘, 부드러운 그림자. 배경은 연한 그레이(#F5F6F8), 카드는 흰색. 포인트 컬러는 파란색(#3182F6). 성공은 초록(#00C48C), 실패는 빨강(#FF4D4D), 원금보존은 보라(#8B5CF6). 폰트는 굵은 산세리프. 수치는 크고 굵게.

---

## 프롬프트 1: 참가자 — 진입 화면 (모바일)

```
Mobile app login screen, 390px width, Korean UI.

Top: centered title "My Life" in bold 28px, subtitle "투자 보드게임" in gray 14px below.

Below title: white rounded card (border-radius 16px, padding 24px) with:
- Label "세션 코드" + text input (large, uppercase, gray border, rounded)
- Label "이름" + text input
- Label "팀 선택" + dropdown select
- Blue button full width "입장" (background #3182F6, white text, rounded 12px, height 52px)

Background: #F5F6F8. Toss-style minimal design. No icons. Clean spacing 16px between elements.
```

---

## 프롬프트 2: 참가자 — 상품 선택 + 투자 (모바일)

```
Mobile investment screen, 390px width, Korean UI, Toss-style bento grid.

Top sticky header: blue bar (#3182F6) with "My Life 투자" left, user name "홍길동" right.

Below header: status strip showing "턴 3" badge (white text on blue pill) and "투자 접수 중" text.

Main content (padding 16px, background #F5F6F8):

Product selection as bento grid (2 columns):
- Card 1: "채권형펀드" — green tag "+8%", subtitle "손실 없음", small dice info "성공 1,2,3,5,6 · 보존 4"
- Card 2: "주식형펀드" — green "+16%", red "-20%", dice info "성공 1,2,3,6 · 보존 4 · 실패 5"
- Card 3: "고위험ETF" — green "+40%", red "-50%", dice info "성공 1,2,3,4 · 보존 5 · 실패 6"
- Card 4: "선물/옵션" — green "+60%", red "-60%", dice info "성공 1,2,3 · 보존 4 · 실패 5,6"

Each card: white background, border-radius 16px, padding 16px, subtle shadow. Selected state: blue border 2px + light blue background.

Below grid: amount input section (hidden until product selected):
- Large number input aligned right, suffix "만 원", font-size 28px bold
- Helper text "최소 500만 원" in gray 12px
- Blue full-width button "투자하기" (52px height, rounded 12px)
- Below: secondary gray button "이번 턴 투자 안 함"

No decorative elements. Generous whitespace. Toss-like clean aesthetic.
```

---

## 프롬프트 3: 참가자 — 투자 현황 (모바일)

```
Mobile portfolio screen, 390px width, Korean UI, Toss-style.

Top section: Bento grid stats (2x2):
- Card: large "5" + label "총 투자"
- Card: large "2" in orange + label "진행중"
- Card: "+1,200" in green + label "총 수익"
- Card: "-500" in red + label "총 손실"

Each stat card: white, rounded 16px, centered, padding 20px, large bold number (24px), small gray label (12px).

Middle section: "진행 중인 투자" card:
- List items with left: product name bold + "턴 3 → 턴 7 만기" in gray
- Right: "2,000만 원" bold + "만기까지 4턴" in orange small text
- Divider line between items

Bottom section: "완료된 투자" card:
- Simple table rows: 턴 | 상품 | 금액 | 결과(colored badge) | 수익/손실
- Bottom summary row: "순수익" left, "+700만 원" right in green bold 20px

Clean white cards on #F5F6F8 background. No borders on table. Subtle row separators only.
```

---

## 프롬프트 4: 참가자 — 주사위 정산 (모바일)

```
Mobile dice rolling screen, 390px width, Korean UI, Toss-style.

Alert-style card at top with orange/yellow left border and warm background (#FFF8E6):
- Title "🎲 만기 도래! 주사위를 굴려주세요" bold 16px
- Below: investment info "주식형펀드 | 2,000만 원 | 턴3→턴7"
- Dice result guide: colored text "성공 1,2,3,6" green · "보존 4" purple · "실패 5" red

Dice buttons row: 6 square buttons (56x56px each), rounded 12px, white background, gray border. Numbers 1-6 centered. Color-coded: green border for success numbers, purple for preserve, red for fail. On tap: selected state with filled background.

Below dice: result preview area (shows after selection):
- Large result text "성공! +320만 원" in green bold 24px centered

Spacious layout. Each section clearly separated. Toss-like micro-interactions feel.
```

---

## 프롬프트 5: 관리자 — 현황 대시보드 (데스크톱)

```
Desktop admin dashboard, 1280px width, Korean UI, Toss-style bento grid layout.

Top bar: dark gray (#1B1D1F) header with "My Life — 3월 워크숍" white bold left, "코드: ABC123 | 4팀 16명" gray right, exit button far right.

Below: status strip — "턴 5" blue pill badge, "투자 접수 중" text, "다음 턴 →" blue button right side (disabled/gray when not all done).

Main content (padding 24px, background #F5F6F8):

Bento grid layout (mixed sizes):
- Large card (spans 2 cols): "팀별 현황" — 4 rows showing team name, progress bar (done/total), "완료" green badge or "대기" orange badge
- Small card top-right: "참가자" large "16" + label
- Small card: "이번 턴 완료" large "12/16"
- Small card: "만기 대기" large "3" in orange

Below: "미완료 참가자" card — list with name, team tag, two buttons: "투자 안 함" gray, "대리 투자" blue small

Bottom: "접속 URL" card with monospace URL text + "복사" button

Cards: white, rounded 16px, padding 20px, subtle shadow. Numbers are 28-32px bold. Labels 13px gray. Grid gap 16px.
```

---

## 프롬프트 6: 관리자 — 만기 정산 (데스크톱)

```
Desktop settlement screen, 1280px width, Korean UI, Toss-style.

Header and tabs same as dashboard. Active tab "만기 정산" with count badge "(5)".

Main content:

Top action bar: "정산 대기 5건" bold left, "전체 주사위 굴리기" green button right.
Helper text below: "참가자가 직접 입력합니다. 대리 정산도 가능합니다." in gray 13px.

Settlement cards (stacked, full width):
Each card (white, rounded 16px, padding 20px):
- Left section: "홍길동" bold name + "주식형펀드 | 2,000만 원" gray info + badge "턴3→7"
- Center: dice info colored (성공 green, 보존 purple, 실패 red) in small text
- Right: 6 dice buttons in a row (48x48, numbered, color-coded borders)

Below settlement cards: "최근 정산 완료" section:
- Clean table: 참가자 | 상품 | 주사위 | 결과(badge) | 수익/손실
- Alternating very light gray rows

Generous spacing between cards. Professional but game-friendly.
```

---

## 프롬프트 7: 관리자 — 최종 산출 / 랭킹 (데스크톱)

```
Desktop ranking screen, 1280px width, Korean UI, Toss-style celebration design.

Header same as dashboard. Active tab "최종 산출".

Top section: "🏆 전체 순수익 랭킹" title.

Podium-style top 3:
- Bento grid 3 cards in a row (equal width):
  - 1st place: gold accent border, "🥇" emoji, large name "김철수", team "1조", amount "+4,200" green bold 28px
  - 2nd place: silver accent, "🥈", name, team, amount
  - 3rd place: bronze accent, "🥉", name, team, amount

Below: full ranking table (4th place onwards):
- # | 이름 | 팀 | 투자 횟수 | 순수익 (green/red colored)

Bottom section: Team awards bento grid (2x2 cards):
- "1조 팀 내 1위" card — table: 순수익 1위(name, amount) / 투자횟수 1위 / 손실 1위 / 투자액 1위
- Same for 2조, 3조, 4조

Award cards: white with subtle colored left border (each team different color). Clean tables inside. Bold names, right-aligned numbers.

Celebratory but not childish. Toss-level polish.
```

---

## 프롬프트 8: 관리자 — 팀 관리 (데스크톱)

```
Desktop team management screen, 1280px width, Korean UI, Toss-style.

Header same. Active tab "팀 관리".

Top card "팀 일괄 생성":
- Inline layout: label "몇 개 조?" + number input (width 80px) + blue "생성" button
- Helper text "기존 팀은 유지되고 새 팀이 추가됩니다" gray 12px

Middle card "참가자 팀 배치":
- Clean table: 이름 | 현재 팀 (badge-style) | 변경 (dropdown select)
- If unassigned: red "미배정" badge

Bottom section: "팀 현황" bento grid (2 columns):
- Each team card (white, rounded 16px):
  - Team name bold + member count right
  - Member names as small rounded pills/badges inside card

Spacious, easy to scan. Dropdowns and buttons have good touch/click targets.
```

---

## 사용법

1. stitch.withgoogle.com 접속
2. 위 프롬프트 하나씩 복사해서 입력
3. 생성된 디자인 중 마음에 드는 것 선택
4. Export → HTML/CSS 또는 캡처
5. 여기에 공유하면 실제 앱에 적용
