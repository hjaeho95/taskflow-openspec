## 1. 공통 인프라

- [x] 1.1 `js/theme.js` 작성: `localStorage`에서 `"theme"` 읽어 `<html>`에 `dark` 클래스 적용/해제하는 `applyStoredTheme()`, 토글 시 저장+적용하는 `toggleTheme()` 구현
- [x] 1.2 각 페이지에 `tailwind.config = { darkMode: 'class' }` 인라인 스크립트를 Tailwind CDN 스크립트 직후에 추가
- [x] 1.3 각 페이지 `<head>`에서 `theme.js`를 가능한 한 이르게 로드해 FOUC 최소화

## 2. 테마 토글 UI

- [x] 2.1 `login.html`, `signup.html`에 테마 토글 버튼 추가 (`index.html`은 순수 리다이렉트 페이지로 렌더링되는 UI가 없어 토글 없이 `theme.js`만 로드)
- [x] 2.2 `team-select.html` 헤더(로그아웃/계정삭제 옆)에 테마 토글 버튼 추가
- [x] 2.3 `kanban.html` 데스크탑 헤더 및 모바일 햄버거 메뉴 양쪽에 테마 토글 버튼 추가
- [x] 2.4 `chat.html` 헤더에 테마 토글 버튼 추가

## 3. 다크 팔레트 적용

- [x] 3.1 각 페이지의 배경/카드/보더/텍스트 색상 클래스에 대응하는 `dark:` variant 클래스 추가 (예: `bg-white` → `bg-white dark:bg-gray-800`)
- [x] 3.2 칸반 카드, 채팅 말풍선, 모달/패널류의 다크 대비 확인 및 조정 (kanban.js/chat.js 동적 렌더링 마크업에도 반영)

## 4. 검증

- [x] 4.1 Playwright로 토글 클릭 시 즉시 다크/라이트 전환되는지 확인
- [x] 4.2 다크 선택 후 새로고침 시 유지되는지, 저장값 없는 최초 방문 시 라이트가 기본인지 확인
- [x] 4.3 login/signup/team-select/kanban(카드)/chat(말풍선) 순회하며 다크모드에서 텍스트 가독성/대비 스크린샷으로 확인
