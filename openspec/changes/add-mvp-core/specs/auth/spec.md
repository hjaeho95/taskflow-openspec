## ADDED Requirements

### Requirement: 회원가입
시스템은 이메일과 비밀번호로 신규 계정 생성을 SHALL 지원해야 한다. 이메일은 유효한 형식이어야 하고 중복될 수 없으며, 비밀번호는 8자 이상이어야 한다. 가입 즉시 계정이 활성화되며 별도의 이메일 인증 절차는 없다.

#### Scenario: 정상 가입
- **WHEN** 사용자가 유효한 이메일과 8자 이상 비밀번호로 `POST /auth/signup`을 호출
- **THEN** 시스템은 201과 함께 JWT를 발급하고 신규 `users` 레코드를 생성한다 (`team_id`는 NULL)

#### Scenario: 이메일 형식 오류
- **WHEN** 사용자가 유효하지 않은 형식의 이메일로 가입을 시도
- **THEN** 시스템은 `400 VALIDATION_ERROR`를 반환하고 가입을 거부한다

#### Scenario: 이메일 중복
- **WHEN** 사용자가 이미 가입된 이메일로 가입을 시도
- **THEN** 시스템은 `409 EMAIL_TAKEN`을 반환한다

#### Scenario: 비밀번호 약함
- **WHEN** 사용자가 8자 미만 비밀번호로 가입을 시도
- **THEN** 시스템은 `400 VALIDATION_ERROR`를 반환한다

### Requirement: 로그인
시스템은 이메일과 비밀번호로 로그인을 SHALL 지원해야 하며, 성공 시 24시간 만료 JWT를 발급해야 한다. 보안상 이메일 존재 여부를 노출해서는 안 된다.

#### Scenario: 정상 로그인
- **WHEN** 사용자가 올바른 이메일/비밀번호로 `POST /auth/login`을 호출
- **THEN** 시스템은 200과 함께 24시간 유효한 JWT 및 사용자 정보(`id`, `email`, `team_id`)를 반환한다

#### Scenario: 자격 증명 오류
- **WHEN** 사용자가 존재하지 않는 이메일 또는 틀린 비밀번호로 로그인을 시도
- **THEN** 시스템은 이메일 존재 여부와 무관하게 동일한 `401 INVALID_CREDENTIALS` 메시지를 반환한다

### Requirement: 로그아웃 (Stateless)
시스템은 JWT를 stateless로 취급해야 하며, 서버 측에 토큰 블랙리스트를 유지해서는 안 된다. 로그아웃은 클라이언트가 토큰을 폐기하는 것으로 완료된다.

#### Scenario: 로그아웃 호출
- **WHEN** 클라이언트가 `POST /auth/logout`을 호출
- **THEN** 서버는 `200 {}`를 반환하고 어떤 서버 측 상태도 변경하지 않는다

#### Scenario: 클라이언트 토큰 폐기
- **WHEN** 사용자가 로그아웃을 클릭
- **THEN** 클라이언트는 `localStorage`에서 토큰을 제거하고 로그인 화면으로 이동한다

### Requirement: 현재 사용자 조회
시스템은 유효한 JWT를 가진 요청에 대해 현재 사용자 정보를 SHALL 반환해야 한다.

#### Scenario: 인증된 사용자 조회
- **WHEN** 유효한 JWT로 `GET /auth/me`를 호출
- **THEN** 시스템은 200과 함께 현재 사용자의 `id`, `email`, `team_id`를 반환한다

### Requirement: JWT 만료 처리
시스템은 JWT가 만료된 요청에 대해 표준화된 오류를 SHALL 반환해야 하며, 갱신 토큰 없이 재로그인을 요구해야 한다.

#### Scenario: 만료된 토큰으로 API 호출
- **WHEN** 만료된 JWT로 보호된 엔드포인트를 호출
- **THEN** 시스템은 `401 TOKEN_EXPIRED`를 반환한다

#### Scenario: 클라이언트의 만료 처리
- **WHEN** 클라이언트가 `401 TOKEN_EXPIRED` 응답을 수신
- **THEN** 클라이언트는 저장된 토큰을 삭제하고 로그인 화면으로 강제 이동시킨다 (진입 전 URL은 저장하지 않음)

### Requirement: 에러 응답 표준
시스템의 모든 4xx/5xx 응답은 `{ error: { code, message, meta? } }` 형식을 SHALL 따라야 한다. `code`는 SCREAMING_SNAKE, `message`는 한국어 사용자 메시지여야 한다.

#### Scenario: 표준 에러 형식 검증
- **WHEN** 임의의 API 호출이 실패
- **THEN** 응답 본문은 `error.code`(문자열)와 `error.message`(한국어 문자열)를 포함한다
