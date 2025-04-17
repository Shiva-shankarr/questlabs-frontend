import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { fetchHomePageData, toggleFavorite } from '../redux/slices/quizSlice';
import './Favorites.css';

const Favorites = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  
  // Get state from Redux
  const { homePageData, favorites, loading } = useSelector(state => state.quiz);
  const { continueTasks, beginnerQuests, popularQuests } = homePageData;

  useEffect(() => {
    // Fetch homepage data if not already loaded
    if (continueTasks.length === 0 && beginnerQuests.length === 0 && popularQuests.length === 0) {
      dispatch(fetchHomePageData());
    }
  }, [dispatch, continueTasks.length, beginnerQuests.length, popularQuests.length]);

  // Combine all courses from different sections
  const allCourses = [
    ...continueTasks.map(course => ({ ...course, section: 'continue' })),
    ...beginnerQuests.map(course => ({ ...course, section: 'beginner' })),
    ...popularQuests.map(course => ({ ...course, section: 'popular' }))
  ];
  
  // Filter only favorited courses
  const favoriteCourses = allCourses.filter(course => 
    course.favorite || favorites.includes(course.id)
  );

  const handleOpenQuest = (courseId) => {
    navigate(`/course/${courseId}`);
  };

  const handleToggleFavorite = (courseId, section) => {
    dispatch(toggleFavorite({ courseId, category: section }));
  };

  // Render a course card with the same styling as User_HomePage.js
  const renderCourseCard = (course) => {
    const isFavorite = course.favorite || favorites.includes(course.id);
    
    return (
      <div className="col-lg-3 col-md-6 col-sm-12 mb-4" key={course.id}>
        <div className="course-card" onClick={() => handleOpenQuest(course.id)}>
          <div className="card-img-container position-relative">
            <img
              src={course.image}
              className="card-img-top"
              alt={course.title}
            />
            <div className="card-overlay">
              <button
                className="btn btn-primary open-quest-btn"
                onClick={(e) => {
                  e.stopPropagation(); // Prevent triggering the parent onClick
                  handleOpenQuest(course.id);
                }}
              >
                Open Quest
              </button>
            </div>
            <button
              className={`favorite-btn ${isFavorite ? 'favorite-active' : ''}`}
              onClick={(e) => {
                e.stopPropagation(); // Prevent card click when clicking favorite
                handleToggleFavorite(course.id, course.section);
              }}
              aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
            >
              <i className={`bi ${isFavorite ? 'bi-heart-fill' : 'bi-heart'}`}></i>
            </button>
          </div>
          <div className="card-body">
            <h5 className="card-title">{course.title}</h5>
            <p className="card-text instructor-name">{course.instructor}</p>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="favorites-page">
      <div className="container-fluid my-4">
        <h1 className="mb-4 text-white">My Favorites</h1>
        
        {loading ? (
          <div className="text-center py-5">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
          </div>
        ) : (
          <>
            {favoriteCourses.length > 0 ? (
              <div className="row">
                {favoriteCourses.map(course => renderCourseCard(course))}
              </div>
            ) : (
              <div className="text-center py-5 text-white">
                <h4>You don't have any favorite courses yet</h4>
                <p>Add courses to your favorites by clicking the heart icon on any course card</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Favorites;