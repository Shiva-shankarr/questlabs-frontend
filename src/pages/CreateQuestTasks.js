import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';
import './CreateQuestTasks.css';
import '../styles/quest-buttons.css';
import { saveQuestTasks } from '../utils/sessionManager';

const CreateQuestTasks = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isEditMode = location.state?.editMode || false;
  
  const [questData, setQuestData] = useState(null);
  const [numTasks, setNumTasks] = useState('');
  const [generatedTasks, setGeneratedTasks] = useState([]);
  const [existingTasksLoaded, setExistingTasksLoaded] = useState(false);
  
  useEffect(() => {
    // Load quest data from session storage
    const storedQuestData = sessionStorage.getItem('questDetails');
    const storedQuestTasks = sessionStorage.getItem('questTasks');
    
    if (storedQuestData) {
      try {
        const parsedQuestData = JSON.parse(storedQuestData);
        setQuestData(parsedQuestData);
        
        // If we have stored tasks, load them
        if (storedQuestTasks && !existingTasksLoaded) {
          try {
            const parsedTasks = JSON.parse(storedQuestTasks);
            
            if (Array.isArray(parsedTasks) && parsedTasks.length > 0) {
              console.log(`Loading ${parsedTasks.length} existing tasks for editing`);
              
              // Format existing tasks to match our expected structure
              const formattedTasks = parsedTasks.map((task, index) => ({
                id: task.id || task._id || Date.now() + index,
                title: task.title || task.question || task.questionText || '',
                description: task.description || '',
                timeLimit: task.timeLimit || '10',
                points: task.points || '10',
                type: task.type || 'TEXT',
                taskNumber: task.taskNumber || task.taskOrder || task.position || index + 1,
                narrative: task.narrative || task.objective || '',
                media: task.media || (task.mediaUrl ? [{ 
                  id: Date.now() + '-media-' + index,
                  type: 'link',
                  url: task.mediaUrl,
                  description: 'Task media'
                }] : [])
              }));
              
              setGeneratedTasks(formattedTasks);
              setNumTasks(formattedTasks.length.toString());
              setExistingTasksLoaded(true);
              toast.info(`${formattedTasks.length} tasks loaded for editing`);
            }
          } catch (err) {
            console.error('Error parsing stored tasks:', err);
            toast.error('Failed to load existing tasks');
          }
        }
      } catch (err) {
        console.error('Error parsing stored quest data:', err);
        toast.error('Failed to load quest data');
      }
    } else {
      toast.error('No quest data found. Please start the creation process again.');
      navigate('/admin/create-quest');
    }
  }, [navigate, existingTasksLoaded]);
  
  // Handle number of tasks change
  const handleNumTasksChange = (e) => {
    const value = e.target.value;
    setNumTasks(value);
    
    // If we already have tasks in edit mode, confirm before regenerating
    if (existingTasksLoaded && generatedTasks.length > 0) {
      const shouldReset = window.confirm(
        "Changing the number of tasks will reset all existing task data. Are you sure you want to continue?"
      );
      
      if (!shouldReset) {
        setNumTasks(generatedTasks.length.toString());
        return;
      }
      
      // If they confirm, reset the existing tasks flag
      setExistingTasksLoaded(false);
    }
    
    // Generate empty tasks based on the number entered
    if (value && !isNaN(value) && parseInt(value) > 0) {
      const tasksCount = parseInt(value);
      const emptyTasks = Array.from({ length: tasksCount }, (_, index) => ({
        id: Date.now() + index,
        title: '',
        description: '',
        timeLimit: '',
        points: '10',
        type: 'TEXT',
        taskNumber: index + 1
      }));
      setGeneratedTasks(emptyTasks);
    } else {
      setGeneratedTasks([]);
    }
  };
  
  const handleBack = () => {
    navigate('/admin/create-quest');
  };
  
  const handleNext = () => {
    if (generatedTasks.length === 0) {
      toast.error('Please specify the number of tasks');
      return;
    }
    
    // Save tasks using the utility function
    saveQuestTasks(generatedTasks);
    toast.info('Tasks saved temporarily. Changes will be uploaded in the final step.');
    
    // Navigate to task details page
    navigate('/admin/create-quest/task-details', { state: { editMode: isEditMode } });
  };
  
  // Calculate progress (33% for this step)
  const progress = 33;
  
  if (!questData) {
    return <div className="loading">Loading quest data...</div>;
  }
  
  return (
    <div className="create-quest-tasks-container">
      <h1 className="create-tasks-title">
        {isEditMode ? 'Edit Your Quest' : 'Create Your Quest'}
      </h1>
      
      {/* Progress bar */}
      <div className="progress-container">
        <div className="progress-bar">
          <div 
            className="progress-fill" 
            style={{ width: `${progress}%` }}
          ></div>
        </div>
      </div>
      
      <div className="task-number-group">
        <label htmlFor="numTasks">Number of Tasks</label>
        <input
          type="number"
          id="numTasks"
          className="form-input"
          value={numTasks}
          onChange={handleNumTasksChange}
          min="1"
          placeholder="Enter number of tasks"
        />
      </div>
      
      {/* Generated Task Placeholders */}
      {generatedTasks.length > 0 && (
        <div className="task-list">
          {generatedTasks.map((task, index) => (
            <div key={task.id} className="task-item">
              <div className="task-placeholder">
                {task.title ? 
                  `Task ${index + 1}: ${task.title}` : 
                  `Set Task ${index + 1}`
                }
              </div>
            </div>
          ))}
        </div>
      )}
      
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
          className="next-button"
          onClick={handleNext}
          disabled={generatedTasks.length === 0}
        >
          Next
        </button>
      </div>
    </div>
  );
};

export default CreateQuestTasks; 