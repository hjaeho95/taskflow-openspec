## Why

MVP 배포 이후 실사용 리스크 두 가지가 확인됐다: (1) 사용자가 가입을 취소할 방법이 없어 개인정보 삭제 요청에 대응할 수 없고, (2) 로그인에 brute-force 방어가 없어 계정 탈취 시도에 그대로 노출된다. 이미 코드로 구현·배포·검증까지 마쳤으나 스펙에는 반영되지 않아, 이 change는 실제 동작을 스펙으로 소급 기록한다.

## What Changes

- `DELETE /auth/me`: 계정을 soft-delete (이메일/비밀번호 무효화, `deleted_at` 기록). 이메일은 즉시 재사용 가능해짐. 소속 팀이 있으면 기존 팀 탈퇴 규칙 재사용(owner면 팀 전체 cascade 삭제, member면 팀에서만 제거) — 팀원의 기존 태스크/메시지 기록은 보존됨
- 삭제된 계정으로 발급된 기존 JWT는 이후 요청에서 즉시 거부됨 (`TOKEN_EXPIRED`)
- 로그인 실패 5회 시 15분간 계정 잠금 (`ACCOUNT_LOCKED`, 423), 성공 시 실패 카운트 리셋
- 프론트엔드 버그 수정: `apiFetch`가 모든 401 응답을 토큰 만료로 처리하던 것을, `TOKEN_EXPIRED` 코드일 때만 자동 로그아웃하도록 수정 (로그인 실패 메시지가 항상 "인증 만료"로 잘못 표시되던 문제)

## Capabilities

### New Capabilities
(없음)

### Modified Capabilities
- `auth`: `DELETE /auth/me` 추가(soft-delete), 로그인 실패 잠금 정책 추가, 삭제된 계정의 로그인/토큰 거부 규칙 추가

## Impact

- 백엔드: `users` 테이블에 `deleted_at`, `failed_login_count`, `locked_until` 컬럼 추가 (마이그레이션 0002), `app/routers/auth.py`, `app/deps.py`, `app/routers/teams.py`(팀 탈퇴 로직을 공유 헬퍼로 추출)
- 프론트엔드: `team-select.html`, `kanban.html`(팀 멤버 패널)에 "계정 삭제" 진입점 추가, `api.js`/`kanban.js` 갱신
- 이미 프로덕션(Vercel + Neon)에 배포·마이그레이션 적용·스모크 테스트 완료된 상태
