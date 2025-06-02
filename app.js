const express = require('express');
const dotenv = require('dotenv'); // dotenv 모듈 추가
const connectDB = require('./config/db'); // DB 연결 함수 불러오기
const cors = require('cors'); // CORS 미들웨어

// 환경 변수 로드 (경로 명시)
dotenv.config({ path: './.env' });

// DB 연결
connectDB(); // 함수 호출

const app = express();

// !!!! 최상단 테스트 라우트 !!!!
app.get('/test-app', (req, res) => {
    res.send('App.js /test-app route is working!');
});
app.post('/test-app-post', (req, res) => {
    res.send('App.js /test-app-post route is working!');
});


// JSON 파싱 미들웨어
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS 설정
app.use(cors({
    origin: ['http://localhost:3000', 'http://127.0.0.1:3000', 'http://localhost:5000', 'http://127.0.0.1:5000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// 라우트 파일 불러오기`
const authRoutes = require('./routes/authRoutes');
// const userRoutes = require('./routes/users'); // 필요에 따라 주석 해제
const movieRoutes = require('./routes/moviesRoutes');
const userActionsRoutes = require('./routes/userActionsRoutes');

// 라우트 마운트
app.use('/api/auth', authRoutes);
app.use('/api/movies', movieRoutes);
app.use('/api/actions', userActionsRoutes);
// app.use('/api/users', userRoutes);

// 에러 핸들링
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ message: '서버 에러가 발생했습니다.' });
});

// 기본 라우트 (선택 사항)
app.get('/', (req, res) => {
    res.send('CineX Backend API is running...');
});

const PORT = process.env.PORT || 5000; // 포트 번수 환경 변수 사용

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`); // 동적 포트 메시지
    console.log(`TMDB API Key loaded: ${process.env.TMDB_API_KEY ? 'Yes' : 'No'}`); // API 키 로드 확인
});

module.exports = app;