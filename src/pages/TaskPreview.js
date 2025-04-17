import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import { FaChevronRight, FaImage, FaVideo,  FaFile, FaLink, FaPaperclip } from 'react-icons/fa';
import './TaskPreview.css';
import '../styles/quest-buttons.css';
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const TaskPreview = () => {
  const { questId, taskId } = useParams();
  const navigate = useNavigate();
  
  const [questDetails, setQuestDetails] = useState(null);
  const [questTasks, setQuestTasks] = useState([]);
  const [currentTask, setCurrentTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [uploading, setUploading] = useState(false);
  
  // Load data from sessionStorage (creation flow)
  const loadFromSessionStorage = useCallback(() => {
    try {
      setLoading(true);
      const questDetails = JSON.parse(sessionStorage.getItem('questDetails'));
      const questTasks = JSON.parse(sessionStorage.getItem('questTasks'));
      
      if (!questDetails || !questTasks || questTasks.length === 0) {
        throw new Error('No quest data found in session storage');
      }
      
      setQuestDetails(questDetails);
      setQuestTasks(questTasks);
      
      // Set current task
      if (taskId) {
        const foundTask = questTasks.find(task => task.id === taskId);
        if (foundTask) {
          setCurrentTask(foundTask);
        } else {
          setCurrentTask(questTasks[0]);
        }
      } else if (questTasks.length > 0) {
        setCurrentTask(questTasks[0]);
      }
      
    } catch (error) {
      console.error('Error loading quest data from session storage:', error);
      setError('Failed to load quest data. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [taskId]);
  
  // Fetch quest data from API (view existing quest)
  const fetchQuestData = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('userToken');
      
      if (!token) {
        throw new Error('Authentication required');
      }
      
      const response = await axios.get(`${API_URL}/quizzes/${questId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (!response.data || !response.data.data) {
        throw new Error('Invalid response from server');
      }
      
      const { quest, tasks } = response.data.data;
      
      setQuestDetails(quest);
      setQuestTasks(tasks);
      
      // Set current task
      if (taskId) {
        const foundTask = tasks.find(task => task.id === taskId);
        if (foundTask) {
          setCurrentTask(foundTask);
        } else {
          setCurrentTask(tasks[0]);
        }
      } else if (tasks.length > 0) {
        setCurrentTask(tasks[0]);
      }
      
    } catch (error) {
      console.error('Error fetching quest data:', error);
      const errorMessage = error.response ? 
        `Server error: ${error.response.data.message || error.response.statusText}` :
        `Error: ${error.message}`;
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [questId, taskId]);
  
  useEffect(() => {
    // We're in one of two modes:
    // 1. View mode (questId in URL) - fetch from API
    // 2. Creation flow - get from sessionStorage
    
    if (questId) {
      console.log('Preview mode: Viewing existing quest with ID:', questId);
      fetchQuestData();
    } else {
      console.log('Preview mode: Creation flow, loading from sessionStorage');
      loadFromSessionStorage();
    }
  }, [questId, fetchQuestData, loadFromSessionStorage]);
  
  const handleTaskClick = (task) => {
    setCurrentTask(task);
    
    // Update URL if in view mode
    if (questId) {
      navigate(`/admin/quest/${questId}/task/${task.id}`);
    }
  };
  
  const handleBack = () => {
    navigate(`/admin/create-quest/preview${questId ? `/${questId}` : ''}`);
  };
  
  const handleUpload = async () => {
    if (!questDetails || !questTasks.length) {
      toast.error('Missing quest data or tasks');
      return;
    }
    
    setUploading(true);
    
    try {
      // Get user token and validation
      const token = localStorage.getItem('token');
      
      if (!token) {
        toast.error('Authentication required. Please log in and try again.');
        setUploading(false);
        navigate('/login', { state: { from: `/admin/quest/${questId}/task/${taskId}` } });
        return;
      }
      
      // Format quiz data according to the database schema
      const quizData = {
        title: questDetails.title.trim(),
        description: typeof questDetails.description === 'string'
          ? questDetails.description.trim().split('\n').filter(line => line.trim() !== '')
          : (Array.isArray(questDetails.description) ? questDetails.description : []),
        level: questDetails.difficulty?.trim() || questDetails.level?.trim() || 'Beginner',
        thumbnailUrl: questDetails.media && questDetails.media.length > 0 ? questDetails.media[0].url : 
                     (questDetails.thumbnailUrl || ''),
        tags: typeof questDetails.domain === 'string' 
          ? questDetails.domain.split(',').map(tag => tag.trim()).filter(tag => tag !== '')
          : [],
        toolsRequired: questDetails.toolsRequired
          ? (typeof questDetails.toolsRequired === 'string'
              ? questDetails.toolsRequired.split(',').map(tool => tool.trim()).filter(tool => tool !== '')
              : questDetails.toolsRequired)
          : [],
        resources: questDetails.resources
          ? (typeof questDetails.resources === 'string'
              ? questDetails.resources.split(',').map(resource => resource.trim()).filter(resource => resource !== '')
              : questDetails.resources)
          : [],
        theme: questDetails.theme || '',
        duration: calculateTotalDuration(questTasks)
      };
      
      // First test authentication before proceeding
      const config = {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      };
      
      let quizId = questId;
      
      // If no existing quizId, create a new quiz
      if (!quizId) {
        const quizResponse = await axios.post(`${API_URL}/quizzes`, quizData, config);
        quizId = quizResponse.data.quiz.id;
      } else {
        // Update existing quiz
        await axios.put(`${API_URL}/quizzes/${quizId}`, quizData, config);
      }
      
      // Now upload each task/question
      const taskUploadPromises = questTasks.map(async (task) => {
        const questionData = {
          questionText: task.question || task.title,
          description: Array.isArray(task.description) 
            ? task.description 
            : [task.description].filter(Boolean),
          objective: Array.isArray(task.objective) 
            ? task.objective 
            : [task.objective].filter(Boolean),
          mediaUrl: task.media && task.media.length > 0 ? task.media[0].url : '',
          type: task.type || 'TEXT',
          timeLimit: task.timeLimit || 10,
          points: task.points || 10,
          taskOrder: task.taskNumber || 0
        };
        
        if (task.id && task.id.toString().length > 10) {
          // If task already has an ID, update it
          return axios.put(`${API_URL}/quizzes/${quizId}/questions/${task.id}`, questionData, config);
        } else {
          // Otherwise create a new task
          return axios.post(`${API_URL}/quizzes/${quizId}/questions`, questionData, config);
        }
      });
      
      await Promise.all(taskUploadPromises);
      
      toast.success('Quest uploaded successfully!');
      
      // Clear session storage after successful upload
      sessionStorage.removeItem('questDetails');
      sessionStorage.removeItem('questTasks');
      
      // Navigate back to the quest preview page
      navigate(`/admin/create-quest/preview/${quizId}`);
    } catch (err) {
      console.error('Error uploading quest:', err);
      toast.error(err.response?.data?.message || 'Failed to upload quest');
    } finally {
      setUploading(false);
    }
  };
  
  // Helper function to calculate total duration of all tasks
  const calculateTotalDuration = (tasks) => {
    return tasks.reduce((total, task) => {
      return total + (parseInt(task.timeLimit) || 10);
    }, 0);
  };
  
  const getMediaIcon = (type) => {
    switch (type.toLowerCase()) {
      case 'image':
        return <FaImage />;
      case 'video':
        return <FaVideo />;
      case 'file':
        return <FaFile />;
      case 'link':
        return <FaLink />;
      default:
        return <FaPaperclip />;
    }
  };
  
  if (loading) {
    return (
      <div className="task-preview-container">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading task details...</p>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="task-preview-container">
        <div className="error-message">
          <h3>Error Loading Task</h3>
          <p>{error}</p>
          <button className="back-button" onClick={handleBack}>Back to Preview</button>
        </div>
      </div>
    );
  }
  
  if (!currentTask) {
    return (
      <div className="task-preview-container">
        <div className="error-container">
          <h3>Task Not Found</h3>
          <p>The requested task could not be found.</p>
          <button className="back-button" onClick={handleBack}>Back to Preview</button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="task-preview-container">
      <div className="task-preview-header">
        <h1>Task Preview</h1>
      </div>
      
      <div className="task-expanded">
        <h2 className="task-title">Task {currentTask.taskNumber}: {currentTask.question || currentTask.title}</h2>
        
        {/* Quest background section */}
        <div className="quest-background">
          <h3>Quest Background:</h3>
          <p>
            {questDetails?.description && Array.isArray(questDetails.description) 
              ? questDetails.description.join('\n\n') 
              : questDetails?.description}
          </p>
        </div>
        
        {/* Tools Required section */}
        <div className="tools-required">
          <h3>Tools Required:</h3>
          <ul>
            {questDetails?.toolsRequired && Array.isArray(questDetails.toolsRequired) 
              ? questDetails.toolsRequired.map((tool, index) => (
                <li key={index}>{tool}</li>
              ))
              : typeof questDetails?.toolsRequired === 'string' 
                ? questDetails.toolsRequired.split(',').map((tool, index) => (
                  <li key={index}>{tool.trim()}</li>
                ))
                : <li>No tools specified</li>
            }
          </ul>
        </div>
        
        {/* Objective section */}
        <div className="objective">
          <h3>Objective:</h3>
          <p>
            {currentTask.objective || 'No objective specified for this task.'}
          </p>
        </div>
        
        {/* Task Description section */}
        <div className="task-description">
          <h3>Task Description:</h3>
          <p>
            {currentTask.description || 'No description provided for this task.'}
          </p>
        </div>
        
        {/* Media section - displaying any attached media */}
        {currentTask.media && currentTask.media.length > 0 && (
          <div className="task-media">
            <h3>Attached Media:</h3>
            <div className="media-grid">
              {currentTask.media.map((item, index) => (
                <div key={index} className="media-item">
                  <div className="media-item-icon">
                    {getMediaIcon(item.type)}
                  </div>
                  <div className="media-item-details">
                    <div className="media-item-description">{item.description}</div>
                    <div className="media-item-type">{item.type}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      
      {/* Other tasks in collapsed view */}
      <div className="other-tasks">
        {questTasks
          .filter(task => task.id !== currentTask.id)
          .map((task, index) => (
            <div 
              key={task.id} 
              className="task-collapsed"
              onClick={() => handleTaskClick(task)}
            >
              <div className="task-collapsed-content">
                <h3>Task {task.taskNumber}: {task.question || task.title}</h3>
                <FaChevronRight className="expand-icon" />
              </div>
            </div>
          ))
        }
      </div>
      
      {/* Actions */}
      <div className="form-actions">
        <button 
          type="button" 
          className="back-button" 
          onClick={handleBack}
          disabled={uploading}
        >
          Back
        </button>
        <button 
          type="button" 
          className="upload-button"
          onClick={handleUpload}
          disabled={uploading}
        >
          {uploading ? 'Uploading...' : 'Upload'}
        </button>
      </div>
    </div>
  );
};

export default TaskPreview; 