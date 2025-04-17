import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import { FaChevronRight, FaImage, FaVideo, FaFile, FaLink, FaPaperclip } from 'react-icons/fa';
import './TaskPreview.css'; // Reuse the same CSS
import '../styles/quest-buttons.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const AdminTaskView = () => {
  const { questId, taskId } = useParams();
  const navigate = useNavigate();
  
  const [questDetails, setQuestDetails] = useState(null);
  const [questTasks, setQuestTasks] = useState([]);
  const [currentTask, setCurrentTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Fetch quest data from API
  const fetchQuestData = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('userToken');
      
      if (!token) {
        throw new Error('Authentication required');
      }
      
      // Fetch quest details
      const questResponse = await axios.get(`${API_URL}/quizzes/${questId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (!questResponse.data) {
        throw new Error('Invalid response from server');
      }
      
      const quest = questResponse.data;
      setQuestDetails(quest);
      
      // Fetch questions/tasks for this quest
      const tasksResponse = await axios.get(`${API_URL}/quizzes/${questId}/questions`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Handle either response format (direct array or {questions: Array})
      const tasks = tasksResponse.data?.questions || tasksResponse.data;
      
      if (!Array.isArray(tasks)) {
        throw new Error('Invalid tasks data received');
      }
      
      // Sort tasks by taskOrder or index
      const sortedTasks = [...tasks].sort((a, b) => 
        (a.taskOrder || 0) - (b.taskOrder || 0)
      );
      
      setQuestTasks(sortedTasks);
      
      // Set current task
      if (taskId) {
        const foundTask = sortedTasks.find(task => task.id === taskId);
        if (foundTask) {
          setCurrentTask(foundTask);
        } else if (sortedTasks.length > 0) {
          setCurrentTask(sortedTasks[0]);
        }
      } else if (sortedTasks.length > 0) {
        setCurrentTask(sortedTasks[0]);
      }
      
    } catch (error) {
      console.error('Error fetching quest data:', error);
      const errorMessage = error.response ? 
        `Server error: ${error.response.data?.message || error.response.statusText}` :
        `Error: ${error.message}`;
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [questId, taskId]);
  
  useEffect(() => {
    // Fetch quest and task data
    fetchQuestData();
  }, [fetchQuestData]);
  
  const handleTaskClick = (task) => {
    setCurrentTask(task);
    
    // Update URL
    navigate(`/admin/quest/${questId}/task/${task.id}`);
  };
  
  const handleBack = () => {
    // Navigate back to the tasks management page
    navigate(`/admin/tasks`);
  };
  
  const handleEdit = async () => {
    if (!currentTask || !questDetails) {
      toast.error('Task data not available for editing');
      return;
    }
    
    try {
      // Use the utility function to load quest data for editing
      const { loadQuestDataForEdit } = await import('../utils/sessionManager');
      
      // First clear any existing quest data to ensure a clean edit session
      const { clearQuestSessionData } = await import('../utils/sessionManager');
      clearQuestSessionData();
      
      // Load the quest data from API or session storage
      const success = await loadQuestDataForEdit(questId, navigate, toast);
      
      if (success) {
        // Mark the current task as the one being edited
        sessionStorage.setItem('editingTaskId', currentTask.id);
        
        // Navigate to task details page in edit mode
        navigate('/admin/create-quest/task-details', { 
          state: { editMode: true, questId, taskId: currentTask.id }
        });
      }
    } catch (err) {
      console.error('Error preparing task for edit:', err);
      toast.error('Failed to prepare task for editing');
    }
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
          <button className="back-button" onClick={handleBack}>Back to Tasks</button>
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
          <button className="back-button" onClick={handleBack}>Back to Tasks</button>
        </div>
      </div>
    );
  }
  
  // Get task index/number for display
  const taskIndex = questTasks.findIndex(task => task.id === currentTask.id);
  const taskNumber = (currentTask.taskOrder || taskIndex + 1);
  
  return (
    <div className="task-preview-container">
      <div className="task-preview-header">
        <h1>Task {taskNumber}: {currentTask.questionText || currentTask.title}</h1>
      </div>
      
      <div className="task-expanded">
        {/* Task title already in header */}
        
        {/* Quest background section */}
        <div className="quest-background">
          <h3>Quest Background:</h3>
          <p>
            {questDetails?.description && Array.isArray(questDetails.description) 
              ? questDetails.description.join('\n\n') 
              : questDetails?.description || 'No quest description available.'}
          </p>
        </div>
        
        {/* Tools Required section */}
        <div className="tools-required">
          <h3>Tools Required:</h3>
          <ul>
            {questDetails?.toolsRequired && Array.isArray(questDetails.toolsRequired) && questDetails.toolsRequired.length > 0
              ? questDetails.toolsRequired.map((tool, index) => (
                <li key={index}>{tool}</li>
              ))
              : typeof questDetails?.toolsRequired === 'string' && questDetails.toolsRequired
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
            {currentTask.objective ? 
              (Array.isArray(currentTask.objective) ? currentTask.objective.join('\n\n') : currentTask.objective) : 
              (currentTask.narrative ? 
                (Array.isArray(currentTask.narrative) ? currentTask.narrative.join('\n\n') : currentTask.narrative) : 
                'No objective specified for this task.')}
          </p>
        </div>
        
        {/* Task Description section */}
        <div className="task-description">
          <h3>Task Description:</h3>
          <p>
            {currentTask.description ? 
              (Array.isArray(currentTask.description) ? currentTask.description.join('\n\n') : currentTask.description) : 
              'No description provided for this task.'}
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
          .map((task, index) => {
            const taskNum = task.taskOrder || questTasks.findIndex(t => t.id === task.id) + 1;
            return (
              <div 
                key={task.id} 
                className="task-collapsed"
                onClick={() => handleTaskClick(task)}
              >
                <div className="task-collapsed-content">
                  <h3>Task {taskNum}: {task.questionText || task.title}</h3>
                  <FaChevronRight className="expand-icon" />
                </div>
              </div>
            );
          })
        }
      </div>
      
      {/* Actions */}
      <div className="form-actions">
        <button 
          type="button" 
          className="back-button" 
          onClick={handleBack}
        >
          Back
        </button>
        <button 
          type="button" 
          className="next-button"  // Use the same styling class
          onClick={handleEdit}
        >
          Edit
        </button>
      </div>
    </div>
  );
};

export default AdminTaskView; 