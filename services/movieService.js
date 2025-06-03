const User = require('../models/user');

class MovieService {
    // 좋아요한 영화 목록 가져오기
    async getLikedMovies(userId) {
        try {
            const user = await User.findById(userId);
            return user ? user.likedMovies : [];
        } catch (error) {
            console.error('Error getting liked movies:', error);
            throw error;
        }
    }

    // 북마크한 영화 목록 가져오기
    async getBookmarkedMovies(userId) {
        try {
            const user = await User.findById(userId);
            return user ? user.bookmarkedMovies : [];
        } catch (error) {
            console.error('Error getting bookmarked movies:', error);
            throw error;
        }
    }

    // 영화 좋아요 추가
    async addLikedMovie(userId, movieId) {
        try {
            const user = await User.findById(userId);
            if (!user) return false;

            if (!user.likedMovies.includes(movieId)) {
                user.likedMovies.push(movieId);
                await user.save();
                return true;
            }
            return false;
        } catch (error) {
            console.error('Error adding liked movie:', error);
            throw error;
        }
    }

    // 영화 좋아요 취소
    async removeLikedMovie(userId, movieId) {
        try {
            const user = await User.findById(userId);
            if (!user) return false;

            const index = user.likedMovies.indexOf(movieId);
            if (index > -1) {
                user.likedMovies.splice(index, 1);
                await user.save();
                return true;
            }
            return false;
        } catch (error) {
            console.error('Error removing liked movie:', error);
            throw error;
        }
    }

    // 영화 북마크 추가
    async addBookmarkedMovie(userId, movieId) {
        try {
            const user = await User.findById(userId);
            if (!user) return false;

            if (!user.bookmarkedMovies.includes(movieId)) {
                user.bookmarkedMovies.push(movieId);
                await user.save();
                return true;
            }
            return false;
        } catch (error) {
            console.error('Error adding bookmarked movie:', error);
            throw error;
        }
    }

    // 영화 북마크 취소
    async removeBookmarkedMovie(userId, movieId) {
        try {
            const user = await User.findById(userId);
            if (!user) return false;

            const index = user.bookmarkedMovies.indexOf(movieId);
            if (index > -1) {
                user.bookmarkedMovies.splice(index, 1);
                await user.save();
                return true;
            }
            return false;
        } catch (error) {
            console.error('Error removing bookmarked movie:', error);
            throw error;
        }
    }

    // 영화 좋아요 여부 확인
    async isMovieLiked(userId, movieId) {
        try {
            const user = await User.findById(userId);
            return user ? user.likedMovies.includes(movieId) : false;
        } catch (error) {
            console.error('Error checking if movie is liked:', error);
            throw error;
        }
    }

    // 영화 북마크 여부 확인
    async isMovieBookmarked(userId, movieId) {
        try {
            const user = await User.findById(userId);
            return user ? user.bookmarkedMovies.includes(movieId) : false;
        } catch (error) {
            console.error('Error checking if movie is bookmarked:', error);
            throw error;
        }
    }
}

module.exports = new MovieService(); 