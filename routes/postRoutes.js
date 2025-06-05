// routes/postRoutes.js
const express = require('express');
const {
    createPost,
    getPosts,
    getPostById,
    toggleLikePost,
    createComment,
    getComments
} = require('../controllers/postController');
const { protect } = require('../middlewares/auth'); // 인증 미들웨어

const router = express.Router();

// 게시글 관련 라우트
router.route('/')
    .post(protect, createPost) // 게시글 작성 (로그인 필요)
    .get(getPosts);            // 게시글 목록 조회

router.route('/:postId')
    .get(getPostById);         // 특정 게시글 조회

router.route('/:postId/like')
    .post(protect, toggleLikePost); // 게시글 좋아요 (로그인 필요)

// 댓글 관련 라우트
router.route('/:postId/comments')
    .post(protect, createComment) // 댓글 작성 (로그인 필요)
    .get(getComments);           // 댓글 목록 조회

module.exports = router;