import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import axios from 'axios';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { checkAuthStatus } from './redux/slices/authSlice';
import AppRoutes from './routes/AppRoutes';
import './App.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import { connect } from './redux/slices/socketSlice';

// Add axios interceptor for auth token
axios.interceptors.request.use(
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

function App() {
  const dispatch = useDispatch();
  const [isInitializing, setIsInitializing] = useState(true);
  
  // Get auth state
  const { isAuthenticated, loading: authLoading } = useSelector(state => state.auth);
  
  // Get course state safely
  const courseState = useSelector(state => state.course) || {};
  const { courses = [] } = courseState;
  
  // Get socket state safely
  const socketState = useSelector(state => state.socket) || {};
  const { connected: socketConnected = false } = socketState;

  useEffect(() => {
    // Check and validate token on app startup
    const validateToken = async () => {
      try {
        // Check if token exists in localStorage first
      const token = localStorage.getItem('userToken');
      if (token) {
          await dispatch(checkAuthStatus()).unwrap();
        } else {
          // No token, no need to check
          console.log('No token found, user is not authenticated');
          setIsInitializing(false);
        }
      } catch (error) {
        console.error('Auth validation failed:', error);
      } finally {
        setIsInitializing(false);
      }
    };

    validateToken();
  }, [dispatch]);

  // Initialize the socket connection when the app loads
  useEffect(() => {
    if (isAuthenticated && !socketConnected) {
      dispatch(connect());
    }
  }, [isAuthenticated, socketConnected, dispatch]);
  
  // Setup socket room joining for courses
  useEffect(() => {
    if (isAuthenticated && socketConnected && courses?.length > 0) {
      // Join socket rooms for each course
      courses.forEach(course => {
        if (course && course._id) {
          dispatch({ 
            type: 'socket/joinQuiz', 
            payload: { quizId: course._id }
          });
          console.log(`Joined socket room for course: ${course._id}`);
        }
      });
    }
  }, [isAuthenticated, socketConnected, courses, dispatch]);
  
  // Setup global notification listener
  useEffect(() => {
    // Function to check for new notifications
    const checkForNotifications = () => {
      const lastNotificationCheck = localStorage.getItem('lastNotificationCheck');
      const lastCompletedTask = localStorage.getItem('lastCompletedTask');
      
      if (lastCompletedTask) {
        try {
          const taskData = JSON.parse(lastCompletedTask);
          const taskTimestamp = taskData.timestamp;
          
          // Check if this is a new completion we haven't notified about
          if (!lastNotificationCheck || taskTimestamp > parseInt(lastNotificationCheck)) {
            // Show notification
            dispatch({
              type: 'notification/show',
              payload: {
                message: 'Task completed successfully!',
                type: 'success'
              }
            });
            
            // Update last check time
            localStorage.setItem('lastNotificationCheck', Date.now().toString());
          }
        } catch (error) {
          console.error('Error processing notification check:', error);
        }
      }
    };
    
    // Check for notifications when component mounts
    if (isAuthenticated) {
      checkForNotifications();
    }
    
    // Setup interval to check periodically
    const intervalId = setInterval(() => {
      if (isAuthenticated) {
        checkForNotifications();
      }
    }, 30000); // Check every 30 seconds
    
    return () => clearInterval(intervalId);
  }, [isAuthenticated, dispatch]);

  if (isInitializing || authLoading) {
    return (
      <div className="app-loader">
        <div className="loader"></div>
        <p>Loading...</p>
      </div>
    );
  }

  return (
      <div className="app">
        <main className="main-content">
          <AppRoutes />
        </main>
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="dark"
      />
      </div>
  );
}

export default App;