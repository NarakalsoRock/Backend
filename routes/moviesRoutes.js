const express = require('express');
const axios = require('axios');
const router = express.Router();
const movieService = require('../services/movieService');

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
router.get('/movie/:id', async (req, res) => {
    try {
        const movieId = req.params.id;
        const response = await axios.get(`${BASE_URL}/movie/${movieId}?api_key=${API_KEY}&language=ko-KR`);
        const movieData = response.data;

        // 추가적으로 크레딧 정보도 가져오기 (배우, 감독)
        const creditsResponse = await axios.get(`${BASE_URL}/movie/${movieId}/credits?api_key=${API_KEY}&language=ko-KR`);
        const creditsData = creditsResponse.data;

        const cast = creditsData.cast.slice(0, 5).map(person => ({ // 주요 출연진 5명
            id: person.id,
            name: person.name,
            character: person.character,
            profile_path: getFullPosterUrl(person.profile_path, 'w185') // 배우 프로필 이미지
        }));
        const director = creditsData.crew.find(person => person.job === 'Director');

        res.json({
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
            director: director ? { id: director.id, name: director.name } : null
        });
    } catch (error) {
        console.error(`Error fetching movie details for ID ${req.params.id}:`, error);
        if (error.response && error.response.status === 404) {
            res.status(404).json({ message: 'Movie not found.' });
        } else {
            res.status(500).json({ message: 'Failed to fetch movie details.' });
        }
    }
});

// 5. 마이페이지 - 좋아요한 영화 목록
router.get('/liked', async (req, res) => {
    try {
        // 실제 구현에서는 인증 미들웨어에서 userId를 가져와야 합니다
        const userId = req.user.id; // 예시로 req.user 사용
        const movieIds = await movieService.getLikedMovies(userId);
        const movies = [];

        for (const movieId of movieIds) {
            const response = await axios.get(`${BASE_URL}/movie/${movieId}?api_key=${API_KEY}&language=ko-KR`);
            movies.push({
                id: response.data.id,
                title: response.data.title,
                poster_path: getFullPosterUrl(response.data.poster_path),
                release_date: response.data.release_date,
                vote_average: response.data.vote_average
            });
        }

        res.json({ movies });
    } catch (error) {
        console.error("Error fetching liked movies:", error);
        res.status(500).json({ message: 'Failed to fetch liked movies.' });
    }
});

// 6. 마이페이지 - 북마크한 영화 목록
router.get('/bookmarked', async (req, res) => {
    try {
        // 실제 구현에서는 인증 미들웨어에서 userId를 가져와야 합니다
        const userId = req.user.id; // 예시로 req.user 사용
        const movieIds = await movieService.getBookmarkedMovies(userId);
        const movies = [];

        for (const movieId of movieIds) {
            const response = await axios.get(`${BASE_URL}/movie/${movieId}?api_key=${API_KEY}&language=ko-KR`);
            movies.push({
                id: response.data.id,
                title: response.data.title,
                poster_path: getFullPosterUrl(response.data.poster_path),
                release_date: response.data.release_date,
                vote_average: response.data.vote_average
            });
        }

        res.json({ movies });
    } catch (error) {
        console.error("Error fetching bookmarked movies:", error);
        res.status(500).json({ message: 'Failed to fetch bookmarked movies.' });
    }
});

// 7. 영화 좋아요 토글
router.post('/like/:movieId', async (req, res) => {
    try {
        const userId = req.user.id; // 예시로 req.user 사용
        const movieId = parseInt(req.params.movieId);
        
        const isLiked = await movieService.isMovieLiked(userId, movieId);
        if (isLiked) {
            await movieService.removeLikedMovie(userId, movieId);
            res.json({ message: '영화 좋아요가 취소되었습니다.' });
        } else {
            await movieService.addLikedMovie(userId, movieId);
            res.json({ message: '영화를 좋아요했습니다.' });
        }
    } catch (error) {
        console.error("Error toggling movie like:", error);
        res.status(500).json({ message: 'Failed to toggle movie like.' });
    }
});

// 8. 영화 북마크 토글
router.post('/bookmark/:movieId', async (req, res) => {
    try {
        const userId = req.user.id; // 예시로 req.user 사용
        const movieId = parseInt(req.params.movieId);
        
        const isBookmarked = await movieService.isMovieBookmarked(userId, movieId);
        if (isBookmarked) {
            await movieService.removeBookmarkedMovie(userId, movieId);
            res.json({ message: '영화 북마크가 취소되었습니다.' });
        } else {
            await movieService.addBookmarkedMovie(userId, movieId);
            res.json({ message: '영화를 북마크했습니다.' });
        }
    } catch (error) {
        console.error("Error toggling movie bookmark:", error);
        res.status(500).json({ message: 'Failed to toggle movie bookmark.' });
    }
});

module.exports = router;