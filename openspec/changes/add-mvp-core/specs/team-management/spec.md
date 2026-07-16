## ADDED Requirements

### Requirement: 1인 1팀 제약
시스템은 각 사용자가 동시에 하나의 팀에만 소속될 수 있도록 SHALL 강제해야 한다. `users.team_id`가 NULL이면 미가입 상태를 의미한다.

#### Scenario: 미가입 사용자 진입
- **WHEN** `team_id`가 NULL인 사용자가 로그인
- **THEN** 시스템은 팀 선택 화면(팀 만들기 또는 초대코드 합류)으로 강제 진입시킨다

#### Scenario: 이미 팀 보유 사용자 진입
- **WHEN** `team_id`가 존재하는 사용자가 로그인하거나 `/teams/*` URL에 직접 접근
- **THEN** 시스템은 자동으로 `/teams/{my_team_id}`(칸반)로 redirect한다

### Requirement: 팀 생성
시스템은 사용자가 팀을 생성하면 자동으로 고유한 초대코드를 발급해야 하며, 생성자를 팀의 owner로 SHALL 지정해야 한다. 팀 이름은 1~30자여야 한다.

#### Scenario: 정상 팀 생성
- **WHEN** 미가입 사용자가 1~30자 이름으로 `POST /teams`를 호출
- **THEN** 시스템은 201과 함께 팀 정보 및 형식 `^[A-Z]{4}-[0-9]{4}$`의 초대코드를 반환하고, 호출자의 `users.team_id`를 갱신하며, 호출자를 owner로 지정한다

### Requirement: 초대코드로 팀 합류
시스템은 유효한 초대코드를 입력한 미가입 사용자를 해당 팀의 member로 SHALL 합류시켜야 한다.

#### Scenario: 정상 합류
- **WHEN** 미가입 사용자가 존재하는 초대코드로 `POST /teams/join`을 호출
- **THEN** 시스템은 200과 함께 팀 정보를 반환하고 사용자의 `users.team_id`를 해당 팀으로 갱신한다

#### Scenario: 형식 오류 초대코드
- **WHEN** 사용자가 `^[A-Z]{4}-[0-9]{4}$` 형식에 맞지 않는 코드를 입력
- **THEN** 시스템은 `400 VALIDATION_ERROR`를 반환한다

#### Scenario: 존재하지 않는 초대코드
- **WHEN** 사용자가 존재하지 않는 초대코드를 입력
- **THEN** 시스템은 `404 NOT_FOUND`를 반환한다

#### Scenario: 이미 다른 팀 소속
- **WHEN** 이미 다른 팀에 소속된 사용자가 합류를 시도
- **THEN** 시스템은 `409` 응답으로 이미 다른 팀에 소속되어 있음을 알린다

### Requirement: 팀 멤버 목록 조회
시스템은 팀 멤버 목록과 각 멤버의 역할(owner/member)을 SHALL 조회할 수 있어야 한다.

#### Scenario: 멤버 목록 조회
- **WHEN** 팀 멤버가 `GET /teams/{id}/members`를 호출
- **THEN** 시스템은 200과 함께 각 멤버의 이메일, 역할(owner 또는 member), 합류 시각을 반환한다

### Requirement: 팀 정보 조회
시스템은 팀 기본 정보(이름, 멤버 수, 태스크 수)를 SHALL 조회할 수 있어야 한다.

#### Scenario: 팀 정보 조회
- **WHEN** 팀 멤버가 `GET /teams/{id}`를 호출
- **THEN** 시스템은 200과 함께 팀 이름, 멤버 수, owner 정보를 반환한다

### Requirement: 팀 탈퇴
시스템은 사용자가 자기 자신을 팀에서 탈퇴시킬 수 있도록 SHALL 지원해야 한다. Owner가 탈퇴하면 소유권 이전 없이 팀 전체가 SHALL 삭제되어야 한다(팀, 태스크, 메시지, 남은 멤버들의 `team_id` 모두 정리).

#### Scenario: member의 정상 탈퇴
- **WHEN** owner가 아닌 팀 멤버가 `DELETE /teams/{id}/leave`를 호출
- **THEN** 시스템은 해당 사용자의 `users.team_id`만 NULL로 갱신하고 팀은 그대로 유지된다

#### Scenario: owner의 탈퇴 → 팀 자동 삭제
- **WHEN** 팀 owner가 `DELETE /teams/{id}/leave`를 호출
- **THEN** 시스템은 해당 팀과 팀에 속한 모든 태스크·메시지를 삭제하고, 남아 있던 모든 멤버(owner 포함)의 `users.team_id`를 NULL로 갱신한다

#### Scenario: 팀 삭제 후 남은 멤버 진입
- **WHEN** owner 탈퇴로 팀이 삭제된 후 기존 member가 로그인하거나 화면을 새로고침
- **THEN** 시스템은 해당 사용자를 미가입 상태로 간주하고 팀 선택 화면으로 강제 진입시킨다

### Requirement: 비멤버 접근 차단
시스템은 팀에 소속되지 않은 사용자(다른 팀 소속 또는 미가입)의 `/teams/{id}/*` 요청을 SHALL 모두 거부해야 한다.

#### Scenario: 비멤버의 GET 요청
- **WHEN** 팀 A에 소속된 사용자가 팀 B의 `GET /teams/{b_id}/tasks`를 호출
- **THEN** 시스템은 `403 FORBIDDEN`을 반환한다

#### Scenario: 비멤버의 쓰기 요청
- **WHEN** 비멤버 사용자가 `/teams/{id}/*` 하위 POST/PATCH/PUT/DELETE 요청을 호출
- **THEN** 시스템은 `403 FORBIDDEN`을 반환한다
