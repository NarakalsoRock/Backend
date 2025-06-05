const express = require('express');
const { signup, login, getMe, logout } = require('../controllers/authController'); // logout 추가
const { protect } = require('../middlewares/auth');

const router = express.Router();

router.post('/signup', signup);
router.post('/login', login);
router.get('/me', protect, getMe);
router.post('/logout', protect, logout); // 로그아웃 라우트 추가 (POST 요청, protect 미들웨어 적용)

module.exports = router;