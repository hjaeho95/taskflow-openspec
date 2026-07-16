## Why

팀 단위로 작업을 조율하는 소규모 팀(3~5인)을 위한 경량 태스크 관리 도구가 필요하다. 별도의 이메일 인증, 다국어, 계정 잠금 등 부가 기능 없이 회원가입부터 팀 합류, 칸반 작업, 팀 채팅, 모바일 확인까지 하나의 흐름으로 이어지는 MVP를 빠르게 검증하기 위해 지금 시작한다.

## What Changes

- 이메일/비밀번호 기반 회원가입·로그인·로그아웃 (JWT 24h, stateless, 갱신 토큰 없음)
- 팀 생성(초대코드 자동 발급) 및 초대코드로 팀 합류, 1인 1팀 제약
- 팀 멤버 목록 조회 (owner/member 구분 표시), 팀 탈퇴 (owner 탈퇴 시 팀 전체 cascade 삭제)
- 칸반 보드: TODO/DOING/DONE 3컬럼, 드래그앤드롭 상태 변경, 필터(전체/@me/미할당), 카드 생성·수정·삭제
- 팀 채팅: 5초 폴링 기반 메시지 조회, 전송(1000자 제한), 본인 메시지 삭제
- 반응형 UI: <768px 모바일(스와이프 칸반, 풀스크린 채팅, 햄버거 메뉴) ~ >1024px 데스크탑
- 표준화된 에러 응답 형식(`{ error: { code, message, meta? } }`)
- 권한 모델: owner(팀 생성자, 모든 태스크 삭제 가능) / member(본인 소유 리소스만 삭제 가능) / 비멤버(403)

## Capabilities

### New Capabilities
- `auth`: 회원가입·로그인·로그아웃·현재 사용자 조회. JWT 발급/검증, stateless 로그아웃, 표준 에러 코드(EMAIL_TAKEN, INVALID_CREDENTIALS, TOKEN_EXPIRED 등)
- `team-management`: 팀 생성·초대코드 합류·멤버 조회·팀 탈퇴(owner 탈퇴 시 cascade 삭제). 1인 1팀 제약, 초대코드 형식 검증, 비멤버 접근 차단(403)
- `kanban-board`: 태스크 CRUD, 상태 변경(드래그앤드롭), 필터링/정렬, 삭제 권한(creator/owner), 모바일 스와이프 대응
- `team-chat`: 팀 단위 메시지 조회(폴링)·전송·삭제(본인만), 1000자 제한, 폴링 재시도(exponential backoff), 모바일 풀스크린 대응

### Modified Capabilities
(없음 — 신규 프로젝트, 기존 spec 없음)

## Impact

- 신규 백엔드: FastAPI 애플리케이션, DB 스키마 4테이블(users/teams/tasks/messages), API 18개 엔드포인트
- 신규 프론트엔드: Vanilla JS + Tailwind CSS 정적 페이지 9종, fetch 기반 API 연동, JWT localStorage 관리
- 신규 배포 구성: 로컬(uvicorn + SQLite), 운영(Vercel + Neon PostgreSQL), `DATABASE_URL` 환경변수로 전환
- 범위 외(Day 2 이후로 명시적 보류): 로그인 실패 rate limiting, JWT 갱신 토큰, 초대코드 재발급, 팀원 추방/역할 변경, 다국어, 이메일 인증, UTC 변환, IE 지원, 계정 삭제, 팀 이름 중복 제한
