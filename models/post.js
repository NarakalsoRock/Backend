// models/post.js
const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, '제목을 입력해주세요.'],
        trim: true
    },
    content: {
        type: String,
        required: [true, '내용을 입력해주세요.']
    },
    author: {
        type: mongoose.Schema.ObjectId,
        ref: 'User', // User 모델 참조
        required: true
    },
    username: { // 작성자명 (User 모델에서 가져와 저장)
        type: String,
        required: true
    },
    boardType: {
        type: String,
        enum: ['info', 'review', 'discussion'],
        required: [true, '게시판 타입을 지정해주세요. (info, review, discussion)']
    },
    views: {
        type: Number,
        default: 0
    },
    likes: [{ // 이 게시글을 좋아하는 사용자들의 ID 목록
        type: mongoose.Schema.ObjectId,
        ref: 'User'
    }],
    commentsCount: { // 댓글 수 (성능을 위해 비정규화)
        type: Number,
        default: 0
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// updatedAt 필드 자동 업데이트 미들웨어
postSchema.pre('save', function(next) {
    if (this.isModified()) {
        this.updatedAt = Date.now();
    }
    next();
});

module.exports = mongoose.models.Post || mongoose.model('Post', postSchema);