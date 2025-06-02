// backend/app.js
const express = require('express');
const dotenv = require('dotenv'); 
const connectDB = require('./config/db'); 
const cors = require('cors'); 

dotenv.config({ path: './.env' }); //
connectDB(); //

const app = express(); //

// 테스트 라우트 (디버깅 시 유용)
// app.get('/test-app', (req, res) => { //
//     res.send('App.js /test-app route is working!'); //
// });
// app.post('/test-app-post', (req, res) => { //
//     res.send('App.js /test-app-post route is working!'); //
// });


app.use(express.json()); //
app.use(express.urlencoded({ extended: true })); //

app.use(cors({ //
    origin: ['http://localhost:3000', 'http://127.0.0.1:3000', 'http://localhost:5000', 'http://127.0.0.1:5000'], //
    credentials: true, //
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], //
    allowedHeaders: ['Content-Type', 'Authorization'] //
}));

// 라우트 파일 불러오기
const authRoutes = require('./routes/authRoutes'); // 제공된 파일 이름이 authRoutes.js 라면
const movieRoutes = require('./routes/moviesRoutes'); //
const userActionsRoutes = require('./routes/userActionsRoutes'); //

// 라우트 마운트
app.use('/api/auth', authRoutes); //
app.use('/api/movies', movieRoutes); //
app.use('/api/actions', userActionsRoutes); //

// 에러 핸들링
app.use((err, req, res, next) => { //
    console.error(err.stack); //
    res.status(500).json({ success: false, message: err.message || '서버 에러가 발생했습니다.' }); // 에러 메시지 포함
});

app.get('/', (req, res) => { //
    res.send('CineX Backend API is running...'); //
});

const PORT = process.env.PORT || 5000; //

app.listen(PORT, () => { //
    console.log(`Server running on port ${PORT}`); //
    console.log(`TMDB API Key loaded: ${process.env.TMDB_API_KEY ? 'Yes' : 'No'}`); //
});

module.exports = app; //