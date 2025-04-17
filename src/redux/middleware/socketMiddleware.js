import { io } from 'socket.io-client';
import {
  connected,
  disconnected,
  connectionError,
  maxRetriesReached
} from '../slices/socketSlice';

const socketMiddleware = () => {
  let socket = null;
  let isConnecting = false;
  let retryCount = 0;
  const MAX_RETRIES = 5;
  const RECONNECT_DELAY = 2000; // 2 seconds
  const processedUpdates = new Set(); // Track processed updates
  
  // Helper to track processed updates to prevent duplicates
  const trackProcessedUpdate = (updateId, type) => {
    const key = `${type}:${updateId}`;
    if (processedUpdates.has(key)) {
      return false; // Already processed
    }
    
    // Add to processed updates
    processedUpdates.add(key);
    
    // Clean up old updates (keep set size manageable)
    if (processedUpdates.size > 1000) {
      // Remove oldest entries (convert to array, remove first 200)
      const updatesArray = Array.from(processedUpdates);
      const updatesToKeep = updatesArray.slice(200);
      processedUpdates.clear();
      updatesToKeep.forEach(update => processedUpdates.add(update));
    }
    
    return true; // First time seeing this update
  };
  
  return store => next => action => {
    // Handle actions from socketSlice
    if (action.type === 'socket/connect') {
      if (!socket && !isConnecting) {
        isConnecting = true;
        
        // Get the userToken for authentication
        const userToken = localStorage.getItem('userToken');
        
        // Create the socket connection
        const socketURL = action.payload?.url || 'http://localhost:5000';
        
        try {
          socket = io(socketURL, {
            reconnectionAttempts: MAX_RETRIES,
            reconnectionDelay: RECONNECT_DELAY,
            auth: {
              token: userToken
            }
          });
          
          // Set up socket event listeners
          socket.on('connect', () => {
            console.log('Socket connected:', socket.id);
            store.dispatch(connected({ socketId: socket.id }));
            retryCount = 0; // Reset retry count on successful connection
            isConnecting = false;
          });
          
          socket.on('disconnect', (reason) => {
            console.log('Socket disconnected:', reason);
            store.dispatch(disconnected({ reason }));
          });
          
          socket.on('connect_error', (error) => {
            console.error('Socket connection error:', error.message);
            store.dispatch(connectionError({ error: error.message }));
            
            retryCount++;
            if (retryCount >= MAX_RETRIES) {
              console.error('Max reconnection attempts reached');
              store.dispatch(maxRetriesReached({ error: 'Failed to connect after multiple attempts' }));
              isConnecting = false;
            }
          });
          
          // Handle progress updates with underscore format
          socket.on('progress_update', (data) => {
            console.log('Received progress update:', data);
            
            // Skip if we've already processed this update
            if (!trackProcessedUpdate(data.updateId, 'progress')) {
              console.log('Skipping duplicate progress update:', data.updateId);
              return;
            }
            
            store.dispatch({
              type: 'course/updateProgress',
              payload: data
            });
          });
          
          // Handle progress updates with camelCase format
          socket.on('progressUpdate', (data) => {
            console.log('Received progressUpdate:', data);
            
            // Skip if we've already processed this update
            if (!trackProcessedUpdate(data.updateId, 'progress')) {
              console.log('Skipping duplicate progressUpdate:', data.updateId);
              return;
            }
            
            store.dispatch({
              type: 'course/updateProgress',
              payload: data
            });
          });
          
          // Handle leaderboard updates with underscore format
          socket.on('leaderboard_update', (data) => {
            console.log('Received leaderboard update:', data);
            
            // Skip if we've already processed this update
            if (!trackProcessedUpdate(data.updateId, 'leaderboard')) {
              console.log('Skipping duplicate leaderboard update:', data.updateId);
              return;
            }
            
            store.dispatch({
              type: 'course/updateLeaderboard',
              payload: data
            });
          });
          
          // Handle leaderboard updates with camelCase format
          socket.on('leaderboardUpdate', (data) => {
            console.log('Received leaderboardUpdate:', data);
            
            // Skip if we've already processed this update
            if (!trackProcessedUpdate(data.updateId, 'leaderboard')) {
              console.log('Skipping duplicate leaderboardUpdate:', data.updateId);
              return;
            }
            
            store.dispatch({
              type: 'course/updateLeaderboard',
              payload: data
            });
          });
          
          // Handle errors from server
          socket.on('error', (error) => {
            console.error('Socket server error:', error);
            store.dispatch(connectionError({ 
              error: error.message || 'Unknown server error',
              type: 'server'
            }));
          });
        } catch (error) {
          console.error('Socket initialization error:', error.message);
          store.dispatch(connectionError({ error: error.message }));
          isConnecting = false;
        }
      }
    }
    
    // Handle socket disconnection
    if (action.type === 'socket/disconnect' && socket) {
      socket.disconnect();
      socket = null;
      isConnecting = false;
      retryCount = 0;
    }
    
    // Handle joining a quiz room
    if (action.type === 'socket/joinQuiz' && socket && socket.connected) {
      const { quizId } = action.payload;
      if (quizId) {
        console.log('Joining quiz room:', quizId);
        socket.emit('joinQuiz', { quizId });
      }
    }
    
    // Handle sending progress updates
    if (action.type === 'course/updateProgress' && socket && socket.connected) {
      const { quizId, progress, updateId, timestamp } = action.payload;
      if (quizId && progress && updateId) {
        console.log('Sending progress update:', { quizId, updateId });
        socket.emit('update-progress', { quizId, progress, updateId, timestamp });
      }
    }
    
    // Handle sending leaderboard updates
    if (action.type === 'course/updateLeaderboard' && socket && socket.connected) {
      const { quizId, leaderboard, updateId, timestamp } = action.payload;
      if (quizId && leaderboard && updateId) {
        console.log('Sending leaderboard update:', { quizId, updateId });
        socket.emit('update-leaderboard', { quizId, leaderboard, updateId, timestamp });
      }
    }
    
    return next(action);
  };
};

export default socketMiddleware; 