import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import quizReducer, { setRefreshCourseDataRef } from './slices/quizSlice';
import userReducer from './slices/userSlice';
import adminReducer from './slices/adminSlice';
import courseReducer, { refreshCourseData } from './slices/courseSlice';
import notificationReducer from './slices/notificationSlice';
import socketReducer from './slices/socketSlice';
import progressReducer from './slices/progressSlice';
import socketMiddleware from './middleware/socketMiddleware';

// Debug middleware to log actions and state changes
const loggerMiddleware = store => next => action => {
  if (action.type.startsWith('admin/')) {
    console.group(`🔄 Redux Action: ${action.type}`);
    console.log('Current State:', store.getState().admin);
    console.log('Action:', action);
  }
  
  const result = next(action);
  
  if (action.type.startsWith('admin/')) {
    console.log('New State:', store.getState().admin);
    console.groupEnd();
  }
  
  return result;
};

// Create Redux store
const store = configureStore({
  reducer: {
    auth: authReducer,
    quiz: quizReducer,
    user: userReducer,
    admin: adminReducer,
    course: courseReducer,
    notifications: notificationReducer,
    socket: socketReducer,
    progress: progressReducer
  },
  middleware: (getDefaultMiddleware) => 
    getDefaultMiddleware({
      serializableCheck: false,
    }).concat(socketMiddleware, loggerMiddleware),
});

// Initialize socket connection
store.dispatch({ type: 'socket/connect' });

// Set refreshCourseData reference in quizSlice to avoid circular dependencies
setRefreshCourseDataRef(refreshCourseData);

// Export the store
export default store;

// Make store available globally for error handlers
window.store = store;