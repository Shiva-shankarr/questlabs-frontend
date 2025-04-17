import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { FaHeart, FaRegHeart } from 'react-icons/fa';
import { fetchQuizzes, toggleFavorite, fetchHomePageData } from '../redux/slices/quizSlice';
import axios from 'axios';
import './Playlists.css';

const Playlists = () => {
  const dispatch = useDispatch();
  const [playlists, setPlaylists] = useState([]);
  const [isDirectFetching, setIsDirectFetching] = useState(false);
  const [directQuizzes, setDirectQuizzes] = useState([]);

  // Get quizzes from Redux store
  const { quizzes, loading, error, homePageData } = useSelector((state) => state.quiz);
  const { isAuthenticated } = useSelector((state) => state.auth);

  // Direct API call as backup method - wrap in useCallback
  const fetchQuizzesDirectly = useCallback(async () => {
    try {
      setIsDirectFetching(true);
      console.log("Playlists: Making direct API request to fetch quizzes");
      
      const API_URL = 'http://localhost:5000/api';
      const response = await axios.get(`${API_URL}/quizzes`);
      
      if (response.data && Array.isArray(response.data.quizzes)) {
        const processedQuizzes = response.data.quizzes.map(quiz => ({
          id: quiz.id,
          title: quiz.title || 'Untitled Quest',
          description: Array.isArray(quiz.description) ? quiz.description : 
                     (quiz.description ? [String(quiz.description)] : ['No description available']),
          instructor: quiz.admin?.username || 'Quest Instructor',
          image: quiz.thumbnailUrl || 'https://via.placeholder.com/300x200?text=Quest+Image',
          level: quiz.level || 'Beginner',
          rating: quiz.rating || quiz.averageRating || 4.5,
          enrolledCount: quiz.enrolledCount || 0,
          favorite: false,
          tasks: Array.isArray(quiz.questions) ? quiz.questions.length : 0
        }));
        
        console.log("Playlists: Processed direct quizzes:", processedQuizzes.length);
        setDirectQuizzes(processedQuizzes);
        
        // If Redux store doesn't have quizzes yet, update it
        if (!quizzes || quizzes.length === 0) {
          console.log("Playlists: No quizzes in Redux store, dispatching direct quizzes");
          dispatch({ type: 'quiz/setQuizzes', payload: processedQuizzes });
        }
      }
    } catch (error) {
      console.error("Playlists: Error fetching quizzes directly:", error);
    } finally {
      setIsDirectFetching(false);
    }
  }, [dispatch, quizzes]); // Add required dependencies

  // Initial data loading using multiple approaches for reliability
  useEffect(() => {
    // Fetch quizzes through Redux
    dispatch(fetchQuizzes());
    dispatch(fetchHomePageData());
    
    // Also try direct API call as backup
    fetchQuizzesDirectly();
    
    console.log('Playlists - Initial mount, dispatching fetch actions');
  }, [dispatch, fetchQuizzesDirectly]); // Add fetchQuizzesDirectly to dependencies

  // Process quizzes into playlists when data is available from any source
  useEffect(() => {
    console.log('Playlists - Processing available data');
    
    // Use quizzes from any available source
    const availableQuizzes = quizzes.length > 0 ? quizzes : 
                            (directQuizzes.length > 0 ? directQuizzes : 
                            (homePageData.beginnerQuests.length > 0 ? 
                              [...homePageData.beginnerQuests, ...homePageData.intermediateQuests || [], ...homePageData.popularQuests || []] : 
                              []));
    
    console.log('Playlists - Available quizzes:', availableQuizzes.length);
    
    if (availableQuizzes && availableQuizzes.length > 0) {
      // Create playlists for the frame-13 layout (3 distinct playlist sections)
      const playlistsData = [];
      
      // Group 1: Create first playlist with subset of quizzes
      const firstPlaylistQuizzes = availableQuizzes.slice(0, Math.min(2, availableQuizzes.length));
      if (firstPlaylistQuizzes.length > 0) {
        playlistsData.push({
          id: 'playlist-1',
          name: 'Playlist Name',
          quizzes: firstPlaylistQuizzes
        });
      }
      
      // Group 2: Create second playlist with next set of quizzes
      const remainingQuizzes = availableQuizzes.slice(2);
      const secondPlaylistQuizzes = remainingQuizzes.slice(0, Math.min(4, remainingQuizzes.length));
      if (secondPlaylistQuizzes.length > 0) {
        playlistsData.push({
          id: 'playlist-2',
          name: 'Playlist Name',
          quizzes: secondPlaylistQuizzes
        });
      }
      
      // Group 3: Create third playlist with remaining quizzes
      const lastRemainingQuizzes = remainingQuizzes.slice(4);
      if (lastRemainingQuizzes.length > 0) {
        playlistsData.push({
          id: 'playlist-3',
          name: 'Playlist Name',
          quizzes: lastRemainingQuizzes
        });
      }
      
      // If we didn't create any playlists but have quizzes, create one with all quizzes
      if (playlistsData.length === 0 && availableQuizzes.length > 0) {
        playlistsData.push({
          id: 'playlist-all',
          name: 'All Quests',
          quizzes: availableQuizzes
        });
      }
      
      console.log('Setting playlists with', playlistsData.length, 'categories');
      setPlaylists(playlistsData);
    }
  }, [quizzes, directQuizzes, homePageData]);

  const handleFavoriteClick = (quizId) => {
    if (!isAuthenticated) return;
    dispatch(toggleFavorite(quizId));
  };

  const handleRefresh = () => {
    console.log('Manually refreshing quizzes');
    dispatch(fetchQuizzes());
    dispatch(fetchHomePageData());
    fetchQuizzesDirectly();
  };

  const QuizCard = ({ quiz }) => {
    if (!quiz) return null;
    
    const defaultImage = 'https://via.placeholder.com/300x200?text=Quest+Image';
    const isFavorite = quiz.isFavorite || false;
    
    return (
      <div className="quest-card">
        <div className="quest-image-container">
          <img 
            src={quiz.thumbnailUrl || quiz.image || defaultImage}
            alt={quiz.title}
            className="quest-image"
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = defaultImage;
            }}
          />
          <button 
            className="favorite-button"
            onClick={(e) => {
              e.stopPropagation();
              handleFavoriteClick(quiz.id);
            }}
          >
            {isFavorite ? (
              <FaHeart className="heart-icon filled" />
            ) : (
              <FaRegHeart className="heart-icon" />
            )}
          </button>
        </div>
        <div className="quest-info">
          <h3 className="quest-title">{quiz.title}</h3>
          <p className="quest-instructor">{quiz.admin?.username || quiz.instructor || 'Quest Instructor'}</p>
        </div>
      </div>
    );
  };

  // Determine if we're still loading data from any source
  const isLoading = loading || isDirectFetching;
  
  // Determine if we have any data available from any source
  const hasAnyData = quizzes.length > 0 || directQuizzes.length > 0 || 
                    homePageData.beginnerQuests.length > 0;

  if (isLoading && !hasAnyData) {
    return (
      <div className="playlists-container">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Loading playlists...</p>
        </div>
      </div>
    );
  }

  if (error && !hasAnyData) {
    return (
      <div className="playlists-container">
        <div className="error-message">
          <p>Error: {error}</p>
          <button onClick={handleRefresh} className="refresh-btn">Retry</button>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="playlists-container">
        <div className="auth-message">
          <h2>Create and customize your playlists</h2>
          <p>Sign in to create personalized playlists and track your learning progress</p>
          <Link to="/login" className="login-button">Sign In</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="playlists-container">
      <div className="playlists-header">
        <h1>Playlist</h1>
        <p>Create and organize your personalized playlists by adding your favorite quests and learning materials. Name your playlists, track your progress, and invite key learners to level up your skills!</p>
      </div>

      {playlists.length > 0 ? (
        <div className="playlists-content">
          {playlists.map(playlist => (
            <div key={playlist.id} className="playlist-section">
              <h2 className="playlist-title">{playlist.name}</h2>
              <div className="quest-grid">
                {playlist.quizzes.map(quiz => (
                  <Link key={quiz.id} to={`/course/${quiz.id}`} className="quest-link">
                    <QuizCard quiz={quiz} />
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="no-playlists">
          <p>No quests available at the moment. Check back later!</p>
          <button onClick={handleRefresh} className="refresh-btn">Refresh</button>
          <div className="debug-info">
            <p>Debug Info - Quizzes: {quizzes?.length || 0}, Direct: {directQuizzes?.length || 0}, HomePageData: {Object.keys(homePageData).length}, Loading: {isLoading ? 'true' : 'false'}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Playlists;