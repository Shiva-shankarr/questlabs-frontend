// src/pages/adminLeaderboard.js
import React, { useState, useEffect } from 'react';
import { FaChevronDown, FaChevronRight } from 'react-icons/fa';
import axios from 'axios';
import { toast } from 'react-toastify';
import './adminLeaderboard.css';

const AdminLeaderboard = () => {
  const [stats, setStats] = useState({
    topUsers: 0,
    activeQuests: 0,
    averageTimeSpent: '0m'
  });
  const [topPerformers, setTopPerformers] = useState([]);
  const [quests, setQuests] = useState([]);
  const [questUsers, setQuestUsers] = useState({});
  const [expandedQuests, setExpandedQuests] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

  // Fetch leaderboard data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('userToken');
        
        if (!token) {
          setError('Authentication required');
          toast.error('Please log in to access admin features');
          return;
        }
        
        const headers = { Authorization: `Bearer ${token}` };
        
        // Fetch all leaderboard data in a single request
        const response = await axios.get(`${API_URL}/admin/leaderboard`, { headers });
        const data = response.data;
        
        // Set stats
        setStats(data.stats);
        
        // Set top performers
        setTopPerformers(data.topPerformers);
        
        // Set quests and organize quest users
        setQuests(data.quests);
        
        // Create an object with quest users
        const questUsersMap = {};
        data.quests.forEach(quest => {
          questUsersMap[quest.id] = quest.users;
        });
        setQuestUsers(questUsersMap);
        
      } catch (err) {
        console.error('Error fetching leaderboard data:', err);
        const errorMessage = err.response?.data?.message || err.message || 'Failed to fetch leaderboard data';
        setError(errorMessage);
        toast.error(errorMessage);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [API_URL]);

  // Toggle quest expansion
  const toggleQuestExpansion = (questId) => {
    setExpandedQuests(prev => {
      const newState = { ...prev };
      newState[questId] = !prev[questId];
      return newState;
    });
  };

  // Render status with appropriate styling
  const renderStatus = (status) => {
    let className = '';
    
    if (status === 'Completed') {
      className = 'status-completed';
    } else if (status === 'In Progress') {
      className = 'status-in-progress';
    } else if (status === 'Active') {
      className = 'status-active';
    }
    
    return <span className={`status-indicator ${className}`}>{status}</span>;
  };

  return (
    <div className="admin-leaderboard-container">
      <div className="admin-leaderboard-header">
        <h1 className="leaderboard-title">Leaderboard</h1>
      </div>

      <div className="stats-cards">
        <div className="stat-card">
          <h3>Top Users</h3>
          <p className="stat-value">{stats.topUsers}</p>
        </div>
        <div className="stat-card">
          <h3>Active Quests</h3>
          <p className="stat-value">{stats.activeQuests}</p>
        </div>
        <div className="stat-card">
          <h3>Average Time Spent</h3>
          <p className="stat-value">{stats.averageTimeSpent}</p>
        </div>
        <div className="stat-card">
          <h3>Active Quests</h3>
          <p className="stat-value">{stats.activeQuests}</p>
        </div>
      </div>

      <div className="top-performances-section">
        <h2 className="section-title">Top Performances</h2>
        
        {loading ? (
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>Loading...</p>
          </div>
        ) : error ? (
          <div className="error-message">
            <p>{error}</p>
          </div>
        ) : topPerformers.length === 0 ? (
          <div className="no-data-message">
            <p>No users data available.</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="performances-table">
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Completed Quests</th>
                </tr>
              </thead>
              <tbody>
                {topPerformers.map(user => (
                  <tr key={user.id}>
                    <td>{user.rank}</td>
                    <td>{user.name}</td>
                    <td>{user.email}</td>
                    <td>{user.completedQuests}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      
      {/* Quest Wise User Performance */}
      <div className="quest-wise-performance-section">
        <h2 className="section-title">Quest Wise User Performance</h2>
        
        {loading ? (
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>Loading...</p>
          </div>
        ) : error ? (
          <div className="error-message">
            <p>{error}</p>
          </div>
        ) : quests.length === 0 ? (
          <div className="no-data-message">
            <p>No quests available.</p>
          </div>
        ) : (
          <div className="quest-users-container">
            {quests.map(quest => (
              <div key={quest.id} className="quest-users-item">
                <div 
                  className="quest-header"
                  onClick={() => toggleQuestExpansion(quest.id)}
                >
                  <div className="quest-title-container">
                    {expandedQuests[quest.id] ? <FaChevronDown /> : <FaChevronRight />}
                    <span className="quest-title">{quest.title}</span>
                  </div>
                </div>
                
                {expandedQuests[quest.id] && (
                  <div className="quest-users-list">
                    {!questUsers[quest.id] ? (
                      <div className="loading-container small">
                        <div className="loading-spinner"></div>
                        <p>Loading users...</p>
                      </div>
                    ) : questUsers[quest.id].length === 0 ? (
                      <div className="no-users-message">
                        <p>No users enrolled in this quest.</p>
                      </div>
                    ) : (
                      <table className="quest-users-table">
                        <thead>
                          <tr>
                            <th>ID</th>
                            <th>Name</th>
                            <th>Status</th>
                            <th>No of Tasks completed</th>
                            <th>Progress</th>
                          </tr>
                        </thead>
                        <tbody>
                          {questUsers[quest.id].map((user, index) => (
                            <tr key={user.id}>
                              <td>{index + 1}</td>
                              <td>{user.name}</td>
                              <td>{renderStatus(user.status)}</td>
                              <td>{user.tasksCompleted}</td>
                              <td>{user.progress}%</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminLeaderboard;