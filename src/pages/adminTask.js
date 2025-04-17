import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import './adminTask.css';
import { FaChevronRight } from 'react-icons/fa';

const AdminTasks = () => {
  const navigate = useNavigate();
  const [quests, setQuests] = useState([]);
  const [selectedQuest, setSelectedQuest] = useState('');
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

  // Fetch all quests on component mount
  useEffect(() => {
    const fetchQuests = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('userToken');
        
        if (!token) {
          setError('Authentication required');
          toast.error('Please log in to access admin features');
          navigate('/login', { state: { from: '/admin/tasks' } });
          return;
        }
        
        const response = await axios.get(`${API_URL}/quizzes`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        // Handle the updated API response format that returns {quizzes: Array} instead of Array directly
        const quizzesData = response.data?.quizzes || response.data;
        
        if (quizzesData && Array.isArray(quizzesData)) {
          setQuests(quizzesData);
          
          // Check for a selected quest ID in session storage
          const savedQuestId = sessionStorage.getItem('selectedQuestId');
          
          if (savedQuestId && quizzesData.some(quest => quest.id === savedQuestId)) {
            // If we have a saved quest ID that exists in the fetched quests, use it
            setSelectedQuest(savedQuestId);
            // Clear it from session storage to prevent confusion on next visit
            sessionStorage.removeItem('selectedQuestId');
          }
        } else {
          console.error('Invalid quests data format:', response.data);
          setError('Invalid data received from the server');
        }
      } catch (err) {
        console.error('Error fetching quests:', err);
        const errorMessage = err.response?.data?.message || err.message || 'Failed to fetch quests';
        setError(errorMessage);
        toast.error(errorMessage);
        
        if (err.response?.status === 401 || err.response?.status === 403) {
          localStorage.removeItem('userToken');
          navigate('/login', { state: { from: '/admin/tasks' } });
        }
      } finally {
        setLoading(false);
      }
    };
    
    fetchQuests();
  }, [navigate, API_URL]);

  // Fetch tasks when selected quest changes
  useEffect(() => {
    const fetchTasks = async () => {
      if (!selectedQuest) return;
      
      try {
        setLoading(true);
        const token = localStorage.getItem('userToken');
        
        if (!token) {
          setError('Authentication required');
          return;
        }
        
        const response = await axios.get(`${API_URL}/quizzes/${selectedQuest}/questions`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        // Handle either format: {questions: Array} or the Array directly
        const questionsData = response.data?.questions || response.data;
        
        if (questionsData && Array.isArray(questionsData)) {
          // Sort tasks by taskOrder
          const sortedTasks = [...questionsData].sort((a, b) => 
            (a.taskOrder || 0) - (b.taskOrder || 0)
          );
          setTasks(sortedTasks);
        } else {
          console.error('Invalid tasks data format:', response.data);
          setTasks([]);
          setError('No tasks found for this quest');
        }
      } catch (err) {
        console.error('Error fetching tasks:', err);
        setTasks([]);
        const errorMessage = err.response?.data?.message || err.message || 'Failed to fetch tasks';
        setError(errorMessage);
        toast.error(errorMessage);
      } finally {
        setLoading(false);
      }
    };
    
    fetchTasks();
  }, [selectedQuest, API_URL]);

  const handleQuestChange = (e) => {
    setSelectedQuest(e.target.value);
  };

  const handleCreateTask = () => {
    if (!selectedQuest) {
      toast.error('Please select a quest first');
      return;
    }
    
    // Store the current quest details in sessionStorage for the task creation flow
    const quest = quests.find(q => q.id === selectedQuest);
    
    if (quest) {
      // Store quest details and existing tasks in session storage
      sessionStorage.setItem('questDetails', JSON.stringify(quest));
      sessionStorage.setItem('questTasks', JSON.stringify(tasks));
      
      // Navigate to the task creation page
      navigate('/admin/create-quest/task-details');
    } else {
      toast.error('Invalid quest selected');
    }
  };
  
  const handleViewTask = (taskId) => {
    if (!selectedQuest) {
      toast.error('Please select a quest first');
      return;
    }
    
    // Store the quest ID in session storage for navigation back
    sessionStorage.setItem('selectedQuestId', selectedQuest);
    
    navigate(`/admin/quest/${selectedQuest}/task/${taskId}`);
  };

  return (
    <div className="admin-content-section">
      <div className="section-header">
        <h1 className="section-title">Manage Tasks</h1>
        <button 
          className="admin-primary-btn"
          onClick={handleCreateTask}
          disabled={!selectedQuest || loading}
        >
          Create New Task
        </button>
      </div>

      <div className="quest-selector-container">
        <select 
          id="quest-select"
          value={selectedQuest}
          onChange={handleQuestChange}
          className="quest-select-dropdown"
          disabled={loading || quests.length === 0}
        >
          {quests.length === 0 ? (
            <option value="">No quests available</option>
          ) : (
            <>
              <option value="">Select Quest</option>
          {quests.map(quest => (
            <option key={quest.id} value={quest.id}>
              {quest.title}
            </option>
          ))}
            </>
          )}
        </select>
      </div>

      {loading ? (
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading...</p>
        </div>
      ) : quests.length === 0 ? (
        <div className="no-tasks-message">
          <p>No quests available. Please create a quest first.</p>
          <button 
            className="admin-secondary-btn"
            onClick={() => navigate('/admin/create-quest')}
          >
            Create New Quest
          </button>
        </div>
      ) : error && tasks.length === 0 ? (
        <div className="error-message">
          <p>{error}</p>
        </div>
      ) : tasks.length === 0 && selectedQuest ? (
        <div className="no-tasks-message">
          <p>No tasks found for this quest. Create your first task!</p>
        </div>
      ) : !selectedQuest ? (
        <div className="no-selection-message">
          <p>Please select a quest to view its tasks.</p>
        </div>
      ) : (
        <div className="tasks-list-container">
          {tasks.map((task, index) => (
            <div 
              key={task.id} 
              className="task-card"
              onClick={() => handleViewTask(task.id)}
            >
            <div className="task-content">
                <h3 className="task-title">
                  Task {index + 1}: {task.questionText || task.title}
                </h3>
                <p className="task-description">
                  {Array.isArray(task.description) && task.description.length > 0 
                    ? task.description[0]
                    : (typeof task.description === 'string' ? task.description : 'Complete this task to progress in the quest.')}
                </p>
              </div>
              <div className="task-chevron">
                <FaChevronRight />
            </div>
          </div>
        ))}
      </div>
      )}
    </div>
  );
};

export default AdminTasks;