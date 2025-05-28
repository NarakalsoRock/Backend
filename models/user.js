// models/User.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs'); // bcryptjs 모듈 추가

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
        required: [true, '비밀번호를 입력해주세요.'],
        minlength: [6, '비밀번호는 최소 6자 이상이어야 합니다.'], // 최소 길이 제한 추가
        select: false // 비밀번호는 조회 시 기본적으로 포함되지 않도록 설정
    },
    nickname: {
        type: String,
        required: [true, '닉네임을 입력해주세요.'],
        unique: true, // 닉네임도 고유해야 함
        minlength: [2, '닉네임은 최소 2자 이상이어야 합니다.'] // 닉네임 최소 길이 제한
    },
    createdAt: {
        type: Date,
        default: Date.now
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

module.exports = mongoose.model('User', UserSchema);