# Liars’ Circle

Blood on the Clocktower 플레이어를 위한 개인 메모 웹 앱입니다.

## 실행

Node.js 22.18 이상을 사용합니다.

```sh
npm ci
npm run dev
npm test
npm run build
npm run preview
```

PWA는 프로덕션 빌드에서 활성화됩니다. 모바일에서는 HTTPS로 제공되는 빌드를 한 번 온라인으로 열고 홈 화면에 추가할 수 있습니다. 같은 브라우저와 주소에서 활성 게임과 시트가 복원됩니다. 외부 Homebrew 이미지에는 네트워크가 필요할 수 있습니다.

## 구현 구조

| 경로 | 역할 |
| --- | --- |
| `src/model.ts` | 게임 모델, 단계 변환, 메모 갱신, 좌석 좌표, 생사 및 유령 투표 계산 |
| `src/scripts.ts`, `src/roles.json` | 공식 시트와 Script Tool JSON 정규화 |
| `src/storage.ts`, `src/useGame.ts` | 저장 데이터 검증, localStorage 복원, 자동 저장 |
| `src/main.tsx`, `src/Setup.tsx`, `src/Editors.tsx` | 게임 생성, 원형 테이블, 입력 및 기록 화면 |
| `public/botc/`, `vite.config.ts` | 공식 이미지 및 빌드별 오프라인 캐시 |
| `tests/game.test.ts` | 모델, 시트 및 복원 회귀 테스트 |

React의 상태와 ref를 사용합니다. 활성 게임은 작은 JSON 한 건이며, 화면 상태와 입력 중인 투표는 테이블 컴포넌트 안에서 관리합니다. 외부 상태 저장소를 추가할 필요가 없는 규모입니다.

- 플레이어는 좌석 번호와 독립적인 ID를 가지며, 현재 등록 캐릭터는 모든 일자에서 공통으로 표시됩니다.
- 메모는 게임에 속하고 일자와 대상별로 한 건씩 저장됩니다. 공통 메모에는 플레이어 ID가 없습니다.
- 투표는 투표자 ID를 저장합니다. 같은 일자의 투표와 생사 이벤트는 공통 순서를 사용해 해당 투표 직전의 생사를 판단합니다. 뒤늦게 기록한 사건은 해당 일자의 마지막 순서에 추가되므로 필요한 경우 투표 편집에서 유령 투표 판정을 수정할 수 있습니다.
- 테이블의 생존 수는 조회 일자 마지막 시점으로 계산합니다. 처형 후 생존은 기존 생사를 유지합니다.
- 활성 게임은 커스텀 시트에 포함된 Homebrew 정의를 보관합니다. 라이브러리에서 시트를 삭제해도 활성 게임은 계속 복원됩니다.
- 모바일에서 토큰은 56px이며 대형 테이블은 가로로 스크롤할 수 있습니다. 일반 플레이어 및 Traveller 구성은 안내로 표시합니다.
- 저장 스키마는 버전 1입니다. 손상되거나 알 수 없는 버전의 저장 데이터는 보존하고 화면에 오류를 표시합니다.

## 공식 리소스

비공식 비상업 팬 프로젝트입니다. 캐릭터 데이터와 이미지 및 Community Created Content 배지는 The Pandemonium Institute의 공개 자료를 사용합니다.

- [공식 리소스](https://release.botc.app/resources/)
- [Community Created Content Policy](https://bloodontheclocktower.com/pages/community-created-content-policy)
- [Script Tool JSON 스키마](https://github.com/ThePandemoniumInstitute/botc-release/blob/main/script-schema.json)
