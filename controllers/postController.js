// controllers/postController.js
const Post = require('../models/post');
const Comment = require('../models/comment');
const User = require('../models/user'); //

// @desc    새 게시글 작성
// @route   POST /api/posts
// @access  Private
exports.createPost = async (req, res) => {
    try {
        const { title, content, boardType } = req.body;

        if (!title || !content || !boardType) {
            return res.status(400).json({ success: false, error: '제목, 내용, 게시판 타입을 모두 입력해야 합니다.' });
        }

        if (!['info', 'review', 'discussion'].includes(boardType)) {
            return res.status(400).json({ success: false, error: '유효하지 않은 게시판 타입입니다.' });
        }

        const post = await Post.create({
            title,
            content,
            boardType,
            author: req.user.id, // protect 미들웨어에서 설정된 사용자 ID
            username: req.user.username // protect 미들웨어에서 설정된 사용자 이름
        });

        res.status(201).json({
            success: true,
            data: post
        });
    } catch (error) {
        console.error('Error creating post:', error);
        res.status(500).json({ success: false, error: '서버 오류로 게시글 작성에 실패했습니다.' });
    }
};

// @desc    특정 타입의 게시글 목록 조회 (페이지네이션 추가 가능)
// @route   GET /api/posts?type=<boardType>&page=<pageNumber>&limit=<limitNumber>
// @access  Public
exports.getPosts = async (req, res) => {
    try {
        const { type, page = 1, limit = 10 } = req.query;
        if (!type || !['info', 'review', 'discussion'].includes(type)) {
            return res.status(400).json({ success: false, error: '유효한 게시판 타입을 지정해주세요.' });
        }

        const pageNum = parseInt(page, 10);
        const limitNum = parseInt(limit, 10);
        const skip = (pageNum - 1) * limitNum;

        const posts = await Post.find({ boardType: type })
            .populate('author', 'username') // 작성자 정보 중 username만 가져오기
            .sort({ createdAt: -1 }) // 최신순 정렬
            .skip(skip)
            .limit(limitNum);

        const totalPosts = await Post.countDocuments({ boardType: type });

        res.status(200).json({
            success: true,
            count: posts.length,
            totalPages: Math.ceil(totalPosts / limitNum),
            currentPage: pageNum,
            data: posts
        });
    } catch (error) {
        console.error('Error getting posts:', error);
        res.status(500).json({ success: false, error: '서버 오류로 게시글 목록 조회에 실패했습니다.' });
    }
};

// @desc    특정 게시글 상세 조회
// @route   GET /api/posts/:postId
// @access  Public
exports.getPostById = async (req, res) => {
    try {
        const post = await Post.findByIdAndUpdate(
            req.params.postId,
            { $inc: { views: 1 } }, // 조회수 1 증가
            { new: true } // 업데이트된 문서를 반환
        ).populate('author', 'username'); // 작성자 정보 중 username만 가져오기

        if (!post) {
            return res.status(404).json({ success: false, error: '게시글을 찾을 수 없습니다.' });
        }
        res.status(200).json({ success: true, data: post });
    } catch (error) {
        console.error('Error getting post by ID:', error);
        if (error.kind === 'ObjectId') {
             return res.status(404).json({ success: false, error: '유효하지 않은 게시글 ID입니다.' });
        }
        res.status(500).json({ success: false, error: '서버 오류로 게시글 조회에 실패했습니다.' });
    }
};

// @desc    게시글 좋아요 토글
// @route   POST /api/posts/:postId/like
// @access  Private
exports.toggleLikePost = async (req, res) => {
    try {
        const post = await Post.findById(req.params.postId);
        if (!post) {
            return res.status(404).json({ success: false, error: '게시글을 찾을 수 없습니다.' });
        }

        const userId = req.user.id;
        const likedIndex = post.likes.indexOf(userId);

        if (likedIndex === -1) { // 좋아요 누르지 않은 상태
            post.likes.push(userId);
        } else { // 이미 좋아요 누른 상태
            post.likes.splice(likedIndex, 1);
        }

        await post.save();
        res.status(200).json({
            success: true,
            data: {
                likesCount: post.likes.length,
                isLiked: likedIndex === -1 // 현재 사용자가 좋아요를 눌렀는지 여부
            }
        });
    } catch (error) {
        console.error('Error toggling like:', error);
         if (error.kind === 'ObjectId') {
             return res.status(404).json({ success: false, error: '유효하지 않은 게시글 ID입니다.' });
        }
        res.status(500).json({ success: false, error: '서버 오류로 좋아요 처리에 실패했습니다.' });
    }
};


// @desc    특정 게시글에 댓글 작성
// @route   POST /api/posts/:postId/comments
// @access  Private
exports.createComment = async (req, res) => {
    try {
        const { content } = req.body;
        const postId = req.params.postId;

        if (!content) {
            return res.status(400).json({ success: false, error: '댓글 내용을 입력해주세요.' });
        }

        const post = await Post.findById(postId);
        if (!post) {
            return res.status(404).json({ success: false, error: '댓글을 작성할 게시글을 찾을 수 없습니다.' });
        }

        const comment = await Comment.create({
            post: postId,
            content,
            author: req.user.id,
            username: req.user.username // 로그인한 사용자의 username 사용
        });

        // 게시글의 댓글 수 업데이트
        post.commentsCount = (await Comment.countDocuments({ post: postId })) || 0;
        await post.save();

        res.status(201).json({ success: true, data: comment });
    } catch (error) {
        console.error('Error creating comment:', error);
         if (error.kind === 'ObjectId') {
             return res.status(404).json({ success: false, error: '유효하지 않은 게시글 ID입니다.' });
        }
        res.status(500).json({ success: false, error: '서버 오류로 댓글 작성에 실패했습니다.' });
    }
};

// @desc    특정 게시글의 댓글 목록 조회
// @route   GET /api/posts/:postId/comments?page=<pageNumber>&limit=<limitNumber>
// @access  Public
exports.getComments = async (req, res) => {
    try {
        const postId = req.params.postId;
        const { page = 1, limit = 10 } = req.query;

        const pageNum = parseInt(page, 10);
        const limitNum = parseInt(limit, 10);
        const skip = (pageNum - 1) * limitNum;

        const comments = await Comment.find({ post: postId })
            .populate('author', 'username') // 댓글 작성자 username 가져오기
            .sort({ createdAt: 1 }) // 오래된 순 정렬 (일반적인 댓글 정렬)
            .skip(skip)
            .limit(limitNum);

        const totalComments = await Comment.countDocuments({ post: postId });

        res.status(200).json({
            success: true,
            count: comments.length,
            totalPages: Math.ceil(totalComments / limitNum),
            currentPage: pageNum,
            data: comments
        });
    } catch (error) {
        console.error('Error getting comments:', error);
         if (error.kind === 'ObjectId') {
             return res.status(404).json({ success: false, error: '유효하지 않은 게시글 ID입니다.' });
        }
        res.status(500).json({ success: false, error: '서버 오류로 댓글 목록 조회에 실패했습니다.' });
    }
};