import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import { FaChevronRight } from 'react-icons/fa';
import { FaTools, FaBook, FaFileAlt, FaFileCode, FaFilePdf, FaFileWord, FaFileImage,  FaExternalLinkAlt, FaInfoCircle, 
  FaLaptopCode,  } from 'react-icons/fa';
import './CreateQuestPreview.css';
import '../styles/quest-buttons.css';
import { clearQuestSessionData } from '../utils/sessionManager';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Resource Item Component
const ResourceItem = ({ resource, index }) => {
  const getResourceIcon = (url) => {
    if (url && typeof url === 'string') {
      if (url.includes('.pdf')) return <FaFilePdf className="resource-icon pdf" />;
      if (url.includes('.doc')) return <FaFileWord className="resource-icon doc" />;
      if (url.includes('.jpg') || url.includes('.png') || url.includes('.gif')) 
        return <FaFileImage className="resource-icon image" />;
      if (url.includes('.js') || url.includes('.ts') || url.includes('.py') || url.includes('.java')) 
        return <FaFileCode className="resource-icon code" />;
      if (url.includes('http')) return <FaExternalLinkAlt className="resource-icon link" />;
    }
    return <FaFileAlt className="resource-icon" />;
  };
  
  // Extract resource name from URL if possible
  const getResourceName = (url) => {
    if (!url || typeof url !== 'string') return `Resource ${index + 1}`;
    
    // Try to extract filename from URL
    const urlParts = url.split('/');
    let fileName = urlParts[urlParts.length - 1];
    
    // Remove query parameters if any
    if (fileName.includes('?')) {
      fileName = fileName.split('?')[0];
    }
    
    // Decode URI components
    try {
      fileName = decodeURIComponent(fileName);
    } catch (e) {
      // If decoding fails, use the original
    }
    
    return fileName || `Resource ${index + 1}`;
  };

  return (
    <div className="resource-item">
      {getResourceIcon(resource)}
      <a href={resource} target="_blank" rel="noopener noreferrer" title={resource}>
        {getResourceName(resource)}
      </a>
    </div>
  );
};

// Tool Item Component
const ToolItem = ({ tool }) => {
  const getToolIcon = (toolName) => {
    const name = toolName.toLowerCase();
    
    if (name.includes('python') || name.includes('django') || name.includes('flask'))
      return <FaLaptopCode className="tool-icon python" />;
    if (name.includes('javascript') || name.includes('js') || name.includes('node'))
      return <FaLaptopCode className="tool-icon js" />;
    if (name.includes('book') || name.includes('reading') || name.includes('documentation'))
      return <FaBook className="tool-icon" />;
    if (name.includes('code') || name.includes('programming') || name.includes('development'))
      return <FaFileCode className="tool-icon" />;
    
    return <FaTools className="tool-icon" />;
  };
  
  return (
    <li className="tool-item">
      {getToolIcon(tool)}
      <span>{tool}</span>
    </li>
  );
};

// Process description text into coherent paragraphs
const processDescription = (description) => {
  // Handle empty descriptions
  if (!description) return [];
  
  // If description is a string, split it into proper paragraphs
  if (typeof description === 'string') {
    // Split by proper paragraph breaks (double newlines)
    const paragraphs = description
      .split(/\n\s*\n/)
      .map(paragraph => paragraph.trim())
      .filter(paragraph => paragraph.length > 0);
    
    // If we found proper paragraphs, return them
    if (paragraphs.length > 0) {
      return paragraphs;
    }
    
    // Otherwise, treat each line as a potential paragraph but smartly combine short lines
    const lines = description
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);
    
    // If it's just a single line, return it
    if (lines.length <= 1) return lines;
    
    // Combine short phrases and sentences into coherent paragraphs
    const paragraphLines = [];
    let currentParagraph = '';
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const wordCount = line.split(/\s+/).length;
      
      // If line ends with a sentence-ending punctuation, it likely completes a thought
      const endsWithPunctuation = /[.!?]$/.test(line);
      
      // Short line or doesn't end with punctuation - append to current paragraph
      if (wordCount < 7 && !endsWithPunctuation && currentParagraph) {
        currentParagraph += ' ' + line;
      } 
      // Line with ending punctuation or longer line - potential paragraph break
      else if (currentParagraph) {
        // Add to current paragraph and start a new one
        currentParagraph += ' ' + line;
        paragraphLines.push(currentParagraph);
        currentParagraph = '';
      } 
      // Starting a new paragraph
      else {
        if (endsWithPunctuation || wordCount >= 7) {
          // Long enough to be its own paragraph
          paragraphLines.push(line);
        } else {
          // Start building a new paragraph
          currentParagraph = line;
        }
      }
    }
    
    // Add the final paragraph if we have one
    if (currentParagraph) {
      paragraphLines.push(currentParagraph);
    }
    
    return paragraphLines;
  }
  
  // If description is already an array, process each item to ensure proper formatting
  if (Array.isArray(description)) {
    return description
      .filter(item => item && String(item).trim().length > 0)
      .map(item => {
        // Process each array item as its own paragraph
        if (typeof item === 'string') {
          return item.trim();
        }
        return String(item).trim();
      });
  }
  
  // Fallback for other types
  return [String(description)];
};

const CreateQuestPreview = () => {
  const { questId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  // Check for editMode in location state (coming from task details) or questId (viewing)
  const editModeFromNavigation = location.state?.editMode || false;
  
  const [questData, setQuestData] = useState(null);
  const [questTasks, setQuestTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [isViewMode, setIsViewMode] = useState(false);
  const [isEditMode, setIsEditMode] = useState(editModeFromNavigation);
  
  // Fetch quest data from API (view existing quest)
  const fetchQuestData = async () => {
    // This function only READS from the database
    // It does not save or update any data
    try {
      console.log('Fetching quest data for ID:', questId);
      const token = localStorage.getItem('userToken');
      if (!token) {
        toast.error('Please log in to view quest details');
        navigate('/login', { state: { from: `/admin/create-quest/preview/${questId}` } });
        return;
      }

      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

      // Check if we already have quest data in session storage (from the AdminQuests page)
      const storedQuestDetails = sessionStorage.getItem('questDetails');
      const storedQuestTasks = sessionStorage.getItem('questTasks');
      
      if (storedQuestDetails && storedQuestTasks) {
        try {
          const parsedQuestDetails = JSON.parse(storedQuestDetails);
          const parsedQuestTasks = JSON.parse(storedQuestTasks);
          
          console.log('Using quest data from session storage');
          setQuestData(parsedQuestDetails);
          setQuestTasks(parsedQuestTasks);
          setLoading(false);
          return;
        } catch (err) {
          console.error('Error parsing stored quest data, fetching from API instead:', err);
        }
      }

      // If not available in session storage, fetch from API
      const [questResponse, tasksResponse] = await Promise.all([
        axios.get(`${API_URL}/quizzes/${questId}`, { headers }),
        axios.get(`${API_URL}/quizzes/${questId}/questions`, { headers })
      ]);

      console.log('API responses received:', { 
        quest: questResponse.data ? 'success' : 'error',
        tasks: tasksResponse.data?.questions ? `${tasksResponse.data.questions.length} tasks` : 'error'
      });

      // Handle possible response formats
      if (questResponse.data?.quiz) {
        setQuestData(questResponse.data.quiz);
      } else if (questResponse.data) {
        // Direct quiz data
        setQuestData(questResponse.data);
      } else {
        throw new Error('Invalid quest data received');
      }

      if (tasksResponse.data?.questions && Array.isArray(tasksResponse.data.questions)) {
        setQuestTasks(tasksResponse.data.questions);
      } else if (Array.isArray(tasksResponse.data)) {
        // Direct tasks array
        setQuestTasks(tasksResponse.data);
      } else {
        console.warn('No tasks found for this quest');
        setQuestTasks([]);
      }

      setLoading(false);
    } catch (err) {
      console.error('Error fetching quest data:', err);
      
      if (err.response?.status === 401 || err.response?.status === 403) {
        toast.error('Session expired. Please log in again.');
        localStorage.removeItem('userToken');
        navigate('/login', { state: { from: `/admin/create-quest/preview/${questId}` } });
        return;
      }
      
      setError(err.message || 'Failed to fetch quest details');
      toast.error(err.message || 'Failed to fetch quest details');
      setLoading(false);
    }
  };
  
  useEffect(() => {
    // We're in one of three modes:
    // 1. View mode (questId in URL) - fetch from API
    // 2. Edit mode (location.state.editMode) - Use session storage for editing
    // 3. Creation flow - get from sessionStorage
    
    const setUpComponent = async () => {
      try {
        setLoading(true);
        
        if (questId) {
          console.log('Preview mode: Viewing existing quest with ID:', questId);
          setIsViewMode(true);
          // If we got here through the edit flow, we're editing not just viewing
          setIsEditMode(editModeFromNavigation);
          
          // If in edit mode and we have a quest ID but no data in session storage,
          // load the data from API using our utility function
          if (editModeFromNavigation) {
            const storedQuestDetails = sessionStorage.getItem('questDetails');
            const storedQuestTasks = sessionStorage.getItem('questTasks');
            
            if (!storedQuestDetails || !storedQuestTasks) {
              // Import the utility function and load the data
              const { loadQuestDataForEdit } = await import('../utils/sessionManager');
              await loadQuestDataForEdit(questId, navigate, toast);
              
              // After loading data, check session storage again
              const updatedQuestDetails = sessionStorage.getItem('questDetails');
              const updatedQuestTasks = sessionStorage.getItem('questTasks');
              
              if (!updatedQuestDetails || !updatedQuestTasks) {
                // If still no data, show error and redirect
                setError('Failed to load quest data for editing');
                setLoading(false);
                toast.error('Failed to load quest data for editing');
                return;
              }
              
              // If data was loaded successfully, use loadFromSessionStorage
              loadFromSessionStorage();
            } else {
              // Use data from session storage
              loadFromSessionStorage();
            }
          } else {
            // Just viewing, not editing, so fetch from API
            await fetchQuestData();
          }
        } else {
          // If we got here through the edit flow, set edit mode
          setIsEditMode(editModeFromNavigation);
          console.log(`Preview mode: ${editModeFromNavigation ? 'Edit' : 'Creation'} flow, loading from sessionStorage`);
          loadFromSessionStorage();
        }
        
        // For debugging - log session storage contents
        const storedDetails = sessionStorage.getItem('questDetails');
        const storedTasks = sessionStorage.getItem('questTasks');
        console.log('Session storage check - questDetails exists:', !!storedDetails);
        console.log('Session storage check - questTasks exists:', !!storedTasks);
      } catch (err) {
        console.error('Error setting up preview component:', err);
        setError('Error preparing quest preview');
        setLoading(false);
      }
    };
    
    setUpComponent();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [questId, editModeFromNavigation, navigate]);
  
  // Load data from sessionStorage (creation flow)
  const loadFromSessionStorage = () => {
    try {
      const storedQuestDetails = sessionStorage.getItem('questDetails');
      const storedQuestTasks = sessionStorage.getItem('questTasks');
      
      if (!storedQuestDetails || !storedQuestTasks) {
        console.error('Missing quest data in sessionStorage', {
          questDetails: storedQuestDetails ? 'exists' : 'missing',
          questTasks: storedQuestTasks ? 'exists' : 'missing'
        });
        setError('No quest data found. Please start the creation process again.');
        setLoading(false);
        return;
      }
      
      const parsedQuestDetails = JSON.parse(storedQuestDetails);
      const parsedQuestTasks = JSON.parse(storedQuestTasks);
      
      console.log('Loaded from sessionStorage:', { 
        questDetails: {
          id: parsedQuestDetails.id,
          title: parsedQuestDetails.title,
          dataType: typeof parsedQuestDetails
        }, 
        tasks: {
          count: parsedQuestTasks.length,
          dataType: Array.isArray(parsedQuestTasks) ? 'array' : typeof parsedQuestTasks
        }
      });
      
      // Transform quest tasks data to match our expected format for rendering
      const formattedTasks = parsedQuestTasks.map(task => ({
        id: task.id,
        question: task.question || task.title || task.questionText || '',
        description: task.description || '',
        objective: task.objective || task.narrative || '',
        media: task.media || [],
        timeLimit: task.timeLimit || 10,
        points: task.points || 10,
        type: task.type || 'TEXT',
        taskNumber: task.taskNumber || task.taskOrder || 0
      }));
      
      setQuestData(parsedQuestDetails);
      setQuestTasks(formattedTasks);
      setLoading(false);
    } catch (err) {
      console.error('Error loading quest data from sessionStorage:', err);
      setError('Failed to load quest data. Please go back and try again.');
      setLoading(false);
    }
  };
  
  const handleBack = () => {
    if (isViewMode) {
      // If viewing an existing quest, go back to quests page
      navigate('/admin/quests');
    } else {
      // If in creation or edit flow, go back to task details
      navigate('/admin/create-quest/task-details', { state: { editMode: isEditMode } });
    }
  };
  
  const handleTaskClick = (task) => {
    if (isViewMode) {
      // If in view mode, navigate to task view with questId
      navigate(`/admin/quest/${questId}/task/${task.id}`);
    } else {
      // If in creation flow, navigate to task preview without questId
      navigate(`/admin/create-quest/task/${task.id}`);
    }
  };
  
  const handleUpload = async () => {
    setUploading(true);
    setError(null);
    
    try {
      // Check for token first
      const token = localStorage.getItem('userToken');
      
      if (!token) {
        toast.error('Authentication required. Please log in.');
        navigate('/login');
        return;
      }

      // Define config object outside of if/else blocks for reuse
      const config = {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      };
      
      // Format quest data according to the database schema
      const quizData = {
        title: questData.title.trim(),
        description: typeof questData.description === 'string'
          ? questData.description.trim().split('\n').filter(line => line.trim() !== '')
          : (Array.isArray(questData.description) ? questData.description : []),
        level: questData.difficulty?.trim() || questData.level?.trim() || 'Beginner',
        thumbnailUrl: questData.media && questData.media.length > 0 ? questData.media[0].url : 
                     (questData.thumbnailUrl || ''),
        tags: typeof questData.domain === 'string' 
          ? questData.domain.split(',').map(tag => tag.trim()).filter(tag => tag !== '')
          : (Array.isArray(questData.tags) ? questData.tags : []),
        toolsRequired: questData.toolsRequired
          ? (typeof questData.toolsRequired === 'string'
              ? questData.toolsRequired.split(',').map(tool => tool.trim()).filter(tool => tool !== '')
              : questData.toolsRequired)
          : [],
        resources: questData.resources
          ? (typeof questData.resources === 'string'
              ? questData.resources.split(',').map(resource => resource.trim()).filter(resource => resource !== '')
              : questData.resources)
          : [],
        theme: questData.theme || '',
        enrolledCount: questData.enrolledCount || 0,
        duration: calculateTotalDuration(questTasks)
      };
      
      // Check if we have a temporary ID (starting with 'temp-')
      const isTemporaryId = questData.id && questData.id.toString().startsWith('temp-');
      
      // Determine if we're in edit mode with a real ID (not a temp ID)
      const isEditMode = questData.id && !isTemporaryId;
      let quizId;
      
      if (isEditMode) {
        // We have a real ID, so we're updating an existing quiz
        quizId = questData.id;
        console.log(`Updating existing quiz with ID: ${quizId}`);
        
        try {
          const quizResponse = await axios.put(
            `${API_URL}/quizzes/${quizId}`, 
            quizData, 
            config
          );
          console.log("Quiz updated successfully:", quizId, "Response:", quizResponse.status);
        } catch (quizError) {
          console.error("Failed to update quiz:", quizError);
          
          if (quizError.response && (quizError.response.status === 401 || quizError.response.status === 403)) {
            toast.error('Authentication error. Please log in again.');
            localStorage.removeItem('userToken');
            setUploading(false);
            navigate('/login');
            return;
          }
          
          throw new Error(quizError.response?.data?.message || 'Quiz not found');
        }
      } else {
        // We don't have a real ID or we have a temp ID, so we're creating a new quiz
        console.log("Creating new quiz...");
        try {
          const quizResponse = await axios.post(`${API_URL}/quizzes`, quizData, config);
          
          if (!quizResponse.data || (!quizResponse.data.quiz && !quizResponse.data._id)) {
            throw new Error('Invalid response from server when creating quiz');
          }
          
          // Handle different response formats
          quizId = quizResponse.data.quiz?._id || 
                   quizResponse.data.quiz?.id || 
                   quizResponse.data._id ||
                   quizResponse.data.id;
                   
          if (!quizId) {
            throw new Error('No quiz ID returned from server');
          }
          
          console.log("Quiz created successfully with ID:", quizId);
        } catch (quizError) {
          console.error("Failed to create quiz:", quizError);
          
          if (quizError.response && (quizError.response.status === 401 || quizError.response.status === 403)) {
            toast.error('Authentication error. Please log in again.');
            localStorage.removeItem('userToken');
            setUploading(false);
            navigate('/login');
            return;
          }
          
          throw new Error(quizError.response?.data?.message || 'Error creating quiz');
        }
      }
      
      // Now handle tasks for the quiz
      if (!quizId) {
        throw new Error('Missing quiz ID. Cannot continue with task creation.');
      }
      
      // Get existing tasks for the quiz (if any)
      let existingTasks = [];
      try {
        const existingTasksResponse = await axios.get(`${API_URL}/quizzes/${quizId}/questions`, config);
        existingTasks = existingTasksResponse.data.questions || existingTasksResponse.data || [];
        console.log(`Found ${existingTasks.length} existing tasks for quiz ${quizId}`);
      } catch (err) {
        console.warn(`No existing tasks found for quiz ${quizId}:`, err);
        // Continue with task creation anyway
      }
      
      // Create a map of existing task IDs
      const existingTasksMap = {};
      existingTasks.forEach(task => {
        existingTasksMap[task.id || task._id] = task;
      });
      
      // Normalize quest tasks to ensure consistent ID handling
      const normalizedQuestTasks = questTasks.map(task => ({
        ...task,
        id: task.id || task._id || null
      }));
      
      // Find tasks to delete (tasks that exist on the server but not in our updated list)
      const currentTaskIds = new Set(
        normalizedQuestTasks
          .filter(task => task.id && !task.id.toString().startsWith('temp-'))
          .map(task => task.id.toString())
      );
      
      // Delete tasks that are no longer in our list
      for (const existingTask of existingTasks) {
        const taskId = existingTask.id || existingTask._id;
        if (!currentTaskIds.has(taskId.toString())) {
          console.log(`Deleting task ${taskId} as it's no longer needed`);
          try {
            await axios.delete(`${API_URL}/quizzes/${quizId}/questions/${taskId}`, config);
            console.log(`Successfully deleted task ${taskId}`);
          } catch (deleteError) {
            console.error(`Error deleting task ${taskId}:`, deleteError);
            // Non-critical error, continue with other operations
          }
        }
      }
      
      // Add or update tasks
      console.log(`Processing ${normalizedQuestTasks.length} tasks for quiz ${quizId}`);
      for (let i = 0; i < normalizedQuestTasks.length; i++) {
        const task = normalizedQuestTasks[i];
        
        // Format task data according to the API expectations
        const taskData = {
          questionText: task.question || task.title || task.questionText || '',
          description: task.description 
            ? (typeof task.description === 'string' 
                ? task.description.split('\n').filter(line => line.trim() !== '') 
                : task.description)
            : [],
          objective: task.objective || task.narrative 
            ? (typeof task.objective === 'string' 
                ? task.objective.split('\n').filter(line => line.trim() !== '')
                : (typeof task.narrative === 'string'
                    ? task.narrative.split('\n').filter(line => line.trim() !== '')
                    : task.objective || []))
            : [],
          hints: task.hints || [],
          bookHints: task.bookHints || [],
          questions: task.questions || [],
          note: task.note || '',
          resources: task.resources || [],
          mediaUrl: task.mediaUrl || (task.media && task.media.length > 0 ? task.media[0].url : ''),
          taskOrder: i,
          timeLimit: task.timeLimit ? parseInt(task.timeLimit) : 10,
          points: task.points ? parseInt(task.points) : 10,
          type: task.type || 'TEXT'
        };
        
        try {
          // Check if this task has a valid existing ID (not a temp ID)
          const hasValidId = task.id && 
                            !task.id.toString().startsWith('temp-') && 
                            existingTasksMap[task.id];
          
          if (hasValidId) {
            // Update existing task
            console.log(`Updating task ${i+1}/${normalizedQuestTasks.length}: ${taskData.questionText}`);
            try {
              await axios.put(
                `${API_URL}/quizzes/${quizId}/questions/${task.id}`, 
                taskData, 
                config
              );
              console.log(`Task ${i+1} updated successfully with ID: ${task.id}`);
            } catch (updateError) {
              console.error(`Error updating task ${task.id}:`, updateError);
              
              // If update fails, try to create as new
              if (updateError.response && updateError.response.status === 404) {
                console.log(`Task ${task.id} not found, creating as new instead`);
                await axios.post(
                  `${API_URL}/quizzes/${quizId}/questions`, 
                  taskData, 
                  config
                );
                console.log(`Task ${i+1} created after update failure`);
              } else {
                throw updateError;
              }
            }
          } else {
            // Create new task
            console.log(`Creating new task ${i+1}/${normalizedQuestTasks.length}`);
            const createResponse = await axios.post(
              `${API_URL}/quizzes/${quizId}/questions`, 
              taskData, 
              config
            );
            
            // Log task creation success
            const newTaskId = createResponse.data.question?.id || 
                              createResponse.data.question?._id ||
                              createResponse.data._id ||
                              createResponse.data.id;
                              
            console.log(`Task ${i+1} created successfully with ID: ${newTaskId}`);
          }
        } catch (taskError) {
          console.error(`Error processing task ${i+1}:`, taskError);
          // Continue with other tasks - non-critical error
        }
        
        // Small delay between operations to avoid overwhelming the server
        if (i < normalizedQuestTasks.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
      
      // Update the quiz with the final duration
      try {
        await axios.put(
          `${API_URL}/quizzes/${quizId}`, 
          { duration: calculateTotalDuration(normalizedQuestTasks) }, 
          config
        );
      } catch (durationError) {
        console.error("Error updating quiz duration:", durationError);
        // Non-critical error, continue
      }
      
      toast.success(`Quest ${isEditMode ? 'updated' : 'created'} successfully!`);
      
      // Clear session storage after successful upload using the utility function
      clearQuestSessionData();
      console.log('Session storage cleared after successful quest upload');
      
      // Navigate to the admin quests page
      navigate('/admin/quests');
    } catch (error) {
      console.error('Error uploading quest:', error);
      
      let errorMessage = error.message || 'Failed to upload quest. Please try again.';
      
      if (error.response) {
        if (error.response.status === 401 || error.response.status === 403) {
          errorMessage = 'Authentication error. Please log in again.';
          localStorage.removeItem('userToken'); // Clear invalid token
          navigate('/login');
        } else if (error.response.status === 500) {
          errorMessage = 'Server error. The team has been notified.';
        } else {
          errorMessage = error.response.data?.message || errorMessage;
        }
      } else if (error.request) {
        errorMessage = 'Network error. Please check your connection and try again.';
      }
      
      toast.error(errorMessage);
      
      // Keep session storage data for retry since upload failed
      console.log('Upload failed, session data preserved for retry');
    } finally {
      setUploading(false);
    }
  };
  
  // Calculate total duration based on task time limits
  const calculateTotalDuration = (taskList) => {
    return taskList.reduce((total, task) => {
      const timeLimit = task.timeLimit ? parseInt(task.timeLimit) : 10; // Default 10 mins if not specified
      return total + timeLimit;
    }, 0);
  };
  
  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading quest details...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <p>Error: {error}</p>
        <button className="back-btn" onClick={() => navigate('/admin/quests')}>
          Back to Quests
        </button>
      </div>
    );
  }

  if (!questData) {
    return (
      <div className="error-container">
        <p>No quest data found</p>
        <button className="back-btn" onClick={() => navigate('/admin/quests')}>
          Back to Quests
        </button>
      </div>
    );
  }
  
  // Prepare quest data for display
  const resources = Array.isArray(questData.resources) ? questData.resources : 
    (typeof questData.resources === 'string' ? questData.resources.split(',').map(r => r.trim()) : []);
  
  const tools = Array.isArray(questData.toolsRequired) ? questData.toolsRequired : 
    (typeof questData.toolsRequired === 'string' ? questData.toolsRequired.split(',').map(t => t.trim()) : []);
  
  const tags = Array.isArray(questData.tags) ? questData.tags : 
    (typeof questData.domain === 'string' ? questData.domain.split(',').map(t => t.trim()) : []);
  
  return (
    <div className="quest-preview-container">
      <h1 className="create-quest-title">
        {isViewMode ? 'View Quest' : isEditMode ? 'Edit Your Quest' : 'Create Your Quest'}
      </h1>
      
      {/* Progress bar - only show in creation or edit flow */}
      {!isViewMode && (
        <div className="progress-container">
          <div className="progress-bar">
            <div 
              className="progress-fill" 
              style={{ width: `100%` }}
            ></div>
          </div>
        </div>
      )}

      <div className="quest-preview-content">
        <div className="quest-details-section">
          <div className="quest-header">
            <h2>Quest Details</h2>
          </div>
          
          <div className="quest-info-grid">
            <div className="quest-info-item">
              <h3>Title</h3>
              <p>{questData.title}</p>
            </div>
            
            {tags && tags.length > 0 && (
              <div className="quest-info-item">
                <h3>Tags</h3>
                <div className="tags-container">
                  {tags.map((tag, index) => (
                    <span key={index} className="tag-badge">{tag}</span>
                  ))}
                </div>
              </div>
            )}
            
            {questData.theme && (
              <div className="quest-info-item">
                <h3>Theme</h3>
                <p>{questData.theme}</p>
              </div>
            )}
            
            <div className="quest-info-item quest-info-description">
              <h3>Description</h3>
              <div className="quest-content-box">
                <div className="quest-description">
                  {processDescription(questData.description).map((desc, index) => (
                    <p key={index}>{desc}</p>
                  ))}
                </div>
              </div>
            </div>
            
            {tools && tools.length > 0 && (
              <div className="quest-info-item quest-info-tools">
                <h3>Tools Required</h3>
                <div className="quest-content-box">
                  <ul className="tools-list">
                    {tools.map((tool, index) => (
                      <ToolItem key={index} tool={tool} />
                    ))}
                  </ul>
                </div>
              </div>
            )}
            
            {resources && resources.length > 0 && (
              <div className="quest-info-item quest-info-resources">
                <h3>Resources</h3>
                <div className="quest-content-box">
                  <div className="resources-list">
                    {resources.map((resource, index) => (
                      <ResourceItem key={index} resource={resource} index={index} />
                    ))}
                  </div>
                  {resources.length === 0 && (
                    <div className="no-resources">
                      <FaInfoCircle /> No resources available
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="quest-tasks-section">
          <h2>Tasks</h2>
          <div className="tasks-grid">
            {questTasks.length > 0 ? (
              questTasks.map((task, index) => (
                <div 
                  key={task.id || index} 
                  className="task-card"
                  onClick={() => handleTaskClick(task)}
                >
                  <div className="task-card-content">
                    <h3>{`Task ${index + 1}: ${task.title || task.question || task.questionText || ''}`}</h3>
                    <p>
                      {processDescription(task.description || 'Complete this task to progress in the quest.')[0]}
                    </p>
                    {task.type && (
                      <div className="task-type-badge">
                        {task.type.replace('_', ' ')}
                      </div>
                    )}
                  </div>
                  <div className="task-card-chevron">
                    <FaChevronRight />
                  </div>
                </div>
              ))
            ) : (
              <p>No tasks found for this quest.</p>
            )}
          </div>
        </div>
      </div>

      <div className="form-actions">
        <button 
          type="button" 
          className="back-button" 
          onClick={handleBack}
          disabled={uploading}
        >
          Back
        </button>
        {!isViewMode && (
          <button 
            type="button" 
            className="upload-button"
            onClick={handleUpload}
            disabled={uploading}
          >
            {uploading ? 'Uploading...' : isEditMode ? 'Update' : 'Upload'}
          </button>
        )}
      </div>
    </div>
  );
};

export default CreateQuestPreview; 