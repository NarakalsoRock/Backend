// models/User.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs'); // bcryptjs 모듈 추가

// 영화 상호작용 정보를 위한 하위 스키마
const MovieInteractionSchema = new mongoose.Schema({
    movieId: { // 영화 API ID (프론트엔드의 movie.id 에 해당)
        type: String, // 또는 Number, 프론트엔드에서 전달하는 ID 타입과 일치
        required: true
    },
    title: { // 영화 제목 (프론트엔드의 movie.title 에 해당)
        type: String,
        required: true
    },
    posterPath: { // 영화 포스터 경로 (프론트엔드의 movie.poster_path 에 해당)
        type: String
    },
    addedAt: { // 추가된 날짜
        type: Date,
        default: Date.now
    }
}, { _id: false }); // 하위 문서에는 별도의 _id를 생성하지 않음

const UserSchema = new mongoose.Schema({
    email: {
        type: String,
        required: [true, '이메일을 입력해주세요.'], // 에러 메시지 추가
        unique: true,
        match: [ // 이메일 형식 검사 정규식 추가
            /^\S+@\S+\.\S+$/,
            '유효한 이메일 주소를 입력해주세요.'
        ]
    },
    password: { // 필드 이름은 password로 통일 (passwordHash 대신)
        type: String,
        required: [true, '비밀번호를 입력해주세요.'], //
        minlength: [6, '비밀번호는 최소 6자 이상이어야 합니다.'], // 최소 길이 제한 추가
        select: false // 비밀번호는 조회 시 기본적으로 포함되지 않도록 설정
    },
    nickname: {
        type: String,
        required: [true, '닉네임을 입력해주세요.'], //
        unique: true, // 닉네임도 고유해야 함
        minlength: [2, '닉네임은 최소 2자 이상이어야 합니다.'] // 닉네임 최소 길이 제한
    },
    likedMovies: [MovieInteractionSchema], // 좋아요한 영화 목록
    bookmarkedMovies: [MovieInteractionSchema], // 북마크한 영화 목록
    createdAt: {
        type: Date,
        default: Date.now //
    }
});

// 비밀번호 해싱 미들웨어 (저장 전 실행)
// isModified('password')를 통해 비밀번호가 변경될 때만 해싱하도록 함
UserSchema.pre('save', async function(next) {
    if (!this.isModified('password')) {
        next();
    }
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

// 비밀번호 일치 확인 메서드 (사용자 모델 인스턴스에서 호출 가능)
UserSchema.methods.matchPassword = async function(enteredPassword) {
    // 저장된 해시 비밀번호 (this.password)와 입력된 비밀번호(enteredPassword) 비교
    return await bcrypt.compare(enteredPassword, this.password);
};

// 이미 모델이 생성되었는지 확인 후 생성 (OverwriteModelError 방지)
module.exports = mongoose.models.User || mongoose.model('User', UserSchema);