## Context

TaskFlow MVP는 신규 프로젝트로, 스토리보드(`docs/TaskFlow_스토리보드.pdf`, 42슬라이드)에서 이미 대부분의 기술 결정이 확정되어 있다. 스택은 사용자가 고정했다: 백엔드 FastAPI(Python, async), 프론트 Vanilla JS + Tailwind CSS, DB는 로컬 SQLite / 운영 Neon PostgreSQL, 배포는 Vercel. 이 design.md는 스토리보드의 결정 추적표(8건)와 ACME(Assumptions/Constraints/Metrics/Examples) 슬라이드, 그리고 탐색 단계에서 추가로 확정한 owner 탈퇴 시 팀 cascade 삭제 결정을 구현 가능한 기술 결정으로 옮기는 데 집중한다.

## Goals / Non-Goals

**Goals:**
- API 18개, DB 4테이블, 화면 9종을 스토리보드 스펙과 1:1로 대응시키는 아키텍처 확정
- JWT 인증/권한 검증을 미들웨어 레벨에서 일관되게 적용
- 로컬↔운영 환경을 `DATABASE_URL` 하나로 전환 가능하게 구성
- 에러 응답 표준(`{ error: { code, message, meta? } }`)을 전 API에 일관 적용

**Non-Goals:**
- 로그인 실패 rate limiting, JWT 갱신 토큰, 초대코드 재발급, 팀원 추방/역할 변경 — Day 2 이후
- 다국어(i18n), UTC 시간대 변환, 이메일 인증, IE 지원
- 계정 삭제/비활성화, 팀 이름 중복 제한 — 이번 MVP 범위 외
- 자동화된 성능 측정 도구 도입 (드래그 반응 <50ms 등은 정성 검증으로 충분)

## Decisions

**1. DB 접근 계층: SQLAlchemy + Alembic (또는 동등 도구)**
로컬 SQLite와 운영 PostgreSQL 양쪽을 하나의 ORM으로 지원해야 하므로 SQLAlchemy(비동기 지원)를 사용한다. `DATABASE_URL` 환경변수로 드라이버만 전환(`sqlite+aiosqlite:///` ↔ `postgresql+asyncpg://`). 대안으로 raw SQL을 고려했으나, 두 DB 방언 차이(예: UUID, autoincrement)를 흡수하기 위해 ORM을 채택.

**2. 인증: python-jose(JWT) + passlib/bcrypt**
JWT는 24h 고정 만료, payload에 `user_id`만 포함(민감정보 최소화). 비밀번호는 bcrypt 해싱. 서버 측 세션/블랙리스트 저장소를 두지 않음(stateless 로그아웃) — Redis 등 추가 인프라 도입을 피하기 위한 의도적 선택.

**3. 권한 검증: FastAPI Dependency 기반 미들웨어**
`get_current_user` → `require_team_member(team_id)` → `require_task_owner_or_creator` 형태로 체이닝되는 FastAPI Dependency를 사용. 모든 `/teams/{id}/*` 라우트는 팀 멤버십 검증 의존성을 강제 적용하여 비멤버 403을 라우트 핸들러가 아닌 공통 계층에서 보장한다.

**4. PATCH vs PUT 분리**
`PATCH /tasks/{id}/status`는 칸반 드래그 전용(상태만 변경), `PUT /tasks/{id}`는 제목/assignee 수정 전용으로 완전히 분리된 핸들러/스키마를 사용한다. 이는 REST 의미론과 프론트엔드 이벤트(드래그 vs 폼 제출)의 자연스러운 분리를 반영한다.

**5. 채팅 폴링: 클라이언트 사이드 setInterval + since 파라미터**
WebSocket 대신 폴링을 채택(스토리보드 확정 사항). 폴링 실패 시 exponential backoff(5s→10s→20s→40s→60s 고정)를 클라이언트에서 구현하고, 재연결 시 `since=`로 누락 메시지를 일괄 수신한다. 오프라인 전송 큐는 클라이언트 메모리(배열)에 보관 — 새로고침 시 유실은 허용(브라우저 저장소 영속화는 범위 외).

**6. 프론트엔드 구조: MPA + 공유 JS 모듈**
Vanilla JS 프레임워크 없음이 확정 사항이므로, 9개 HTML 페이지(MPA)로 구성하고 `api.js`(fetch 래퍼 + JWT 헤더 자동 첨부 + 401 인터셉트), `auth.js`(localStorage 관리) 등 공통 모듈을 각 페이지에서 `<script>` 로 공유한다. SPA 라우터 도입은 범위 외로 판단(화면 전환이 적고 새로고침 비용이 낮음).

**7. 에러 코드 상수화**
백엔드에 `error_codes.py` 같은 단일 모듈로 SCREAMING_SNAKE 코드(EMAIL_TAKEN, INVALID_CREDENTIALS, TOKEN_EXPIRED, FORBIDDEN, NOT_OWNER, NOT_FOUND, VALIDATION_ERROR, TOO_LONG)를 정의하고, 예외 핸들러 하나가 이를 `{ error: { code, message, meta } }` 형태로 직렬화한다.

**8. Owner 탈퇴 시 팀 자동 삭제 (Cascade)**
스토리보드에는 팀 소유권 이전이나 팀 삭제 기능이 정의되어 있지 않아, owner가 `DELETE /teams/{id}/leave`를 호출했을 때의 동작이 모호했다. 소유권 이전 UI/로직을 새로 설계하는 대신, owner 탈퇴 시 팀을 통째로 삭제(cascade: tasks, messages 삭제 + 모든 멤버 `team_id` NULL 처리)하는 방식을 채택했다. 이는 MVP 범위를 최소화하면서 owner 없는 팀이 존재하는 상태를 원천 차단한다. DB FK는 `ON DELETE CASCADE`로 tasks/messages를 정리하고, users.team_id는 애플리케이션 레벨에서 일괄 NULL 처리한다.

## Risks / Trade-offs

- [Risk] Stateless 로그아웃 + 24h 고정 만료 → 토큰 탈취 시 24시간 동안 무효화 불가 → Mitigation: 스토리보드에서 이미 인지된 트레이드오프(단순성 우선). MVP 범위에서는 수용.
- [Risk] 폴링(5초) 방식은 실시간성이 낮고 서버 부하가 요청량에 비례 → Mitigation: 팀당 동시접속 5명 이하 가정(ACME Assumptions)이므로 MVP 규모에서는 허용 가능.
- [Risk] SQLite(로컬)와 PostgreSQL(운영) 간 방언 차이로 로컬에서 통과한 쿼리가 운영에서 실패할 가능성 → Mitigation: ORM 레벨 쿼리만 사용하고 raw SQL 지양, CI에서 두 환경 모두 마이그레이션 검증.
- [Risk] MPA 구조에서 공통 JS 모듈 중복 로드/버전 불일치 가능성 → Mitigation: 모듈을 소수(2~3개)로 유지하고 캐시 버스팅은 배포 시 Vercel 정적 자산 해시에 위임.
- [Risk] Owner가 실수로 탈퇴 버튼을 눌러 팀 전체(태스크·채팅 이력 포함)가 삭제될 수 있음 → Mitigation: 프론트엔드에서 owner의 탈퇴 시도 시 "팀이 삭제되고 모든 데이터가 사라집니다" 경고를 포함한 확인 다이얼로그를 표시한다.

## Migration Plan

- 신규 프로젝트이므로 별도 마이그레이션(기존 데이터) 없음. 최초 배포 시 Alembic(또는 동등 도구)으로 4테이블 스키마를 운영 Neon DB에 적용.
- 롤백: 문제 발생 시 Vercel 이전 배포로 즉시 롤백 가능(정적 자산 + Serverless Functions 모두 버전 관리됨). DB 스키마 롤백은 별도 다운그레이드 마이그레이션으로 대응.

## Open Questions

(없음 — 스토리보드의 결정 추적표 8건, ACME 슬라이드, 탐색 단계에서 추가 확정한 owner 탈퇴 cascade 결정으로 주요 모호성 해소 완료)
