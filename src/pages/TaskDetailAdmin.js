import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import { FaChevronRight, FaEdit, FaArrowLeft } from 'react-icons/fa';
import './TaskDetailAdmin.css';

const TaskDetailAdmin = () => {
  const { questId, taskId } = useParams();
  const navigate = useNavigate();
  
  const [questDetails, setQuestDetails] = useState(null);
  const [allTasks, setAllTasks] = useState([]);
  const [currentTask, setCurrentTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

  useEffect(() => {
    const fetchQuestData = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('userToken');
        
        if (!token) {
          setError('Authentication required');
          toast.error('Please log in to view task details');
          navigate('/login', { state: { from: `/admin/quest/${questId}/task/${taskId}` } });
          return;
        }
        
        // Fetch quest details and all tasks in parallel
        const [questResponse, tasksResponse] = await Promise.all([
          axios.get(`${API_URL}/quizzes/${questId}`, {
            headers: { Authorization: `Bearer ${token}` }
          }),
          axios.get(`${API_URL}/quizzes/${questId}/questions`, {
            headers: { Authorization: `Bearer ${token}` }
          })
        ]);
        
        if (questResponse.data) {
          setQuestDetails(questResponse.data);
        } else {
          throw new Error('Invalid quest data received');
        }
        
        if (tasksResponse.data && tasksResponse.data.questions) {
          const sortedTasks = [...tasksResponse.data.questions].sort((a, b) => 
            (a.taskOrder || 0) - (b.taskOrder || 0)
          );
          setAllTasks(sortedTasks);
          
          // Find the current task
          const selectedTask = sortedTasks.find(task => task.id === taskId);
          if (selectedTask) {
            setCurrentTask(selectedTask);
          } else {
            throw new Error('Task not found');
          }
        } else {
          throw new Error('Invalid tasks data received');
        }
      } catch (err) {
        console.error('Error fetching task details:', err);
        const errorMessage = err.response?.data?.message || err.message || 'Failed to fetch task details';
        setError(errorMessage);
        toast.error(errorMessage);
        
        if (err.response?.status === 401 || err.response?.status === 403) {
          localStorage.removeItem('userToken');
          navigate('/login', { state: { from: `/admin/quest/${questId}/task/${taskId}` } });
        }
      } finally {
        setLoading(false);
      }
    };
    
    fetchQuestData();
  }, [questId, taskId, navigate, API_URL]);

  const handleTaskClick = (task) => {
    navigate(`/admin/quest/${questId}/task/${task.id}`);
  };
  
  const handleEditTask = () => {
    // Store quest details and all tasks for editing
    sessionStorage.setItem('questDetails', JSON.stringify(questDetails));
    sessionStorage.setItem('questTasks', JSON.stringify(allTasks));
    sessionStorage.setItem('editingTaskId', taskId);
    
    // Navigate to the task editing page
    navigate(`/admin/create-quest/task-details/${taskId}`);
  };
  
  const handleBackToTasks = () => {
    if (questId) {
      // If we have a questId, return to the admin tasks page and preselect this quest
      sessionStorage.setItem('selectedQuestId', questId);
    }
    navigate('/admin/tasks');
  };
  
  // Helper function to format task description
  const formatDescription = (description) => {
    if (Array.isArray(description) && description.length > 0) {
      return description.join('\n\n');
    }
    return description || 'No description available';
  };
  
  // Helper function to get task number
  const getTaskNumber = (task) => {
    if (task.taskOrder) return task.taskOrder;
    
    const index = allTasks.findIndex(t => t.id === task.id);
    return index !== -1 ? index + 1 : '?';
  };

  if (loading) {
    return (
      <div className="task-detail-admin-container">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading task details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="task-detail-admin-container">
        <div className="error-message">
          <h3>Error Loading Task</h3>
          <p>{error}</p>
          <button className="back-button" onClick={handleBackToTasks}>
            Back to Tasks
          </button>
        </div>
      </div>
    );
  }

  if (!currentTask || !questDetails) {
    return (
      <div className="task-detail-admin-container">
        <div className="error-message">
          <h3>Task Not Found</h3>
          <p>The requested task could not be found.</p>
          <button className="back-button" onClick={handleBackToTasks}>
            Back to Tasks
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="task-detail-admin-container">
      {/* Quest Header */}
      <div className="quest-header">
        <h2>Featured Quest: {questDetails.title}</h2>
        <div className="quest-header-actions">
          <button 
            className="edit-button" 
            onClick={handleEditTask}
            aria-label="Edit task"
          >
            <FaEdit /> Edit
          </button>
          <button 
            className="back-button" 
            onClick={handleBackToTasks}
            aria-label="Back to tasks"
          >
            <FaArrowLeft /> Back
          </button>
        </div>
      </div>
      
      {/* Quest Background */}
      <div className="quest-background-section">
        <h3>Quest Background:</h3>
        <p>
          {Array.isArray(questDetails.description) 
            ? questDetails.description.join('\n\n') 
            : questDetails.description || 'No background information available'}
        </p>
      </div>
      
      {/* Objectives */}
      <div className="objectives-section">
        <h3>Objectives:</h3>
        <p>
          {currentTask.objective 
            ? (Array.isArray(currentTask.objective) 
              ? currentTask.objective.join('\n\n') 
              : currentTask.objective)
            : 'No objectives specified for this task.'}
        </p>
      </div>
      
      {/* Task Required */}
      <div className="requirements-section">
        <h3>Tools Required:</h3>
        <ul>
          {questDetails.toolsRequired && Array.isArray(questDetails.toolsRequired) && questDetails.toolsRequired.length > 0
            ? questDetails.toolsRequired.map((tool, index) => (
                <li key={index}>{tool}</li>
              ))
            : <li>No specific tools required</li>
          }
        </ul>
      </div>
      
      {/* Media Gallery */}
      {currentTask.mediaUrl && (
        <div className="media-gallery">
          <div className="media-grid">
            <div className="media-tile">
              <img src={currentTask.mediaUrl} alt="Task media" />
            </div>
          </div>
        </div>
      )}
      
      {/* Task List */}
      <div className="task-list-section">
        {allTasks.map((task) => (
          <div 
            key={task.id} 
            className={`task-item ${task.id === currentTask.id ? 'active' : ''}`}
            onClick={() => task.id !== currentTask.id && handleTaskClick(task)}
          >
            <div className="task-item-content">
              <h4>Task {getTaskNumber(task)}: {task.questionText || task.title}</h4>
              <p>{formatDescription(task.description)}</p>
            </div>
            {task.id !== currentTask.id && <FaChevronRight className="chevron-icon" />}
          </div>
        ))}
      </div>
    </div>
  );
};

export default TaskDetailAdmin; 