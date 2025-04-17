import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import { FaChevronRight } from 'react-icons/fa';
import './adminQuestView.css';
import '../styles/quest-buttons.css';
import { clearQuestSessionData } from '../utils/sessionManager';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const AdminQuestView = () => {
  const { questId } = useParams();
  const navigate = useNavigate();
  const [questData, setQuestData] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchQuestData = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('userToken');
      
      if (!token) {
        toast.error('Please log in to view quest details');
        navigate('/login', { state: { from: `/admin/quest/${questId}` } });
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

      console.log('Quest API response:', questResponse.data);
      console.log('Tasks API response:', tasksResponse.data);

      // Process quest data - handle different API response formats
      if (questResponse.data) {
        const quizData = questResponse.data.quiz || questResponse.data;
        setQuestData(quizData);
      } else {
        throw new Error('Invalid quest data format received');
      }

      // Process tasks data - handle different API response formats
      if (tasksResponse.data && tasksResponse.data.questions) {
        // Sort tasks by task order
        const sortedTasks = [...tasksResponse.data.questions].sort((a, b) => 
          (a.taskOrder || 0) - (b.taskOrder || 0)
        );
        setTasks(sortedTasks);
      } else if (Array.isArray(tasksResponse.data)) {
        const sortedTasks = [...tasksResponse.data].sort((a, b) => 
          (a.taskOrder || 0) - (b.taskOrder || 0)
        );
        setTasks(sortedTasks);
      } else {
        setTasks([]);
      }
    } catch (err) {
      console.error('Error fetching quest data:', err);
      setError(err.response?.data?.message || 'Failed to fetch quest data');
      toast.error('Error loading quest data');
    } finally {
      setLoading(false);
    }
  }, [questId, navigate]);

  useEffect(() => {
    // Clear any existing quest session data when viewing a quest
    clearQuestSessionData();
    fetchQuestData();
  }, [fetchQuestData]);

  const handleEdit = async () => {
    try {
      // Use the utility function to load quest data for editing
      const { loadQuestDataForEdit } = await import('../utils/sessionManager');
      
      // First clear any existing quest data to ensure a clean edit session
      const { clearQuestSessionData } = await import('../utils/sessionManager');
      clearQuestSessionData();
      
      const success = await loadQuestDataForEdit(questId, navigate, toast);
      
      if (success) {
        // Navigate to the create quest page with edit mode
        navigate('/admin/create-quest', { state: { editMode: true, questId } });
      }
    } catch (err) {
      console.error('Error preparing for edit:', err);
      toast.error('Failed to prepare quest for editing');
    }
  };

  const handleBack = () => {
    navigate('/admin/quests');
  };

  const handleTaskClick = (taskId) => {
    // Navigate to task detail view
    navigate(`/admin/quest/${questId}/task/${taskId}`);
  };

  if (loading) {
    return (
      <div className="admin-quest-view-container">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading quest details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="admin-quest-view-container">
        <div className="error-container">
          <h3>Error Loading Quest</h3>
          <p>{error}</p>
          <button className="back-button" onClick={handleBack}>Back to Quests</button>
        </div>
      </div>
    );
  }

  if (!questData) {
    return (
      <div className="admin-quest-view-container">
        <div className="error-container">
          <h3>Quest Not Found</h3>
          <p>The requested quest could not be found.</p>
          <button className="back-button" onClick={handleBack}>Back to Quests</button>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-quest-view-container">
      <div className="admin-quest-view-header">
        <h1 className="featured-quest-title">Featured Quest: {questData.title}</h1>
      </div>

      <div className="quest-view-content">
        <div className="quest-background-section">
          <h2>Quest Background:</h2>
          <p>
            {Array.isArray(questData.description) 
              ? questData.description.join('\n\n')
              : questData.description}
          </p>
        </div>

        <div className="quest-objectives-section">
          <h2>Objectives:</h2>
          <p>
            To complete the quest, you must solve a series of challenges by exploring data from the website. You'll need to gather book details, sort data, and analyze the results using Python, exploratory techniques, and data representation. The goal is to find all the books that have been stolen.
          </p>
        </div>

        <div className="tools-required-section">
          <h2>Tools Required:</h2>
          <ul className="tools-list">
            {Array.isArray(questData.toolsRequired) && questData.toolsRequired.length > 0 
              ? questData.toolsRequired.map((tool, index) => (
                <li key={index}>{tool}</li>
              ))
              : typeof questData.toolsRequired === 'string'
                ? questData.toolsRequired.split(',').map((tool, index) => (
                  <li key={index}>{tool.trim()}</li>
                ))
                : <li>Python (for scripting)</li>
            }
          </ul>
        </div>

        <div className="tasks-grid">
          {tasks.map((task, index) => (
            <div 
              key={task.id} 
              className="task-card"
              onClick={() => handleTaskClick(task.id)}
            >
              <div className="task-card-content">
                <h3>Task {index + 1}: {task.title || task.questionText}</h3>
                <p>{Array.isArray(task.description) && task.description.length > 0 
                  ? task.description[0] 
                  : (typeof task.description === 'string' ? task.description : 'Complete this task to progress in the quest.')}
                </p>
              </div>
              <div className="task-card-chevron">
                <FaChevronRight />
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Action buttons at the bottom */}
      <div className="form-actions">
        <button 
          className="back-button" 
          onClick={handleBack}
        >
          Back
        </button>
        <button 
          className="edit-button" 
          onClick={handleEdit}
        >
          Edit
        </button>
      </div>
    </div>
  );
};

export default AdminQuestView; 