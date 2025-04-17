import { io } from 'socket.io-client';
import socketDebugger from '../../utils/WebSocketDebugger';

// Create socket middleware
const createSocketMiddleware = () => {
  // Create socket instance with auth token
  let socket = null;
  let socketConnected = false;
  let reconnectAttempts = 0;
  let quizRooms = new Set(); // Track joined quiz rooms for automatic rejoin
  let connectionErrorDisplayed = false;
  let pendingActions = [];

  // Initialize socket with auth token
  const initializeSocket = (token) => {
    try {
      if (socket) {
        // If socket exists but is disconnected, reconnect it
        if (!socket.connected) {
          socket.connect();
        }
        return socket;
      }

      // Get the correct server URL, ensuring we don't hardcode to different ports
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000';
      
      // For relative URLs in development, use the current origin
      let serverUrl;
      if (process.env.NODE_ENV === 'development') {
        // In development, connect to current host which will be proxied via setupProxy.js
        serverUrl = window.location.origin;
        console.log(`Development environment detected, using origin: ${serverUrl}`);
      } else {
        // In production, use the configured API URL
        serverUrl = apiUrl;
        console.log(`Production environment detected, using API URL: ${serverUrl}`);
      }
      
      console.log(`Attempting to connect to socket server at: ${serverUrl}`);
      
      // Create new socket connection with auth token
      socket = io(serverUrl, {
        withCredentials: true,
        reconnection: true,
        reconnectionAttempts: 20,        // Allow more reconnection attempts
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 30000,                 // Increase timeout for better reliability
        autoConnect: true,
        path: '/socket.io',            // Explicit path for socket.io
        auth: token ? { token } : undefined,
        transports: ['websocket', 'polling'] // Try WebSocket first, fallback to polling
      });
      
      // Make socket available globally for direct access in components
      window.socket = socket;
      
      // Add a heartbeat to ensure connection stays active
      const heartbeatInterval = setInterval(() => {
        if (socket && socket.connected) {
          socket.emit('heartbeat', { timestamp: Date.now() });
        }
      }, 30000); // 30 seconds
      
      // Store the interval ID for cleanup
      socket.heartbeatInterval = heartbeatInterval;
      
      // Initialize the debugger as well
      if (process.env.NODE_ENV === 'development') {
        socketDebugger.initialize(serverUrl, {
          path: '/socket.io',
          auth: token ? { token } : undefined
        });
      }
      
      return socket;
    } catch (error) {
      console.error("Error initializing socket:", error);
      return null;
    }
  };

  // Function to clean up socket connection
  const cleanupSocket = () => {
    if (socket) {
      // Clear heartbeat interval if it exists
      if (socket.heartbeatInterval) {
        clearInterval(socket.heartbeatInterval);
        socket.heartbeatInterval = null;
      }
      
      // Disconnect socket
      if (socket.connected) {
        socket.disconnect();
      }
      
      socket = null;
      window.socket = null;
    }
  };

  // Function to restore data from localStorage and sessionStorage
  const restorePersistedState = (store) => {
    try {
      // Get current quiz ID from state
      const state = store.getState();
      const quizId = state.course?.currentCourse?.id;
      
      if (!quizId) return false;
      
      // Try to load from sessionStorage first (more recent data)
      let restored = false;
      
      // Check for progress updates
      const progressUpdateStr = sessionStorage.getItem('lastProgressUpdate');
      if (progressUpdateStr) {
        const progressUpdate = JSON.parse(progressUpdateStr);
        
        // Verify it's for the current quiz
        if (progressUpdate.quizId === quizId) {
          console.log('Restoring progress from sessionStorage');
          store.dispatch({
            type: 'course/updateProgress',
            payload: {
              quizId: progressUpdate.quizId,
              updateId: progressUpdate.updateId,
              timestamp: progressUpdate.timestamp,
              progress: progressUpdate.data
            }
          });
          restored = true;
        }
      }
      
      // Check for leaderboard updates
      const leaderboardUpdateStr = sessionStorage.getItem('lastLeaderboardUpdate');
      if (leaderboardUpdateStr) {
        const leaderboardUpdate = JSON.parse(leaderboardUpdateStr);
        
        // Verify it's for the current quiz
        if (leaderboardUpdate.quizId === quizId) {
          console.log('Restoring leaderboard from sessionStorage');
          store.dispatch({
            type: 'course/updateLeaderboard',
            payload: {
              quizId: leaderboardUpdate.quizId,
              updateId: leaderboardUpdate.updateId,
              timestamp: leaderboardUpdate.timestamp,
              leaderboard: leaderboardUpdate.data
            }
          });
          restored = true;
        }
      }
      
      return restored;
    } catch (error) {
      console.error('Error restoring persisted state:', error);
      return false;
    }
  };
  
  // Function to handle socket event registration
  const registerSocketEvents = (socket, store) => {
    if (!socket) return;
    
    // Clear any existing listeners to prevent duplicates
    socket.off('connect');
    socket.off('connect_error');
    socket.off('disconnect');
    socket.off('reconnect_attempt');
    socket.off('reconnect');
    socket.off('leaderboardUpdate');
    socket.off('progressUpdate');
    socket.off('quizActivityUpdate');
    socket.off('refreshRequired');
    socket.off('joinedQuiz');
    socket.off('answerProcessed');
    socket.off('authenticated');

    // Handle connection
    socket.on('connect', () => {
      console.log('Socket.io connected with ID:', socket.id);
      socketConnected = true;
      reconnectAttempts = 0;
      store.dispatch({ type: 'socket/connected' });
      
      // Re-join all active quiz rooms after reconnection
      quizRooms.forEach(quizId => {
        console.log('Re-joining quiz room after reconnection:', quizId);
        socket.emit('joinQuiz', quizId);
        
        // Request latest data
        store.dispatch({ type: 'course/refreshCourseData', payload: quizId });
      });

      // Authenticate user with socket when we have both a token and connected socket
      const authToken = localStorage.getItem('userToken');
      const userId = localStorage.getItem('userId');
      
      if (authToken && userId) {
        console.log('Authenticating socket connection with user ID:', userId);
        socket.emit('authenticate', { 
          userId, 
          token: authToken 
        });
      }
    });

    // Handle connection error
    socket.on('connect_error', (error) => {
      console.error('Socket.io connection error:', error);
      socketConnected = false;
      store.dispatch({ 
        type: 'socket/error', 
        payload: 'Failed to connect to real-time server' 
      });
    });

    // Handle disconnect
    socket.on('disconnect', (reason) => {
      console.log('Socket.io disconnected. Reason:', reason);
      socketConnected = false;
      store.dispatch({ type: 'socket/disconnected' });
      
      // Auto reconnect if not closed intentionally
      if (reason === 'io server disconnect') {
        // Server disconnected us, try to reconnect
        socket.connect();
      }
    });

    // Handle reconnection attempts
    socket.on('reconnect_attempt', (attemptNumber) => {
      reconnectAttempts = attemptNumber;
      console.log(`Socket.io reconnect attempt #${attemptNumber}`);
      
      // If we have many reconnection attempts, check if we need to refresh the page
      if (attemptNumber > 5) {
        store.dispatch({
          type: 'notifications/showToast',
          payload: {
            message: 'Connection issues detected. Trying to reconnect...',
            type: 'warning',
            duration: 5000
          }
        });
      }
    });

    // Handle successful reconnection
    socket.on('reconnect', (attemptNumber) => {
      console.log(`Socket.io reconnected after ${attemptNumber} attempts`);
      socketConnected = true;
      reconnectAttempts = 0;
      store.dispatch({ type: 'socket/connected' });
      
      // Restore persisted state if possible
      const restored = restorePersistedState(store);
      
      // If state was not restored from storage, refresh from server
      if (!restored) {
        // Get current quiz ID from state
        const state = store.getState();
        const quizId = state.course?.currentCourse?.id;
        
        if (quizId) {
          console.log(`Refreshing data for quiz ${quizId} after reconnection`);
          store.dispatch({ type: 'course/refreshCourseData', payload: quizId });
        }
      }
    });

    // Listen for leaderboard updates
    socket.on('leaderboardUpdate', (data) => {
      console.log('Real-time leaderboard update received:', data);
      
      // Add timestamp if not present
      if (!data.timestamp) {
        data.timestamp = new Date().toISOString();
      }
      
      // Add updateId if not present
      if (!data.updateId) {
        data.updateId = `leaderboard_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      }
      
      // Store these updates in sessionStorage for resilience
      try {
        sessionStorage.setItem('lastLeaderboardUpdate', JSON.stringify({
          timestamp: data.timestamp,
          quizId: data.quizId,
          updateId: data.updateId,
          data: data.leaderboard
        }));
      } catch (e) {
        console.warn('Could not save leaderboard in sessionStorage', e);
      }
      
      // Ensure the leaderboard data is dispatched immediately
      store.dispatch({
        type: 'course/updateLeaderboard',
        payload: data
      });
      
      // Provide visual feedback about the update, only if not from cache
      if (!data.fromCache) {
        store.dispatch({
          type: 'notifications/showToast',
          payload: {
            message: 'Leaderboard updated in real-time!',
            type: 'info',
            duration: 2000
          }
        });
      }
    });

    // Listen for progress updates
    socket.on('progressUpdate', (data) => {
      console.log('Real-time progress update received:', data);
      
      // Add timestamp if not present
      if (!data.timestamp) {
        data.timestamp = new Date().toISOString();
      }
      
      // Add updateId if not present
      if (!data.updateId) {
        data.updateId = `progress_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      }
      
      // Store these updates in sessionStorage for resilience
      try {
        sessionStorage.setItem('lastProgressUpdate', JSON.stringify({
          timestamp: data.timestamp,
          quizId: data.quizId,
          updateId: data.updateId,
          data: data.progress
        }));
      } catch (e) {
        console.warn('Could not save progress in sessionStorage', e);
      }
      
      // Ensure the progress data is dispatched immediately
      store.dispatch({
        type: 'course/updateProgress',
        payload: data
      });
      
      // Only show toast for non-cache updates to avoid excessive notifications
      if (!data.fromCache) {
        store.dispatch({
          type: 'notifications/showToast',
          payload: {
            message: 'Your progress updated in real-time!',
            type: 'success',
            duration: 2000
          }
        });
      }
    });
    
    // Listen for quiz activity updates (used for triggering refreshes)
    socket.on('quizActivityUpdate', (data) => {
      console.log('Quiz activity update received:', data);
      
      // Request fresh data after activity, especially for task submissions
      if (data.actionType === 'taskSubmission') {
        const state = store.getState();
        const currentUser = state.auth?.user;
        
        // If we have a userId and it's not our own submission, refresh data
        if (data.userId !== currentUser?.id) {
          console.log('Another user completed a task, refreshing data');
          store.dispatch({ 
            type: 'course/refreshCourseData', 
            payload: data.quizId 
          });
          
          // Show toast about activity
          store.dispatch({
            type: 'notifications/showToast',
            payload: {
              message: 'A participant completed a task!',
              type: 'info',
              duration: 3000
            }
          });
        }
      }
    });
    
    // Listen for refresh requests from server
    socket.on('refreshRequired', (data) => {
      console.log('Server requested data refresh:', data);
      
      if (data.quizId) {
        // First try to use cached data if available
        const wasRestored = restorePersistedState(store);
        
        // Then issue a full refresh to ensure we have the latest
        store.dispatch({ 
          type: 'course/refreshCourseData', 
          payload: data.quizId 
        });
      }
    });
    
    // Listen for successful quiz room join
    socket.on('joinedQuiz', (data) => {
      console.log('Successfully joined quiz room:', data.quizId);
      if (data.quizId) {
        quizRooms.add(data.quizId);
      }
    });

    // Listen for successful authentication
    socket.on('authenticated', (data) => {
      console.log('Socket authenticated:', data);
      
      // Refresh all active quiz rooms after authentication
      quizRooms.forEach(quizId => {
        console.log('Refreshing data for quiz after authentication:', quizId);
        store.dispatch({ type: 'course/refreshCourseData', payload: quizId });
      });
    });

    // Listen for answerProcessed events
    socket.on('answerProcessed', (data) => {
      console.log('Answer processing complete, received data:', data);
      
      if (!data || !data.quizId) {
        console.error('Received invalid answer processed data:', data);
        return;
      }
      
      // First update the progress data if present
      if (data.progress) {
        store.dispatch({
          type: 'course/updateProgress',
          payload: {
            quizId: data.quizId,
            progress: data.progress,
            updateId: data.updateId || `answerProcessed-${Date.now()}`,
            timestamp: data.timestamp || new Date().toISOString()
          }
        });
        
        // Store progress in session storage for resilience
        try {
          sessionStorage.setItem('lastProgressUpdate', JSON.stringify({
            timestamp: data.timestamp || new Date().toISOString(),
            quizId: data.quizId,
            updateId: data.updateId || `answerProcessed-${Date.now()}`,
            data: data.progress
          }));
        } catch (e) {
          console.warn('Could not save progress in sessionStorage', e);
        }
      }
      
      // Then update the leaderboard if present
      if (data.leaderboard) {
        store.dispatch({
          type: 'course/updateLeaderboard',
          payload: {
            quizId: data.quizId,
            leaderboard: data.leaderboard,
            updateId: data.updateId || `answerProcessed-${Date.now()}`,
            timestamp: data.timestamp || new Date().toISOString()
          }
        });
        
        // Store leaderboard in session storage for resilience
        try {
          sessionStorage.setItem('lastLeaderboardUpdate', JSON.stringify({
            timestamp: data.timestamp || new Date().toISOString(),
            quizId: data.quizId,
            updateId: data.updateId || `answerProcessed-${Date.now()}`,
            data: data.leaderboard
          }));
        } catch (e) {
          console.warn('Could not save leaderboard in sessionStorage', e);
        }
      }
      
      // Mark the task as completed in the quiz state
      store.dispatch({
        type: 'quiz/markTaskCompleted',
        payload: {
          quizId: data.quizId,
          questionId: data.questionId,
          isCorrect: data.isCorrect
        }
      });
      
      // Optional: Notify other parts of the app via a custom action
      store.dispatch({
        type: 'quiz/answerProcessed',
        payload: data
      });
    });
  };

  return store => next => action => {
    if (!socket && action.type === 'auth/login/fulfilled') {
      // Initialize socket on successful login
      const token = localStorage.getItem('userToken');
      if (token) {
        socket = initializeSocket(token);
        if (socket) {
          registerSocketEvents(socket, store);
        }
      }
    } else if (action.type === 'auth/logout') {
      // Clean up socket on logout
      cleanupSocket();
    } else if (action.type === 'socket/connect') {
      // Explicit connection request
      const token = localStorage.getItem('userToken');
      socket = initializeSocket(token);
      if (socket) {
        registerSocketEvents(socket, store);
      }
    } else if (action.type === 'socket/disconnect') {
      // Explicit disconnection request
      cleanupSocket();
    } else if (action.type === 'socket/joinQuiz') {
      // Join a quiz room
      if (socket && socket.connected) {
        const quizId = action.payload;
        if (quizId) {
          console.log(`Joining quiz room: ${quizId}`);
          socket.emit('joinQuiz', quizId);
          quizRooms.add(quizId);
        }
      } else if (socket) {
        // If socket exists but not connected, try to reconnect
        socket.connect();
        // Store the action to retry after connection
        pendingActions.push(action);
      } else {
        // If no socket exists, initialize it
        const token = localStorage.getItem('userToken');
        socket = initializeSocket(token);
        if (socket) {
          registerSocketEvents(socket, store);
          // Store the action to retry after connection
          pendingActions.push(action);
        }
      }
    } else if (action.type === 'socket/leaveQuiz') {
      const quizId = action.payload;
      if (!quizId) {
        console.error('No quizId provided for leaveQuiz action');
        return next(action);
      }
      
      // Remove from tracked rooms
      quizRooms.delete(quizId);
      
      if (socket && socket.connected) {
        console.log(`Leaving quiz room: ${quizId}`);
        socket.emit('leaveQuiz', quizId);
      }
    } else if (action.type === 'socket/requestRefresh') {
      const quizId = action.payload;
      if (socket && socket.connected && quizId) {
        console.log(`Requesting refresh for quiz: ${quizId}`);
        socket.emit('requestRefresh', { 
          quizId, 
          userId: store.getState().auth?.user?.id 
        });
        
        // Show loading toast
        store.dispatch({
          type: 'notifications/showToast',
          payload: {
            message: 'Refreshing data...',
            type: 'info',
            duration: 2000
          }
        });
      }
    } else if (action.type === 'auth/loginSuccess' || action.type === 'auth/tokenRefreshed') {
      const token = action.payload.token || localStorage.getItem('token');
      
      if (token) {
        // Disconnect existing socket if any
        if (socket && socket.connected) {
          socket.disconnect();
        }
        
        // Reconnect with new token
        socket = initializeSocket(token);
        
        // Register all event handlers with the new socket
        registerSocketEvents(socket, store);
        
        store.dispatch({ type: 'socket/connect' });
      }
    }

    // Continue to next middleware
    return next(action);
  };
};

export default createSocketMiddleware; 