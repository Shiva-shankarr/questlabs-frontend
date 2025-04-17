import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import './adminDashboard.css';
import { clearQuestSessionData } from '../utils/sessionManager';

// Constants
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const AdminDashboardContent = () => {
  // State for dashboard data
  const [dashboardData, setDashboardData] = useState({
    totalQuizzes: 36, // Default value from Frame-31
    totalUsers: 1200, // Default value from Frame-31
    topQuiz: 'Python', // Default value from Frame-31
    userEngagement: []
  });
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Clear any temporary quest data when dashboard loads
  useEffect(() => {
    clearQuestSessionData();
  }, []);

  // Function to fetch all dashboard data
  const fetchDashboardData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Get token for authentication
      const token = localStorage.getItem('token') || localStorage.getItem('userToken');
      if (!token) {
        throw new Error('Authentication token not found');
      }
      
      const config = {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      };
      
      // Fetch quizzes data
      const quizzesResponse = await axios.get(`${API_URL}/quizzes`, config);
      
      // Fetch users data
      const usersResponse = await axios.get(`${API_URL}/auth/users`, config);
      
      // Parse data
      const quizzes = Array.isArray(quizzesResponse.data) 
        ? quizzesResponse.data 
        : (quizzesResponse.data?.quizzes || []);
      
      const users = Array.isArray(usersResponse.data) 
        ? usersResponse.data 
        : (usersResponse.data?.users || []);
      
      // Find top quiz based on enrollments
      let topQuiz = 'Python'; // Default if no quizzes found
      if (quizzes.length > 0) {
        // Sort quizzes by enrollment count (descending)
        const sortedQuizzes = [...quizzes].sort((a, b) => {
          return (b.enrolledCount || 0) - (a.enrolledCount || 0);
        });
        
        if (sortedQuizzes[0]) {
          topQuiz = sortedQuizzes[0].title || 'Python';
        }
      }
      
      // Update dashboard data
      setDashboardData({
        totalQuizzes: quizzes.length,
        totalUsers: users.length,
        topQuiz: topQuiz,
        userEngagement: generateMockEngagementData() // Generate sample data for now
      });
    } catch (error) {
      setError(error.message || 'Failed to fetch dashboard data');
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  // Generate sample engagement data (until backend provides real data)
  const generateMockEngagementData = () => {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    return days.map(day => ({
      day,
      value: Math.floor(Math.random() * 100) + 20
    }));
  };
  
  // Fetch data on component mount
  useEffect(() => {
    fetchDashboardData();
    
    // Set up auto-refresh interval (every 5 minutes)
    const refreshInterval = setInterval(() => {
      fetchDashboardData();
    }, 300000); 
    
    return () => clearInterval(refreshInterval);
  }, [fetchDashboardData]); // Include fetchDashboardData in the dependency array
  
  // Handler for manual refresh
  const handleRefresh = () => {
    fetchDashboardData();
  };

  return (
    <div className="admin-dashboard-container">
      {/* Welcome Section */}
      <div className="welcome-section">
        <h1 className="welcome-title">Welcome Admin!</h1>
        <button 
          className="refresh-button" 
          onClick={handleRefresh}
          disabled={isLoading}
        >
          {isLoading ? 'Refreshing...' : 'Refresh Data'}
        </button>
      </div>
      
      {/* Create Quest Link - Now in a black container */}
      <div className="create-quest-wrapper">
        <a href="/admin/create-quest" className="create-quest-link">
          Create Your Quest Here
        </a>
      </div>

      {/* Error State Display */}
      {error && (
        <div className="error-state">
          <p>Error loading dashboard data: {error}</p>
          <button 
            className="retry-button" 
            onClick={handleRefresh}
            disabled={isLoading}
          >
            Retry
          </button>
        </div>
      )}

      {/* Dashboard Cards */}
      <div className="dashboard-cards-grid">
        {/* Total Quizzes Card */}
        <div className="dashboard-card">
          <div className="card-icon quiz-icon">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <div className="card-content">
            <h3 className="card-title">Total Quizzes</h3>
            <p className="card-value">
              {isLoading ? (
                <span className="loading-placeholder">Loading...</span>
              ) : (
                dashboardData.totalQuizzes
              )}
            </p>
          </div>
        </div>

        {/* Total Users Card */}
        <div className="dashboard-card">
          <div className="card-icon user-icon">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          </div>
          <div className="card-content">
            <h3 className="card-title">Total Users</h3>
            <p className="card-value">
              {isLoading ? (
                <span className="loading-placeholder">Loading...</span>
              ) : (
                dashboardData.totalUsers
              )}
            </p>
          </div>
        </div>

        {/* Top Quiz Card */}
        <div className="dashboard-card">
          <div className="card-icon top-quiz-icon">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <div className="card-content">
            <h3 className="card-title">Top Quiz</h3>
            <p className="card-value">
              {isLoading ? (
                <span className="loading-placeholder">Loading...</span>
              ) : (
                dashboardData.topQuiz
              )}
            </p>
          </div>
        </div>
      </div>

      {/* User Engagement Overview */}
      <div className="engagement-overview">
        <h2 className="section-title">User Engagement Overview</h2>
        <div className="engagement-chart-container">
          {isLoading ? (
            <div className="loading-chart">Loading chart data...</div>
          ) : (
            <div className="chart-grid">
              {dashboardData.userEngagement.map((item, index) => (
                <div className="chart-column" key={index}>
                  <div className="chart-bar-container">
                    <div 
                      className="chart-bar" 
                      style={{ height: `${Math.min(100, Math.max(4, item.value))}%` }} 
                      title={`${item.value} activities`}
                    />
                  </div>
                  <div className="chart-label">{item.day}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboardContent;