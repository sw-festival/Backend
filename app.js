const express = require('express');
const session = require('express-session');
const dotenv = require('dotenv');
const helmet = require('helmet');
const morgan = require('morgan');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');
const path = require('path');

dotenv.config(); // .env 하나만

const app = express();
const isProd = process.env.NODE_ENV === 'production';
app.set('port', process.env.PORT || 3000);

// 로깅/보안
if (isProd) {
  app.enable('trust proxy');
  app.use(morgan('combined'));
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
      crossOriginResourcePolicy: false,
    })
  );
} else {
  app.use(morgan('dev'));
}

// ===== CORS: 한 파일에서 동적 허용 =====
const clientOriginDev = (process.env.CLIENT_ORIGIN_DEV || '')
  .split(',')
  .filter(Boolean);
const clientOriginProd = (process.env.CLIENT_ORIGIN_PROD || '')
  .split(',')
  .filter(Boolean);
const allowedOrigins = isProd ? clientOriginProd : clientOriginDev;

// origin을 함수로 주면 더 유연함(와일드카드/프리뷰 도메인 대응)
app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true); // 모바일앱/서버-서버 호출 허용
      if (allowedOrigins.includes(origin)) return cb(null, true);
      return cb(new Error(`Not allowed by CORS: ${origin}`), false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    exposedHeaders: ['Content-Disposition'],
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// ===== 세션: 한 파일에서 분기 =====
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: isProd,
      httpOnly: true,
      sameSite: isProd ? 'none' : 'lax', // 크로스사이트 쿠키 고려 시
      maxAge: 1000 * 60 * 60,
    },
  })
);

// ===== Swagger: 한 파일에서 동적 서버 주입 =====
const swaggerDocRaw = YAML.load(path.join(process.cwd(), './swagger.yaml'));

const makeDocPerRequest = (req) => {
  const isProd = process.env.NODE_ENV === 'production';
  const proto =
    req.headers['x-forwarded-proto'] ||
    req.protocol ||
    (isProd ? 'https' : 'http');
  const host =
    req.headers['x-forwarded-host'] ||
    req.headers.host ||
    `localhost:${app.get('port')}`;
  const inferred = `${proto}://${host}/api`;

  const servers = [
    {
      url:
        (isProd
          ? process.env.API_BASE_URL_PROD
          : process.env.API_BASE_URL_DEV) || inferred,
      description: isProd ? 'Production' : 'Development',
    },
  ];

  return { ...swaggerDocRaw, servers };
};

// swaggerUi.setup은 핸들러를 리턴하므로, 요청마다 문서를 생성하여 주입
app.use('/docs', swaggerUi.serve, (req, res) => {
  const doc = makeDocPerRequest(req);
  swaggerUi.setup(doc, { explorer: true })(req, res);
});

// ===== 라우팅 =====
const { initDB } = require('./src/models/bootstrap');
const adminRouter = require('./src/routes/admin.route');
const sessionRouter = require('./src/routes/session.route');

(async () => {
  await initDB({ alter: true }); // 개발 중만 alter, 운영은 안전하게 마이그레이션 권장
})();

app.use('/api/admin', adminRouter);
app.use('/api/sessions', sessionRouter);

// ===== 에러 핸들러 =====
const errorHandler = require('./src/middlewares/errorHandler');
app.use(errorHandler);

// ===== 서버 시작 =====
app.listen(app.get('port'), () => {
  console.log(
    `Server running on http://localhost:${app.get('port')} NODE_ENV=${process.env.NODE_ENV}`
  );
});
