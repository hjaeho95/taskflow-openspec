## ADDED Requirements

### Requirement: 태스크 조회 및 필터링
시스템은 팀의 태스크를 TODO/DOING/DONE 상태별로 SHALL 조회할 수 있어야 하며, 전체/@me(담당자=본인)/미할당(담당자 없음) 필터를 지원해야 한다. 정렬은 최근 생성순이어야 한다.

#### Scenario: 전체 조회
- **WHEN** 팀 멤버가 `GET /teams/{id}/tasks`를 호출
- **THEN** 시스템은 해당 팀의 모든 태스크를 `created_at` 내림차순으로 반환한다

#### Scenario: @me 필터
- **WHEN** 팀 멤버가 `GET /teams/{id}/tasks?filter=me`를 호출
- **THEN** 시스템은 `assignee_id`가 현재 사용자와 일치하는 태스크만 반환한다 (생성자 기준이 아님)

#### Scenario: 미할당 필터
- **WHEN** 팀 멤버가 `GET /teams/{id}/tasks?filter=unassigned`를 호출
- **THEN** 시스템은 `assignee_id`가 NULL인 태스크만 반환한다

### Requirement: 태스크 생성
시스템은 팀 멤버가 제목(1~100자)과 선택적 담당자로 태스크를 SHALL 생성할 수 있어야 한다. 신규 태스크는 기본 상태 TODO로 생성된다.

#### Scenario: 정상 생성
- **WHEN** 팀 멤버가 `POST /teams/{id}/tasks`에 1~100자 제목을 전송
- **THEN** 시스템은 201과 함께 새 태스크를 생성하고 `creator_id`를 호출자로 설정한다

### Requirement: 태스크 상태 변경 (드래그앤드롭)
시스템은 칸반 카드의 드래그앤드롭으로 상태 변경을 SHALL 지원해야 하며, 이는 제목/담당자 수정과 분리된 별도 엔드포인트여야 한다.

#### Scenario: 드래그로 상태 변경
- **WHEN** 사용자가 카드를 다른 컬럼으로 드롭하여 `PATCH /tasks/{id}/status`를 호출
- **THEN** 시스템은 200과 함께 해당 태스크의 `status`만 갱신한다

### Requirement: 태스크 수정
시스템은 태스크의 제목과 담당자를 SHALL 수정할 수 있어야 한다. 담당자는 nullable이며 '미할당'으로 되돌릴 수 있다.

#### Scenario: 제목/담당자 수정
- **WHEN** 팀 멤버가 `PUT /tasks/{id}`에 새 제목 또는 `assignee_id`를 전송
- **THEN** 시스템은 200과 함께 해당 필드를 갱신한다

### Requirement: 태스크 삭제 권한
시스템은 태스크의 생성자(creator) 또는 팀 owner만 태스크를 삭제할 수 있도록 SHALL 제한해야 한다. 그 외 사용자의 삭제 시도는 거부되어야 한다.

#### Scenario: 생성자의 삭제
- **WHEN** 태스크 생성자가 `DELETE /tasks/{id}`를 호출
- **THEN** 시스템은 200과 함께 태스크를 삭제한다

#### Scenario: owner의 타인 태스크 삭제
- **WHEN** 팀 owner가 자신이 생성하지 않은 태스크에 대해 `DELETE /tasks/{id}`를 호출
- **THEN** 시스템은 200과 함께 태스크를 삭제한다 (owner 권한으로 오버라이드)

#### Scenario: 권한 없는 삭제 시도
- **WHEN** 생성자도 owner도 아닌 멤버가 `DELETE /tasks/{id}`를 호출
- **THEN** 시스템은 `403 FORBIDDEN`을 반환하고, 프론트엔드는 권한이 없는 사용자에게 삭제 버튼 자체를 숨긴다

### Requirement: 빈 칸반 상태 (Empty State)
시스템은 팀에 태스크가 하나도 없을 때 각 컬럼에 안내 문구와 생성 유도 CTA를 SHALL 표시해야 한다.

#### Scenario: 신규 팀의 빈 칸반
- **WHEN** 신규 생성된 팀 또는 모든 태스크가 삭제된 팀의 칸반에 진입
- **THEN** 각 컬럼은 '카드 없음'을 표시하고, TODO 컬럼에는 '+첫 태스크 만들기' CTA가 강조 표시된다
