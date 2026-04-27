# 헌법 제정 게임 React 프로젝트

고등학교 2학년 사회 수업에서 롤스의 "무지의 베일" 사고실험을 체험하기 위한 React + Tailwind CSS + Firebase Realtime Database 앱입니다.

## 수업 흐름

- 토론: 학생 입장, 모둠 확정, 정책 쟁점 확인
- 헌법 제정: 모둠별 정책 선택과 제출
- 결과 확인: 1차 룰렛으로 미래의 나를 공개하고 결과 확인
- 새 헌법 토론: 공개된 위치를 바탕으로 정책 재검토
- 최종 결과 및 발표: 같은 미래의 나 기준으로 수정 헌법 결과를 비교하고 발표

현재 정책 항목은 최고 소득세율, 복지 예산 비중, 최저임금 3개입니다. 결과 계산식과 계층 확률은 초기 버전의 수업용 모델입니다.

## 실행 방법

```bash
npm install
npm run dev
```

브라우저에서 Vite가 표시하는 주소로 접속합니다.

## Firebase 설정

1. `.env.example` 파일을 복사해서 `.env` 파일을 만듭니다.
2. Firebase 콘솔에서 Web App 설정값을 확인합니다.
3. `.env`에 `VITE_FIREBASE_DATABASE_URL`을 포함한 값을 입력합니다.
4. Firebase Realtime Database를 활성화합니다.

Firebase 설정 전에는 로컬 데모 모드로 동작합니다. 이 모드에서는 같은 브라우저의 `localStorage`에 세션이 저장되므로 개발 중 흐름 리허설에 적합합니다. 실제 여러 기기 접속 수업은 Firebase 설정 후 사용합니다.

## 화면 주소

로컬 교사용:

```text
http://localhost:5173/?role=teacher
```

로컬 학생용:

```text
http://localhost:5173/?role=student&pin=123456&groupId=group_1
```

GitHub Pages 배포 주소:

```text
https://saam-kim.github.io/constitution-game-react/
```

GitHub Pages에서는 404 방지를 위해 교사용/학생용 화면 이동에 해시 라우팅을 사용합니다.

## 기록 저장

교사용 대시보드의 `CSV 저장` 버튼으로 모둠별 정책, 제출 여부, 미래의 나, 점수, 결과 메시지, 사건 카드를 CSV로 저장할 수 있습니다.

## 교사용 운영 기능

- 학생들이 입장한 뒤 `모둠 확정` 버튼으로 실제 참여 모둠을 확정합니다.
- 모둠 확정 뒤 입장하지 않은 모둠은 대시보드에서 사라집니다.
- `토론`, `헌법 제정`, `결과 확인`, `새 헌법 토론`, `최종 결과 및 발표` 단계 버튼으로 수업 흐름을 제어합니다.
- 1차 룰렛은 미래의 나를 공개하는 장치입니다.
- 최종 단계에서는 2차 룰렛을 돌리지 않고, 같은 미래의 나 기준으로 수정 헌법 결과를 확인합니다.
- 헌법 제정/새 헌법 토론 단계에서만 학생 화면의 정책 수정과 제출이 열립니다.
- 전체 비교 표에서 모둠별 정책, 미래의 나, 결과 점수를 한 번에 확인할 수 있습니다.

## 파일 구성

```text
src/
  App.jsx
  StudentApp.jsx
  TeacherDashboard.jsx
  firebase.js
  index.css
  main.jsx
  routes.js
  useGameData.js
firebase-db-schema.json
```
