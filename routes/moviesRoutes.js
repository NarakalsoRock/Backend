// backend/routes/moviesRoutes.js
const express = require('express');
const axios = require('axios');
const router = express.Router();
// const movieService = require('../services/movieService'); // 이 서비스는 userActionsController와 기능이 중복될 수 있으므로, 사용하지 않는다면 제거합니다.

const API_KEY = process.env.TMDB_API_KEY;
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
    if (!API_KEY) return res.status(500).json({ success: false, message: 'TMDB API 키가 설정되지 않았습니다.' });
    try {
        const response = await axios.get(`${BASE_URL}/movie/now_playing?api_key=${API_KEY}&language=ko-KR&page=1&region=KR`);
        const movies = response.data.results;
        if (movies.length > 0) {
            const top10Movies = movies.slice(0, 10);
            const randomIndex = Math.floor(Math.random() * top10Movies.length);
            const mainMovie = top10Movies[randomIndex];

            const detailResponse = await axios.get(`${BASE_URL}/movie/${mainMovie.id}?api_key=${API_KEY}&language=ko-KR&append_to_response=credits`);
            const movieDetails = detailResponse.data;
            const director = movieDetails.credits.crew.find(person => person.job === 'Director');

            res.json({
                success: true,
                id: mainMovie.id,
                title: mainMovie.title,
                overview: mainMovie.overview,
                backdrop_path: getFullPosterUrl(mainMovie.backdrop_path, 'w1280'),
                poster_path: getFullPosterUrl(mainMovie.poster_path, 'w500'),
                release_date: mainMovie.release_date,
                vote_average: mainMovie.vote_average,
                runtime: movieDetails.runtime,
                genres: movieDetails.genres ? movieDetails.genres.map(genre => genre.name) : [],
                director: director ? { name: director.name } : null
            });
        } else {
            res.status(404).json({ success: false, message: '메인 영화 정보를 찾을 수 없습니다.' });
        }
    } catch (error) {
        console.error("Error fetching main movie:", error.message);
        res.status(500).json({ success: false, message: '메인 영화 정보를 가져오는 중 오류 발생', error: error.message });
    }
});

// 2. 현재 상영작 목록 (Now Playing)
router.get('/now-playing', async (req, res) => {
    const page = req.query.page || 1;
    if (!API_KEY) return res.status(500).json({ success: false, message: 'TMDB API 키가 설정되지 않았습니다.' });
    try {
        const response = await axios.get(`${BASE_URL}/movie/now_playing?api_key=${API_KEY}&language=ko-KR&page=${page}&region=KR`);
        
        const moviesWithFullPosterPath = response.data.results.map(movie => ({
            ...movie,
            poster_path: getFullPosterUrl(movie.poster_path, 'w342')
        }));

        res.json({
            success: true,
            movies: moviesWithFullPosterPath,
            total_pages: response.data.total_pages,
            page: response.data.page
        });
    } catch (error) {
        console.error("Error fetching now playing movies:", error.message);
        res.status(500).json({ success: false, message: '현재 상영작 정보를 가져오는 중 오류 발생', error: error.message });
    }
});

// 3. 상영 예정작 목록 (Upcoming)
router.get('/upcoming', async (req, res) => {
    const page = req.query.page || 1;
    if (!API_KEY) return res.status(500).json({ success: false, message: 'TMDB API 키가 설정되지 않았습니다.' });
    try {
        const response = await axios.get(`${BASE_URL}/movie/upcoming?api_key=${API_KEY}&language=ko-KR&page=${page}&region=KR`);
        
        const moviesWithFullPosterPath = response.data.results.map(movie => ({
            ...movie,
            poster_path: getFullPosterUrl(movie.poster_path, 'w342')
        }));

        res.json({
            success: true,
            movies: moviesWithFullPosterPath,
            total_pages: response.data.total_pages,
            page: response.data.page
        });
    } catch (error) {
        console.error("Error fetching upcoming movies:", error.message);
        res.status(500).json({ success: false, message: '개봉 예정작 정보를 가져오는 중 오류 발생', error: error.message });
    }
});

// 4. 영화 상세 정보
router.get('/:movieId', async (req, res) => { // API 경로 일관성을 위해 /movie/:id 대신 /:movieId 사용
    const movieId = req.params.movieId;
    if (!API_KEY) return res.status(500).json({ success: false, message: 'TMDB API 키가 설정되지 않았습니다.' });
    try {
        const response = await axios.get(`${BASE_URL}/movie/${movieId}?api_key=${API_KEY}&language=ko-KR&append_to_response=credits,videos,release_dates`);
        const movieData = response.data;

        const cast = movieData.credits.cast.slice(0, 10).map(person => ({
            id: person.id,
            name: person.name,
            character: person.character,
            profile_path: getFullPosterUrl(person.profile_path, 'w185')
        }));
        const director = movieData.credits.crew.find(person => person.job === 'Director');

        let certification = '정보 없음';
        if (movieData.release_dates && movieData.release_dates.results) {
            const krRelease = movieData.release_dates.results.find(r => r.iso_3166_1 === 'KR');
            if (krRelease && krRelease.release_dates.length > 0) {
                const officialRelease = krRelease.release_dates.find(rd => rd.certification && rd.certification !== "");
                certification = officialRelease ? officialRelease.certification : (krRelease.release_dates[0] ? krRelease.release_dates[0].certification : '정보 없음');
            }
        }
        
        res.json({
            success: true,
            movie: { // 프론트엔드 api.js의 getMovieDetails와 일관성을 위해 movie 키로 감쌈
                id: movieData.id,
                title: movieData.title,
                original_title: movieData.original_title,
                overview: movieData.overview,
                release_date: movieData.release_date,
                vote_average: movieData.vote_average,
                runtime: movieData.runtime,
                genres: movieData.genres ? movieData.genres.map(genre => genre.name) : [],
                poster_path: getFullPosterUrl(movieData.poster_path, 'w500'),
                backdrop_path: getFullPosterUrl(movieData.backdrop_path, 'w1280'),
                cast: cast,
                director: director ? { id: director.id, name: director.name } : null,
                videos: movieData.videos,
                certification: certification
            }
        });
    } catch (error) {
        console.error(`Error fetching movie details for ID ${req.params.movieId}:`, error.message);
        if (error.response && error.response.status === 404) {
            res.status(404).json({ success: false, message: '영화를 찾을 수 없습니다.' });
        } else {
            res.status(500).json({ success: false, message: '영화 상세 정보를 가져오는 중 오류 발생', error: error.message });
        }
    }
});

// 5. 영화 검색 라우트
router.get('/search', async (req, res) => {
    const query = req.query.query;
    const page = parseInt(req.query.page) || 1;

    if (!query) {
        return res.status(400).json({ success: false, message: '검색어를 입력해주세요.' });
    }
    if (!API_KEY) {
        console.error('TMDB_API_KEY is not defined in .env file');
        return res.status(500).json({ success: false, message: 'TMDB API 키가 설정되지 않았습니다.' });
    }

    try {
        const response = await axios.get(`${BASE_URL}/search/movie`, {
            params: {
                api_key: API_KEY,
                query: query,
                language: 'ko-KR',
                page: page,
                include_adult: false
            }
        });
        res.json({
            success: true,
            movies: response.data.results.map(movie => ({
                ...movie,
                poster_path: getFullPosterUrl(movie.poster_path, 'w342')
            })),
            page: response.data.page,
            total_pages: response.data.total_pages,
            total_results: response.data.total_results
        });
    } catch (error) {
        console.error('Error fetching search results from TMDB:', error.message);
        if (error.response) {
            console.error('TMDB Error Data:', error.response.data);
            res.status(error.response.status).json({ 
                success: false, 
                message: error.response.data.status_message || 'TMDB API 호출 중 오류가 발생했습니다.',
                error_details: error.response.data 
            });
        } else {
            res.status(500).json({ 
                success: false, 
                message: '영화 검색 중 서버 내부 오류가 발생했습니다.',
                error_details: error.message 
            });
        }
    }
});

/*
// 아래 라우트들은 userActionsRoutes.js에서 처리하므로 여기서는 주석 처리하거나 삭제합니다.
// 5. 마이페이지 - 좋아요한 영화 목록 (userActionsController가 User 모델을 직접 사용)
router.get('/liked', async (req, res) => { ... });

// 6. 마이페이지 - 북마크한 영화 목록 (userActionsController가 User 모델을 직접 사용)
router.get('/bookmarked', async (req, res) => { ... });

// 7. 영화 좋아요 토글 (userActionsController가 User 모델을 직접 사용)
router.post('/like/:movieId', async (req, res) => { ... });

// 8. 영화 북마크 토글 (userActionsController가 User 모델을 직접 사용)
router.post('/bookmark/:movieId', async (req, res) => { ... });
*/

module.exports = router;