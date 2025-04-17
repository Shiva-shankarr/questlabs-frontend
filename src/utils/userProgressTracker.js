/**
 * User Progress Tracker
 * Handles real-time tracking and updates of user progress and leaderboard data
 */

import { fetchProgressAndLeaderboard } from './progressFetcher';

// Cache previous data to avoid duplicate updates
const dataCache = {
  progress: new Map(), // quizId -> { data, timestamp }
  leaderboard: new Map(), // quizId -> { data, timestamp }
};

// Track initialization status
const initialized = {
  status: new Map(), // quizId -> boolean
};

/**
 * Initialize user progress tracking for a quiz
 * @param {string} userId - User ID
 * @param {string} quizId - Quiz ID
 * @param {Function} dispatch - Redux dispatch function
 * @returns {Promise<Object>} - Initial progress and leaderboard data
 */
const initializeUserProgress = async (userId, quizId, dispatch) => {
  if (!userId || !quizId) {
    console.error('Missing userId or quizId for progress initialization');
    return null;
  }

  try {
    console.log(`Initializing progress tracking for user ${userId} in quiz ${quizId}`);
    
    // Check if already initialized
    if (initialized.status.get(quizId)) {
      console.log(`Progress tracking already initialized for quiz ${quizId}`);
      return getLastKnownData(quizId);
    }
    
    // Fetch initial data
    const { progress, leaderboard } = await fetchProgressAndLeaderboard(quizId, dispatch);
    
    // Set up socket event listeners if socket is available
    setupSocketListeners(quizId, userId, dispatch);
    
    // Mark as initialized
    initialized.status.set(quizId, true);
    
    // Cache current data
    if (progress) {
      dataCache.progress.set(quizId, {
        data: progress,
        timestamp: new Date().toISOString()
      });
    }
    
    if (leaderboard) {
      dataCache.leaderboard.set(quizId, {
        data: leaderboard,
        timestamp: new Date().toISOString()
      });
    }
    
    return { progress, leaderboard };
  } catch (error) {
    console.error('Error initializing user progress:', error);
    return null;
  }
};

/**
 * Set up socket listeners for real-time updates
 * @param {string} quizId - Quiz ID
 * @param {string} userId - User ID
 * @param {Function} dispatch - Redux dispatch function
 */
const setupSocketListeners = (quizId, userId, dispatch) => {
  if (!window.socket) {
    console.warn('Socket not available for real-time updates');
    return;
  }
  
  console.log(`Setting up socket listeners for quiz ${quizId}`);
  
  // Join the quiz room
  window.socket.emit('joinQuiz', { quizId });
  
  // Listen for progress updates
  window.socket.on('progress_update', (data) => {
    if (data.quizId !== quizId) return;
    
    // Skip if this is a duplicate update
    const lastUpdate = dataCache.progress.get(quizId);
    if (lastUpdate && 
        JSON.stringify(lastUpdate.data) === JSON.stringify(data.progress) &&
        new Date(lastUpdate.timestamp) >= new Date(data.timestamp)) {
      console.log('Skipping duplicate progress update');
      return;
    }
    
    console.log('Received real-time progress update:', data);
    
    // Update cache
    dataCache.progress.set(quizId, {
      data: data.progress,
      timestamp: data.timestamp || new Date().toISOString()
    });
    
    // Dispatch to Redux
    dispatch({
      type: 'course/updateProgress',
      payload: {
        quizId,
        progress: data.progress,
        updateId: data.updateId,
        timestamp: data.timestamp || new Date().toISOString()
      }
    });
  });
  
  // Listen for leaderboard updates
  window.socket.on('leaderboard_update', (data) => {
    if (data.quizId !== quizId) return;
    
    // Skip if this is a duplicate update
    const lastUpdate = dataCache.leaderboard.get(quizId);
    if (lastUpdate && 
        JSON.stringify(lastUpdate.data) === JSON.stringify(data.leaderboard) &&
        new Date(lastUpdate.timestamp) >= new Date(data.timestamp)) {
      console.log('Skipping duplicate leaderboard update');
      return;
    }
    
    console.log('Received real-time leaderboard update:', data);
    
    // Update cache
    dataCache.leaderboard.set(quizId, {
      data: data.leaderboard,
      timestamp: data.timestamp || new Date().toISOString()
    });
    
    // Dispatch to Redux
    dispatch({
      type: 'course/updateLeaderboard',
      payload: {
        quizId,
        leaderboard: data.leaderboard,
        updateId: data.updateId,
        timestamp: data.timestamp || new Date().toISOString()
      }
    });
  });
  
  // Listen for answer processed events
  window.socket.on('answer_processed', (data) => {
    if (data.quizId !== quizId) return;
    
    console.log('Received answer processed event:', data);
    
    // Request refresh of data after answer processed
    window.socket.emit('requestRefresh', { quizId, userId });
  });
};

/**
 * Get last known progress and leaderboard data for a quiz
 * @param {string} quizId - Quiz ID
 * @returns {Object} - Last known progress and leaderboard data
 */
const getLastKnownData = (quizId) => {
  const progress = dataCache.progress.get(quizId)?.data || null;
  const leaderboard = dataCache.leaderboard.get(quizId)?.data || null;
  
  return { progress, leaderboard };
};

/**
 * Update tracking data manually (useful for when socket updates fail)
 * @param {string} quizId - Quiz ID 
 * @param {string} type - 'progress' or 'leaderboard'
 * @param {Object} data - Data to update
 */
const updateTrackedData = (quizId, type, data) => {
  if (type === 'progress') {
    dataCache.progress.set(quizId, {
      data,
      timestamp: new Date().toISOString()
    });
  } else if (type === 'leaderboard') {
    dataCache.leaderboard.set(quizId, {
      data,
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * Reset tracking for a quiz (useful when leaving a quiz)
 * @param {string} quizId - Quiz ID
 */
const resetTracking = (quizId) => {
  dataCache.progress.delete(quizId);
  dataCache.leaderboard.delete(quizId);
  initialized.status.delete(quizId);
  
  // Leave the socket room if socket is available
  if (window.socket) {
    window.socket.emit('leaveQuiz', { quizId });
  }
};

const userProgressTracker = {
  initializeUserProgress,
  getLastKnownData,
  updateTrackedData,
  resetTracking
};

export default userProgressTracker; 