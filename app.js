const express = require('express');
const session = require('express-session');
const dotenv = require('dotenv');
const helmet = require('helmet');
const morgan = require('morgan');
const cors = require('cors');
const { initDB } = require('./src/models/bootstrap');

const adminRouter = require('./src/routes/admin.route');
const sessionRouter = require('./src/routes/session.route');
const errorHandler = require('./src/middlewares/errorHandler');

dotenv.config();

const app = express();
app.set('port', process.env.PORT || 3000);

// 보안 관련 미들웨어 및 로깅 설정 (production 환경에 따른 설정)
if (process.env.NODE_ENV === 'production') {
  app.enable('trust proxy');
  app.use(morgan('combined')); // 생산 환경에서는 'combined'로 로깅
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
      crossOriginResourcePolicy: false,
    })
  );
} else {
  app.use(morgan('dev')); // 개발 환경에서는 'dev'로 로깅
}

const allowedOrigin = process.env.CLIENT_ORIGIN
  ? process.env.CLIENT_ORIGIN.split(',')
  : ['http://localhost:3000'];

// CORS 설정
app.use(
  cors({
    origin: allowedOrigin,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    credentials: true,
    exposedHeaders: ['Content-Disposition'],
  })
);

(async () => {
  await initDB({ alter: true });
})();

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// 세션 설정
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production', // production 환경에서는 secure 속성 설정
      httpOnly: true,
      maxAge: 1000 * 60 * 60, // 세션 만료 시간 설정 (1시간)
    },
  })
);

app.use('/api/admin', adminRouter);
app.use('/api/sessions', sessionRouter);

// 에러 핸들링 미들웨어
app.use(errorHandler);

// connectDB();

// 서버 시작
app.listen(app.get('port'), () => {
  console.log(`Server running on http://localhost:${app.get('port')}`);
});
