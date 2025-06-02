// controllers/userActionsController.js
const User = require('../models/user');

// @desc    영화 좋아요 토글 (추가/삭제)
// @route   POST /api/actions/movies/like
// @access  Private
exports.toggleLikeMovie = async (req, res) => {

    
    console.log('toggleLikeMovie controller reached with body:', req.body);
    
    try {
        const userId = req.user.id; // protect 미들웨어에서 설정된 사용자 ID
        // 프론트엔드 mypage.js, now-playing.js, upcoming.js의 movie.id, movie.title, movie.poster_path 를 참조
        const { movieId, title, posterPath } = req.body; 

        if (!movieId || !title) {
            return res.status(400).json({ success: false, error: 'movieId와 title은 필수 항목입니다.' });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, error: '사용자를 찾을 수 없습니다.' });
        }

        const movieIndex = user.likedMovies.findIndex(movie => movie.movieId === String(movieId)); // movieId 타입을 String으로 일치시켜 비교

        let message;
        if (movieIndex > -1) {
            // 이미 좋아요 목록에 있으면 제거 (좋아요 취소)
            user.likedMovies.splice(movieIndex, 1);
            message = '영화 좋아요를 취소했습니다.';
        } else {
            // 좋아요 목록에 없으면 추가
            user.likedMovies.push({ movieId: String(movieId), title, posterPath });
            message = '영화를 좋아합니다.';
        }
        await user.save();
        res.status(200).json({ 
            success: true, 
            message,
            likedMovies: user.likedMovies 
        });

    } catch (error) {
        console.error('Error in toggleLikeMovie:', error);
        res.status(500).json({ success: false, error: '서버 오류가 발생했습니다.' });
    }
};

// @desc    영화 북마크 토글 (추가/삭제)
// @route   POST /api/actions/movies/bookmark
// @access  Private
exports.toggleBookmarkMovie = async (req, res) => {
    try {
        const userId = req.user.id; // protect 미들웨어에서 설정된 사용자 ID
        // 프론트엔드 mypage.js, now-playing.js, upcoming.js의 movie.id, movie.title, movie.poster_path 를 참조
        const { movieId, title, posterPath } = req.body;

        if (!movieId || !title) {
            return res.status(400).json({ success: false, error: 'movieId와 title은 필수 항목입니다.' });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, error: '사용자를 찾을 수 없습니다.' });
        }

        const movieIndex = user.bookmarkedMovies.findIndex(movie => movie.movieId === String(movieId)); // movieId 타입을 String으로 일치시켜 비교
        
        let message;
        if (movieIndex > -1) {
            // 이미 북마크 목록에 있으면 제거 (북마크 취소)
            user.bookmarkedMovies.splice(movieIndex, 1);
            message = '영화 북마크를 취소했습니다.';
        } else {
            // 북마크 목록에 없으면 추가
            user.bookmarkedMovies.push({ movieId: String(movieId), title, posterPath });
            message = '영화를 북마크했습니다.';
        }
        await user.save();
        res.status(200).json({ 
            success: true, 
            message,
            bookmarkedMovies: user.bookmarkedMovies
        });

    } catch (error) {
        console.error('Error in toggleBookmarkMovie:', error);
        res.status(500).json({ success: false, error: '서버 오류가 발생했습니다.' });
    }
};