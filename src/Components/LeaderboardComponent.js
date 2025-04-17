import React, { useState, useEffect, useCallback } from 'react';
import { FiRefreshCw } from 'react-icons/fi';
import axios from 'axios';
import './LeaderboardComponent.css';

const LeaderboardComponent = ({ courseId }) => {
  const [loading, setLoading] = useState(false);
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [currentUserId, setCurrentUserId] = useState(null);

  // Convert to useCallback so it can be used in dependencies
  const fetchLeaderboardData = useCallback(async () => {
    setLoading(true);
    try {
      // First try to get data from localStorage
      const storageKey = `leaderboard_${courseId}`;
      const cachedData = localStorage.getItem(storageKey);
      
      if (cachedData) {
        try {
          const parsedData = JSON.parse(cachedData);
          console.log('Found leaderboard data in localStorage:', parsedData);
          setLeaderboardData(parsedData);
        } catch (e) {
          console.error('Error parsing cached leaderboard data:', e);
        }
      }
      
      // Then try to get fresh data from API
      const token = localStorage.getItem('userToken');
      if (!token) {
        throw new Error('Authentication token not found');
      }
      
      const response = await axios.get(`/api/quizzes/${courseId}/leaderboard`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      if (response.data && Array.isArray(response.data)) {
        console.log('Received leaderboard data from API:', response.data);
        
        // Format the data to ensure it has the required properties
        const formattedData = response.data.map((user, index) => ({
          rank: user.rank || index + 1,
          userId: user.userId,
          username: user.username,
          completedTasks: user.completedTasks || 0,
          streak: user.streak || 0,
          isCurrentUser: user.isCurrentUser || user.userId === currentUserId
        }));
        
        setLeaderboardData(formattedData);
        
        // Cache the data in localStorage
        localStorage.setItem(storageKey, JSON.stringify(formattedData));
      }
    } catch (error) {
      console.error('Error fetching leaderboard data:', error);
    } finally {
      setLoading(false);
    }
  }, [courseId, currentUserId]); // Add dependencies for the callback

  useEffect(() => {
    // Set current user ID from localStorage
    const userId = localStorage.getItem('userId');
    setCurrentUserId(userId);
    
    // Initial data fetch
    if (courseId) {
      fetchLeaderboardData();
    }
  }, [courseId, fetchLeaderboardData]); // fetchLeaderboardData is now a stable dependency

  return (
    <div className="leaderboard-component">
      <div className="leaderboard-header">
        <h3 className="leaderboard-title">Leaderboard</h3>
        <button 
          className={`refresh-button ${loading ? 'loading' : ''}`}
          onClick={fetchLeaderboardData}
          disabled={loading}
        >
          <FiRefreshCw />
        </button>
      </div>

      {leaderboardData.length > 0 ? (
        <div className="leaderboard-table">
          <div className="leaderboard-table-header">
            <div className="rank-col">Rank</div>
            <div className="user-col">User</div>
            <div className="completed-col">Completed</div>
            <div className="streak-col">Streak</div>
          </div>
          
          <div className="leaderboard-table-body">
            {leaderboardData.map((user) => (
              <div key={user.userId} className={`leaderboard-row ${user.isCurrentUser ? 'current-user' : ''}`}>
                <div className="rank-col">{user.rank < 10 ? `0${user.rank}` : user.rank}</div>
                <div className="user-col">{user.username}</div>
                <div className="completed-col">{user.completedTasks}</div>
                <div className="streak-col">{user.streak}</div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="empty-leaderboard">
          <div className="trophy-icon">🏆</div>
          <p>No participants yet. Be the first to complete a task!</p>
        </div>
      )}
    </div>
  );
};

export default LeaderboardComponent; 