import React, { useState, useEffect, useCallback } from 'react';
import './adminQuest.css';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import { clearQuestSessionData } from '../utils/sessionManager';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Default background images for different quest types
const defaultBackgrounds = {
  python: '/images/python-bg.jpg',
  web: '/images/web-dev-bg.jpg',
  security: '/images/security-bg.jpg',
  default: '/images/default-quest-bg.jpg'
};

const getQuestBackground = (quest) => {
  const title = quest.title.toLowerCase();
  if (title.includes('python')) return defaultBackgrounds.python;
  if (title.includes('web')) return defaultBackgrounds.web;
  if (title.includes('security') || title.includes('cyber')) return defaultBackgrounds.security;
  return defaultBackgrounds.default;
};

const AdminQuests = () => {
  const navigate = useNavigate();
  const [quests, setQuests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Function to fetch quests from API - wrapped in useCallback to maintain reference
  const fetchQuests = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Get auth token
      const token = localStorage.getItem('userToken');
      
      if (!token) {
        toast.error('Please log in to view quests');
        navigate('/login', { state: { from: '/admin/quests' } });
        return;
      }

      // Make API request
      const response = await axios.get(`${API_URL}/quizzes`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      // Ensure we have an array of quizzes
      if (response.data && Array.isArray(response.data.quizzes)) {
        // Format quizzes for display
        const formattedQuests = response.data.quizzes.map(quiz => ({
          id: quiz.id,
          title: quiz.title || 'Untitled Quest',
          description: Array.isArray(quiz.description) 
            ? quiz.description[0] 
            : (typeof quiz.description === 'string' ? quiz.description : 'No description available'),
          thumbnailUrl: quiz.thumbnailUrl,
          level: quiz.level || 'Beginner',
          enrolledCount: quiz.enrolledCount || 0,
          duration: quiz.duration || 0,
          createdAt: quiz.createdAt || new Date().toISOString()
        }));
        
        setQuests(formattedQuests);
      } else {
        console.error('Invalid response format:', response.data);
        toast.error('Failed to fetch quests: Invalid response format');
      }
    } catch (err) {
      console.error('Error fetching quests:', err);
      
      if (err.response?.status === 401 || err.response?.status === 403) {
        toast.error('Session expired. Please log in again.');
        localStorage.removeItem('userToken');
        navigate('/login', { state: { from: '/admin/quests' } });
        return;
      }
      
      setError(err.response?.data?.message || 'Failed to fetch quests');
      toast.error(err.response?.data?.message || 'Failed to fetch quests');
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  // Fetch quests from backend on component mount and clear any quest session data
  useEffect(() => {
    // Clear any temporary quest data when the quests page loads
    clearQuestSessionData();
    fetchQuests();
  }, [fetchQuests]);

  const handleCreateQuest = () => {
    // Clear any existing quest creation data from session storage
    clearQuestSessionData();
    
    // Navigate to the first step of the quest creation process
    navigate('/admin/create-quest');
  };

  const handleViewQuest = async (questId) => {
    try {
      const token = localStorage.getItem('userToken');
      
      if (!token) {
        toast.error('Please log in to view quest details');
        navigate('/login', { state: { from: `/admin/quests/${questId}` } });
        return;
      }

      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

      // Fetch quest details and tasks in parallel for better performance
      const [questResponse, tasksResponse] = await Promise.all([
        axios.get(`${API_URL}/quizzes/${questId}`, { headers }),
        axios.get(`${API_URL}/quizzes/${questId}/questions`, { headers })
      ]);

      // For debugging
      console.log('Quest response:', questResponse.data);
      console.log('Tasks response:', tasksResponse.data);

      if (questResponse.data) {
        // Extract the quiz data - handle different API response formats
        const quizData = questResponse.data.quiz || questResponse.data;
        
        if (!quizData) {
          throw new Error('Invalid quiz data format received');
        }
        
        // Store quest details in the correct format
        sessionStorage.setItem('questDetails', JSON.stringify(quizData));
        
        // Store tasks in the correct format if available
        if (tasksResponse.data && tasksResponse.data.questions) {
          sessionStorage.setItem('questTasks', JSON.stringify(tasksResponse.data.questions));
        } else if (Array.isArray(tasksResponse.data)) {
          sessionStorage.setItem('questTasks', JSON.stringify(tasksResponse.data));
        } else {
          sessionStorage.setItem('questTasks', JSON.stringify([]));
        }
        
        // Navigate to the quest view page
        console.log('Navigating to quest view with ID:', questId);
        navigate(`/admin/quest/${questId}`);
      } else {
        throw new Error('Failed to fetch quest details');
      }
      
    } catch (err) {
      console.error('Error handling quest view:', err);
      toast.error(err.response?.data?.message || 'Failed to view quest. Please try again.');
    }
  };

  const handleEditQuest = async (questId) => {
    try {
      // Use the utility function to load quest data for editing
      const { loadQuestDataForEdit } = await import('../utils/sessionManager');
      const success = await loadQuestDataForEdit(questId, navigate, toast);
      
      if (success) {
        // Navigate to create quest page with edit mode
        console.log('Navigating to edit quest with ID:', questId);
        navigate('/admin/create-quest', { state: { editMode: true, questId } });
      }
    } catch (err) {
      console.error('Error handling quest edit:', err);
      toast.error(err.response?.data?.message || 'Failed to edit quest. Please try again.');
    }
  };

  return (
    <div className="admin-quests-container">
      <div className="admin-quests-header">
        <h1 className="manage-quests-title">Manage Quests</h1>
        <button 
          className="create-quest-button"
          onClick={handleCreateQuest}
        >
          Create Quest
        </button>
      </div>

      {loading ? (
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading quests...</p>
        </div>
      ) : error ? (
        <div className="error-container">
          <p>Error: {error}</p>
          <button className="retry-btn" onClick={fetchQuests}>Retry</button>
        </div>
      ) : quests.length === 0 ? (
        <div className="no-quests-message">
          <p>No quests found. Create your first quest to get started!</p>
          <button 
            className="create-first-quest-btn"
            onClick={handleCreateQuest}
          >
            Create Your First Quest
          </button>
        </div>
      ) : (
        <div className="quests-grid">
          {quests.map((quest) => (
            <div 
              key={quest.id} 
              className="quest-card"
              style={{
                backgroundImage: `url(${quest.thumbnailUrl || getQuestBackground(quest)})`
              }}
            >
              <div className="quest-content">
              <h3 className="quest-title">{quest.title}</h3>
                <p className="quest-subtitle">{quest.level}</p>
              </div>
              <div className="quest-actions">
                <button 
                  className="view-btn"
                  onClick={() => {
                    console.log('View button clicked for quest:', quest.id);
                    handleViewQuest(quest.id);
                  }}
                >
                  View
                </button>
                <button 
                  className="edit-btn"
                  onClick={() => {
                    console.log('Edit button clicked for quest:', quest.id);
                    handleEditQuest(quest.id);
                  }}
                >
                  Edit
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminQuests;