## Context

Neon 스키마상 `tasks.creator_id`, `tasks.assignee_id`, `messages.user_id`가 `users`를 FK로 참조하며 `ON DELETE`가 지정돼 있지 않다(기본 RESTRICT). 유저를 하드 삭제하면 그 사람이 만든 태스크/메시지가 하나라도 있을 때 즉시 FK 위반이 난다. 또한 배포 환경이 Vercel 서버리스 함수라 프로세스 간 메모리가 공유되지 않아, 로그인 실패 카운트를 메모리에 두는 방식은 신뢰할 수 없다.

## Goals / Non-Goals

**Goals:**
- 사용자가 계정을 삭제해도 팀원들의 칸반/채팅 히스토리가 깨지지 않게 한다
- 로그인 실패 잠금이 서버리스 환경(콜드 스타트, 다중 인스턴스)에서도 일관되게 동작하게 한다

**Non-Goals:**
- IP 기반 rate limiting (계정 단위만 다룸)
- 이메일 인증, 계정 복구(soft-delete 취소) 흐름
- 관리자에 의한 강제 잠금 해제 UI

## Decisions

- **soft delete 채택 (hard delete 대신)**: 계정 행은 남기고 이메일을 `deleted-user-{id}@deleted.taskflow`로, 비밀번호 해시를 무작위 값으로 덮어써 무효화한다. FK가 그대로 유효하므로 태스크/메시지 기록이 보존된다. 원래 이메일은 즉시 재가입에 사용 가능해진다.
- **팀 탈퇴 로직 재사용**: `teams.py`의 owner-cascade / member-leave 로직을 `leave_current_team()` 헬퍼로 추출해 팀 나가기와 계정 삭제 양쪽에서 공유한다. 별도 삭제 전용 cascade 로직을 새로 만들지 않는다.
- **잠금 상태를 DB 컬럼에 저장** (`failed_login_count`, `locked_until`): 서버리스 함수는 인스턴스 간 메모리를 공유하지 않으므로, 인메모리 카운터 대신 이미 요청마다 접근하는 Postgres에 상태를 둔다.
- **5회 실패 → 15분 잠금**: 일반적인 균형점. 실수로 잊은 사용자도 15분 내 재시도 가능하면서 무차별 대입 속도를 크게 늦춘다.
- **삭제된 계정의 로그인 실패도 `INVALID_CREDENTIALS`로 응답**: 이메일 존재 여부를 노출하지 않는 기존 정책(design.md 결정 #2 계열)과 일관성을 유지한다.

## Risks / Trade-offs

- [태스크/메시지에 "탈퇴한 사용자"임을 표시하는 UI가 없음] → 프론트엔드는 `deleted-user-{id}@deleted.taskflow` 형식의 이메일을 그대로 노출한다. 후속 change에서 표시 개선 가능.
- [잠금 해제 수단이 시간 경과뿐] → 정당한 사용자가 비밀번호를 잊고 여러 번 틀리면 15분을 기다려야 한다. 계정 복구/관리자 개입 기능은 범위 밖으로 남겨둔다.
- [`apiFetch`의 401 처리 버그 수정이 이 change에 묻어감] → 원래 로그인 실패 메시지가 항상 "인증 만료"로 잘못 표시되던 기존 버그. 잠금 기능 검증 중 발견되어 함께 수정했다.

## Migration Plan

이미 프로덕션에 적용 완료: Alembic 마이그레이션 0002(컬럼 추가) → Neon에 `alembic upgrade head` → `vercel --prod` 배포 → curl/Playwright로 계정 삭제·잠금·이메일 재사용 스모크 테스트. 롤백이 필요하면 0002 `downgrade()`로 컬럼 제거 가능(단, 배포된 코드가 해당 컬럼을 참조하므로 코드 롤백과 함께 진행해야 함).
