// app.js
const express = require('express');
const dotenv = require('dotenv'); // dotenv 모듈 추가
const connectDB = require('./config/db'); // DB 연결 함수 불러오기
const cors = require('cors'); // CORS 미들웨어

// 환경 변수 로드 (경로 명시)
dotenv.config({ path: './.env' });

// DB 연결
connectDB(); // 함수 호출

const app = express();

// Body Parser 미들웨어 (JSON 요청 본문 파싱)
app.use(express.json());

// CORS 허용 (개발 단계에서는 모든 도메인 허용)
// 실제 배포 시에는 특정 프론트엔드 도메인만 허용하도록 변경
app.use(cors());

// 라우트 파일 불러오기`
const authRoutes = require('./routes/auth');
// const userRoutes = require('./routes/users'); // 필요에 따라 주석 해제
// const movieRoutes = require('./routes/movies'); // 필요에 따라 주석 해제

// 라우트 마운트
app.use('/api/auth', authRoutes);
// app.use('/api/users', userRoutes);
// app.use('/api/movies', movieRoutes);


// 기본 라우트 (선택 사항)
app.get('/', (req, res) => {
    res.send('CineX Backend API is running...');
});

const PORT = process.env.PORT || 5000; // 포트 번수 환경 변수 사용

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`); // 동적 포트 메시지
});