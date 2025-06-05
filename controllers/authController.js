const User = require('../models/user');
const getSignedJwtToken = require('../utils/jwt');

// @desc    회원가입
// @route   POST /api/auth/signup
// @access  Public
exports.signup = async (req, res, next) => {
    try {
        const { email, password, username } = req.body;

        // 이메일 중복 확인
        const existingEmail = await User.findOne({ email });
        if (existingEmail) {
            return res.status(400).json({ success: false, error: '이미 등록된 이메일입니다.' });
        }

        // 사용자명 중복 확인
        const existingUsername = await User.findOne({ username });
        if (existingUsername) {
            return res.status(400).json({ success: false, error: '이미 사용 중인 사용자명입니다.' });
        }

        const user = await User.create({
            email,
            password,
            username
        });

        const token = getSignedJwtToken(user._id);

        res.status(201).json({
            success: true,
            message: '회원가입이 성공적으로 완료되었습니다.',
            token
        });
    } catch (err) {
        // Mongoose 유효성 검사 오류 처리
        if (err.name === 'ValidationError') {
            const messages = Object.values(err.errors).map(val => val.message);
            return res.status(400).json({ success: false, error: messages.join(', ') });
        }
        res.status(500).json({ success: false, error: '서버 오류가 발생했습니다.' });
    }
};

// @desc    로그인
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res, next) => {
    try {
        const { email, password } = req.body;

        // 이메일 및 비밀번호 유효성 검사
        if (!email || !password) {
            return res.status(400).json({ success: false, error: '이메일과 비밀번호를 모두 입력해주세요.' });
        }

        // 사용자 존재 여부 확인 (비밀번호 포함하여 조회)
        const user = await User.findOne({ email }).select('+password');

        if (!user) {
            return res.status(400).json({ success: false, error: '잘못된 이메일 또는 비밀번호입니다.' });
        }

        // 비밀번호 일치 확인
        const isMatch = await user.matchPassword(password);

        if (!isMatch) {
            return res.status(400).json({ success: false, error: '잘못된 이메일 또는 비밀번호입니다.' });
        }

        const token = getSignedJwtToken(user._id);

        res.status(200).json({
            success: true,
            message: '로그인 성공!',
            token,
            user: {
                id: user._id,
                email: user.email,
                username: user.username
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, error: '서버 오류가 발생했습니다.' });
    }
};

// @desc    현재 로그인된 사용자 정보 가져오기 (마이페이지용)
// @route   GET /api/auth/me
// @access  Private (JWT 필요)
exports.getMe = async (req, res, next) => {
    try {
        const user = await User.findById(req.user.id); // auth 미들웨어에서 req.user에 사용자 정보 추가

        if (!user) {
            return res.status(404).json({ success: false, error: '사용자를 찾을 수 없습니다.' });
        }

        res.status(200).json({
            success: true,
            data: user
        });
    } catch (err) {
        res.status(500).json({ success: false, error: '서버 오류가 발생했습니다.' });
    }
};

// @desc    로그아웃
// @route   POST /api/auth/logout
// @access  Private (JWT 필요)
exports.logout = async (req, res, next) => {
    // JWT의 경우 로그아웃은 주로 클라이언트 측 작업입니다(토큰 삭제).
    // 이 엔드포인트는 로그아웃을 확인하기 위한 것입니다.
    // 세션 기반 인증을 사용하는 경우 여기에서 세션을 삭제합니다.
    // 토큰 블랙리스트가 있다면 여기에 토큰을 추가할 수 있습니다.
    try {
        // 선택적으로 로그아웃 작업을 기록하거나 다른 정리 작업을 수행할 수 있습니다.
        // 지금은 성공 응답만 보냅니다.
        res.status(200).json({
            success: true,
            message: '성공적으로 로그아웃되었습니다.'
        });
    } catch (err) {
        // 이 기본 로그아웃은 미들웨어 문제나 이 컨트롤러에 도달하기 전 예상치 못한 문제가 없는 한
        // 실제로 오류를 발생시키지 않아야 합니다.
        console.error('Logout error:', err); // 디버깅을 위한 로그
        res.status(500).json({ success: false, error: '로그아웃 중 서버 오류가 발생했습니다.' });
    }
};