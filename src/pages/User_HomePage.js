import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { fetchHomePageData, toggleFavorite, fetchQuizzes } from '../redux/slices/quizSlice';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import './UserHomePage.css';
import video from '../assets/videos/bg-video.mp4'

const User_HomePage = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [debugInfo, setDebugInfo] = useState({});
  const [directQuizzes, setDirectQuizzes] = useState([]);
  
  const { homePageData, favorites, loading, error, quizzes } = useSelector(state => state.quiz);
  const { featuredQuiz, continueTasks, beginnerQuests, popularQuests } = homePageData;

  // First fetch attempt with debug info
  useEffect(() => {
    console.log("=== HOMEPAGE INITIALIZE ===");
    console.log("Initial Redux State:", { 
      homePageData, 
      favorites, 
      loading, 
      error, 
      quizCount: quizzes?.length 
    });
    
    // Make a direct API request to compare with Redux results
    const checkApiDirectly = async () => {
      try {
        console.log("Making direct API request to /api/quizzes");
        const API_URL = 'http://localhost:5000/api';
        
        // Fetch without axios to eliminate middleware issues
        const response = await fetch(`${API_URL}/quizzes`);
        const data = await response.json();
        
        console.log("Direct API response:", data);
        console.log("Quiz count from direct API:", data.quizzes?.length || 0);
        
        // If we got quizzes, process them for display
        if (data.quizzes?.length > 0) {
          console.log("Found quizzes via direct API call, setting for direct use");
          
          // Process quizzes to ensure consistent format
          const processedQuizzes = data.quizzes.map(quiz => ({
            id: quiz.id,
            title: quiz.title || 'Untitled Quest',
            description: Array.isArray(quiz.description) ? quiz.description : 
                       (quiz.description ? [String(quiz.description)] : ['No description available']),
            instructor: quiz.admin?.username || 'Quest Instructor',
            image: quiz.thumbnailUrl || 'https://via.placeholder.com/300x200?text=Quest+Image',
            level: quiz.level || 'Beginner',
            favorite: false,
            tasks: Array.isArray(quiz.questions) ? quiz.questions.length : 0
          }));
          
          // Save these for direct use in the UI
          setDirectQuizzes(processedQuizzes);
          
          // Create homepage data categories from these quizzes
          const updatedHomePageData = {
            featuredQuiz: processedQuizzes[0],
            continueTasks: processedQuizzes.slice(0, 4),
            beginnerQuests: processedQuizzes,
            intermediateQuests: processedQuizzes.slice(0, Math.min(processedQuizzes.length, 4)),
            advancedQuests: [],
            popularQuests: processedQuizzes.slice(0, Math.min(processedQuizzes.length, 4))
          };
          
          // Dispatch both actions to update state
          dispatch({
            type: 'quiz/setHomePageData',
            payload: updatedHomePageData
          });
          
          // Also update the main quizzes array
          dispatch({
            type: 'quiz/quizzesLoaded',
            payload: processedQuizzes
          });
          
          console.log("Directly updated Redux state with", processedQuizzes.length, "quizzes");
        }
        
        setDebugInfo(prev => ({
          ...prev,
          directApiResponse: {
            status: response.status,
            quizCount: data.quizzes?.length || 0,
            timestamp: new Date().toISOString()
          }
        }));
      } catch (error) {
        console.error("Direct API request failed:", error);
        setDebugInfo(prev => ({
          ...prev,
          directApiError: {
            message: error.message,
            timestamp: new Date().toISOString()
          }
        }));
      }
    };
    
    // Run our diagnostics and direct API call first
    checkApiDirectly();
    
    // Then try the regular Redux actions
    console.log("Fetching homepage data through Redux...");
    dispatch(fetchHomePageData());
    dispatch(fetchQuizzes());
    
  }, [dispatch, quizzes?.length]);
  
  // Add debug logging for homePageData changes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    console.log("=== HOME PAGE DATA UPDATED ===");
    console.log("Current homePageData:", homePageData);
    console.log("featuredQuiz:", featuredQuiz);
    console.log("continueTasks:", continueTasks);
    console.log("beginnerQuests:", beginnerQuests);
    console.log("popularQuests:", popularQuests);
    console.log("All quizzes in Redux:", quizzes);
    
    // IMPORTANT: If we have quizzes but no categories filled, manually update them
    if (quizzes && quizzes.length > 0 && 
        (!continueTasks?.length && !beginnerQuests?.length && !popularQuests?.length)) {
      console.log("We have quizzes but no categories - manually updating");
      
      // Create direct reference to homePage data categories
      const updatedHomePageData = {
        featuredQuiz: quizzes[0],
        continueTasks: quizzes.slice(0, Math.min(quizzes.length, 4)),
        beginnerQuests: quizzes,
        intermediateQuests: quizzes.slice(0, Math.min(quizzes.length, 4)),
        advancedQuests: [],
        popularQuests: quizzes.slice(0, Math.min(quizzes.length, 4))
      };
      
      // Dispatch action to update redux state
      dispatch({
        type: 'quiz/setHomePageData',
        payload: updatedHomePageData
      });
      
      console.log("Manually updated homePageData:", updatedHomePageData);
    }
    
    setDebugInfo(prev => ({
      ...prev,
      reduxState: {
        homePageDataKeys: Object.keys(homePageData),
        quizzesLength: quizzes?.length || 0,
        continueTasksLength: continueTasks?.length || 0,
        beginnerQuestsLength: beginnerQuests?.length || 0,
        popularQuestsLength: popularQuests?.length || 0,
        timestamp: new Date().toISOString()
      }
    }));
  }, [homePageData, featuredQuiz, continueTasks, beginnerQuests, popularQuests, quizzes, dispatch]);

  const handleOpenQuest = (id) => {
    console.log("Opening quest with ID:", id);
    navigate(`/course/${id}`);
  };

  const handleToggleFavorite = (courseId, category) => {
    dispatch(toggleFavorite({ courseId, category }));
  };

  // Force refresh the data
  const handleRetryLoading = () => {
    console.log("Manually refreshing data...");
    dispatch(fetchQuizzes());
    dispatch(fetchHomePageData());
  };

  // Render a course card with improved interactivity
  const renderCourseCard = (course, section) => {
    if (!course) {
      console.error("Invalid course data: undefined or null");
      return null; // Skip invalid courses
    }
    
    // Ensure course has all required properties by providing defaults
    const safeTitle = course.title || 'Untitled Quest';
    const safeId = course.id || `temp-id-${Math.random().toString(36).substring(2, 9)}`;
    const safeImage = course.image || course.thumbnailUrl || 'https://via.placeholder.com/300x200?text=Quest+Image';
    const safeInstructor = course.instructor || course.admin?.username || 'Quest Instructor';
    
    const isFavorite = course.favorite || favorites.includes(safeId);
    
    return (
      <div className="col-lg-3 col-md-6 col-sm-12 mb-4" key={safeId}>
        <div className="course-card" onClick={() => handleOpenQuest(safeId)}>
          <div className="card-img-container position-relative">
            <img 
              src={safeImage} 
              className="card-img-top" 
              alt={safeTitle} 
              onError={(e) => {
                e.target.onerror = null; 
                e.target.src = 'https://via.placeholder.com/300x200?text=Quest+Image';
              }}
            />
            <div className="card-overlay">
              <button
                className="btn btn-primary open-quest-btn"
                onClick={(e) => {
                  e.stopPropagation(); // Prevent triggering the parent onClick
                  handleOpenQuest(safeId);
                }}
              >
                Open Quest
              </button>
            </div>
            <button 
              className={`favorite-btn ${isFavorite ? 'favorite-active' : ''}`}
              onClick={(e) => {
                e.stopPropagation(); // Prevent card click when clicking favorite
                handleToggleFavorite(safeId, section);
              }}
              aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
            >
              <i className={`bi ${isFavorite ? 'bi-heart-fill' : 'bi-heart'}`}></i>
            </button>
          </div>
          <div className="card-body">
            <h5 className="card-title">{safeTitle}</h5>
            <p className="card-text instructor-name">{safeInstructor}</p>
          </div>
        </div>
      </div>
    );
  };

  if (loading && (!continueTasks?.length && !beginnerQuests?.length && !popularQuests?.length) && directQuizzes.length === 0) {
    return (
      <div className="loading-container">
        <div className="spinner-border text-light" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  if (error && directQuizzes.length === 0) {
    return (
      <div className="error-container">
        <div className="alert alert-danger" role="alert">
          <h4>Error loading content</h4>
          <p>{typeof error === 'object' ? (error.message || JSON.stringify(error)) : error}</p>
        </div>
      </div>
    );
  }

  // Always show debug section in development
  const showDebugInfo = process.env.NODE_ENV === 'development' || true;

  // Ensure we have quizzes to display by using all available sources
  const availableQuizzes = directQuizzes.length > 0 ? directQuizzes : quizzes;
  const availableFeaturedQuiz = featuredQuiz || (availableQuizzes.length > 0 ? availableQuizzes[0] : null);
  const availableContinueTasks = continueTasks?.length > 0 ? continueTasks : availableQuizzes.slice(0, 4);
  const availableBeginnerQuests = beginnerQuests?.length > 0 ? beginnerQuests : availableQuizzes;
  const availablePopularQuests = popularQuests?.length > 0 ? popularQuests : availableQuizzes.slice(0, 4);

  return (
    <div className="user-home-page">
      {/* Featured Quest Section with Video Background */}
      <section className="featured-quest">
        {/* Background Video */}
        <div className="video-background">
          <video autoPlay loop muted playsInline className="video-bg">
            <source src={video} type="video/mp4" />
            Your browser does not support the video tag.
          </video>
        </div>

        {/* Overlay Content */}
        <div className="overlay">
          <div className="container">
            <div className="row">
              <div className="col-md-6">
                <h2>Featured Quest: {availableFeaturedQuiz?.title || 'The Bookkeeper\'s Challenge'}</h2>
                <p>
                  {Array.isArray(availableFeaturedQuiz?.description) && availableFeaturedQuiz?.description[0]
                    ? availableFeaturedQuiz.description[0].substring(0, 120)
                    : 'Embark on a journey to solve the mystery of the missing books from the Citadel\'s archives.'
                  }
                </p>
                <div className="button-group">
                  <button
                    className="btn btn-primary open-quest-btn"
                    onClick={() => handleOpenQuest(availableFeaturedQuiz?.id || null)}
                  >
                    Open Quest
                  </button>
                  <button className="btn btn-outline-light more-info-btn">More Info</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Continue Tasks Section - use directQuizzes if available */}
      {availableContinueTasks?.length > 0 && (
      <section className="continue-tasks section-padding">
        <div className="container">
          <h3 className="section-title">Continue Tasks</h3>
          <div className="row">
              {availableContinueTasks.map(course => renderCourseCard(course, 'continue'))}
            </div>
        </div>
      </section>
      )}

      {/* Beginner Quest Section - use directQuizzes if available */}
      {availableBeginnerQuests?.length > 0 && (
      <section className="beginner-quest section-padding">
        <div className="container">
          <h3 className="section-title">Beginner Quest</h3>
          <div className="row">
              {availableBeginnerQuests.map(course => renderCourseCard(course, 'beginner'))}
            </div>
        </div>
      </section>
      )}

      {/* Popular Quest Section - use directQuizzes if available */}
      {availablePopularQuests?.length > 0 && (
      <section className="popular-quest section-padding">
        <div className="container">
          <h3 className="section-title">Popular Quest</h3>
          <div className="row">
              {availablePopularQuests.map(course => renderCourseCard(course, 'popular'))}
            </div>
          </div>
        </section>
      )}
      
      {/* Only show debug section if needed */}
      {(showDebugInfo && !directQuizzes.length && !quizzes.length) && (
        <section className="debug-section section-padding">
          <div className="container">
            <h3 className="section-title">Debug Info</h3>
            <div className="alert alert-info">
              <h5>Quiz Data:</h5>
              <pre>{JSON.stringify({ 
                quizCount: quizzes?.length || 0,
                directQuizCount: directQuizzes?.length || 0,
                featuredQuiz: featuredQuiz ? 'Present' : 'Missing',
                continueTasks: continueTasks?.length || 0,
                beginnerQuests: beginnerQuests?.length || 0,
                popularQuests: popularQuests?.length || 0,
                error: error || 'None',
                loading,
                debugInfo
              }, null, 2)}</pre>
              
              <div className="mt-4">
                <h5>No Quizzes Found</h5>
                <p>Possible solutions:</p>
                <ul>
                  <li>Check that the backend server is running</li>
                  <li>Verify that quizzes exist in the database</li>
                  <li>Check for CORS issues in browser console</li>
                  <li>Check authentication token validity</li>
                </ul>
                <button 
                  className="btn btn-primary mt-2"
                  onClick={handleRetryLoading}
                >
                  Retry Loading
                </button>
              </div>
          </div>
        </div>
      </section>
      )}
    </div>
  );
};

export default User_HomePage;