# 한양대학교 ERICA 소프트웨어융합대학 주점 주문 플랫폼

학교 축제 부스에서 사용하는 QR 기반 주문 시스템의 백엔드 서버입니다.
손님이 테이블 QR을 스캔해 메뉴를 주문하면, 관리자가 실시간으로 주문을 확인하고 처리합니다.

---

## 기술 스택

| 분류 | 사용 기술 |
|------|-----------|
| Runtime | Node.js 22 |
| Framework | Express.js 5 |
| ORM | Sequelize 6 |
| Database | MySQL 8 |
| 인증 | JWT (관리자), Session Token (사용자) |
| 실시간 | SSE (Server-Sent Events) |
| 외부 연동 | Notion API (주문 동기화) |
| 문서 | Swagger UI (`/docs`) |
| 테스트 | Jest |
| 배포 | AWS EC2, PM2 |

---

## 아키텍처

```
클라이언트 (QR 스캔)
    │
    ▼
Express.js (REST API)
    │
    ├── 인증 미들웨어 (JWT / Session Token)
    │
    ├── 라우터
    │   ├── /api/admin      관리자 로그인, 테이블 관리
    │   ├── /api/sessions   세션 열기/닫기
    │   ├── /api/orders     주문 생성, 상태 변경
    │   ├── /api/menu       메뉴 조회
    │   └── /api/sse        실시간 주문 스트림
    │
    └── Sequelize ORM
            │
            └── MySQL 8
```

**주문 상태 머신 (FSM)**

```
PENDING ──confirm──▶ CONFIRMED ──start──▶ IN_PROGRESS ──serve──▶ SERVED
   │                     │
   └──cancel──▶ CANCELED  └──cancel──▶ CANCELED (재고 복구)
```

---

## 로컬 실행

### 요구사항
- Node.js 22+
- MySQL 8

### 설치 및 실행

```bash
# 의존성 설치
npm install

# 환경변수 설정
cp .env.example .env  # DB 정보, JWT_SECRET 등 입력

# 개발 서버 실행
npm run dev
```

### 환경변수

```
PORT=3000
NODE_ENV=development

DB_HOST=127.0.0.1
DB_PORT=3306
DB_NAME=sw_festival
DB_USER=root
DB_PASSWORD=

JWT_SECRET=
SESSION_SECRET=
SESSION_OPEN_CODE=

CLIENT_ORIGIN=http://localhost:5173
```

---

## API 문서

서버 실행 후 `http://localhost:3000/docs` 에서 Swagger UI로 확인할 수 있습니다.

주요 엔드포인트:

| 메서드 | 경로 | 설명 |
|--------|------|------|
| POST | `/api/admin/login` | 관리자 PIN 로그인 |
| POST | `/api/admin/tables/ensure` | 테이블 생성/조회 |
| POST | `/api/sessions/open-by-slug` | 세션 열기 |
| POST | `/api/orders` | 주문 생성 |
| PATCH | `/api/orders/:id/status` | 주문 상태 변경 |
| GET | `/api/orders/active` | 진행 중 주문 조회 |
| GET | `/api/menu` | 메뉴 조회 |
| GET | `/api/sse/orders/stream` | 실시간 주문 스트림 (SSE) |

---

## 테스트

```bash
npm test
```

---

## Wiki

기술적 설계 결정과 개선 과정은 [GitHub Wiki](../../wiki)에서 확인할 수 있습니다.

- [커서 기반 페이지네이션 설계](../../wiki/커서-기반-페이지네이션)
- [데드락 재현 및 withRetry 도입](../../wiki/데드락-재현-및-withRetry-도입)
- [주문 FSM 설계](../../wiki/주문-FSM-설계)
