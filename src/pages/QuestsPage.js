import React, { useState, useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { FaSearch, FaHeart, FaRegHeart, FaSync } from 'react-icons/fa';
import { fetchQuizzes, toggleFavorite, fetchHomePageData } from '../redux/slices/quizSlice';
import axios from 'axios';
import './QuestsPage.css';

const QuestsPage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredQuizzes, setFilteredQuizzes] = useState([]);
  const [directQuizzes, setDirectQuizzes] = useState([]);
  const [isDirectFetching, setIsDirectFetching] = useState(false);
  
  // Get quizzes from Redux store
  const { quizzes, loading, error, homePageData } = useSelector((state) => state.quiz);
  const { favorites } = useSelector((state) => state.quiz);
  
  // Direct API call as a backup method - wrapped in useCallback
  const fetchQuizzesDirectly = useCallback(async () => {
    try {
      setIsDirectFetching(true);
      console.log("QuestsPage: Making direct API request to fetch quizzes");
      
      const API_URL = 'http://localhost:5000/api';
      const response = await axios.get(`${API_URL}/quizzes`);
      
      console.log("QuestsPage: Direct API response received:", response.data);
      
      if (response.data && Array.isArray(response.data.quizzes)) {
        const processedQuizzes = response.data.quizzes.map(quiz => ({
          id: quiz.id,
          title: quiz.title || 'Untitled Quest',
          description: Array.isArray(quiz.description) ? quiz.description : 
                    (quiz.description ? [String(quiz.description)] : ['No description available']),
          instructor: quiz.admin?.username || 'Quest Instructor',
          image: quiz.thumbnailUrl || 'https://via.placeholder.com/300x200?text=Quest+Image',
          level: quiz.level || 'Beginner',
          rating: quiz.rating || 4.5,
          enrolledCount: quiz.enrolledCount || 0,
          favorite: false,
          tasks: Array.isArray(quiz.questions) ? quiz.questions.length : 0
        }));
        
        console.log("QuestsPage: Processed direct quizzes:", processedQuizzes.length);
        setDirectQuizzes(processedQuizzes);
        
        // If Redux store doesn't have quizzes yet, update it
        if (!quizzes || quizzes.length === 0) {
          console.log("QuestsPage: No quizzes in Redux store, dispatching direct quizzes");
          dispatch({ type: 'quiz/setQuizzes', payload: processedQuizzes });
        }
      }
    } catch (error) {
      console.error("QuestsPage: Error fetching quizzes directly:", error);
    } finally {
      setIsDirectFetching(false);
    }
  }, [dispatch, quizzes]); // Add dependencies

  // Fetch quizzes on component mount using multiple approaches
  useEffect(() => {
    console.log("QuestsPage: Initializing component");
    // First try regular Redux action
    dispatch(fetchQuizzes());
    dispatch(fetchHomePageData());
    
    // Also try a direct API call as backup
    fetchQuizzesDirectly();
  }, [dispatch, fetchQuizzesDirectly]); // Added fetchQuizzesDirectly as dependency
  
  // Filter quizzes based on search query
  useEffect(() => {
    const allQuizzes = quizzes.length > 0 ? quizzes : 
                    (directQuizzes.length > 0 ? directQuizzes : 
                    (homePageData.beginnerQuests.length > 0 ? 
                     [...homePageData.beginnerQuests, ...homePageData.intermediateQuests, ...homePageData.advancedQuests, ...homePageData.popularQuests] : []));
    
    if (allQuizzes.length > 0) {
      if (!searchQuery.trim()) {
        setFilteredQuizzes([]);
        return;
      }
      
      const filtered = allQuizzes.filter(quiz => 
        (quiz.title && quiz.title.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (quiz.description && 
          (Array.isArray(quiz.description)
            ? quiz.description.some(desc => desc && desc.toLowerCase().includes(searchQuery.toLowerCase()))
            : String(quiz.description).toLowerCase().includes(searchQuery.toLowerCase())))
      );
      
      setFilteredQuizzes(filtered);
    }
  }, [searchQuery, quizzes, directQuizzes, homePageData]);

  // Get different quest categories from the best available source
  const getQuestsByLevel = (level) => {
    // Try to use quizzes from redux, direct API call, or homepage data
    const allQuizzes = quizzes.length > 0 ? quizzes : 
                      (directQuizzes.length > 0 ? directQuizzes : 
                      (homePageData.beginnerQuests.length > 0 ? 
                       [...homePageData.beginnerQuests, ...homePageData.intermediateQuests, ...homePageData.advancedQuests, ...homePageData.popularQuests] : []));
    
    if (!allQuizzes || allQuizzes.length === 0) return [];
    
    // Return quizzes filtered by level, or return all quizzes if there's only one
    if (allQuizzes.length === 1) return allQuizzes; // If there's only one quest, show it in all categories
    
    return allQuizzes.filter(quiz => 
      quiz.level && quiz.level.toLowerCase() === level.toLowerCase()
    );
  };

  // Get popular quests (those with high ratings or enrollments)
  const getPopularQuests = () => {
    // Try to use quizzes from redux or direct API call
    const allQuizzes = quizzes.length > 0 ? quizzes : 
                      (directQuizzes.length > 0 ? directQuizzes : 
                      (homePageData.popularQuests.length > 0 ? homePageData.popularQuests : []));
    
    if (!allQuizzes || allQuizzes.length === 0) return [];
    
    // If there's only one quest, show it in popular
    if (allQuizzes.length === 1) return allQuizzes;
    
    // Sort by a combination of rating and enrollment count
    return [...allQuizzes]
      .sort((a, b) => {
        const scoreA = (a.rating || 0) * 0.7 + (a.enrolledCount || 0) * 0.3;
        const scoreB = (b.rating || 0) * 0.7 + (b.enrolledCount || 0) * 0.3;
        return scoreB - scoreA;
      })
      .slice(0, 4); // Take top 4
  };

  const beginnerQuests = getQuestsByLevel('Beginner');
  const intermediateQuests = getQuestsByLevel('Intermediate');
  const advancedQuests = getQuestsByLevel('Advanced');
  const popularQuests = getPopularQuests();
  
  // Determine if we have any quizzes to display
  const hasAnyQuizzes = quizzes.length > 0 || directQuizzes.length > 0 || 
                       homePageData.beginnerQuests.length > 0 || 
                       homePageData.popularQuests.length > 0;

  const handleOpenQuest = (id) => {
    navigate(`/course/${id}`);
  };

  const handleToggleFavorite = (e, courseId) => {
    e.stopPropagation();
    dispatch(toggleFavorite({ courseId }));
  };
  
  // Manually retry loading quests
  const handleRetryLoading = () => {
    console.log("QuestsPage: Manually retrying quiz loading");
    dispatch(fetchQuizzes());
    dispatch(fetchHomePageData());
    fetchQuizzesDirectly();
  };

  // Render a quest card
  const renderQuestCard = (quest) => {
    if (!quest) return null;
    
    const isFavorite = favorites?.includes(quest.id);
    const defaultImage = 'https://via.placeholder.com/300x200?text=Quest+Image';
    
    return (
      <div key={quest.id} className="quest-card" onClick={() => handleOpenQuest(quest.id)}>
        <div className="quest-card-img-container">
          <img 
            src={quest.image || defaultImage} 
            alt={quest.title} 
            className="quest-card-img"
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = defaultImage;
            }}
          />
          <button 
            className="favorite-btn"
            onClick={(e) => handleToggleFavorite(e, quest.id)}
            aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
          >
            {isFavorite ? (
              <FaHeart className="heart-icon-filled" />
            ) : (
              <FaRegHeart className="heart-icon" />
            )}
          </button>
        </div>
        <div className="quest-card-content">
          <h3 className="quest-card-title">{quest.title}</h3>
          <p className="quest-card-text">
            Learn More
          </p>
        </div>
      </div>
    );
  };

  // Render loading state
  if ((loading || isDirectFetching) && !hasAnyQuizzes) {
    return (
      <div className="quests-page">
        <div className="loading-container">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      </div>
    );
  }

  // Render error state if there was an error and no quizzes were loaded
  if (error && !hasAnyQuizzes) {
    return (
      <div className="quests-page">
        <div className="error-container">
          <h3>Error loading quests</h3>
          <p>{error}</p>
          <button
            className="retry-btn"
            onClick={handleRetryLoading}
          >
            <FaSync className="retry-icon" /> Retry
          </button>
        </div>
      </div>
    );
  }

  // Render empty state if no quests are found
  if (!loading && !isDirectFetching && !hasAnyQuizzes) {
    return (
      <div className="quests-page">
        <div className="quests-header">
          <h1>Quests</h1>
          <div className="quests-search-container">
            <div className="quests-search-input-container">
              <FaSearch className="quests-search-icon" />
              <input
                type="text"
                className="quests-search-input"
                placeholder="Search Quest"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </div>
        <div className="empty-state">
          <h3>No quests available</h3>
          <p>There are currently no quests available. Please check back later.</p>
          <button
            className="retry-btn"
            onClick={handleRetryLoading}
          >
            <FaSync className="retry-icon" /> Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="quests-page">
      {/* Header with search */}
      <div className="quests-header">
        <h1>Quests</h1>
        <div className="quests-search-container">
          <div className="quests-search-input-container">
            <FaSearch className="quests-search-icon" />
            <input
              type="text"
              className="quests-search-input"
              placeholder="Search Python"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* If search query exists, show search results */}
      {searchQuery.trim() !== '' && (
        <div className="search-results">
          <h2 className="section-heading">Search Results</h2>
          {filteredQuizzes.length > 0 ? (
            <div className="quest-grid">
              {filteredQuizzes.map(quest => renderQuestCard(quest))}
            </div>
          ) : (
            <div className="no-results">
              <p>No quests found matching "{searchQuery}"</p>
            </div>
          )}
        </div>
      )}

      {/* If no search query, show all quest categories */}
      {searchQuery.trim() === '' && (
        <>
          {/* Beginner Quest Section */}
          <div className="quest-section">
            <h2 className="section-heading">Beginner Quest</h2>
            <div className="quest-grid">
              {beginnerQuests.length > 0 ? (
                beginnerQuests.slice(0, 4).map(quest => renderQuestCard(quest))
              ) : (
                <div className="no-quests">
                  <p>No beginner quests available</p>
                </div>
              )}
            </div>
          </div>

          {/* Popular Quest Section */}
          <div className="quest-section">
            <h2 className="section-heading">Popular Quest</h2>
            <div className="quest-grid">
              {popularQuests.length > 0 ? (
                popularQuests.map(quest => renderQuestCard(quest))
              ) : (
                <div className="no-quests">
                  <p>No popular quests available</p>
                </div>
              )}
            </div>
          </div>

          {/* Intermediate Quest Section */}
          <div className="quest-section">
            <h2 className="section-heading">Intermediate Quest</h2>
            <div className="quest-grid">
              {intermediateQuests.length > 0 ? (
                intermediateQuests.slice(0, 4).map(quest => renderQuestCard(quest))
              ) : (
                <div className="no-quests">
                  <p>No intermediate quests available</p>
                </div>
              )}
            </div>
          </div>

          {/* Advanced Quest Section */}
          <div className="quest-section">
            <h2 className="section-heading">Advanced Quest</h2>
            <div className="quest-grid">
              {advancedQuests.length > 0 ? (
                advancedQuests.slice(0, 4).map(quest => renderQuestCard(quest))
              ) : (
                <div className="no-quests">
                  <p>No advanced quests available</p>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default QuestsPage;