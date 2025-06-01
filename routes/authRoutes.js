const express = require('express');
const { signup, login, getMe } = require('../controllers/authController');
const { protect } = require('../middlewares/auth');

const router = express.Router();

router.post('/signup', signup);
router.post('/login', login);
router.get('/me', protect, getMe); // protect 미들웨어 적용

module.exports = router;