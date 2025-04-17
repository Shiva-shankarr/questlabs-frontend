import React, { useState, useEffect, useCallback } from 'react';
import { FiRefreshCw, FiBarChart2, FiClock, FiZap } from 'react-icons/fi';
import axios from 'axios';
import './ProgressBoard.css';

const ProgressBoard = ({ courseId }) => {
  const [loading, setLoading] = useState(false);
  const [progressData, setProgressData] = useState({
    completedTasks: 0,
    totalTasks: 6, // Default total
    currentTaskProgress: 50,
    timeSpentMinutes: 0,
    streak: 0
  });

  // Format time spent from minutes to hours and minutes
  const formatTimeSpent = (minutes) => {
    if (!minutes && minutes !== 0) return '0h 0m';
    
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    
    return `${hours}h ${mins}m`;
  };

  const fetchProgressData = useCallback(async () => {
    setLoading(true);
    try {
      // First try to get data from localStorage
      const storageKey = `progress_${courseId}`;
      const cachedData = localStorage.getItem(storageKey);
      
      if (cachedData) {
        try {
          const parsedData = JSON.parse(cachedData);
          console.log('Found progress data in localStorage:', parsedData);
          
          setProgressData({
            completedTasks: parsedData.completedTasks || 0,
            totalTasks: parsedData.totalTasks || 6,
            currentTaskProgress: parsedData.percentage || 50,
            timeSpentMinutes: parsedData.timeSpentMinutes || 0,
            streak: parsedData.streak || 0
          });
        } catch (e) {
          console.error('Error parsing cached progress data:', e);
        }
      }
      
      // Then try to get fresh data from API
      const token = localStorage.getItem('userToken');
      if (!token) {
        throw new Error('Authentication token not found');
      }
      
      const response = await axios.get(`/api/quizzes/${courseId}/progress`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      if (response.data) {
        console.log('Received progress data from API:', response.data);
        
        const apiData = response.data;
        
        // Update state with the latest data
        setProgressData({
          completedTasks: apiData.completedTasks || 0,
          totalTasks: apiData.totalTasks || 6,
          currentTaskProgress: apiData.percentage || 50,
          timeSpentMinutes: apiData.timeSpentMinutes || 0,
          streak: apiData.streak || 0
        });
        
        // Cache the data in localStorage
        localStorage.setItem(storageKey, JSON.stringify(apiData));
      }
    } catch (error) {
      console.error('Error fetching progress data:', error);
      
      // Try to get data from the third image format as a fallback
      try {
        // The third image shows data in a different format in localStorage
        const quizProgressKey = Object.keys(localStorage).find(key => 
          key.startsWith('progress_') && key.includes(courseId)
        );
        
        if (quizProgressKey) {
          const progressData = JSON.parse(localStorage.getItem(quizProgressKey));
          if (progressData) {
            console.log('Using alternate progress data format:', progressData);
            setProgressData({
              completedTasks: progressData.completedTasks || 0,
              totalTasks: progressData.totalTasks || 6,
              currentTaskProgress: progressData.percentage || 50,
              timeSpentMinutes: progressData.timeSpentMinutes || 0,
              streak: progressData.streak || 0
            });
          }
        }
      } catch (fallbackError) {
        console.error('Error using fallback progress data:', fallbackError);
      }
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    if (courseId) {
      fetchProgressData();
    }
  }, [courseId, fetchProgressData]);

  return (
    <div className="progress-board">
      <div className="progress-header">
        <h3 className="progress-title">Your Progress</h3>
        <button 
          className={`refresh-button ${loading ? 'loading' : ''}`}
          onClick={fetchProgressData}
          disabled={loading}
        >
          <FiRefreshCw />
        </button>
      </div>
      
      <div className="progress-circle-container">
        <div className="progress-circle">
          <svg viewBox="0 0 100 100">
            <circle
              className="progress-circle-bg"
              cx="50"
              cy="50"
              r="36"
              strokeWidth="8"
            />
            <circle
              className="progress-circle-fill"
              cx="50"
              cy="50"
              r="36"
              strokeWidth="8"
              strokeDasharray={2 * Math.PI * 36}
              strokeDashoffset={2 * Math.PI * 36 * (1 - progressData.completedTasks / progressData.totalTasks)}
              transform="rotate(-90 50 50)"
            />
          </svg>
          <div className="progress-text">
            {progressData.completedTasks}/{progressData.totalTasks} Tasks Completed
          </div>
        </div>
      </div>
      
      <div className="progress-stats">
        <div className="progress-stat-item">
          <div className="progress-stat-icon">
            <FiBarChart2 />
          </div>
          <div className="progress-stat-content">
            <div className="progress-stat-label">Current Task Progress</div>
            <div className="progress-stat-value">{progressData.currentTaskProgress}%</div>
          </div>
        </div>
        
        <div className="progress-stat-item">
          <div className="progress-stat-icon">
            <FiClock />
          </div>
          <div className="progress-stat-content">
            <div className="progress-stat-label">Time Spent on Tasks</div>
            <div className="progress-stat-value">{formatTimeSpent(progressData.timeSpentMinutes)}</div>
          </div>
        </div>
        
        <div className="progress-stat-item">
          <div className="progress-stat-icon">
            <FiZap />
          </div>
          <div className="progress-stat-content">
            <div className="progress-stat-label">Streak</div>
            <div className="progress-stat-value">{progressData.streak}-days</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProgressBoard; 