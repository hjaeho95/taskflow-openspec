# TaskFlow

소규모 팀(3~5인)을 위한 경량 태스크 관리 도구. 회원가입 → 팀 생성/합류 → 칸반 보드 → 팀 채팅까지 하나의 흐름으로 이어지는 MVP입니다.

## 주요 기능

- **인증**: 이메일/비밀번호 회원가입·로그인·로그아웃 (JWT 24h, stateless)
- **팀 관리**: 초대코드로 팀 생성/합류 (1인 1팀), 멤버 목록, 팀 탈퇴 (owner 탈퇴 시 팀 전체 삭제)
- **칸반 보드**: TODO/DOING/DONE 3컬럼, 드래그앤드롭, 필터(전체/@me/미할당), 카드 생성·수정·삭제
- **팀 채팅**: 5초 폴링 기반 메시지 조회/전송(1000자 제한)/삭제(본인만)
- **반응형 UI**: 모바일(<1024px, 햄버거 메뉴/스와이프 칸반/풀스크린 채팅) ~ 데스크탑(>=1024px)

## 기술 스택

- **백엔드**: FastAPI, SQLAlchemy(비동기) + Alembic, JWT 인증
- **프론트엔드**: Vanilla JS + Tailwind CSS (정적 페이지)
- **DB**: 로컬 SQLite / 운영 Neon PostgreSQL (`DATABASE_URL` 환경변수로 전환)
- **배포**: Vercel (Python 서버리스 함수 + 정적 프론트엔드)

## 로컬 개발

### 백엔드

```bash
cd backend
python -m venv .venv
.venv/Scripts/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload
```

기본적으로 `sqlite+aiosqlite:///./taskflow.db`를 사용합니다. Postgres를 쓰려면 `DATABASE_URL` 환경변수를 설정하세요.

### 프론트엔드

`frontend/` 디렉토리를 정적 파일 서버로 서빙하면 됩니다 (예: `npx serve frontend`). 로컬에서는 `http://localhost:8000`에 떠 있는 백엔드를 자동으로 바라봅니다.

## 배포

Vercel에 프론트엔드(정적 파일)와 백엔드(Python 서버리스 함수, `api/index.py`)를 함께 배포합니다. Neon PostgreSQL을 `DATABASE_URL`로 연결합니다. 자세한 라우팅 설정은 `vercel.json`을 참고하세요.

```bash
vercel --prod
```

## 프로젝트 구조

```
backend/    FastAPI 앱, Alembic 마이그레이션
frontend/   정적 HTML/JS 페이지
api/        Vercel Python 서버리스 함수 진입점
openspec/   OpenSpec 변경 제안/스펙 문서
```

## 문서

- 스토리보드: `docs/TaskFlow_스토리보드.pdf`
- OpenSpec 변경 제안: `openspec/changes/add-mvp-core/`
