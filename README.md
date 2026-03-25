# Web3 Minion Chrome Extension

Web3 Minion은 Nodit API를 활용한 블록체인 분석 도구입니다. 웹페이지에서 텍스트를 선택하여 실시간으로 멀티체인 계정을 분석할 수 있는 크롬 익스텐션입니다.

## 🛠 기술 스택

- **Frontend**: React 18.2.0 + TypeScript
- **빌드 도구**: Webpack 5.90.1
- **블록체인**: Ethers.js 6.14.4, MetaMask SDK
- **UI**: 커스텀 CSS + React 컴포넌트
- **API**: Nodit Blockchain Context API

## 📋 요구사항

### Node.js 및 Yarn 설치

```bash
# Node.js 18 이상 설치 (현재 v24.2.0 권장)
# https://nodejs.org/에서 다운로드

# Yarn 설치 (현재 v4.2.2 권장)
npm install -g yarn
```

## 🚀 개발 환경 설정

### 1. 프로젝트 클론 및 의존성 설치

```bash
# 프로젝트 클론
git clone <repository-url>
cd aim_high

# 의존성 설치
yarn install
```

### 2. 프로젝트 빌드

```bash
# 프로덕션 빌드
yarn build

# 개발 모드 (파일 변경 감지 자동 빌드)
yarn watch
```

빌드가 완료되면 `dist/` 폴더에 다음 파일들이 생성됩니다:

- `manifest.json` - 익스텐션 설정
- `popup.html`, `popup.js` - 팝업 UI
- `background.js` - 백그라운드 서비스 워커
- `content.js` - 컨텐츠 스크립트
- `metamask-content.js` - MetaMask 연동 스크립트
- `transaction.html`, `transaction.js` - 트랜잭션 분석 UI
- 기타 필요 파일들

## 🔧 크롬 익스텐션 개발자 모드 설치

### 1. 크롬 확장 프로그램 관리 페이지 접속

```
chrome://extensions/
```

또는 메뉴 → 도구 더보기 → 확장 프로그램

### 2. 개발자 모드 활성화

- 페이지 우상단의 **"개발자 모드"** 토글을 켜기

### 3. 익스텐션 로드

- **"압축해제된 확장 프로그램을 로드합니다"** 클릭
- 프로젝트의 `dist/` 폴더 선택
- 확인

### 4. 설치 확인

- 브라우저 툴바에 Web3 Minion 아이콘이 표시됨
- 아이콘 클릭 시 팝업이 정상적으로 열리는지 확인

## 🔄 개발 워크플로우

### 실시간 개발

```bash
# 1. 개발 모드로 빌드 시작 (파일 변경 감지)
yarn watch

# 2. 코드 수정 후 익스텐션 새로고침
# - chrome://extensions/ 페이지에서
# - Web3 Minion 익스텐션 카드의 새로고침 버튼 클릭
```

### 디버깅

```bash
# 백그라운드 스크립트 디버깅
# chrome://extensions/ → Web3 Minion → "서비스 워커" 클릭

# 팝업 디버깅
# 팝업 열기 → 우클릭 → "검사"

# 컨텐츠 스크립트 디버깅
# 웹페이지 → F12 → Console 탭
```

## 📁 프로젝트 구조

```
src/
├── popup.tsx           # 메인 팝업 UI
├── content.tsx         # 텍스트 선택 및 분석 기능
├── background.ts       # 백그라운드 서비스 워커
├── metamask-content.tsx # MetaMask 연동
├── transaction.tsx     # 트랜잭션 분석 UI
├── components/         # 재사용 가능한 컴포넌트
├── services/          # API 서비스
├── utils/             # 유틸리티 함수
└── types/             # TypeScript 타입 정의

public/
├── manifest.json      # 익스텐션 설정
└── images/           # 아이콘 및 이미지

dist/                 # 빌드 결과물 (자동 생성)
```

## 🌟 주요 기능

- 웹페이지 텍스트 선택을 통한 지갑 주소 감지
- 멀티체인 계정 분석 (Ethereum, Polygon 등)
- 실시간 트랜잭션 데이터 조회
- MetaMask 연동 및 Web3 상호작용
- 직관적인 데이터 시각화

## 🐛 문제 해결

### 빌드 오류

```bash
# node_modules 삭제 후 재설치
rm -rf node_modules yarn.lock
yarn install
yarn build
```

### 익스텐션 로드 실패

- `dist/manifest.json` 파일이 존재하는지 확인
- 브라우저 콘솔에서 오류 메시지 확인
- 개발자 모드가 활성화되어 있는지 확인

### API 연동 오류

- Nodit API 키 설정 확인
- 네트워크 연결 상태 확인
- CORS 정책 관련 오류 확인

## 📞 지원

개발 관련 문의사항이나 버그 신고는 GitHub Issues를 통해 제출해 주세요.
