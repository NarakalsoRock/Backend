// middlewares/auth.js
const jwt = require('jsonwebtoken');
const User = require('../models/user');

exports.protect = async (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        // "Bearer [token]" 형태에서 토큰만 추출
        token = req.headers.authorization.split(' ')[1];
    }

    // 토큰이 없는 경우
    if (!token) {
        return res.status(401).json({ success: false, error: '인증되지 않았습니다. 토큰이 없습니다.' });
    }

    try {
        // 토큰 검증
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        console.log(decoded);

        // 사용자 찾기 및 req.user에 저장
        req.user = await User.findById(decoded.id);

        if (!req.user) {
            return res.status(401).json({ success: false, error: '토큰에 해당하는 사용자가 없습니다.' });
        }

        next();
    } catch (err) {
        console.error(err);
        return res.status(401).json({ success: false, error: '인증되지 않았습니다. 토큰이 유효하지 않습니다.' });
    }
};