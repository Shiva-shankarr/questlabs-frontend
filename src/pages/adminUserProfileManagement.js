import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import { FiMapPin, FiMail, FiPhone, FiArrowLeft } from 'react-icons/fi';
import './adminUserProfileManagement.css';
import logo from '../assets/images/adVlogo7.png'



const AdminUserProfileManagement = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  
  const [user, setUser] = useState(null);
  const [enrolledQuests, setEnrolledQuests] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [performance, setPerformance] = useState({
    completedQuests: 0,
    ongoingTasks: 0,
    averageCompletionRate: 0,
    streak: 0
  });
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
  
  // Fetch user profile data
  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        setLoading(true);
        
        const token = localStorage.getItem('userToken');
        if (!token) {
          toast.error('Authentication required');
          navigate('/login');
          return;
        }
        
        const response = await axios.get(`${API_URL}/users/${userId}/details`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        
        // Extract data from response
        const { user, enrolledQuests, recentActivity, performance } = response.data;
        
        setUser(user);
        setEnrolledQuests(enrolledQuests);
        setRecentActivity(recentActivity);
        setPerformance(performance);
        
        setLoading(false);
      } catch (err) {
        console.error('Error fetching user profile:', err);
        setError('Failed to load user profile');
        toast.error('Error loading user profile');
        setLoading(false);
      }
    };
    
    if (userId) {
      fetchUserProfile();
    }
  }, [userId, API_URL, navigate]);
  
  // Handle back button click
  const handleBack = () => {
    navigate('/admin/users');
  };
  
  // Generate user initials for avatar if no image is available
  const getUserInitials = (username) => {
    if (!username) return '';
    return username.charAt(0).toUpperCase();
  };
  
  // Render status badge with appropriate color
  const renderStatus = (status) => {
    if (status === 'Completed') {
      return <span className="status-badge completed">Completed</span>;
    } else if (status === 'In Progress') {
      return <span className="status-badge in-progress">In Progress</span>;
    } else {
      return <span className="status-badge active">Active</span>;
    }
  };
  
  if (loading) {
    return (
      <div className="profile-page loading">
        <div className="loading-spinner"></div>
        <p>Loading user profile...</p>
      </div>
    );
  }
  
  if (error || !user) {
    return (
      <div className="profile-page error">
        <h2>Error Loading Profile</h2>
        <p>{error || 'User not found'}</p>
        <button className="back-btn" onClick={handleBack}>
          <FiArrowLeft /> Back to Users
        </button>
      </div>
    );
  }
  
  return (
    <div className="profile-page">
      {/* User Profile Header */}
      <div className="profile-header">
        <div className="logo">
          <img src={logo} alt="Quest Labs" />
        </div>
        <div className="user-badge">
          <span className="user-initial">{user.username?.charAt(0).toUpperCase() || 'U'}</span>
        </div>
      </div>
      
      <div className="profile-content">
        {/* User Info Section */}
        <div className="profile-section user-info-section">
          <div className="user-avatar">
            {user.profileImage ? (
              <img src={user.profileImage} alt={user.username} />
            ) : (
              <div className="user-initial-avatar">
                {getUserInitials(user.username)}
              </div>
            )}
          </div>
          
          <div className="user-details">
            <h2 className="user-name">{user.username}</h2>
            
            <div className="user-contact-info">
              {user.location && (
                <div className="contact-item">
                  <FiMapPin className="contact-icon" />
                  <span>{user.location}</span>
                </div>
              )}
              
              <div className="contact-item">
                <FiMail className="contact-icon" />
                <span>{user.email}</span>
              </div>
              
              {user.phone && (
                <div className="contact-item">
                  <FiPhone className="contact-icon" />
                  <span>{user.phone}</span>
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Recent Activity Section */}
        <div className="profile-section activity-section">
          <h3 className="section-title">Recent Activity</h3>
          
          <div className="activity-list">
            {recentActivity && recentActivity.length > 0 ? (
              recentActivity.map((activity, index) => (
                <div key={index} className="activity-item">
                  <p>{activity.details}</p>
                </div>
              ))
            ) : (
              <p className="no-data-message">No recent activity</p>
            )}
          </div>
        </div>
        
        {/* Enrolled Quests Section */}
        <div className="profile-section quests-section">
          <h3 className="section-title">Enrolled Quests</h3>
          
          <div className="quests-table-container">
            <table className="quests-table">
              <thead>
                <tr>
                  <th>Quest</th>
                  <th>Status</th>
                  <th>Progress</th>
                </tr>
              </thead>
              <tbody>
                {enrolledQuests && enrolledQuests.length > 0 ? (
                  enrolledQuests.map((quest, index) => (
                    <tr key={index}>
                      <td>{quest.title}</td>
                      <td>{renderStatus(quest.status)}</td>
                      <td>{quest.progress}%</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="3" className="no-data-message">
                      No enrolled quests
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        
        {/* Performance Section */}
        <div className="profile-section performance-section">
          <h3 className="section-title">Performance</h3>
          
          <div className="performance-stats">
            <div className="stat-item">
              <div className="stat-label">Completed Quests</div>
              <div className="stat-value">{performance.completedQuests}</div>
            </div>
            
            <div className="stat-item">
              <div className="stat-label">Ongoing Tasks</div>
              <div className="stat-value">{Math.max(0, performance.ongoingTasks)}</div>
            </div>
            
            <div className="stat-item">
              <div className="stat-label">Average Completion Rate</div>
              <div className="stat-value">{performance.averageCompletionRate}%</div>
            </div>
            
            <div className="stat-item">
              <div className="stat-label">Streak</div>
              <div className="stat-value">{performance.streak}</div>
            </div>
          </div>
          
          {/* Back Button placed below the performance board */}
          <div className="back-button-container">
            <button className="back-btn" onClick={handleBack}>
              <FiArrowLeft /> Back to Users
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminUserProfileManagement; 