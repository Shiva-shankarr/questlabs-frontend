// src/pages/adminUserManagement.js
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaEdit, FaTrash, FaChevronDown, FaChevronRight } from 'react-icons/fa';
import axios from 'axios';
import { toast } from 'react-toastify';
import './adminUserManagement.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const AdminUserManagement = () => {
  const [users, setUsers] = useState([]);
  const [quests, setQuests] = useState([]);
  const [selectedQuest, setSelectedQuest] = useState('');
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [usersPerPage] = useState(10);
  const [error, setError] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [expandedQuests, setExpandedQuests] = useState({});
  const [questUsers, setQuestUsers] = useState({});
  
  const navigate = useNavigate();

  // Fetch users for a specific quest
  const fetchQuestUsers = useCallback(async (questId) => {
    try {
      if (questUsers[questId]) {
        // If we already have the users for this quest, no need to fetch again
        return;
      }
      
      const token = localStorage.getItem('userToken');
      
      if (!token) {
        toast.error('Authentication required');
        return;
      }
      
      const headers = { Authorization: `Bearer ${token}` };
      
      // Use the new dedicated endpoint for getting users by quest
      const response = await axios.get(`${API_URL}/auth/users/by-quest/${questId}`, { headers });
      
      // The response directly contains user data in the expected format
      // Filter out admin users here too
      const questUsersData = (response.data || [])
        .filter(user => user.role !== 'admin')
        .map(user => ({
          id: user.id,
          name: user.username,
          email: user.email,
          questId: questId,
          questTitle: quests.find(q => q.id === questId)?.title || 'Unknown Quest'
        }));
      
      // Update quest users state
      setQuestUsers(prev => ({
        ...prev,
        [questId]: questUsersData
      }));
    } catch (err) {
      console.error(`Error fetching users for quest ${questId}:`, err);
      // Don't show toast here to avoid multiple errors when prefetching
    }
  }, [questUsers, quests]);

  // Fetch users with pagination
  const fetchUsers = useCallback(async (page = 1) => {
    try {
      setLoading(true);
      const token = localStorage.getItem('userToken');
      
      if (!token) {
        toast.error('Please log in to access admin dashboard');
        return;
      }
      
      const response = await axios.get(`${API_URL}/admin/users`, {
        params: {
          page,
          limit: usersPerPage
        },
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const { users } = response.data;
      
      if (Array.isArray(users)) {
        setUsers(users);
        setFilteredUsers(users);
      } else {
        console.error('Invalid user data format:', response.data);
        toast.error('Error: Invalid data format received from server');
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error(error.response?.data?.message || 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  }, [usersPerPage]);

  // Initial data load
  useEffect(() => {
    fetchUsers(1);
  }, [fetchUsers]);

  // Fetch all quests on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('userToken');
        
        if (!token) {
          setError('Authentication required');
          toast.error('Please log in to access admin features');
          return;
        }
        
        const headers = { Authorization: `Bearer ${token}` };
        
        // Fetch all quests
        const questsResponse = await axios.get(`${API_URL}/quizzes`, { headers });
        
        // Handle quests data
        const questsData = questsResponse.data?.quizzes || questsResponse.data;
        if (Array.isArray(questsData)) {
          setQuests(questsData);
          
          // Prefetch users for each quest to populate the expandable sections
          questsData.forEach(quest => {
            fetchQuestUsers(quest.id);
          });
        } else {
          console.error('Invalid quests data format:', questsResponse.data);
          setError('Invalid quest data received from the server');
        }
      } catch (err) {
        console.error('Error fetching data:', err);
        const errorMessage = err.response?.data?.message || err.message || 'Failed to fetch data';
        setError(errorMessage);
        toast.error(errorMessage);
      }
    };
    
    fetchData();
  }, [fetchQuestUsers]);

  // Handle quest selection change
  const handleQuestChange = (e) => {
    const questId = e.target.value;
    setSelectedQuest(questId);
    
    if (questId) {
      // Filter users by the selected quest
      if (questUsers[questId]) {
        const questUserIds = questUsers[questId].map(user => user.id);
        setFilteredUsers(users.filter(user => questUserIds.includes(user.id)));
      } else {
        // If we don't have users for this quest yet, fetch them
        fetchQuestUsers(questId).then(() => {
          if (questUsers[questId]) {
            const questUserIds = questUsers[questId].map(user => user.id);
            setFilteredUsers(users.filter(user => questUserIds.includes(user.id)));
          }
        });
      }
    } else {
      // If no quest is selected, show all users
      setFilteredUsers(users);
    }
  };

  // Toggle quest expansion
  const toggleQuestExpansion = (questId) => {
    setExpandedQuests(prev => {
      const newState = { ...prev };
      newState[questId] = !prev[questId];
      
      // If we're expanding and don't have users for this quest yet, fetch them
      if (newState[questId] && !questUsers[questId]) {
        fetchQuestUsers(questId);
      }
      
      return newState;
    });
  };

  // Handle delete user confirmation
  const handleDeleteClick = (user) => {
    setSelectedUser(user);
    setShowDeleteModal(true);
  };

  // Confirm delete
  const confirmDelete = async () => {
    try {
      const token = localStorage.getItem('userToken');
      
      if (!token) {
        toast.error('Authentication required');
        setShowDeleteModal(false);
        setSelectedUser(null);
        return;
      }
      
      const headers = { Authorization: `Bearer ${token}` };
      
      // Delete user from backend
      await axios.delete(`${API_URL}/auth/users/${selectedUser.id}`, { headers });
      
      // Update state by removing the deleted user
    setUsers(users.filter(user => user.id !== selectedUser.id));
      setFilteredUsers(filteredUsers.filter(user => user.id !== selectedUser.id));
      
      // Also remove the user from quest users
      const updatedQuestUsers = { ...questUsers };
      Object.keys(updatedQuestUsers).forEach(questId => {
        updatedQuestUsers[questId] = updatedQuestUsers[questId].filter(
          user => user.id !== selectedUser.id
        );
      });
      setQuestUsers(updatedQuestUsers);
      
      toast.success(`User ${selectedUser.username || selectedUser.email} deleted successfully`);
    } catch (err) {
      console.error('Error deleting user:', err);
      const errorMessage = err.response?.data?.message || err.message || 'Failed to delete user';
      toast.error(errorMessage);
    } finally {
    setShowDeleteModal(false);
    setSelectedUser(null);
    }
  };

  // Cancel delete
  const cancelDelete = () => {
    setShowDeleteModal(false);
    setSelectedUser(null);
  };

  // Navigate to user profile page
  const navigateToUserProfile = (userId) => {
    navigate(`/admin/users/profile/${userId}`);
  };

  return (
    <div className="admin-content-section">
      <div className="section-header">
        <h1 className="section-title">Manage Users</h1>
      </div>
      
      <div className="user-table-section">
        <div className="registered-users-header">
        <h2 className="section-title">Registered Users</h2>
          <div className="sort-by-quest">
            <span>Sort by Quest</span>
            <select 
              id="quest-select"
              value={selectedQuest}
              onChange={handleQuestChange}
              className="quest-select-dropdown"
              disabled={loading || quests.length === 0}
            >
              <option value="">All</option>
              {quests.map(quest => (
                <option key={quest.id} value={quest.id}>
                  {quest.title}
                </option>
              ))}
            </select>
          </div>
        </div>
        
        {loading ? (
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>Loading...</p>
          </div>
        ) : error ? (
          <div className="error-message">
            <p>{error}</p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="no-users-message">
            <p>No users found{selectedQuest ? ' for the selected quest' : ''}.</p>
          </div>
        ) : (
        <div className="table-responsive">
          <table className="users-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Email</th>
                  <th>Quest</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
                {filteredUsers.map((user, index) => (
                <tr key={user.id}>
                    <td>{index + 1}</td>
                    <td>
                      <span 
                        className="user-name-link"
                        onClick={() => navigateToUserProfile(user.id)}
                      >
                        {user.username || 'N/A'}
                      </span>
                    </td>
                  <td>{user.email}</td>
                    <td>{selectedQuest ? quests.find(q => q.id === selectedQuest)?.title || 'N/A' : 'All'}</td>
                  <td className="actions-cell">
                    <button 
                      className="action-btn edit-btn"
                        disabled
                    >
                      <FaEdit />
                    </button>
                    <button 
                      className="action-btn delete-btn"
                      onClick={() => handleDeleteClick(user)}
                    >
                      <FaTrash />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        )}
      </div>
      
      {/* Users by Quest (Collapsible Sections) */}
      <div className="users-by-quest-section">
        <h2 className="section-title">Users Registered</h2>
        
        {loading ? (
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>Loading...</p>
          </div>
        ) : quests.length === 0 ? (
          <div className="no-quests-message">
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
                            <th>Email</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {questUsers[quest.id].map((user, index) => (
                            <tr key={user.id}>
                              <td>{index + 1}</td>
                              <td>
                                <span 
                                  className="user-name-link"
                                  onClick={() => navigateToUserProfile(user.id)}
                                >
                                  {user.name || 'N/A'}
                                </span>
                              </td>
                              <td>{user.email}</td>
                              <td className="actions-cell">
                                <button 
                                  className="action-btn edit-btn"
                                  disabled
                                >
                                  <FaEdit />
                                </button>
                                <button 
                                  className="action-btn delete-btn"
                                  onClick={() => handleDeleteClick(user)}
                                >
                                  <FaTrash />
                                </button>
                              </td>
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

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="modal-overlay">
          <div className="delete-modal">
            <h3>Confirm Delete</h3>
            <p>Are you sure you want to delete user: <strong>{selectedUser?.username || selectedUser?.email || 'Unknown User'}</strong>?</p>
            <div className="modal-buttons">
              <button className="cancel-btn" onClick={cancelDelete}>Cancel</button>
              <button className="confirm-btn" onClick={confirmDelete}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminUserManagement;