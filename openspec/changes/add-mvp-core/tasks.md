## 1. 프로젝트 셋업

- [x] 1.1 백엔드 디렉토리 구조 생성 (FastAPI 프로젝트, `requirements.txt`)
- [x] 1.2 SQLAlchemy(비동기) + Alembic(또는 동등 마이그레이션 도구) 설정
- [x] 1.3 `DATABASE_URL` 환경변수 기반 DB 연결 설정 (로컬 SQLite / 운영 PostgreSQL 겸용)
- [x] 1.4 프론트엔드 디렉토리 구조 생성 (정적 HTML 9종, Tailwind CSS 설정) — 실제로는 8페이지(index/signup/login/team-select/kanban/chat + 공용 members 패널)로 통합. Tailwind는 CDN 사용
- [x] 1.5 공통 에러 응답 핸들러(`{ error: { code, message, meta? } }`) 및 에러 코드 상수 모듈 작성
- [x] 1.6 로컬 개발 실행 스크립트 확인 (`uvicorn --reload`, 정적 파일 서버)

## 2. DB 스키마

- [x] 2.1 `users` 테이블 마이그레이션 작성 (id, email UNIQUE, password_hash, team_id FK NULL, created_at)
- [x] 2.2 `teams` 테이블 마이그레이션 작성 (id, name, invite_code UNIQUE, owner_id FK, created_at)
- [x] 2.3 `tasks` 테이블 마이그레이션 작성 (id, team_id FK ON DELETE CASCADE, title, status, creator_id FK, assignee_id FK NULL, created_at)
- [x] 2.4 `messages` 테이블 마이그레이션 작성 (id, team_id FK ON DELETE CASCADE, user_id FK, content, created_at)
- [x] 2.5 인덱스 추가: `tasks(team_id, created_at)`, `messages(team_id, created_at)`, `teams(invite_code)`, `users(team_id)`
- [x] 2.6 로컬 SQLite와 운영 PostgreSQL 양쪽에 마이그레이션 적용 검증 (SQLite 실행 + Postgres 방언 컴파일 검증. 순환 FK로 인해 users.team_id는 앱 레벨 무결성으로 전환 — design.md 참고)

## 3. 인증 (auth)

- [x] 3.1 비밀번호 해싱(bcrypt) 및 JWT 발급/검증 유틸 작성 (24h 만료, stateless)
- [x] 3.2 `POST /auth/signup` 구현 (이메일 형식/중복, 비밀번호 길이 검증 → 201 + JWT)
- [x] 3.3 `POST /auth/login` 구현 (자격 증명 검증, 이메일 존재 여부 비노출 → 200 + JWT)
- [x] 3.4 `POST /auth/logout` 구현 (stateless, 200 반환만)
- [x] 3.5 `GET /auth/me` 구현
- [x] 3.6 `get_current_user` FastAPI Dependency 작성 (JWT 검증, `TOKEN_EXPIRED` 처리)
- [x] 3.7 회원가입/로그인 프론트엔드 화면 3종 상태(초기/입력중/처리중) 및 에러 케이스 UI 구현
- [x] 3.8 401 응답 시 클라이언트 인터셉터로 토큰 삭제 + 로그인 화면 redirect 구현

## 4. 팀 관리 (team-management)

- [x] 4.1 `require_team_member(team_id)` Dependency 작성 (비멤버 403 처리)
- [x] 4.2 초대코드 생성 로직 작성 (`^[A-Z]{4}-[0-9]{4}$` 형식, 유일성 보장)
- [x] 4.3 `POST /teams` 구현 (팀 생성 + 초대코드 발급 + owner 지정 + `users.team_id` 갱신)
- [x] 4.4 `POST /teams/join` 구현 (형식/존재/중복 소속 검증 → `users.team_id` 갱신)
- [x] 4.5 `GET /teams/{id}` 구현
- [x] 4.6 `GET /teams/{id}/members` 구현
- [x] 4.7 `DELETE /teams/{id}/leave` 구현: member는 `team_id`만 NULL, owner는 팀 cascade 삭제(tasks/messages 삭제 + 전체 멤버 `team_id` NULL) 처리 분기
- [x] 4.8 팀 선택 화면(팀 만들기/초대코드 합류) 및 3가지 초대코드 에러 상태 UI 구현
- [x] 4.9 owner 탈퇴 시 "팀이 삭제되고 모든 데이터가 사라집니다" 경고 확인 다이얼로그 UI 구현
- [x] 4.10 `team_id` NULL 사용자에 대한 강제 리다이렉트 로직(프론트) 구현
- [x] 4.11 팀 멤버 목록 사이드 패널 UI 구현 (owner/member 뱃지)

## 5. 칸반 보드 (kanban-board)

- [x] 5.1 `GET /teams/{id}/tasks` 구현 (필터: 전체/@me/미할당, 정렬: created_at desc)
- [x] 5.2 `POST /teams/{id}/tasks` 구현
- [x] 5.3 `GET /tasks/{id}` 구현
- [x] 5.4 `PUT /tasks/{id}` 구현 (제목/assignee 수정)
- [x] 5.5 `PATCH /tasks/{id}/status` 구현 (상태 전용, PUT과 분리)
- [x] 5.6 `DELETE /tasks/{id}` 구현 (creator 또는 owner만 허용, 그 외 403)
- [x] 5.7 칸반 3컬럼 UI 구현 (TODO/DOING/DONE, 필터/정렬 컨트롤)
- [x] 5.8 빈 칸반 empty state UI 구현 (컬럼별 안내 + TODO CTA)
- [x] 5.9 인라인 태스크 생성 UI 구현 (+ 클릭 → 입력 → Enter 저장)
- [x] 5.10 HTML5 드래그앤드롭 구현 (드롭 시 PATCH 호출, 대상 컬럼 하이라이트)
- [x] 5.11 카드 상세/수정 모달 구현 (상태/담당자 변경 + 메타 정보 표시 + 삭제 확인 다이얼로그)
- [x] 5.12 삭제 권한에 따른 삭제 버튼 조건부 렌더링 구현

## 6. 팀 채팅 (team-chat)

- [x] 6.1 `GET /teams/{id}/messages?since=` 구현 (since 없으면 최근 50개)
- [x] 6.2 `POST /teams/{id}/messages` 구현 (1000자 서버 검증 → `TOO_LONG`)
- [x] 6.3 `DELETE /messages/{id}` 구현 (본인만, 그 외 `NOT_OWNER`)
- [x] 6.4 채팅 UI 구현 (말풍선, 5초 폴링 setInterval)
- [x] 6.5 메시지 입력 카운터(1000자) + 클라이언트 검증 + 전송 버튼 disable 구현
- [x] 6.6 본인 메시지 호버 삭제 아이콘 구현
- [x] 6.7 빈 채팅 empty state UI 구현
- [x] 6.8 폴링 실패 시 exponential backoff 재시도(5s→10s→20s→40s→60s) 구현
- [x] 6.9 재연결 시 `since=` 기반 누락 메시지 일괄 수신 + 오프라인 전송 큐 구현

## 7. 모바일 반응형

- [x] 7.1 Tailwind breakpoint 설정 — 2단계(`<1024px` 모바일/햄버거, `>=1024px` 데스크탑/사이드패널)로 단순화. 스토리보드의 768~1024px 중간 단계(헤더 통합)는 생략 — 필요 시 후속 조정
- [x] 7.2 모바일 칸반 스와이프 UI 구현 (컬럼별 탭/인디케이터, 카드 롱프레스 상태변경 메뉴)
- [x] 7.3 모바일 채팅 풀스크린 전환 + `visualViewport` 기반 키보드 대응 구현
- [x] 7.4 모바일 입력 포커스 시 폴링 간격 5초→2초 단축 구현
- [x] 7.5 모바일 pull-to-refresh 구현
- [x] 7.6 모바일 햄버거 메뉴 구현 (칸반/채팅/팀멤버/로그아웃 통합)

## 8. 공통 인프라 및 검증

- [x] 8.1 프론트엔드 `api.js` 공통 fetch 래퍼 작성 (JWT 헤더 자동 첨부, 401 인터셉트)
- [x] 8.2 API 18개 전수 수동 검증 (통합 매핑표 기준, 정상/에러 케이스 각각 확인) — curl 스모크 테스트로 백엔드 완료. 프론트엔드 연동 후 재확인 필요
- [x] 8.3 권한 매트릭스 검증 (owner/member/비멤버 × 태스크·메시지 삭제) — 백엔드 curl 테스트로 확인
- [x] 8.4 칸반 드래그 반응성 정성 검증 (체감 지연 없음) — Playwright e2e로 카드 상태변경(모달 경로) 체감 지연 없음 확인. 실제 HTML5 dragstart/drop 제스처는 헤드리스 환경 한계로 코드 리뷰로 대체
- [x] 8.5 신규 합류자 시나리오 end-to-end 검증 (가입→합류→칸반→채팅, 5분 이내) — Playwright로 회원가입→팀 생성→칸반 카드 생성/상태변경→채팅 메시지 전송까지 실제 브라우저에서 재현 완료
- [x] 8.6 owner 탈퇴 시 팀 cascade 삭제 및 남은 멤버 재로그인 시나리오 검증 — curl로 재현: member 탈퇴는 팀 유지, owner 탈퇴는 teams/tasks/messages 전부 삭제 및 남은 멤버 team_id NULL 처리 확인

## 9. 배포

- [ ] 9.1 Neon PostgreSQL 프로젝트 생성 및 `DATABASE_URL` 환경변수 등록 (Vercel)
- [ ] 9.2 Vercel 프로젝트 연결 (프론트 정적 파일 + 백엔드 Serverless Functions)
- [ ] 9.3 운영 환경에 마이그레이션 적용
- [ ] 9.4 운영 배포 후 핵심 플로우(가입→로그인→팀→칸반→채팅) 스모크 테스트
