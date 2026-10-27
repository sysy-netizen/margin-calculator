# 마진/정산 계산기 (Vercel 배포용)

`excel_merge/`와 동일한 구조로 만드는 프로젝트입니다.

- 화면: Next.js (App Router, TypeScript)
- 매칭/계산 로직: Python (Vercel Python 서버리스 함수, `/api/*.py`)

`codivostudio-web`(Astro, Cloudflare 배포)의 `/tools/excel-converter/`와 같은 방식으로,
`codivostudio-web` 쪽 페이지가 이 앱을 감싸서 보여줄 예정입니다.

## 목적

네이버 스마트스토어 정산내역(A파일)과 셀러가 관리하는 상품별 원가표(B파일)를
업로드하면, 상품 기준으로 매칭해서 상품별 순이익·마진율을 계산한 결과 파일(C파일)을
내려줍니다.

## 현재 상태

폴더 구조와 빌드 설정만 만든 상태입니다. 다음 두 가지를 확인한 뒤 `api/_lib/`에
`config.py / file_reader.py / key_builder.py / matcher.py / writer.py`를
채워 넣어야 합니다 (excel_merge의 구조를 그대로 따름):

1. 네이버 정산내역 다운로드 파일의 실제 컬럼 구조 (어떤 열이 상품명/매출/수수료인지)
2. 원가표 형식 (상품명 기준인지 옵션별인지, 어떤 열에 원가가 있는지)
3. 두 파일을 매칭할 기준 키 (상품명 / 옵션명 / 상품번호 중 무엇을 쓸지)

## 로컬 실행

### 1. 프론트엔드 (Next.js)

```bash
npm install
npm run dev
```

### 2. API 함수 (Python)까지 함께 실행하려면 Vercel CLI 사용

```bash
npm install -g vercel
python -m venv .venv
.venv\Scripts\activate        # (Windows)
pip install -r requirements.txt
vercel dev
```

## 배포 (Vercel)

1. 이 폴더를 GitHub 저장소로 올리거나, `vercel` CLI로 바로 배포합니다.
   ```bash
   vercel login
   vercel --prod
   ```
2. 배포 후 나오는 주소를 `codivostudio-web` 저장소의
   `src/pages/tools/margin-calculator/index.astro`와 `src/data/programs.ts`에
   반영해야 실제 사이트에서 보입니다.

## 구조

```
api/
  _lib/               # 매칭/계산 로직 (아직 비어 있음)
app/
  layout.tsx           # 공통 도구 탭 내비 포함
  page.tsx             # 메인 화면 (현재는 준비중 안내만 표시)
public/logo/           # 로고 등 정적 파일
```

## 참고

- 업로드된 엑셀 파일은 디스크에 저장하지 않고 메모리에서만 처리한 뒤 즉시 사라지는
  방식으로 만들 예정입니다 (excel_merge와 동일한 정책).
