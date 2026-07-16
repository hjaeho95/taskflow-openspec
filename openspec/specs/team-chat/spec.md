## Purpose

TBD - captures the team chat capability (polling-based message retrieval, sending, deletion, empty state, and polling failure recovery).

## Requirements

### Requirement: 메시지 조회 (폴링)
시스템은 팀 단위 채팅 메시지를 폴링 방식으로 SHALL 조회할 수 있어야 한다. `since` 파라미터로 특정 시각 이후 신규 메시지만 조회할 수 있어야 한다.

#### Scenario: 최초 진입 조회
- **WHEN** 클라이언트가 `since` 없이 `GET /teams/{id}/messages`를 호출
- **THEN** 시스템은 최근 50개 메시지를 반환한다

#### Scenario: 폴링 조회
- **WHEN** 클라이언트가 `since=<마지막 메시지 시각>`으로 `GET /teams/{id}/messages`를 호출
- **THEN** 시스템은 해당 시각 이후에 생성된 메시지만 반환한다

### Requirement: 메시지 전송
시스템은 팀 멤버가 1000자 이내의 메시지를 SHALL 전송할 수 있어야 하며, 클라이언트와 서버 양쪽에서 길이를 검증해야 한다.

#### Scenario: 정상 전송
- **WHEN** 팀 멤버가 1000자 이내 내용으로 `POST /teams/{id}/messages`를 호출
- **THEN** 시스템은 201과 함께 메시지를 저장한다

#### Scenario: 길이 초과
- **WHEN** 사용자가 1000자를 초과하는 내용을 전송
- **THEN** 시스템은 `400 TOO_LONG`을 반환하며, 클라이언트는 전송 전에 실시간 카운터로 초과를 표시하고 전송 버튼을 비활성화한다

### Requirement: 메시지 삭제 (본인만)
시스템은 사용자가 본인이 작성한 메시지만 삭제할 수 있도록 SHALL 제한해야 한다. 팀 owner라도 타인의 메시지는 삭제할 수 없다.

#### Scenario: 본인 메시지 삭제
- **WHEN** 사용자가 본인이 작성한 메시지에 대해 `DELETE /messages/{id}`를 호출
- **THEN** 시스템은 200과 함께 메시지를 즉시 삭제한다 (확인 다이얼로그 없음)

#### Scenario: 타인 메시지 삭제 시도
- **WHEN** owner를 포함한 임의의 사용자가 본인이 작성하지 않은 메시지에 대해 `DELETE /messages/{id}`를 호출
- **THEN** 시스템은 `403 NOT_OWNER`를 반환한다

### Requirement: 빈 채팅 상태 (Empty State)
시스템은 팀에 메시지가 하나도 없을 때 첫 메시지 작성을 유도하는 안내를 SHALL 표시해야 한다.

#### Scenario: 신규 팀의 빈 채팅
- **WHEN** 메시지가 0건인 팀의 채팅 화면에 진입
- **THEN** 화면은 '아직 대화가 없습니다' 안내와 첫 메시지 입력 유도 문구를 표시한다

### Requirement: 폴링 실패 복구
시스템(클라이언트)은 폴링 요청이 실패할 경우 exponential backoff로 재시도해야 하며, 재연결 후 누락된 메시지를 SHALL 모두 수신해야 한다(메시지 누락 0건).

#### Scenario: 네트워크 끊김
- **WHEN** 폴링 요청이 연속으로 실패
- **THEN** 클라이언트는 5s→10s→20s→40s→60s(고정) 간격으로 재시도하며 연결 끊김 상태를 사용자에게 표시한다

#### Scenario: 재연결 후 메시지 복구
- **WHEN** 네트워크가 복구되어 폴링이 재개
- **THEN** 클라이언트는 마지막으로 수신한 메시지 시각을 `since=`로 사용하여 끊긴 동안의 메시지를 모두 수신한다

#### Scenario: 오프라인 중 사용자 입력
- **WHEN** 사용자가 오프라인 상태에서 메시지를 입력하고 전송
- **THEN** 클라이언트는 메시지를 큐에 저장하고, 연결이 복구되면 자동으로 전송한다
