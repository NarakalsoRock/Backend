const express = require('express');
const axios = require('axios');
const router = express.Router();
const movieService = require('../services/movieService');
const User = require('../models/user');

const API_KEY = process.env.TMDB_API_KEY; // .env에서 로드된 API 키 사용
const BASE_URL = 'https://api.themoviedb.org/3';
const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/';

// 헬퍼 함수: 포스터 URL 생성
const getFullPosterUrl = (posterPath, size = 'w342') => {
    if (!posterPath) return null;
    // Cache-Control 헤더를 위해 URL에 버전 파라미터 추가
    return `${IMAGE_BASE_URL}${size}${posterPath}?v=1`;
};

// 1. 메인 영화 (현재 상영작 상위 10개 중 랜덤 선택)
router.get('/main-movie', async (req, res) => {
    try {
        const response = await axios.get(`${BASE_URL}/movie/now_playing?api_key=${API_KEY}&language=ko-KR&page=1`);
        const movies = response.data.results;
        if (movies.length > 0) {
            // 상위 10개 영화 선택 (또는 전체 영화가 10개 미만이면 전체)
            const top10Movies = movies.slice(0, 10);
            // 랜덤 인덱스 생성
            const randomIndex = Math.floor(Math.random() * top10Movies.length);
            const mainMovie = top10Movies[randomIndex];

            // 추가 영화 정보 가져오기
            const detailResponse = await axios.get(`${BASE_URL}/movie/${mainMovie.id}?api_key=${API_KEY}&language=ko-KR`);
            const movieDetails = detailResponse.data;

            // 크레딧 정보 가져오기
            const creditsResponse = await axios.get(`${BASE_URL}/movie/${mainMovie.id}/credits?api_key=${API_KEY}&language=ko-KR`);
            const creditsData = creditsResponse.data;

            // 감독 정보 찾기
            const director = creditsData.crew.find(person => person.job === 'Director');

            res.json({
                id: mainMovie.id,
                title: mainMovie.title,
                overview: mainMovie.overview,
                backdrop_path: getFullPosterUrl(mainMovie.backdrop_path, 'w1280'),
                poster_path: getFullPosterUrl(mainMovie.poster_path, 'w500'),
                release_date: mainMovie.release_date,
                vote_average: mainMovie.vote_average,
                runtime: movieDetails.runtime,
                genres: movieDetails.genres.map(genre => genre.name),
                director: director ? { name: director.name } : null
            });
        } else {
            res.status(404).json({ message: 'No main movie found.' });
        }
    } catch (error) {
        console.error("Error fetching main movie:", error);
        res.status(500).json({ message: 'Failed to fetch main movie data.' });
    }
});


// 2. 현재 상영작 목록 (Now Playing)
router.get('/now-playing', async (req, res) => {
    try {
        const page = req.query.page || 1;
        const response = await axios.get(`${BASE_URL}/movie/now_playing?api_key=${API_KEY}&language=ko-KR&page=${page}`);
        const movies = await Promise.all(response.data.results.map(async movie => {
            // 영화 상세 정보를 추가로 가져와서 관람등급 정보 포함
            const detailResponse = await axios.get(`${BASE_URL}/movie/${movie.id}?api_key=${API_KEY}&language=ko-KR`);
            const rating = detailResponse.data.adult ? '18' : 
                         movie.vote_average >= 7 ? '15' : 
                         movie.vote_average >= 5 ? '12' : 'ALL';
            
            return {
            id: movie.id,
            title: movie.title,
            release_date: movie.release_date,
            vote_average: movie.vote_average,
                poster_path: getFullPosterUrl(movie.poster_path, 'w342'),
                rating: rating
            };
        }));
        
        res.json({
            movies: movies,
            total_pages: response.data.total_pages,
            page: response.data.page
        });
    } catch (error) {
        console.error("Error fetching now playing movies:", error);
        res.status(500).json({ message: 'Failed to fetch now playing movies.' });
    }
});

// 3. 상영 예정작 목록 (Upcoming)
router.get('/upcoming', async (req, res) => {
    try {
        // 현재 날짜를 YYYY-MM-DD 형식으로 가져오기
        const today = new Date().toISOString().split('T')[0];
        
        // 여러 페이지의 데이터를 가져오기
        const allMovies = [];
        
        // 1. upcoming 엔드포인트에서 데이터 가져오기
        let page = 1;
        const maxPages = 3;
        
        while (page <= maxPages) {
            const response = await axios.get(
                `${BASE_URL}/movie/upcoming?api_key=${API_KEY}&language=ko-KR&page=${page}&region=KR&with_release_type=3`
            );
            
            if (!response.data.results.length) break;
            
            allMovies.push(...response.data.results);
            page++;
        }

        // 2. discover 엔드포인트에서 추가 데이터 가져오기 (더 먼 미래의 영화)
        page = 1;
        while (page <= maxPages) {
            const response = await axios.get(
                `${BASE_URL}/discover/movie?api_key=${API_KEY}&language=ko-KR&page=${page}&region=KR&sort_by=release_date.asc&release_date.gte=${today}&with_release_type=3&watch_region=KR`
            );
            
            if (!response.data.results.length) break;
            
            allMovies.push(...response.data.results);
            page++;
        }

        // 중복 제거 및 현재 날짜 이후 영화만 필터링
        const uniqueMovies = Array.from(new Set(allMovies.map(movie => movie.id)))
            .map(id => allMovies.find(movie => movie.id === id))
            .filter(movie => {
                // 한국어 제목이 있거나 한국에서 개봉하는 영화만 포함
                return movie.release_date > today && 
                       (movie.title.match(/[가-힣]/) || // 한글이 포함된 제목
                        movie.original_language === 'ko'); // 원어가 한국어
            })
            .sort((a, b) => new Date(a.release_date) - new Date(b.release_date));

        // 영화 상세 정보 가져오기
        const movies = await Promise.all(uniqueMovies.map(async movie => {
            try {
                const detailResponse = await axios.get(`${BASE_URL}/movie/${movie.id}?api_key=${API_KEY}&language=ko-KR`);
                
                // 한국 개봉일 확인
                const releaseDatesResponse = await axios.get(
                    `${BASE_URL}/movie/${movie.id}/release_dates?api_key=${API_KEY}`
                );
                
                const koreanRelease = releaseDatesResponse.data.results.find(
                    country => country.iso_3166_1 === 'KR'
                );

                // 한국 개봉일이 있는 경우에만 포함
                if (!koreanRelease) return null;

                const rating = detailResponse.data.adult ? '18' : 
                             movie.vote_average >= 7 ? '15' : 
                             movie.vote_average >= 5 ? '12' : 'ALL';
                
                return {
            id: movie.id,
            title: movie.title,
            release_date: movie.release_date,
            vote_average: movie.vote_average,
                    poster_path: getFullPosterUrl(movie.poster_path, 'w342'),
                    rating: rating
                };
            } catch (error) {
                console.error(`Error fetching details for movie ${movie.id}:`, error);
                return null;
            }
        }));

        // null 값 제거
        const validMovies = movies.filter(movie => movie !== null);
        
        res.json({
            movies: validMovies,
            total_pages: maxPages,
            page: 1
        });
    } catch (error) {
        console.error("Error fetching upcoming movies:", error);
        res.status(500).json({ message: 'Failed to fetch upcoming movies.' });
    }
});

// 4. 영화 상세 정보
router.get('/:id', async (req, res) => {
    try {
        const movieId = req.params.id;
        
        // movieId가 숫자인지 확인
        if (!/^\d+$/.test(movieId)) {
            return res.status(400).json({ message: '유효하지 않은 영화 ID입니다.' });
        }

        const tmdbMovieResponse = await axios.get(`${BASE_URL}/movie/${movieId}?api_key=${API_KEY}&language=ko-KR`);
        const movieData = tmdbMovieResponse.data;

        const creditsResponse = await axios.get(`${BASE_URL}/movie/${movieId}/credits?api_key=${API_KEY}&language=ko-KR`);
        const creditsData = creditsResponse.data;

        const cast = creditsData.cast.slice(0, 10).map(person => ({
            id: person.id,
            name: person.name,
            character: person.character,
            profile_path: getFullPosterUrl(person.profile_path, 'w185')
        }));
        const director = creditsData.crew.find(person => person.job === 'Director');

        let userLiked = false;
        let userBookmarked = false;
        let userId = null;

        // 1. Authorization 헤더에서 토큰 파싱 시도
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.split(' ')[1];
            if (token && process.env.JWT_SECRET) {
                try {
                    const jwt = require('jsonwebtoken');
                    const decoded = jwt.verify(token, process.env.JWT_SECRET);
                    userId = decoded.id;
                } catch (err) {
                    console.warn('JWT verification failed in /:id (from header):', err.message);
                }
            }
        }

        // 2. req.user 확인 (상위 라우터에서 protect 미들웨어가 적용된 경우)
        if (!userId && req.user && req.user.id) {
            userId = req.user.id;
        }

        // 확보된 userId로 사용자 정보 조회
        if (userId) {
            try {
                const user = await User.findById(userId);
                if (user) {
                    userLiked = user.likedMovies.some(movie => String(movie.movieId) === String(movieId));
                    userBookmarked = user.bookmarkedMovies.some(movie => String(movie.movieId) === String(movieId));
                }
            } catch (dbError) {
                console.error('Error fetching user for like/bookmark status in /:id:', dbError.message);
            }
        }

        res.json({
            id: movieData.id,
            title: movieData.title,
            overview: movieData.overview,
            poster_path: getFullPosterUrl(movieData.poster_path, 'w500'),
            backdrop_path: getFullPosterUrl(movieData.backdrop_path, 'w1280'),
            release_date: movieData.release_date,
            runtime: movieData.runtime,
            vote_average: movieData.vote_average,
            genres: movieData.genres.map(genre => genre.name),
            adult: movieData.adult,
            cast: cast,
            director: director ? { name: director.name } : null,
            isLiked: userLiked,
            isBookmarked: userBookmarked
        });
    } catch (error) {
        console.error("Error fetching movie details:", error);
        res.status(500).json({ message: 'Failed to fetch movie details.' });
    }
});

// 5. 마이페이지 - 좋아요한 영화 목록 (User 모델 직접 사용, req.user 의존)
router.get('/liked', async (req, res) => {
    try {
        if (!req.user || !req.user.id) {
            return res.status(401).json({ message: '인증되지 않은 사용자입니다. 이 기능을 사용하려면 로그인이 필요합니다.' });
        }
        const userId = req.user.id;
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: '사용자를 찾을 수 없습니다.' });
        }
        const likedMoviesDetails = [];
        if (user.likedMovies && user.likedMovies.length > 0) {
            for (const likedMovie of user.likedMovies) {
                try {
                    const response = await axios.get(`${BASE_URL}/movie/${likedMovie.movieId}?api_key=${API_KEY}&language=ko-KR`);
                    likedMoviesDetails.push({
                        id: response.data.id,
                        title: response.data.title,
                        poster_path: getFullPosterUrl(response.data.poster_path),
                        release_date: response.data.release_date,
                        vote_average: response.data.vote_average
                    });
                } catch (movieError) {
                    console.error(`Error fetching details for liked movie ${likedMovie.movieId}:`, movieError.message);
                }
            }
        }
        res.json({ movies: likedMoviesDetails });
    } catch (error) {
        console.error("Error fetching liked movies:", error);
        res.status(500).json({ message: 'Failed to fetch liked movies.' });
    }
});

// 6. 마이페이지 - 북마크한 영화 목록 (User 모델 직접 사용, req.user 의존)
router.get('/bookmarked', async (req, res) => {
    try {
        if (!req.user || !req.user.id) {
            return res.status(401).json({ message: '인증되지 않은 사용자입니다. 이 기능을 사용하려면 로그인이 필요합니다.' });
        }
        const userId = req.user.id;
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: '사용자를 찾을 수 없습니다.' });
        }
        const bookmarkedMoviesDetails = [];
        if (user.bookmarkedMovies && user.bookmarkedMovies.length > 0) {
            for (const bookmarkedMovie of user.bookmarkedMovies) {
                try {
                    const response = await axios.get(`${BASE_URL}/movie/${bookmarkedMovie.movieId}?api_key=${API_KEY}&language=ko-KR`);
                    bookmarkedMoviesDetails.push({
                        id: response.data.id,
                        title: response.data.title,
                        poster_path: getFullPosterUrl(response.data.poster_path),
                        release_date: response.data.release_date,
                        vote_average: response.data.vote_average
                    });
                } catch (movieError) {
                    console.error(`Error fetching details for bookmarked movie ${bookmarkedMovie.movieId}:`, movieError.message);
                }
            }
        }
        res.json({ movies: bookmarkedMoviesDetails });
    } catch (error) {
        console.error("Error fetching bookmarked movies:", error);
        res.status(500).json({ message: 'Failed to fetch bookmarked movies.' });
    }
});

// 7. 영화 좋아요 토글 (사용자 코드 유지, req.user 의존)
router.post('/like/:movieId', async (req, res) => {
    try {
        if (!req.user || !req.user.id) { // req.user 가 없으면 movieService 사용 불가 (userId 필요)
            return res.status(401).json({ message: '인증이 필요합니다.' });
        }
        const userId = req.user.id;
        const movieId = parseInt(req.params.movieId);
        
        // movieService의 로직은 User 모델의 likedMovies가 단순 movieId 배열이라고 가정할 수 있음.
        // 현재 User 모델은 객체 배열이므로, movieService.isMovieLiked 등이 호환되지 않을 수 있음.
        // userActionsController.js의 로직을 참고하여 직접 User 모델을 다루는 것이 일관성 있음.
        // 여기서는 사용자님의 코드를 유지하되, 잠재적 비호환성 주석 추가.
        const isLiked = await movieService.isMovieLiked(userId, movieId); 
        if (isLiked) {
            await movieService.removeLikedMovie(userId, movieId);
            res.json({ message: '영화 좋아요가 취소되었습니다.' });
        } else {
            await movieService.addLikedMovie(userId, movieId); // title, posterPath 정보 없이 movieId만 전달
            res.json({ message: '영화를 좋아요했습니다.' });
        }
    } catch (error) {
        console.error("Error toggling movie like:", error);
        res.status(500).json({ message: 'Failed to toggle movie like.' });
    }
});

// 8. 영화 북마크 토글 (사용자 코드 유지, req.user 의존)
router.post('/bookmark/:movieId', async (req, res) => {
    try {
        if (!req.user || !req.user.id) { // req.user 가 없으면 movieService 사용 불가 (userId 필요)
            return res.status(401).json({ message: '인증이 필요합니다.' });
        }
        const userId = req.user.id;
        const movieId = parseInt(req.params.movieId);

        // movieService의 로직은 User 모델의 bookmarkedMovies가 단순 movieId 배열이라고 가정할 수 있음.
        // 이 또한 userActionsController.js의 로직과 비교하여 일관성 확인 필요.
        const isBookmarked = await movieService.isMovieBookmarked(userId, movieId);
        if (isBookmarked) {
            await movieService.removeBookmarkedMovie(userId, movieId);
            res.json({ message: '영화 북마크가 취소되었습니다.' });
        } else {
            await movieService.addBookmarkedMovie(userId, movieId); // title, posterPath 정보 없이 movieId만 전달
            res.json({ message: '영화를 북마크했습니다.' });
        }
    } catch (error) {
        console.error("Error toggling movie bookmark:", error);
        res.status(500).json({ message: 'Failed to toggle movie bookmark.' });
    }
});

module.exports = router;
