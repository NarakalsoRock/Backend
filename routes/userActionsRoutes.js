// routes/userActionsRoutes.js
const express = require('express');
const { toggleLikeMovie, toggleBookmarkMovie } = require('../controllers/userActionsController');
const { protect } = require('../middlewares/auth'); // 인증 미들웨어

const router = express.Router();

// 이 라우터의 모든 경로는 인증된 사용자만 접근 가능
router.use(protect);

router.post('/movies/like', toggleLikeMovie);
router.post('/movies/bookmark', toggleBookmarkMovie);

module.exports = router;