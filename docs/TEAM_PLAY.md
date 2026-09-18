# 신규 통합 버전 팀 진행

- 적용: `gameVersion === integrated-v3` 세션만.
- 팀 순서: 참가자의 `joinedAt`, 같은 시각이면 참가자 ID 순. 팀이 없으면 개인 진행.
- 연봉협상: 분기 마감 중, 버킷 공유를 완료한 현재 차례 참가자만 실행. 세션 트랜잭션 안에서 차례를 재검사하고 결과를 한 번 저장한다. 같은 팀은 해당 결과의 룰렛을 함께 표시한다. 당사자가 공유 완료를 누르면 `acknowledged`가 저장되어 다음 사람으로 넘어간다.
- 투자 정산: 개인 주사위 처리는 병렬. 같은 팀의 해당 턴 정산 결과를 입장 순서로 표시한다. 모든 팀원이 정산을 완료하거나 진행자에 의해 대기 제외되면 팀원 누구나 `함께 확인 완료`를 누를 수 있다.
- 저장: `teamRounds/{turn}/{teamId}/settlementConfirmed`, `salarySkipped/{playerId}`, `settlementSkipped/{playerId}`. 개인 협상 결과는 기존 `integrated/{playerId}/negotiations/{turn}` 유지.
- 진행자의 건너뛰기는 기록 삭제나 투자 대리정산이 아니다. 투자 정산 대기 제외 시 미정산 투자는 그대로 보존되며 필요하면 진행자가 기존 정산 도구로 처리한다.
- 테스트: `node tests/team-play.test.cjs`. 실제 여러 휴대폰의 네트워크 지연 및 자동재생 정책은 현장 검증 필요.
