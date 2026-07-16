## Why

현재 UI는 라이트 테마로 고정돼 있다. 칸반/채팅을 오래 켜두고 쓰는 협업 도구 특성상 야간 사용 편의를 위한 다크모드 요청이 자연스럽게 나올 기능이며, 구현 비용 대비 체감 만족도가 높다.

## What Changes

- 모든 페이지에 라이트/다크 테마 토글 UI 추가 (헤더 또는 햄버거 메뉴)
- 선택한 테마를 `localStorage`에 저장하고, 페이지 로드 시 저장된 테마를 즉시 적용 (깜빡임 최소화)
- 별도 서버 저장 없음 — 브라우저/기기별로 독립적으로 적용됨 (계정에 종속되지 않음)
- Tailwind의 `dark:` variant를 활용해 각 페이지의 색상 클래스를 다크 대응으로 확장

## Capabilities

### New Capabilities
- `dark-mode`: 라이트/다크 테마 전환 및 localStorage 기반 유지

### Modified Capabilities
(없음 — 기존 capability의 요구사항 자체는 바뀌지 않음, 전 페이지에 걸친 순수 UI 추가)

## Impact

- 프론트엔드: 모든 HTML 페이지(9종)에 테마 토글 버튼과 `dark:` 클래스 추가, 공통 `js/theme.js` 신설(테마 읽기/적용/저장), Tailwind CDN 설정에 `darkMode: 'class'` 반영
- 백엔드: 변경 없음
- 배포: 변경 없음 (정적 자산만 갱신)
