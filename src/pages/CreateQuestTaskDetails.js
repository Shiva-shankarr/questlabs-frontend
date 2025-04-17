import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { FaPlus, FaTrash } from 'react-icons/fa';
import './CreateQuestTaskDetails.css';
import '../styles/quest-buttons.css';
import { saveQuestTasks } from '../utils/sessionManager';

const CreateQuestTaskDetails = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { taskId } = useParams(); // Get taskId from URL if it exists
  const isEditMode = location.state?.editMode || false;
  
  const [tasks, setTasks] = useState([]);
  const [expandedTaskIndex, setExpandedTaskIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [mediaType, setMediaType] = useState('');
  const [mediaDescription, setMediaDescription] = useState('');
  const [uploadedFile, setUploadedFile] = useState(null);
  const [mediaDropdownOpen, setMediaDropdownOpen] = useState(false);
  const [validationError, setValidationError] = useState('');

  // Fetch quest details and tasks from session storage on component mount
  useEffect(() => {
    const storedDetails = sessionStorage.getItem('questDetails');
    const storedTasks = sessionStorage.getItem('questTasks');
    const editingTaskId = sessionStorage.getItem('editingTaskId') || taskId;
    
    if (!storedDetails || !storedTasks) {
      // Redirect back if data is missing
      toast.error('Missing quest data. Please start from the beginning.');
      navigate('/admin/create-quest');
      return;
    }
    
    try {
      // Parse the stored tasks, we don't need the details since we removed setQuestDetails
      const parsedTasks = JSON.parse(storedTasks);
      
      // Ensure tasks have all required fields and normalize the format
      const normalizedTasks = parsedTasks.map((task, index) => ({
        id: task.id || task._id || `task-${Date.now()}-${index}`,
        title: task.title || task.question || task.questionText || '',
        description: typeof task.description === 'string' 
          ? task.description 
          : (Array.isArray(task.description) ? task.description.join('\n') : ''),
        narrative: task.narrative || 
          (typeof task.objective === 'string' 
            ? task.objective 
            : (Array.isArray(task.objective) ? task.objective.join('\n') : '')),
        timeLimit: task.timeLimit?.toString() || '10',
        points: task.points?.toString() || '10',
        type: task.type || 'TEXT',
        media: task.media || (task.mediaUrl ? [{ 
          id: `media-${Date.now()}-${index}`,
          type: 'link',
          url: task.mediaUrl,
          description: 'Task media'
        }] : [])
      }));
      
      setTasks(normalizedTasks);
      
      // If editing an existing task, find and expand it
      if (editingTaskId) {
        const taskIndex = normalizedTasks.findIndex(task => 
          task.id === editingTaskId || 
          task._id === editingTaskId
        );
        
        if (taskIndex !== -1) {
          console.log(`Expanding task at index ${taskIndex} with ID ${editingTaskId}`);
          setExpandedTaskIndex(taskIndex);
          // Clear the editing task ID from session storage to prevent confusion on next visit
          sessionStorage.removeItem('editingTaskId');
        } else if (normalizedTasks.length > 0) {
          // If no matching task found but tasks exist, expand the first one
          console.log(`Task with ID ${editingTaskId} not found, expanding first task`);
          setExpandedTaskIndex(0);
        }
      } else if (normalizedTasks.length > 0) {
        // Default to expanding the first task if no specific task is provided
        setExpandedTaskIndex(0);
      }
    } catch (err) {
      console.error('Error parsing stored data:', err);
      toast.error('Failed to load quest data. Please go back and try again.');
      navigate('/admin/create-quest');
    }
  }, [navigate, taskId]);

  // Clear validation error when user makes changes
  useEffect(() => {
    if (validationError) {
      setValidationError('');
    }
  }, [tasks, validationError]);

  const handleTaskChange = (taskIndex, field, value) => {
    setTasks(prevTasks => {
      const updatedTasks = [...prevTasks];
      updatedTasks[taskIndex] = {
        ...updatedTasks[taskIndex],
        [field]: value
      };
      return updatedTasks;
    });
  };

  const handleFileUpload = (e) => {
    setUploadedFile(e.target.files[0]);
  };

  const handleAddMedia = (taskIndex) => {
    if (!mediaType) {
      toast.error('Please select a media type');
      return;
    }

    if (!mediaDescription.trim()) {
      toast.error('Please provide a media description');
      return;
    }

    // If it's a file type media, ensure a file is uploaded
    if (mediaType === 'file' && !uploadedFile) {
      toast.error('Please upload a file');
      return;
    }

    // Simulating file upload (in a real app, you'd upload to server/cloud)
    let fileUrl = '';
    if (uploadedFile) {
      // In a real app, this would be the URL from your server/cloud storage
      fileUrl = URL.createObjectURL(uploadedFile);
    }

    const newMedia = {
      id: Date.now().toString(),
      type: mediaType,
      description: mediaDescription,
      url: mediaType === 'file' ? fileUrl : mediaDescription // For non-file media, use description as URL
    };

    setTasks(prevTasks => {
      const updatedTasks = [...prevTasks];
      updatedTasks[taskIndex] = {
        ...updatedTasks[taskIndex],
        media: [...(updatedTasks[taskIndex].media || []), newMedia]
      };
      return updatedTasks;
    });

    // Reset media form
    setMediaType('');
    setMediaDescription('');
    setUploadedFile(null);
    setMediaDropdownOpen(false);
  };

  const handleRemoveMedia = (taskIndex, mediaId) => {
    setTasks(prevTasks => {
      const updatedTasks = [...prevTasks];
      updatedTasks[taskIndex] = {
        ...updatedTasks[taskIndex],
        media: updatedTasks[taskIndex].media ? updatedTasks[taskIndex].media.filter(item => item.id !== mediaId) : []
      };
      return updatedTasks;
    });
  };

  const toggleTaskExpansion = (index) => {
    setExpandedTaskIndex(expandedTaskIndex === index ? -1 : index);
  };

  const handleSubmit = async () => {
    setLoading(true);

    // Validate tasks have required fields
    const missingTitles = tasks.filter(task => !task.title?.trim()).map((task, index) => index + 1);
    
    if (missingTitles.length > 0) {
      toast.error(`All tasks require a title. Please add titles to task${missingTitles.length > 1 ? 's' : ''} ${missingTitles.join(', ')}.`);
      setLoading(false);
      return;
    }

    try {
      // Store complete quest data in session storage only, no API calls
      // Use the sessionManager utility instead of directly using sessionStorage
      saveQuestTasks(tasks);
      toast.info('Task details saved temporarily. Your quest will be uploaded in the final step.');
      
      // Navigate to preview page, passing along edit mode state
      navigate('/admin/create-quest/preview', { state: { editMode: isEditMode } });
    } catch (err) {
      toast.error('Failed to save task details');
      console.error('Error saving task details:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    // Check if we came from editing a task
    const referrer = document.referrer;
    const editingTask = referrer && referrer.includes('/admin/quest/');
    
    if (editingTask) {
      // Extract the quest ID from the referrer URL if possible
      const questIdMatch = referrer.match(/\/admin\/quest\/([^/]+)/);
      const questId = questIdMatch ? questIdMatch[1] : null;
      
      if (questId) {
        // If we know the quest ID, navigate back to task list
        navigate(`/admin/quest/${questId}/tasks`);
        return;
      }
    }
    
    // Default navigation to task list
    navigate('/admin/create-quest/tasks');
  };

  // Calculate progress (66% for this step)
  const progress = 66;

  if (!tasks.length) {
    return <div className="loading">Loading task data...</div>;
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
      
      {/* Number of Tasks Input (for display only) */}
      <div className="task-number-group">
        <label htmlFor="numTasks">Number of Tasks</label>
        <input
          type="number"
          id="numTasks"
          className="form-input"
          value={tasks.length}
          disabled
          readOnly
        />
      </div>
      
      {/* Task Setup Section */}
      <div className="task-details-container">
        {tasks.map((task, index) => (
          <div key={task.id || index} className={`task-detail-item ${expandedTaskIndex === index ? 'expanded' : ''}`}>
            <div 
              className="task-header"
              onClick={() => toggleTaskExpansion(index)}
            >
              <span className="task-number">Set Task {index + 1}</span>
              {task.title && <span className="task-title">{task.title}</span>}
            </div>
            
            {expandedTaskIndex === index && (
              <div className="task-form">
                <div className="form-group">
                  <label htmlFor={`task-title-${index}`}>Task Title</label>
                  <input
                    type="text"
                    id={`task-title-${index}`}
                    className="form-input"
                    value={task.title || ''}
                    onChange={e => handleTaskChange(index, 'title', e.target.value)}
                    placeholder="Enter task title"
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor={`task-narrative-${index}`}>Task Narrative</label>
                  <textarea
                    id={`task-narrative-${index}`}
                    className="form-textarea"
                    value={task.narrative || ''}
                    onChange={e => handleTaskChange(index, 'narrative', e.target.value)}
                    placeholder="Enter task narrative"
                    rows="3"
                  ></textarea>
                </div>
                
                <div className="form-group">
                  <label htmlFor={`task-description-${index}`}>Task Description</label>
                  <textarea
                    id={`task-description-${index}`}
                    className="form-textarea"
                    value={task.description || ''}
                    onChange={e => handleTaskChange(index, 'description', e.target.value)}
                    placeholder="Enter task description"
                    rows="6"
                  ></textarea>
                </div>
                
                {/* Media Attachment Section */}
                <div className="form-group">
                  <label>Add Media</label>
                  
                  <div className="media-selector">
                    <div 
                      className="media-type-selector" 
                      onClick={() => setMediaDropdownOpen(!mediaDropdownOpen)}
                    >
                      <span>{mediaType || 'Select Media Type'}</span>
                      <span className="dropdown-arrow">▼</span>
                    </div>
                    
                    {mediaDropdownOpen && (
                      <div className="media-type-dropdown">
                        <div onClick={() => { setMediaType('file'); setMediaDropdownOpen(false); }}>
                          File Upload
                        </div>
                        <div onClick={() => { setMediaType('link'); setMediaDropdownOpen(false); }}>
                          External Link
                        </div>
                        <div onClick={() => { setMediaType('embed'); setMediaDropdownOpen(false); }}>
                          Embed Code
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="media-input-container">
                    <input
                      type="text"
                      placeholder="Media Description"
                      value={mediaDescription}
                      onChange={(e) => setMediaDescription(e.target.value)}
                      className="form-input"
                    />
                    
                    {mediaType === 'file' && (
                      <div className="file-upload">
                        <input
                          type="file"
                          onChange={handleFileUpload}
                          className="file-input"
                          id={`file-upload-${index}`}
                        />
                        <label htmlFor={`file-upload-${index}`} className="file-label">
                          <span>Attach File</span>
                        </label>
                        {uploadedFile && <span className="file-name">{uploadedFile.name}</span>}
                      </div>
                    )}
                    
                    <button 
                      type="button" 
                      className="add-media-btn" 
                      onClick={() => handleAddMedia(index)}
                    >
                      <FaPlus /> Add
                    </button>
                  </div>
                </div>
                
                {/* Display Added Media */}
                {task.media && task.media.length > 0 && (
                  <div className="media-list">
                    <h4>Attached Media</h4>
                    {task.media.map(item => (
                      <div key={item.id} className="media-item">
                        <div className="media-item-content">
                          <div className="media-item-icon">
                            {item.type === 'file' ? '📄' : item.type === 'link' ? '🔗' : '📌'}
                          </div>
                          <div className="media-item-details">
                            <div className="media-item-description">{item.description}</div>
                            <div className="media-item-type">{item.type}</div>
                          </div>
                        </div>
                        <button 
                          type="button" 
                          className="media-delete-btn" 
                          onClick={() => handleRemoveMedia(index, item.id)}
                        >
                          <FaTrash />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
      
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
          onClick={handleSubmit}
          disabled={loading}
        >
          {loading ? 'Saving...' : 'Preview'}
        </button>
      </div>
    </div>
  );
};

export default CreateQuestTaskDetails; 