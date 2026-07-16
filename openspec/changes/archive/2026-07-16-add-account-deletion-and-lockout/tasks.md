## 1. DB 스키마

- [x] 1.1 `users` 테이블에 `deleted_at`, `failed_login_count`, `locked_until` 컬럼 추가 마이그레이션 작성 (0002)
- [x] 1.2 Neon(운영) DB에 마이그레이션 적용 검증

## 2. 백엔드

- [x] 2.1 `teams.py`의 owner-cascade/member-leave 로직을 `leave_current_team()` 공유 헬퍼로 추출, 기존 `/teams/{id}/leave`가 이를 사용하도록 리팩터링
- [x] 2.2 `DELETE /auth/me` 구현: 소속 팀이 있으면 `leave_current_team()` 호출 후 이메일/비밀번호 무효화 및 `deleted_at` 기록
- [x] 2.3 `get_current_user`가 `deleted_at`이 설정된 사용자의 토큰을 `401 TOKEN_EXPIRED`로 거부하도록 수정
- [x] 2.4 로그인에 실패 횟수 추적 및 5회 실패 시 15분 잠금(`423 ACCOUNT_LOCKED`) 로직 추가, 성공 시 카운트 리셋
- [x] 2.5 삭제된 계정으로의 로그인 시도도 `INVALID_CREDENTIALS`로 응답(이메일 존재 여부 비노출 유지)

## 3. 프론트엔드

- [x] 3.1 `api.js`에 `deleteAccount()` 추가
- [x] 3.2 `team-select.html`(팀 미소속 상태)에 "계정 삭제" 버튼 및 확인 다이얼로그 추가
- [x] 3.3 `kanban.html` 팀 멤버 패널에 "계정 삭제" 버튼 및 owner/member별 경고 문구 추가, `kanban.js`에 핸들러 연결
- [x] 3.4 `apiFetch`가 `TOKEN_EXPIRED` 코드일 때만 자동 로그아웃하도록 수정 (모든 401을 토큰 만료로 처리하던 기존 버그 수정)

## 4. 검증

- [x] 4.1 로컬 SQLite에서 owner 계정 삭제 시 팀/태스크/메시지 cascade 삭제 확인
- [x] 4.2 로컬에서 이메일 재사용 가능 여부 및 기존 토큰 무효화 확인
- [x] 4.3 로컬에서 5회 로그인 실패 → 잠금 → 정상 비밀번호도 거부됨을 확인
- [x] 4.4 Playwright로 실제 브라우저에서 owner 계정 삭제 cascade 경고 UI → 삭제 → login.html 리다이렉트 확인
- [x] 4.5 운영(Neon) DB에 마이그레이션 적용 후 curl로 계정 삭제/잠금 스모크 테스트, 테스트 데이터 정리
