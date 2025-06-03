const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    likedMovies: [{
        movieId: { type: String, required: true },
        title: { type: String, required: true },
        posterPath: { type: String },
        addedAt: { type: Date, default: Date.now }
    }],
    bookmarkedMovies: [{
        movieId: { type: String, required: true },
        title: { type: String, required: true },
        posterPath: { type: String },
        addedAt: { type: Date, default: Date.now }
    }],
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// 비밀번호 해싱 미들웨어 (저장 전 실행)
// isModified('password')를 통해 비밀번호가 변경될 때만 해싱하도록 함
userSchema.pre('save', async function(next) {
    if (!this.isModified('password')) {
        return next();
    }
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

// 비밀번호 일치 확인 메서드 (사용자 모델 인스턴스에서 호출 가능)
userSchema.methods.matchPassword = async function(enteredPassword) {
    // 저장된 해시 비밀번호 (this.password)와 입력된 비밀번호(enteredPassword) 비교
    return await bcrypt.compare(enteredPassword, this.password);
};

// 모델이 이미 존재하는지 확인하고, 존재하지 않는 경우에만 새로 생성
module.exports = mongoose.models.User || mongoose.model('User', userSchema);