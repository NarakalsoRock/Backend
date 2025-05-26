require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const authRoutes = require('./routes/auth');

const app = express();

mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('MongoDB 연결 성공!'))
  .catch(err => console.error('MongoDB 연결 실패:', err));

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);

app.listen(3000, () => {
  console.log('서버가 3000번 포트에서 실행 중!');
});
