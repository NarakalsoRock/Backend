const User = require('../models/user');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

exports.signup = async (req, res) => {
  const { email, password, nickname } = req.body;
  try {
    if (!email || !password || !nickname) {
      return res.status(400).json({ message: '모든 값을 입력하세요.' });
    }
    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(409).json({ message: '이미 존재하는 이메일입니다.' });
    }
    const hash = await bcrypt.hash(password, 10);
    const user = new User({ email, passwordHash: hash, nickname });
    await user.save();
    res.status(201).json({ message: '회원가입 성공' });
  } catch (err) {
    res.status(500).json({ message: '서버 오류', error: err.message });
  }
};

exports.login = async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ message: '이메일 또는 비밀번호가 틀립니다.' });
    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) return res.status(401).json({ message: '이메일 또는 비밀번호가 틀립니다.' });

    const token = jwt.sign({ userId: user._id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, nickname: user.nickname });
  } catch (err) {
    res.status(500).json({ message: '서버 오류', error: err.message });
  }
};
