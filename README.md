# 경북 공간이음 - 실제 API 연동형

소상공인시장진흥공단 상가업소정보 좌표 데이터와 VWorld 주요상권 폴리곤 데이터를 결합해
경북 시군별·업종별 상권 과밀 위험도와 블루오션 후보지를 보여주는 웹앱입니다.

## 기능

1. VWorld 주요상권 API 호출
2. 소진공 상가업소정보 API 호출
3. 공공 API 실패 시 데모 데이터 자동 전환
4. 소진공 CSV 업로드 분석
5. 점-다각형 공간 조인
6. 면적당 점포 밀도 기반 안정/주의/위험 표시
7. 정책지원 우선순위 점수 산출
8. GitHub Pages 배포 가능

## 설치 및 로컬 테스트

```bash
npm install
cp .env.example .env
npm run dev
```

브라우저에서 `http://localhost:5173` 접속

## 인증키 넣기

`.env` 파일을 열고 아래 값을 넣습니다.

```env
VITE_VWORLD_KEY=발급받은_VWorld_KEY
VITE_VWORLD_DOMAIN=http://localhost:5173
VITE_DATA_GO_KR_KEY=발급받은_공공데이터포털_서비스키
```

GitHub Pages 배포 후에는 `VITE_VWORLD_DOMAIN`과 VWorld 인증키 등록 도메인을
실제 주소로 바꿔야 합니다.

예:

```env
VITE_VWORLD_DOMAIN=https://geunho1011.github.io/gyeongbuk-space-link-realapi
```

## CSV 업로드 방식

브라우저 CORS 문제로 공공 API 직접 호출이 막힐 경우,
소상공인시장진흥공단 상가업소정보 CSV를 내려받아 업로드하면 동일하게 분석됩니다.

인식 가능한 좌표 필드 예시:

- lon, 경도, longitude
- lat, 위도, latitude
- 상호명, bizesNm
- 상권업종대분류명, indsLclsNm
- 도로명주소, rdnmAdr

## GitHub 업로드

```bash
git init
git add .
git commit -m "경북 공간이음 실제 API 연동형"
git branch -M main
git remote add origin 본인_깃허브_저장소_URL
git push -u origin main
```

## GitHub Pages 배포

```bash
npm run build
npm run deploy
```

또는 GitHub Actions/Pages 설정에서 `dist` 산출물을 배포하세요.

## 유의사항

- VWorld API는 인증키 발급 시 등록한 도메인과 실제 호출 도메인이 다르면 실패할 수 있습니다.
- 공공데이터포털 API는 활용 신청한 API 상품에 따라 endpoint와 응답 필드명이 다를 수 있습니다.
- 브라우저 CORS가 발생하면 CSV 업로드 방식 또는 별도 서버 프록시 방식이 필요합니다.
