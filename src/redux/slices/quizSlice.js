import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

// Define API_URL very explicitly for debugging
const API_URL = 'http://localhost:5000/api';
console.log('Using API URL:', API_URL);

// Add this to temporarily hold the refresh function reference
export const setRefreshCourseDataRef = (refreshCourseDataAction) => {
  // This will be set from the CoursePage component
  console.log('Setting refresh course data reference function');
};

// Configure axios defaults
axios.defaults.withCredentials = true;

// Create axios instance with auth token
const axiosInstance = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  },
  timeout: 10000 // Add a reasonable timeout
});

// Add request interceptor to add auth token
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('userToken');
    if (token) {
      // Log token presence but not the actual token for security
      console.log('Auth token found for request to:', config.url);
      config.headers.Authorization = `Bearer ${token}`;
    } else {
      console.warn('No auth token found for request to:', config.url);
    }
    return config;
  },
  (error) => {
    console.error('Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Add response interceptor for handling common errors
axiosInstance.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    
    // Check if error is due to expired token and we haven't already tried to refresh
    if (error.response && error.response.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        console.log('Token expired, attempting to refresh...');
        
        // Attempt to refresh token if store is available
        if (window.store) {
          const refreshResult = await window.store.dispatch({ type: 'auth/refreshToken' });
          
          // If refresh was successful, retry the original request
          if (refreshResult.type === 'auth/refreshToken/fulfilled') {
            console.log('Token refresh successful, retrying request');
            const token = localStorage.getItem('userToken');
            
            // Update the original request with the new token
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return axiosInstance(originalRequest);
          }
        }
      } catch (refreshError) {
        console.error('Token refresh failed:', refreshError);
      }
      
      // Token refresh failed or not possible, proceed with logout
      console.error('Authentication error - token expired and refresh failed');
      
      if (window.store) {
        window.store.dispatch({ type: 'auth/logout' });
        window.store.dispatch({ 
          type: 'notifications/showToast', 
          payload: { 
            message: 'Your session has expired. Please log in again.',
            type: 'error',
            duration: 5000
          }
        });
      }
    }
    
    return Promise.reject(error);
  }
);

// Fetch all quizzes from the backend
export const fetchQuizzes = createAsyncThunk(
  'quiz/fetchQuizzes',
  async (_, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get(`/quizzes`);
      const quizzes = response.data.quizzes.map(quiz => ({
        id: quiz.id,
        title: quiz.title,
        description: Array.isArray(quiz.description) ? quiz.description : [],
        objective: Array.isArray(quiz.objective) ? quiz.objective : [],
        toolsRequired: Array.isArray(quiz.toolsRequired) ? quiz.toolsRequired : [],
        resources: Array.isArray(quiz.resources) ? quiz.resources : [],
        instructor: quiz.admin?.username || 'Quest Instructor',
        image: quiz.thumbnailUrl || 'https://via.placeholder.com/300x200?text=Quest+Image',
        level: quiz.level || 'Beginner',
        rating: quiz.averageRating || 4.5,
        totalStudents: quiz.enrolledCount || 0,
        favorite: false,
        tasks: quiz.questions?.length || 0
      }));
      return quizzes;
    } catch (error) {
      console.error('Error fetching quizzes:', error);
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch quizzes');
    }
  }
);

// Alias for fetchQuizzes to maintain compatibility
export const fetchCourses = fetchQuizzes;

// Fetch a single quiz by ID
export const fetchQuizById = createAsyncThunk(
  'quiz/fetchQuizById',
  async (quizId, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get(`/quizzes/${quizId}`);
      const quiz = response.data;
      return {
        id: quiz.id,
        title: quiz.title,
        description: Array.isArray(quiz.description) ? quiz.description : [],
        objective: Array.isArray(quiz.objective) ? quiz.objective : [],
        toolsRequired: Array.isArray(quiz.toolsRequired) ? quiz.toolsRequired : [],
        resources: Array.isArray(quiz.resources) ? quiz.resources : [],
        instructor: quiz.admin?.username || 'Quest Instructor',
        image: quiz.thumbnailUrl || 'https://via.placeholder.com/300x200?text=Quest+Image',
        level: quiz.level || 'Beginner',
        rating: quiz.averageRating || 4.5,
        totalStudents: quiz.enrolledCount || 0,
        tasks: quiz.questions || [],
        favorite: false
      };
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch quiz');
    }
  }
);

// Fetch course by ID
export const fetchCourseById = createAsyncThunk(
  'quiz/fetchById',
  async (quizId, { rejectWithValue, getState }) => {
    try {
      console.log(`Fetching quiz by ID: ${quizId}`);
      const state = getState();
      const token = state.auth.token;
      
      const response = await fetch(`http://localhost:5000/api/quizzes/${quizId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        credentials: 'include'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Error fetching quiz:', errorData);
        return rejectWithValue(errorData.message || 'Failed to fetch quiz');
      }
      
      const data = await response.json();
      console.log(`Quiz fetched successfully: ${data.title}`);
      
      return data;
    } catch (error) {
      console.error('Error in fetchCourseById:', error);
      return rejectWithValue(error.message || 'Failed to fetch quiz');
    }
  }
);

// Fetch homepage data
export const fetchHomePageData = createAsyncThunk(
  'quiz/fetchHomePageData',
  async (_, { rejectWithValue }) => {
    try {
      console.log('ATTEMPTING FETCH FROM:', `${API_URL}/quizzes`);
      
      // Make API request directly without axios interceptors for testing
      try {
        const directResponse = await fetch(`${API_URL}/quizzes`, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          },
          credentials: 'include' // Include cookies for CORS requests
        });
        const directData = await directResponse.json();
        console.log('DIRECT FETCH RESPONSE:', directData);
        console.log('DIRECT QUIZ COUNT:', directData.quizzes?.length || 0);
        
        if (directData.quizzes?.length > 0) {
          console.log('SAMPLE QUIZ FROM DIRECT FETCH:', directData.quizzes[0]);
        } else {
          console.warn('NO QUIZZES IN DIRECT FETCH RESPONSE');
        }
      } catch (directError) {
        console.error('DIRECT FETCH ERROR:', directError);
      }
      
      // Get the current token
      const token = localStorage.getItem('userToken');
      console.log('User token available:', !!token);
      
      // Make API request through axios
      console.log('Attempting axios request to:', `${API_URL}/quizzes`);
      const response = await axiosInstance.get(`/quizzes`);
      console.log('AXIOS RESPONSE RECEIVED:', response);
      console.log('AXIOS RESPONSE DATA:', response.data);
      console.log('AXIOS QUIZ COUNT:', response.data.quizzes?.length || 0);
      
      // Check that quizzes is valid before mapping
      if (!response.data.quizzes || !Array.isArray(response.data.quizzes)) {
        console.error('INVALID QUIZZES DATA IN RESPONSE:', response.data);
        throw new Error('Invalid quizzes data received from API');
      }
      
      // Process quizzes to ensure consistent array format
      console.log('PROCESSING QUIZZES FROM RESPONSE...');
      const quizzes = response.data.quizzes.map((quiz, index) => {
        if (!quiz || typeof quiz !== 'object') {
          console.error(`INVALID QUIZ AT INDEX ${index}:`, quiz);
          return null;
        }
        
        if (!quiz.id) {
          console.warn(`QUIZ WITHOUT ID AT INDEX ${index}:`, quiz);
        }
        
        console.log(`Processing quiz ${index}:`, quiz.id, quiz.title);
        
        // Create a processed quiz object with consistent structure
        const processedQuiz = {
          id: quiz.id || `temp-id-${index}`,
          title: quiz.title || 'Untitled Quest',
          description: Array.isArray(quiz.description) ? quiz.description : 
                     (quiz.description ? [String(quiz.description)] : ['No description available']),
          objective: Array.isArray(quiz.objective) ? quiz.objective : 
                    (quiz.objective ? [String(quiz.objective)] : []),
          toolsRequired: Array.isArray(quiz.toolsRequired) ? quiz.toolsRequired : 
                        (quiz.toolsRequired ? [String(quiz.toolsRequired)] : []),
          resources: Array.isArray(quiz.resources) ? quiz.resources : 
                    (quiz.resources ? [String(quiz.resources)] : []),
          instructor: quiz.admin?.username || 'Quest Instructor',
          image: quiz.thumbnailUrl || 'https://via.placeholder.com/300x200?text=Quest+Image',
          level: (quiz.level || 'Beginner').toString().trim(),
          rating: Number(quiz.averageRating) || 4.5,
          totalStudents: Number(quiz.enrolledCount) || 0,
      favorite: false,
          tasks: Array.isArray(quiz.questions) ? quiz.questions.length : 0
        };
        
        console.log(`Processed quiz ${index}:`, processedQuiz.id, processedQuiz.title, processedQuiz.level);
        return processedQuiz;
      }).filter(Boolean); // Remove any null entries

      console.log('Processed quizzes:', quizzes.length);
      
      if (quizzes.length === 0) {
        console.warn('No quizzes found in API response');
        console.log('Original response data:', JSON.stringify(response.data));
      } else {
        console.log('First quiz sample:', JSON.stringify(quizzes[0]));
      }

      // Get featured quiz (first quiz or specific one)
      const featuredQuiz = quizzes[0] || null;
      console.log('Featured quiz set to:', featuredQuiz ? featuredQuiz.title : 'None');
      
      // SIMPLIFIED APPROACH: Add all quizzes to beginner category if none match existing levels
      let beginnerQuests = quizzes.filter(q => {
        const level = (q.level || '').toLowerCase();
        return level.includes('beginner') || level.includes('easy') || level.includes('starter');
      });
      
      let intermediateQuests = quizzes.filter(q => {
        const level = (q.level || '').toLowerCase();
        return level.includes('intermediate') || level.includes('medium') || level.includes('moderate');
      });
      
      let advancedQuests = quizzes.filter(q => {
        const level = (q.level || '').toLowerCase();
        return level.includes('advanced') || level.includes('hard') || level.includes('expert');
      });
      
      // If no quizzes were categorized, put them all in beginner category
      if (beginnerQuests.length === 0 && intermediateQuests.length === 0 && advancedQuests.length === 0 && quizzes.length > 0) {
        console.log('No quizzes matched any level categories, putting all in beginner');
        beginnerQuests = [...quizzes]; // Add all quizzes to beginner
      }
      
      // Always ensure we have popular quests by taking the first few if none match the rating criteria
      let popularQuests = quizzes.filter(q => q.rating >= 4.0);
      if (popularQuests.length === 0 && quizzes.length > 0) {
        popularQuests = quizzes.slice(0, Math.min(quizzes.length, 4));
        console.log('No high-rated quizzes found, using first few as popular quests');
      }

      console.log('Categories:', { 
        beginnerQuests: beginnerQuests.length,
        intermediateQuests: intermediateQuests.length,
        advancedQuests: advancedQuests.length,
        popularQuests: popularQuests.length
      });
      
      // Ensure we have continue tasks (use all quizzes if available)
      const continueTasks = quizzes.slice(0, Math.min(quizzes.length, 4));
      
      // Create a final result object for debugging
      const result = {
        featuredQuiz,
        continueTasks,
        beginnerQuests,
        intermediateQuests,
        advancedQuests,
        popularQuests
      };
      
      console.log('FINAL DATA OBJECT:', {
        featuredQuiz: featuredQuiz ? 'Present' : 'Missing',
        categories: {
          continueTasks: continueTasks.length,
          beginnerQuests: beginnerQuests.length,
          intermediateQuests: intermediateQuests.length,
          advancedQuests: advancedQuests.length,
          popularQuests: popularQuests.length
        }
      });
      
      return result;
    } catch (error) {
      console.error('Error fetching homepage data:', error);
      console.error('Error details:', error.response?.data || error.message);
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch homepage data');
    }
  }
);

// Fetch task by ID
export const fetchTaskById = createAsyncThunk(
  'quiz/fetchTaskById',
  async ({ quizId, taskId }, { rejectWithValue }) => {
    try {
      console.log(`Attempting to fetch task - quizId: ${quizId}, taskId: ${taskId}`);
      
      // Log full details for debugging
      console.log('Task fetch details:', {
        API_URL,
        quizId,
        taskId,
        authToken: !!localStorage.getItem('userToken')
      });
      
      // Try all available endpoints until one works, with better error logging
      const attempts = [
        // First try direct question endpoint (new)
        { 
          path: `/questions/${taskId}`, 
          name: 'direct question endpoint'
        },
        // Also try direct task endpoint
        { 
          path: `/tasks/${taskId}`, 
          name: 'direct task endpoint'
        },
        // Then try tasks endpoint with quiz ID
        { 
          path: `/quizzes/${quizId}/tasks/${taskId}`, 
          name: 'tasks endpoint with quizId'
        },
        // Then try questions endpoint with quiz ID
        { 
          path: `/quizzes/${quizId}/questions/${taskId}`, 
          name: 'questions endpoint with quizId'
        }
      ];
      
      const errors = [];
      
      // Try each endpoint in sequence
      for (const attempt of attempts) {
        try {
          console.log(`Trying ${attempt.name}: ${attempt.path}`);
          const response = await axiosInstance.get(attempt.path, {
            headers: {
              'Cache-Control': 'no-cache',
              'Pragma': 'no-cache'
            },
            timeout: 5000 // Lower timeout for faster fallback attempts
          });
          
          if (response.data) {
            console.log(`Task fetch successful via ${attempt.name}:`, response.data);
            
            // More detailed validation logging
            console.log('Task data inspection:', {
              hasId: !!response.data.id,
              id: response.data.id,
              hasQuestionText: !!response.data.questionText,
              questionText: response.data.questionText,
              hasDescription: !!response.data.description,
              isDescriptionArray: Array.isArray(response.data.description),
              descriptionLength: Array.isArray(response.data.description) ? response.data.description.length : 'not an array'
            });
            
            // Validate the data - more permissive validation
            if (!response.data.id) {
              console.warn(`Response from ${attempt.path} is missing id field:`, response.data);
              continue; // Try the next endpoint
            }
            
            // Success! Return the data with consistent format
            return {
              ...response.data,
              id: response.data.id,
              quizId: response.data.quizId || quizId,
              questionId: response.data.questionId || 1,
              questionText: response.data.questionText || response.data.title || 'Task',
              description: Array.isArray(response.data.description) ? response.data.description : 
                        (response.data.description ? [response.data.description] : []),
              objective: Array.isArray(response.data.objective) ? response.data.objective : 
                        (response.data.objective ? [response.data.objective] : []),
              hints: Array.isArray(response.data.hints) ? response.data.hints : 
                      (response.data.hints ? [response.data.hints] : []),
              bookHints: Array.isArray(response.data.bookHints) ? response.data.bookHints : 
                        (response.data.bookHints ? [response.data.bookHints] : []),
              resources: Array.isArray(response.data.resources) ? response.data.resources : 
                        (response.data.resources ? [response.data.resources] : []),
              isLoaded: true
            };
          }
        } catch (attemptError) {
          // Log the error details
          const errorMessage = attemptError.response?.data?.message || attemptError.message;
          const statusCode = attemptError.response?.status;
          
          console.log(`Error from ${attempt.name} (${attempt.path}):`, errorMessage, statusCode);
          
          // Add more detailed logging for specific status codes
          if (statusCode === 401) {
            console.log('Authentication error - token may be invalid or expired');
          } else if (statusCode === 404) {
            console.log('Resource not found - task or quiz ID may be incorrect');
          } else if (statusCode === 500) {
            console.log('Server error - check server logs for details');
          }
          
          // Inspect headers if available
          if (attemptError.response?.headers) {
            console.log('Response headers:', attemptError.response.headers);
          }
          
          errors.push({ 
            endpoint: attempt.path, 
            message: errorMessage,
            status: statusCode 
          });
        }
      }
      
      // If we get here, all attempts failed - try one last desperate approach
      console.log("All standard endpoints failed, trying to fetch all questions as last resort");
      
      try {
        const allQuestionsResponse = await axiosInstance.get(`/quizzes/${quizId}/questions`);
        
        if (allQuestionsResponse.data && Array.isArray(allQuestionsResponse.data.questions)) {
          const questions = allQuestionsResponse.data.questions;
          console.log(`Found ${questions.length} questions in quiz, searching for task ID ${taskId}`);
          
          // Try exact match first
          let foundTask = questions.find(q => q.id === taskId);
          
          // If not found, try case-insensitive match
          if (!foundTask) {
            const taskIdLower = taskId.toLowerCase();
            foundTask = questions.find(q => q.id.toLowerCase() === taskIdLower);
          }
          
          // If still not found, try matching with dashes removed
          if (!foundTask) {
            const normalizedTaskId = taskId.toLowerCase().replace(/-/g, '');
            foundTask = questions.find(q => {
              const normalizedId = q.id.toLowerCase().replace(/-/g, '');
              return normalizedId === normalizedTaskId;
            });
          }
          
          if (foundTask) {
            console.log("Found task in questions array:", foundTask);
            return {
              ...foundTask,
              id: foundTask.id || taskId,
              quizId: foundTask.quizId || quizId,
              questionId: foundTask.questionId || 1,
              questionText: foundTask.questionText || foundTask.title || 'Task',
              description: Array.isArray(foundTask.description) ? foundTask.description : 
                          (foundTask.description ? [foundTask.description] : []),
              objective: Array.isArray(foundTask.objective) ? foundTask.objective : 
                        (foundTask.objective ? [foundTask.objective] : []),
              hints: Array.isArray(foundTask.hints) ? foundTask.hints : 
                      (foundTask.hints ? [foundTask.hints] : []),
              bookHints: Array.isArray(foundTask.bookHints) ? foundTask.bookHints : 
                        (foundTask.bookHints ? [foundTask.bookHints] : []),
              resources: Array.isArray(foundTask.resources) ? foundTask.resources : 
                        (foundTask.resources ? [foundTask.resources] : []),
              isLoaded: true
            };
          }
          
          // Log available task IDs for debugging
          console.log("Available question IDs:", questions.map(q => q.id).join(', '));
        }
      } catch (fallbackError) {
        console.error("Error in fallback approach:", fallbackError);
        errors.push({ 
          endpoint: `/quizzes/${quizId}/questions`, 
          message: fallbackError.message,
          status: fallbackError.response?.status 
        });
      }
      
      // Try direct API call with fetch as a last resort
      console.log("Trying direct fetch API call as last resort");
      try {
        const directResponse = await fetch(`${API_URL}/questions/${taskId}`, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          },
          credentials: 'include'
        });
        
        if (directResponse.ok) {
          const data = await directResponse.json();
          console.log("Direct fetch successful:", data);
          return {
            ...data,
            id: data.id,
            quizId: data.quizId || quizId,
            questionId: data.questionId || 1,
            questionText: data.questionText || data.title || 'Task',
            description: Array.isArray(data.description) ? data.description : 
                        (data.description ? [data.description] : []),
            objective: Array.isArray(data.objective) ? data.objective : 
                      (data.objective ? [data.objective] : []),
            hints: Array.isArray(data.hints) ? data.hints : 
                    (data.hints ? [data.hints] : []),
            bookHints: Array.isArray(data.bookHints) ? data.bookHints : 
                      (data.bookHints ? [data.bookHints] : []),
            resources: Array.isArray(data.resources) ? data.resources : 
                      (data.resources ? [data.resources] : []),
            isLoaded: true
          };
        } else {
          console.error("Direct fetch failed:", directResponse.status);
          errors.push({
            endpoint: `/questions/${taskId}`,
            message: `HTTP Error ${directResponse.status}`,
            status: directResponse.status
          });
        }
      } catch (directFetchError) {
        console.error("Direct fetch error:", directFetchError);
        errors.push({
          endpoint: `/questions/${taskId}`,
          message: directFetchError.message,
          status: 'Network Error'
        });
      }
      
      // If we get here, all attempts failed
      console.error('All task fetch attempts failed');
      
      return rejectWithValue({
        message: 'Failed to fetch task details after multiple attempts',
        errors,
        taskId,
        quizId,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Top-level error fetching task:', error);
      return rejectWithValue({
        message: error.response?.data?.message || 'Failed to fetch task details',
        status: error.response?.status,
        taskId,
        quizId,
        timestamp: new Date().toISOString()
      });
    }
  }
);

// Update task progress
export const updateTaskProgress = createAsyncThunk(
  'quiz/updateTaskProgress',
  async ({ courseId, taskId, completed }, { rejectWithValue }) => {
    try {
      // In a real implementation, you would call an API endpoint to update progress
      // For now, we'll just return the data to update state
      return { courseId, taskId, completed };
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to update task progress');
    }
  }
);

// Toggle a quiz as favorite
export const toggleFavorite = createAsyncThunk(
  'quiz/toggleFavorite',
  async ({ courseId, category }, { rejectWithValue, getState }) => {
    try {
      const { auth } = getState();
      if (!auth.isAuthenticated) {
        throw new Error('Please login to add to favorites');
      }
      
      // In a real implementation, you would call an API endpoint
      // For now, we'll just return the data to update state
      return { courseId, category };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// Submit answer for a task
export const submitTaskAnswer = createAsyncThunk(
  'quiz/submitTaskAnswer',
  async ({ quizId, taskId, answer, timeSpent, clientEvaluation }, { rejectWithValue, getState }) => {
    try {
      console.log(`Submitting task answer:`, {
        quizId,
        taskId,
        answer: answer.substring(0, 50) + (answer.length > 50 ? '...' : ''),
        timeSpent,
        clientEvaluation: clientEvaluation ? {
          isCorrect: clientEvaluation.isCorrect,
          score: clientEvaluation.score,
          confidence: clientEvaluation.confidence
        } : null
      });
      
      // Get token from auth state
      const state = getState();
      const token = state.auth.token;

      if (!token) {
        console.error('No authentication token available');
        return rejectWithValue('Authentication required');
      }
      
      if (!quizId || !taskId) {
        console.error('Missing quiz ID or task ID');
        return rejectWithValue('Missing required fields');
      }
      
      // Format answer for submission
      const trimmedAnswer = answer ? answer.trim() : '';
      
      if (!trimmedAnswer) {
        console.error('Empty answer submitted');
        return rejectWithValue('Answer cannot be empty');
      }
      
      // Prepare submission data
      const submissionData = {
        answer,
        timeSpent,
        clientEvaluation: clientEvaluation || null
      };
      
      console.log(`Making API request to: /quizzes/${quizId}/questions/${taskId}/submit with data:`, {
        answer: answer.substring(0, 50) + (answer.length > 50 ? '...' : ''),
        timeSpent,
        clientEvaluation: clientEvaluation ? {
          isCorrect: clientEvaluation.isCorrect,
          score: clientEvaluation.score,
          confidence: clientEvaluation.confidence
        } : null
      });
      
      // Setup a promise that will be resolved when we receive the complete response
      let completeDataPromise = new Promise((resolve) => {
        // Function to handle the complete data
        const handleComplete = (data) => {
          if (data && data.quizId === quizId && data.questionId === taskId) {
            console.log('Received complete answer data via socket:', data);
            resolve(data);
            window.socket?.off('answerProcessed', handleComplete);
          }
        };
        
        // Set up listener if socket is available
        if (window.socket && window.socket.connected) {
          console.log('Setting up answerProcessed socket listener');
          window.socket.on('answerProcessed', handleComplete);
          
          // Add a timeout to prevent waiting forever
          setTimeout(() => {
            console.log('Socket response timeout - using preliminary data');
            window.socket.off('answerProcessed', handleComplete);
            resolve(null); // Resolve with null to indicate timeout
          }, 5000); // 5 second timeout
        } else {
          // If no socket, resolve immediately with null
          console.log('No socket connection available');
          resolve(null);
        }
      });
      
      // Make the API request for initial submission
      console.log(`Making API request to: /quizzes/${quizId}/questions/${taskId}/submit`);
      
      // Try using a direct fetch for more reliable submission
      let directData = null;
      try {
        console.log('Trying direct fetch for submission');
        const directResponse = await fetch(`${API_URL}/quizzes/${quizId}/questions/${taskId}/submit`, {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(submissionData),
          credentials: 'include'
        });
        
        if (directResponse.ok) {
          console.log('Direct submission successful');
          directData = await directResponse.json();
          console.log('Direct submission response:', directData);
        } else {
          console.warn('Direct submission failed:', directResponse.status);
        }
      } catch (directError) {
        console.error('Error with direct fetch submission:', directError);
      }
      
      // Continue with axios request as fallback
      const response = await axiosInstance.post(
        `/quizzes/${quizId}/questions/${taskId}/submit`,
        submissionData,
        { timeout: 8000 } // Shorter timeout since we expect a quick preliminary response
      );
      
      console.log('Received server response:', response.data);
      
      // Create a baseline response object with the preliminary data
      const prelimData = {
        success: true,
        questionId: taskId,
        quizId,
        timeSpent,
        answer: answer || '',
        isCorrect: directData?.isCorrect === true || response.data?.isCorrect === true,
        pointsEarned: directData?.pointsEarned || response.data?.pointsEarned || 0,
        progress: directData?.progress || response.data?.progress || null,
        leaderboard: directData?.leaderboard || response.data?.leaderboard || null,
        preliminary: true,
        message: directData?.message || response.data?.message || "Answer submission complete"
      };
      
      // For correct answers, we should have a resultId field from the backend
      if (prelimData.isCorrect) {
        prelimData.resultId = directData?.resultId || response.data?.resultId || null;
      }
      
      // Wait for the complete data from socket or timeout
      const completeData = await completeDataPromise;
      
      // If we got complete data via socket, use it
      if (completeData) {
        console.log('Using complete socket data for result');
        
        // Ensure we have valid data
        const validatedData = {
          ...prelimData,
          ...completeData,
          isCorrect: completeData.isCorrect,
          message: completeData.message || prelimData.message,
          preliminary: false
        };
        
        return validatedData;
      }
      
      // If no complete data received, use the preliminary data
      console.log('No complete data received, using preliminary data with isCorrect:', prelimData.isCorrect);
      return prelimData;
    } catch (error) {
      console.error('Error submitting task answer:', error);
      return rejectWithValue(error.response?.data?.message || 'Failed to submit answer');
    }
  }
);

const initialState = {
  quizzes: [],
  currentQuiz: null,
  currentTask: null,
  homePageData: {
    featuredQuiz: null,
    continueTasks: [],
    beginnerQuests: [],
    intermediateQuests: [],
    advancedQuests: [],
    popularQuests: []
  },
  favorites: [],
  loading: false,
  error: null,
  lastUpdated: null
};

const quizSlice = createSlice({
  name: 'quiz',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setQuizzes: (state, action) => {
      console.log(`setQuizzes: Setting ${action.payload.length} quizzes`);
      // Check if the payload is a valid array, otherwise set empty array
      state.quizzes = Array.isArray(action.payload) ? action.payload : [];
      state.loading = false;
      state.error = null;
      state.lastUpdated = new Date().toISOString();
      console.log('setQuizzes: Finished setting quizzes');
    },
    setCurrentTask: (state, action) => {
      console.log("Manual setCurrentTask called with:", action.payload.id);
      
      // Ensure the task has all required fields with fallbacks
      const task = action.payload;
      
      // Store the processed task in state
      state.currentTask = {
        ...task,
        id: task.id,
        questionText: task.questionText || task.title || 'Untitled Task',
        description: Array.isArray(task.description) ? task.description : 
                   (task.description ? [task.description] : []),
        objective: Array.isArray(task.objective) ? task.objective : 
                  (task.objective ? [task.objective] : []),
        hints: Array.isArray(task.hints) ? task.hints : 
               (task.hints ? [task.hints] : []),
        bookHints: Array.isArray(task.bookHints) ? task.bookHints : 
                  (task.bookHints ? [task.bookHints] : []),
        resources: Array.isArray(task.resources) ? task.resources : 
                  (task.resources ? [task.resources] : []),
        isLoaded: true,
        lastUpdated: new Date().toISOString()
      };
      
      state.error = null;
      state.loading = false;
      
      console.log("Current task updated in Redux store:", state.currentTask.id);
    },
    markTaskCompleted: (state, action) => {
      const { questionId, isCorrect } = action.payload;
      
      // Update the current task with completion status if it's loaded
      if (state.currentTask && state.currentTask.id === questionId) {
        state.currentTask.isCompleted = true;
        state.currentTask.isCorrect = isCorrect;
      }
      
      // Also update the task in the questions list if loaded
      if (state.currentQuiz && state.currentQuiz.questions) {
        const question = state.currentQuiz.questions.find(q => q.id === questionId);
        if (question) {
          question.isCompleted = true;
          question.isCorrect = isCorrect;
        }
      }
    },
    answerProcessed: (state, action) => {
      // eslint-disable-next-line no-unused-vars
      const { questionId, quizId, isCorrect } = action.payload;
      
      // Update current task if it matches
      if (state.currentTask && state.currentTask.id === questionId) {
        state.currentTask.isCompleted = true;
        state.currentTask.isCorrect = isCorrect;
      }
      
      // Mark last updated timestamp
      state.lastUpdated = new Date().toISOString();
    },
    setFavorite: (state, action) => {
      const { id, favorite } = action.payload;
      
      // Update in quizzes array
      const quizIndex = state.quizzes.findIndex(quiz => quiz.id === id);
      if (quizIndex >= 0) {
        state.quizzes[quizIndex].favorite = favorite;
      }
      
      // Update in homepageData if present
      const updateInArray = (array) => {
        const index = array.findIndex(quiz => quiz.id === id);
        if (index >= 0) {
          array[index].favorite = favorite;
        }
      };
      
      if (state.homePageData.featuredQuiz?.id === id) {
        state.homePageData.featuredQuiz.favorite = favorite;
      }
      
      updateInArray(state.homePageData.popularQuests);
      updateInArray(state.homePageData.beginnerQuests);
      updateInArray(state.homePageData.intermediateQuests);
      updateInArray(state.homePageData.advancedQuests);
      
      // Update currentQuiz if it matches
      if (state.currentQuiz?.id === id) {
        state.currentQuiz.favorite = favorite;
      }
    }
  },
  extraReducers: (builder) => {
    builder
      // Fetch Quizzes
      .addCase(fetchQuizzes.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchQuizzes.fulfilled, (state, action) => {
        state.loading = false;
        state.quizzes = Array.isArray(action.payload) ? action.payload : [];
        state.lastUpdated = new Date().toISOString();
      })
      .addCase(fetchQuizzes.rejected, (state, action) => {
        state.loading = false;
        state.error = typeof action.payload === 'object' 
          ? action.payload.message || JSON.stringify(action.payload) 
          : action.payload || action.error.message;
      })
      
      // Fetch Quiz by ID
      .addCase(fetchQuizById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchQuizById.fulfilled, (state, action) => {
        state.loading = false;
        state.currentQuiz = action.payload || null;
      })
      .addCase(fetchQuizById.rejected, (state, action) => {
        state.loading = false;
        state.error = typeof action.payload === 'object' 
          ? action.payload.message || JSON.stringify(action.payload) 
          : action.payload || action.error.message;
      })
      
      // Fetch Homepage Data
      .addCase(fetchHomePageData.pending, (state) => {
        state.loading = true;
        state.error = null;
        console.log('fetchHomePageData.pending: Setting loading state');
      })
      .addCase(fetchHomePageData.fulfilled, (state, action) => {
        console.log('fetchHomePageData.fulfilled: Processing payload', action.payload);
        state.loading = false;
        
        // Check if the payload is a valid object
        if (action.payload && typeof action.payload === 'object') {
          console.log('VALID PAYLOAD: Keys in payload:', Object.keys(action.payload));
          
          // Log all categories with counts
          Object.entries(action.payload).forEach(([key, value]) => {
            if (Array.isArray(value)) {
              console.log(`Category ${key}: ${value.length} items`);
            } else if (value === null) {
              console.log(`Category ${key}: null`);
            } else if (typeof value === 'object') {
              console.log(`Category ${key}: object with keys ${Object.keys(value)}`);
            } else {
              console.log(`Category ${key}: ${value}`);
            }
          });
          
          // IMPORTANT: Make sure we have quizzes loaded in the state
          if (Array.isArray(action.payload.continueTasks) && action.payload.continueTasks.length > 0) {
            console.log('Adding quizzes from continueTasks to state.quizzes');
            // Use a Set to avoid duplicates when merging
            const existingIds = new Set(state.quizzes.map(q => q.id));
            const newQuizzes = action.payload.continueTasks.filter(q => !existingIds.has(q.id));
            if (newQuizzes.length > 0) {
              state.quizzes = [...state.quizzes, ...newQuizzes];
              console.log(`Added ${newQuizzes.length} new quizzes to state`);
            }
          }
          
          // Safely destructure with defaults to handle missing properties
          const { 
            featuredQuiz = null,
            continueTasks = [],
            beginnerQuests = [],
            intermediateQuests = [],
            advancedQuests = [],
            popularQuests = []
          } = action.payload;
          
          // Extra validation for each category
          const safeFeatureQuiz = featuredQuiz && typeof featuredQuiz === 'object' ? featuredQuiz : null;
          const safeContinueTasks = Array.isArray(continueTasks) ? continueTasks.filter(Boolean) : [];
          const safeBeginnerQuests = Array.isArray(beginnerQuests) ? beginnerQuests.filter(Boolean) : [];
          const safeIntermediateQuests = Array.isArray(intermediateQuests) ? intermediateQuests.filter(Boolean) : [];
          const safeAdvancedQuests = Array.isArray(advancedQuests) ? advancedQuests.filter(Boolean) : [];
          const safePopularQuests = Array.isArray(popularQuests) ? popularQuests.filter(Boolean) : [];
          
          // IMPORTANT: If we don't have beginner quests but have quizzes, use all quizzes as beginner
          const finalBeginnerQuests = safeBeginnerQuests.length > 0 ? 
            safeBeginnerQuests : 
            (state.quizzes.length > 0 ? state.quizzes : []);
            
          // Log validation results
          console.log('VALIDATION RESULTS:', {
            featuredQuiz: safeFeatureQuiz ? 'Valid' : 'Invalid',
            continueTasks: `${safeContinueTasks.length} valid items`,
            beginnerQuests: `${finalBeginnerQuests.length} valid items`,
            intermediateQuests: `${safeIntermediateQuests.length} valid items`,
            advancedQuests: `${safeAdvancedQuests.length} valid items`,
            popularQuests: `${safePopularQuests.length} valid items`
          });
          
          // Update state with validated data
          state.homePageData = {
            featuredQuiz: safeFeatureQuiz,
            continueTasks: safeContinueTasks.length > 0 ? safeContinueTasks : state.quizzes.slice(0, 4),
            beginnerQuests: finalBeginnerQuests,
            intermediateQuests: safeIntermediateQuests.length > 0 ? safeIntermediateQuests : state.quizzes.slice(0, 4),
            advancedQuests: safeAdvancedQuests,
            popularQuests: safePopularQuests.length > 0 ? safePopularQuests : state.quizzes.slice(0, 4)
          };
          
          console.log('STATE UPDATED: homePageData now contains', {
            featuredQuiz: state.homePageData.featuredQuiz ? 'Present' : 'Missing',
            continueTasks: state.homePageData.continueTasks.length,
            beginnerQuests: state.homePageData.beginnerQuests.length,
            intermediateQuests: state.homePageData.intermediateQuests.length,
            advancedQuests: state.homePageData.advancedQuests.length,
            popularQuests: state.homePageData.popularQuests.length
          });
        } else {
          // Reset to default if payload is invalid
          console.error('INVALID PAYLOAD:', action.payload);
          console.log('Using quizzes directly from state:', state.quizzes.length);
          
          // If we have quizzes in state but invalid payload, use quizzes directly
          if (state.quizzes.length > 0) {
            const quizzes = state.quizzes;
            state.homePageData = {
              featuredQuiz: quizzes[0] || null,
              continueTasks: quizzes.slice(0, 4),
              beginnerQuests: quizzes,
              intermediateQuests: quizzes.slice(0, Math.min(quizzes.length, 4)),
              advancedQuests: [],
              popularQuests: quizzes.slice(0, Math.min(quizzes.length, 4))
            };
            console.log('STATE UPDATED from quizzes array:', {
              quizzesCount: quizzes.length,
              continueTasks: state.homePageData.continueTasks.length,
              beginnerQuests: state.homePageData.beginnerQuests.length
            });
          } else {
            state.homePageData = initialState.homePageData;
            console.log('STATE RESET: homePageData reset to initial state');
          }
        }
        
        state.lastUpdated = new Date().toISOString();
      })
      .addCase(fetchHomePageData.rejected, (state, action) => {
        state.loading = false;
        state.error = typeof action.payload === 'object' 
          ? action.payload.message || JSON.stringify(action.payload) 
          : action.payload || action.error.message;
        console.error('fetchHomePageData.rejected:', state.error);
      })
      
      // Fetch Task by ID
      .addCase(fetchTaskById.pending, (state) => {
        state.loading = true;
        state.error = null;
        console.log('fetchTaskById.pending: Setting loading state to true');
      })
      .addCase(fetchTaskById.fulfilled, (state, action) => {
        state.loading = false;
        
        // Validate the received data
        if (!action.payload || typeof action.payload !== 'object') {
          console.error('Invalid task data received:', action.payload);
          state.error = 'Invalid task data received from server';
          return;
        }
        
        console.log('Received task data:', {
          id: action.payload.id,
          questionText: action.payload.questionText,
          dataComplete: !!action.payload.questionText
        });
        
        // Process the task data
        state.currentTask = {
          ...action.payload,
          // Ensure all properties exist with default values if needed
          id: action.payload.id,
          questionText: action.payload.questionText || 'Task Question',
          description: Array.isArray(action.payload.description) ? action.payload.description : 
                      (action.payload.description ? [action.payload.description] : []),
          objective: Array.isArray(action.payload.objective) ? action.payload.objective : 
                    (action.payload.objective ? [action.payload.objective] : []),
          hints: Array.isArray(action.payload.hints) ? action.payload.hints : 
                (action.payload.hints ? [action.payload.hints] : []),
          bookHints: Array.isArray(action.payload.bookHints) ? action.payload.bookHints : 
                    (action.payload.bookHints ? [action.payload.bookHints] : []),
          questions: Array.isArray(action.payload.questions) ? action.payload.questions : 
                    (action.payload.questions ? [action.payload.questions] : []),
          resources: Array.isArray(action.payload.resources) ? action.payload.resources : 
                    (action.payload.resources ? [action.payload.resources] : []),
          note: action.payload.note || '',
          questionId: action.payload.questionId || 1,
          isLoaded: true
        };
        
        console.log('Task data successfully loaded into state:', state.currentTask.questionText);
      })
      .addCase(fetchTaskById.rejected, (state, action) => {
        state.loading = false;
        
        // Extract detailed error information
        if (typeof action.payload === 'object' && action.payload !== null) {
          state.error = action.payload.message || action.payload.error || 'Failed to fetch task details';
          console.error('Error fetching task:', state.error, 'Status:', action.payload.status || 'unknown');
        } else {
          state.error = action.payload || action.error?.message || 'Failed to fetch task details';
          console.error('Error fetching task:', state.error);
        }
        
        // Clear current task or set error flag
        state.currentTask = null;
      })
      
      // Update Task Progress
      .addCase(updateTaskProgress.fulfilled, (state, action) => {
        const { courseId, taskId, completed } = action.payload;
        
        // Update the task in the current quiz if loaded
        if (state.currentQuiz && state.currentQuiz.id === courseId) {
          const taskIndex = state.currentQuiz.questions.findIndex(t => t.id === taskId);
          if (taskIndex >= 0) {
            state.currentQuiz.questions[taskIndex].completed = completed;
          }
        }
        
        // Update the current task if it's the one being modified
        if (state.currentTask && state.currentTask.id === taskId) {
          state.currentTask.completed = completed;
        }
      })
      
      // Toggle Favorite
      .addCase(toggleFavorite.fulfilled, (state, action) => {
        const { courseId } = action.payload;
        
        if (state.favorites.includes(courseId)) {
          state.favorites = state.favorites.filter(id => id !== courseId);
        } else {
          state.favorites.push(courseId);
        }
      })
      .addCase(toggleFavorite.rejected, (state, action) => {
        state.error = typeof action.payload === 'object' 
          ? action.payload.message || JSON.stringify(action.payload) 
          : action.payload || action.error.message;
      })
      
      // Submit Task Answer
      .addCase(submitTaskAnswer.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(submitTaskAnswer.fulfilled, (state, action) => {
        state.loading = false;
        
        // Update the current task with completion status
        if (state.currentTask && state.currentTask.id === action.payload.questionId) {
          state.currentTask.isCompleted = true;
          state.currentTask.timeSpent = action.payload.timeSpent;
        }
      })
      .addCase(submitTaskAnswer.rejected, (state, action) => {
        state.loading = false;
        // Extract error message if it's an object
        if (typeof action.payload === 'object' && action.payload !== null) {
          state.error = action.payload.message || action.payload.error || 'Failed to submit answer';
        } else {
          state.error = action.payload || 'Failed to submit answer';
        }
      });
  }
});

export const { clearError, setQuizzes, setCurrentTask, markTaskCompleted, answerProcessed, setFavorite } = quizSlice.actions;
export default quizSlice.reducer;