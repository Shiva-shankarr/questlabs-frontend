import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';
import { submitTaskAnswer } from './quizSlice';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Create axios instance with default config
const axiosInstance = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add request interceptor to add auth token
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('userToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Helper function to load cached state from localStorage
const loadCachedState = (quizId) => {
  try {
    const cachedState = localStorage.getItem(`course_state_${quizId}`);
    if (cachedState) {
      const parsedState = JSON.parse(cachedState);
      // Check if cache is still valid (less than 5 minutes old)
      const cacheAge = Date.now() - parsedState.timestamp;
      if (cacheAge < 5 * 60 * 1000) {
        console.log(`Using cached course state for quiz ${quizId}, age: ${Math.round(cacheAge/1000)}s`);
        return parsedState.data;
      } else {
        console.log(`Cached course state expired for quiz ${quizId}, age: ${Math.round(cacheAge/1000)}s`);
      }
    }
  } catch (error) {
    console.error('Error loading cached course state:', error);
  }
  return null;
};

// Helper function to save state to localStorage
const saveCachedState = (quizId, data) => {
  try {
    const stateToCache = {
      timestamp: Date.now(),
      data
    };
    localStorage.setItem(`course_state_${quizId}`, JSON.stringify(stateToCache));
  } catch (error) {
    console.error('Error caching course state:', error);
  }
};

// Helper for tracking processed updates in the reducer
const createUpdateTracker = () => {
  const processedUpdates = new Map();
  
  return (updateId, timestamp) => {
    if (!updateId) return true; // Allow if no updateId (legacy)
    
    // If we've seen this update before, check timestamp
    if (processedUpdates.has(updateId)) {
      const storedTimestamp = processedUpdates.get(updateId);
      // Only process newer updates for the same ID
      if (timestamp && storedTimestamp && timestamp <= storedTimestamp) {
        return false;
      }
    }
    
    // Store this update with timestamp
    processedUpdates.set(updateId, timestamp || Date.now());
    
    // Clean up old entries (to prevent memory leaks)
    if (processedUpdates.size > 200) {
      // Get oldest entries
      const entries = Array.from(processedUpdates.entries());
      // Sort by timestamp (oldest first)
      entries.sort((a, b) => a[1] - b[1]);
      // Remove oldest 50 entries
      for (let i = 0; i < 50; i++) {
        if (entries[i]) {
          processedUpdates.delete(entries[i][0]);
        }
      }
    }
    
    return true;
  };
};

// Create the update trackers
const progressUpdateTracker = createUpdateTracker();
const leaderboardUpdateTracker = createUpdateTracker();

// Async thunks
export const fetchCourseDetails = createAsyncThunk(
  'course/fetchCourseDetails',
  async (quizId, { rejectWithValue, getState }) => {
    try {
      console.log(`Fetching course details for quiz ID: ${quizId}`);
      
      // First, check for cached state
      const cachedState = loadCachedState(quizId);
      if (cachedState) {
        console.log('Found cached course state, will use as fallback if API fails');
      }
      
      // Always make the API call to get the latest data
      console.log(`Making API request to: ${API_URL}/quizzes/${quizId}`);
      
      // Add debugging for authorization token
      const token = localStorage.getItem('userToken');
      console.log(`Auth token present: ${!!token}`);
      
      // Using fetch directly to bypass potential axios issues
      const response = await fetch(`${API_URL}/quizzes/${quizId}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      });
      
      if (!response.ok) {
        throw new Error(`API request failed with status: ${response.status}`);
      }
      
      const courseData = await response.json();
      console.log('API response status:', response.status);
      console.log('Course data received:', { 
        id: courseData?.id, 
        title: courseData?.title,
        questionsCount: courseData?.questions?.length || 0
      });
      
      if (!courseData || typeof courseData !== 'object') {
        console.error('Invalid course data received:', courseData);
        throw new Error('Invalid course data received from server');
      }
      
      // Normalize ID format to ensure consistency
      const normalizedId = quizId?.toString().trim();
      const dataId = courseData.id?.toString().trim();
      
      console.log('ID comparison:', { requestedId: normalizedId, receivedId: dataId });
      
      // Extra validation to ensure we got the correct course
      if (dataId && normalizedId && dataId !== normalizedId) {
        console.warn(`ID mismatch - requested: ${normalizedId}, received: ${dataId}`);
      }
      
      const processedData = {
        ...courseData,
        // Normalize ID to ensure it matches exactly what was requested
        id: normalizedId,
        // Ensure all array fields are properly formatted
        description: Array.isArray(courseData.description) ? courseData.description : 
                    (courseData.description ? [String(courseData.description)] : []),
        objective: Array.isArray(courseData.objective) ? courseData.objective : 
                  (courseData.objective ? [String(courseData.objective)] : []),
        resources: Array.isArray(courseData.resources) ? courseData.resources : 
                  (courseData.resources ? [String(courseData.resources)] : []),
        toolsRequired: Array.isArray(courseData.toolsRequired) ? courseData.toolsRequired : 
                      (courseData.toolsRequired ? [String(courseData.toolsRequired)] : []),
        // Keep other fields as is
        title: courseData.title || 'Untitled Course',
        thumbnailUrl: courseData.thumbnailUrl || '/default-quest-bg.jpg',
        questions: Array.isArray(courseData.questions) ? courseData.questions.map(q => ({
          ...q,
          id: q.id || q._id,
          questionId: q.questionId || 0,
          questionText: q.questionText || 'Untitled Question',
          description: Array.isArray(q.description) ? q.description : []
        })) : [],
        progress: courseData.progress || {
          completedTasks: 0,
          totalTasks: Array.isArray(courseData.questions) ? courseData.questions.length : 0,
          percentage: 0,
          currentTaskProgress: 0,
          timeSpentMinutes: 0,
          streak: 0
        },
        leaderboard: Array.isArray(courseData.leaderboard) ? courseData.leaderboard : [],
        lastUpdated: new Date().toISOString()
      };
      
      // Cache the new state
      saveCachedState(quizId, processedData);
      
      console.log('Processed course data successfully, returning:', {
        id: processedData.id,
        title: processedData.title
      });
      return processedData;
    } catch (error) {
      console.error('Error fetching course details:', error);
      console.log('Error response:', error.response?.data);
      console.log('Error status:', error.response?.status);
      
      // If API call fails, try to use cached state
      const cachedState = loadCachedState(quizId);
      if (cachedState) {
        console.log('Using cached course state due to API error');
        return cachedState;
      }
      
      return rejectWithValue({
        message: error.response?.data?.message || error.message || 'Failed to fetch course details',
        status: error.response?.status || 500,
        timestamp: new Date().toISOString()
      });
    }
  }
);

export const refreshCourseData = createAsyncThunk(
  'course/refreshCourseData',
  async (quizId, { rejectWithValue, dispatch }) => {
    try {
      console.log(`Refreshing course data for ID: ${quizId}`);
      
      // Add timestamp parameter to bypass cache
      const timestamp = Date.now();
      const url = `${API_URL}/quizzes/${quizId}?_=${timestamp}`;
      console.log(`Making refresh request to: ${url}`);
      
      // Get auth token
      const token = localStorage.getItem('userToken');
      if (!token) {
        console.warn('No authentication token available for refresh request');
      } else {
        console.log('Auth token is available for refresh request');
      }
      
      // Use fetch directly for consistency with fetchCourseDetails
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        cache: 'no-store', // Force fresh request
        credentials: 'include' // Include credentials for cookie-based auth
      });
      
      if (!response.ok) {
        console.error(`Refresh request failed with status: ${response.status}`);
        throw new Error(`API request failed with status: ${response.status}`);
      }
      
      const courseData = await response.json();
      console.log('Refresh response received successfully');
      
      // Check if we received valid data
      if (!courseData || typeof courseData !== 'object') {
        console.error('Invalid course data received:', courseData);
        throw new Error('Invalid course data received from server');
      }
      
      // Log progress and leaderboard data
      console.log('Received progress data:', courseData.progress);
      console.log('Received leaderboard data:', {
        entries: Array.isArray(courseData.leaderboard) ? courseData.leaderboard.length : 0,
        sample: Array.isArray(courseData.leaderboard) && courseData.leaderboard.length > 0 
          ? courseData.leaderboard[0] 
          : 'No entries'
      });
      
      // Normalize ID format to ensure consistency
      const normalizedId = quizId?.toString().trim();
      
      // Process the data similarly to fetchCourseDetails
      const processedData = {
        ...courseData,
        id: normalizedId,
        description: Array.isArray(courseData.description) ? courseData.description : 
                    (courseData.description ? [String(courseData.description)] : []),
        objective: Array.isArray(courseData.objective) ? courseData.objective : 
                  (courseData.objective ? [String(courseData.objective)] : []),
        resources: Array.isArray(courseData.resources) ? courseData.resources : 
                  (courseData.resources ? [String(courseData.resources)] : []),
        toolsRequired: Array.isArray(courseData.toolsRequired) ? courseData.toolsRequired : 
                      (courseData.toolsRequired ? [String(courseData.toolsRequired)] : []),
        title: courseData.title || 'Untitled Course',
        thumbnailUrl: courseData.thumbnailUrl || '/default-quest-bg.jpg',
        questions: Array.isArray(courseData.questions) ? courseData.questions.map(q => ({
          ...q,
          id: q.id || q._id,
          questionId: q.questionId || 0,
          questionText: q.questionText || 'Untitled Question',
          description: Array.isArray(q.description) ? q.description : []
        })) : [],
        progress: courseData.progress || {
          completedTasks: 0,
          totalTasks: Array.isArray(courseData.questions) ? courseData.questions.length : 0,
          percentage: 0,
          currentTaskProgress: 0,
          timeSpentMinutes: 0,
          streak: 0
        },
        leaderboard: Array.isArray(courseData.leaderboard) ? courseData.leaderboard : [],
        lastUpdated: new Date().toISOString()
      };
      
      // Additionally, dispatch explicit updates for progress and leaderboard
      // This helps ensure that the UI gets updated even if there are issues with state merging
      if (courseData.progress) {
        dispatch({
          type: 'course/updateProgress',
          payload: {
            quizId: normalizedId,
            progress: courseData.progress,
            updateId: `refresh-${timestamp}`,
            timestamp: new Date().toISOString()
          }
        });
      }
      
      if (Array.isArray(courseData.leaderboard)) {
        dispatch({
          type: 'course/updateLeaderboard',
          payload: {
            quizId: normalizedId,
            leaderboard: courseData.leaderboard,
            updateId: `refresh-${timestamp}`,
            timestamp: new Date().toISOString()
          }
        });
      }
      
      // Cache the new state
      saveCachedState(quizId, processedData);
      
      console.log('Refresh completed successfully, returning processed data');
      return processedData;
    } catch (error) {
      console.error('Error refreshing course data:', error);
      
      return rejectWithValue({
        message: error.response?.data?.message || error.message || 'Failed to refresh course data',
        status: error.response?.status || 500,
        timestamp: new Date().toISOString()
      });
    }
  }
);

export const fetchTaskDetails = createAsyncThunk(
  'course/fetchTaskDetails',
  async ({ quizId, id }, { rejectWithValue }) => {
    try {
      const response = await axios.get(`${API_URL}/quizzes/${quizId}/questions/${id}`);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch task details');
    }
  } 
);

export const startTask = createAsyncThunk(
  'course/startTask',
  async ({ quizId, taskId }, { rejectWithValue }) => {
    try {
      const response = await axios.post(`${API_URL}/quizzes/${quizId}/questions/${taskId}/start`);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to start task');
    }
  }
);

export const submitTaskResult = createAsyncThunk(
  'course/submitTaskResult',
  async ({ quizId, taskId, sessionId, timeSpent, selectedOptionId }, { rejectWithValue }) => {
    try {
      const response = await axios.post(`${API_URL}/quizzes/${quizId}/questions/${taskId}/submit`, {
        sessionId,
        timeSpent,
        selectedOptionId
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to submit task result');
    }
  }
);

const initialState = {
  currentCourse: null,
  currentTask: null,
  progress: {
    completedTasks: 0,
    totalTasks: 0,
    percentage: 0,
    currentTaskProgress: 0,
    timeSpentMinutes: 0,
    streak: 0
  },
  leaderboard: [],
  sessionId: null,
  timer: {
    isRunning: false,
    timeSpent: 0
  },
  loading: false,
  error: null,
  lastUpdated: null,
  socketUpdates: {
    latestUpdateId: null,
    updateTimestamp: null,
    latestProgressUpdateId: null
  }
};

const courseSlice = createSlice({
  name: 'course',
  initialState,
  reducers: {
    updateTimer: (state, action) => {
      state.timer.timeSpent = action.payload;
    },
    startTimer: (state) => {
      state.timer.isRunning = true;
    },
    stopTimer: (state) => {
      state.timer.isRunning = false;
    },
    resetTimer: (state) => {
      state.timer.timeSpent = 0;
      state.timer.isRunning = false;
    },
    updateLeaderboard: (state, action) => {
      const { quizId, leaderboard, updateId, timestamp } = action.payload;
      
      // Enhanced logging for debugging
      console.log(`Received leaderboard update in reducer:`, action.payload);
      
      // Check if we should process this update
      if (!leaderboardUpdateTracker(updateId, timestamp)) {
        console.log(`Skipping duplicate leaderboard update in reducer: ${updateId}`);
        return;
      }
      
      // Validate leaderboard data
      if (!leaderboard || !Array.isArray(leaderboard)) {
        console.error('Received invalid leaderboard data format:', leaderboard);
        return;
      }
      
      // Update the currentCourse leaderboard if it matches
      if (state.currentCourse && (state.currentCourse._id === quizId || state.currentCourse.id === quizId)) {
        state.currentCourse.leaderboard = leaderboard;
        state.leaderboard = leaderboard;
        console.log(`Updated leaderboard for current course`);
      }
      
      // Force a lastUpdated timestamp change to trigger UI refresh
      state.lastUpdated = new Date().toISOString();
    },
    updateProgress: (state, action) => {
      const { quizId, progress, updateId, timestamp } = action.payload;
      
      // Enhanced logging for debugging
      console.log(`Received progress update in reducer:`, action.payload);
      
      // Check if we should process this update
      if (!progressUpdateTracker(updateId, timestamp)) {
        console.log(`Skipping duplicate progress update in reducer: ${updateId}`);
        return;
      }
      
      // Validate progress data
      if (!progress) {
        console.error('Received invalid progress data format:', progress);
        return;
      }
      
      // Normalize progress data structure - handle both nested and flat formats
      const normalizedProgress = {
        completedTasks: progress.completedTasks || progress.completedQuestions || 0,
        totalTasks: progress.totalTasks || progress.totalQuestions || 0,
        percentage: progress.percentage || progress.percentComplete || 0,
        timeSpentMinutes: progress.timeSpentMinutes || 0,
        streak: progress.streak || 0,
        lastUpdated: progress.lastUpdated || timestamp || new Date().toISOString()
      };
      
      // Update the currentCourse progress if it matches
      if (state.currentCourse && (state.currentCourse._id === quizId || state.currentCourse.id === quizId)) {
        state.currentCourse.progress = normalizedProgress;
        state.progress = normalizedProgress;
        console.log(`Updated progress for current course`);
      }
      
      // Force a lastUpdated timestamp change to trigger UI refresh
      state.lastUpdated = new Date().toISOString();
    },
    handleQuizActivityUpdate: (state, action) => {
      // This is a general activity update for the quiz
      // We can use this to trigger a refresh if needed
      console.log(`Received quiz activity update: ${action.payload.message}`);
      
      // Update lastUpdated to show activity
      state.lastUpdated = new Date().toISOString();
    },
    clearCourseState: (state) => {
      return initialState;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCourseDetails.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCourseDetails.fulfilled, (state, action) => {
        state.loading = false;
        
        // Ensure we have valid data
        if (!action.payload || typeof action.payload !== 'object') {
          console.error('Invalid payload received in fetchCourseDetails.fulfilled:', action.payload);
          state.error = 'Invalid course data received';
          return;
        }
        
        console.log('Setting currentCourse with payload:', {
          id: action.payload.id,
          title: action.payload.title,
          questionsCount: action.payload.questions?.length || 0
        });
        
        // Process questions to ensure they have all required properties
        let processedQuestions = [];
        if (Array.isArray(action.payload.questions)) {
          processedQuestions = action.payload.questions.map(q => ({
            ...q,
            id: q.id || q._id || `generated-${Math.random().toString(36).substring(2, 9)}`,
            questionId: q.questionId || 0,
            questionText: q.questionText || 'Untitled Question',
            description: Array.isArray(q.description) ? q.description : 
                        (q.description ? [q.description] : []),
            isCompleted: !!q.isCompleted
          }));
        }
        
        // Set the current course
        state.currentCourse = {
          ...action.payload,
          questions: processedQuestions,
        };
        
        // Set progress data
        state.progress = {
          completedTasks: action.payload.progress?.completedTasks || 0,
          totalTasks: action.payload.progress?.totalTasks || action.payload.questions?.length || 0,
          percentage: action.payload.progress?.percentage || 0,
          currentTaskProgress: action.payload.progress?.currentTaskProgress || 0,
          timeSpentMinutes: action.payload.progress?.timeSpentMinutes || 0,
          streak: action.payload.progress?.streak || 0
        };
        
        state.leaderboard = Array.isArray(action.payload.leaderboard) ? action.payload.leaderboard : [];
        state.lastUpdated = action.payload.lastUpdated || new Date().toISOString();
        
        // Log success
        console.log('Course data successfully loaded into Redux state');
        
        // Reset socket update tracking on fresh load
        state.socketUpdates = {
          latestUpdateId: null,
          updateTimestamp: null,
          latestProgressUpdateId: null
        };
      })
      .addCase(fetchCourseDetails.rejected, (state, action) => {
        state.loading = false;
        state.error = typeof action.payload === 'object' 
          ? action.payload.message || JSON.stringify(action.payload) 
          : action.payload || action.error.message;
      })
      .addCase(refreshCourseData.pending, (state) => {
        // Don't set loading true for refresh to avoid UI flicker
        state.error = null;
      })
      .addCase(refreshCourseData.fulfilled, (state, action) => {
        // Ensure we have valid data
        if (!action.payload || typeof action.payload !== 'object') {
          console.error('Invalid payload received in refreshCourseData.fulfilled:', action.payload);
          state.error = 'Invalid course data received from refresh';
          return;
        }

        console.log('Setting refreshed course data:', {
          id: action.payload.id,
          title: action.payload.title,
          questionsCount: action.payload.questions?.length || 0
        });
        
        // Process questions to ensure they have all required properties
        let processedQuestions = [];
        if (Array.isArray(action.payload.questions)) {
          processedQuestions = action.payload.questions.map(q => ({
            ...q,
            id: q.id || q._id || `generated-${Math.random().toString(36).substring(2, 9)}`,
            questionId: q.questionId || 0,
            questionText: q.questionText || 'Untitled Question',
            description: Array.isArray(q.description) ? q.description : 
                        (q.description ? [q.description] : []),
            isCompleted: !!q.isCompleted
          }));
        }
        
        // Set the current course
        state.currentCourse = {
          ...action.payload,
          questions: processedQuestions,
        };
        
        // Update progress data
        state.progress = {
          completedTasks: action.payload.progress?.completedTasks || 0,
          totalTasks: action.payload.progress?.totalTasks || action.payload.questions?.length || 0,
          percentage: action.payload.progress?.percentage || 0,
          currentTaskProgress: action.payload.progress?.currentTaskProgress || 0,
          timeSpentMinutes: action.payload.progress?.timeSpentMinutes || 0,
          streak: action.payload.progress?.streak || 0
        };
        
        state.leaderboard = Array.isArray(action.payload.leaderboard) ? action.payload.leaderboard : [];
        state.lastUpdated = action.payload.lastUpdated || new Date().toISOString();
        
        // Log success
        console.log('Course data successfully refreshed in Redux state');
      })
      .addCase(refreshCourseData.rejected, (state, action) => {
        state.error = typeof action.payload === 'object' 
          ? action.payload.message || JSON.stringify(action.payload) 
          : action.payload || action.error.message;
      })
      .addCase(fetchTaskDetails.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTaskDetails.fulfilled, (state, action) => {
        state.loading = false;
        state.currentTask = action.payload;
        if (action.payload.progress) {
          state.progress = action.payload.progress;
        }
      })
      .addCase(fetchTaskDetails.rejected, (state, action) => {
        state.loading = false;
        state.error = typeof action.payload === 'object' 
          ? action.payload.message || JSON.stringify(action.payload) 
          : action.payload || action.error.message;
      })
      .addCase(startTask.fulfilled, (state, action) => {
        state.sessionId = action.payload.sessionId;
        state.timer.isRunning = true;
        state.timer.timeSpent = 0;
      })
      .addCase(submitTaskResult.fulfilled, (state, action) => {
        state.timer.isRunning = false;
        if (action.payload.isCorrect) {
          state.progress.completedTasks += 1;
          state.progress.percentage = Math.round(
            (state.progress.completedTasks / state.progress.totalTasks) * 100
          );
        }
      })
      .addCase(submitTaskAnswer.fulfilled, (state, action) => {
        console.log('submitTaskAnswer.fulfilled received data:', action.payload);
        
        // For correct answers, update progress
        if (action.payload?.isCorrect) {
          // Add a log for the progress data
          if (action.payload?.progress) {
            console.log('Updating progress data from submitTaskAnswer:', action.payload.progress);
            
            // Normalize the progress format from server
            const normalizedProgress = {
              completedTasks: action.payload.progress.completedTasks || 0,
              totalTasks: action.payload.progress.totalTasks || 0,
              percentage: action.payload.progress.percentage || 0,
              timeSpentMinutes: action.payload.progress.timeSpentMinutes || 0,
              streak: action.payload.progress.streak || 0,
              lastUpdated: action.payload.progress.lastUpdated || new Date().toISOString(),
              quizId: action.payload.quizId || action.payload.progress.quizId
            };
            
            // Update local state
            state.progress = normalizedProgress;
            
            // Also update progress in current course if it matches the quiz
            if (state.currentCourse && state.currentCourse._id === normalizedProgress.quizId) {
              state.currentCourse.progress = normalizedProgress;
              
              // If this progress is for a question in the current course, mark it as completed
              if (state.currentCourse.questions?.length > 0) {
                const questionIndex = state.currentCourse.questions.findIndex(
                  q => q.id === action.payload.questionId || q._id === action.payload.questionId
                );
                
                if (questionIndex >= 0) {
                  state.currentCourse.questions[questionIndex].isCompleted = true;
                }
              }
            }
          }
          
          // Update leaderboard if provided
          if (action.payload?.leaderboard) {
            console.log('Updating leaderboard data from submitTaskAnswer:', action.payload.leaderboard);
            
            // Ensure the leaderboard data is an array
            if (Array.isArray(action.payload.leaderboard)) {
              state.leaderboard = action.payload.leaderboard;
              
              // Also update leaderboard in current course if it matches
              if (state.currentCourse && state.currentCourse._id === action.payload.quizId) {
                state.currentCourse.leaderboard = action.payload.leaderboard;
              }
            }
          }
        }
        
        // Reset timer state
        state.timer.isRunning = false;
        state.timer.timeSpent = action.payload.timeSpent || 0;
        state.lastUpdated = new Date().toISOString();
        
        // Update cache if currentCourse exists
        if (state.currentCourse?._id) {
          const dataToCache = {
            ...state.currentCourse,
            progress: state.progress,
            leaderboard: state.leaderboard,
            lastUpdated: new Date().toISOString()
          };
          saveCachedState(state.currentCourse._id, dataToCache);
        }
      });
  }
});

export const { 
  updateTimer, 
  startTimer, 
  stopTimer, 
  resetTimer, 
  updateLeaderboard, 
  updateProgress,
  handleQuizActivityUpdate,
  clearCourseState
} = courseSlice.actions;

export default courseSlice.reducer;

// The reference setting will be moved to store.js
// Remove the import at the bottom of the file to fix the ESLint error 