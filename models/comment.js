// models/comment.js
const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
    post: { // 댓글이 달린 게시글 ID
        type: mongoose.Schema.ObjectId,
        ref: 'Post', // Post 모델 참조
        required: true
    },
    author: { // 댓글 작성자 ID
        type: mongoose.Schema.ObjectId,
        ref: 'User', // User 모델 참조
        required: true
    },
    username: { // 댓글 작성자명 (User 모델에서 가져와 저장)
        type: String,
        required: true
    },
    content: {
        type: String,
        required: [true, '댓글 내용을 입력해주세요.']
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.models.Comment || mongoose.model('Comment', commentSchema);