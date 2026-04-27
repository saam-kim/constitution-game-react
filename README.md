# 헌법 제정 게임 React 프로젝트

고등학교 2학년 사회 수업에서 존 롤스의 "무지의 베일" 사고실험을 체험하기 위한 React + Tailwind CSS + Firebase Realtime Database 앱입니다.

## 수업 흐름

- 토론: 학생 입장, 모둠 확정, 정책 쟁점 확인
- 헌법 제정: 모둠별 정책 선택과 제출
- 결과 확인: 계층 룰렛과 1차 결과 확인
- 새로운 헌법을 위한 토론: 1차 결과를 바탕으로 정책 재검토
- 결과 확인 및 발표: 최종 룰렛, 모둠 발표, 기록 저장

현재 정책 항목은 최고 소득세율, 복지 예산 비중, 최저임금 3개입니다. 결과 계산식과 계층 확률은 초기 버전을 유지합니다.

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

Firebase 설정 전에는 로컬 데모 모드로 동작합니다. 이 모드에서는 같은 브라우저의 `localStorage`에 세션이 저장되므로, 개발 중에 교사 화면과 학생 화면을 여러 탭으로 열어 전체 흐름을 리허설할 수 있습니다. 실제 여러 기기에서 동시에 접속하는 수업 운영은 Firebase 설정 후 사용합니다.

## 화면 주소

교사용:

```text
http://localhost:5173/?role=teacher
```

학생용:

```text
http://localhost:5173/?role=student&pin=123456&groupId=group_1
```

교사용 화면에서 세션을 만들면 6자리 PIN이 생성됩니다. 모둠 수는 4~8모둠으로 운영합니다.

## 기록 저장

교사용 대시보드의 `CSV 저장` 버튼으로 모둠별 정책, 제출 여부, 룰렛 결과, 점수와 결과 메시지를 CSV로 저장할 수 있습니다.

## 교사용 운영 기능

- 학생들이 입장한 뒤 `모둠 확정` 버튼으로 실제 참여 모둠을 확정합니다.
- 모둠 확정 후 입장하지 않은 모둠은 대시보드에서 사라집니다.
- `토론`, `헌법 제정`, `결과 확인`, `새 헌법 토론`, `결과 확인 및 발표` 단계 버튼으로 수업 흐름을 제어합니다.
- 헌법 제정/새 헌법 토론 단계에서만 학생 화면의 정책 수정과 제출이 열립니다.
- 전체 비교 표에서 모둠별 정책, 계층 배정, 결과 점수를 한 번에 확인할 수 있습니다.

## 파일 구성

```text
src/
  App.jsx
  StudentApp.jsx
  TeacherDashboard.jsx
  firebase.js
  index.css
  main.jsx
  useGameData.js
firebase-db-schema.json
```
