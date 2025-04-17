import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Enhanced debug function to log API responses
const logApiResponse = (response) => {
  console.group('🌐 API Response');
  console.log('Status:', response.status);
  console.log('Headers:', response.headers);
  console.log('Data:', response.data);
  console.log('Data Type:', typeof response.data);
  if (typeof response.data === 'object') {
    console.log('Data Keys:', Object.keys(response.data));
  }
  console.groupEnd();
};

// Configure axios instance with auth interceptor
const getAuthAxiosInstance = () => {
  const token = localStorage.getItem('token') || localStorage.getItem('userToken');
  
  const instance = axios.create({
    baseURL: API_URL,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : '',
    }
  });

  // Add response interceptor for error handling
  instance.interceptors.response.use(
    (response) => {
      // Log API response for debugging
      logApiResponse(response);
      return response;
    },
    (error) => {
      if (error.response?.status === 401) {
        // Handle unauthorized access
        localStorage.removeItem('token');
        localStorage.removeItem('userToken');
        window.location.href = '/login';
      }
      return Promise.reject(error);
    }
  );
  
  return instance;
};

// Create async thunk for fetching dashboard stats
export const fetchDashboardStats = createAsyncThunk(
  'admin/fetchDashboardStats',
  async (_, { rejectWithValue }) => {
    try {
      console.log('Fetching admin dashboard stats...');
      
      const token = localStorage.getItem('token') || localStorage.getItem('userToken');
      if (!token) {
        return rejectWithValue('Authentication token not found');
      }

      const api = getAuthAxiosInstance();
      
      // Call the dedicated admin dashboard endpoint
      const dashboardResponse = await api.get('/admin/dashboard');
      
      // Log response for debugging
      console.log('Dashboard API Response:', dashboardResponse.data);
      
      // Create detailed logging for the data structure
      console.log('Data structure check:', {
        isObject: typeof dashboardResponse.data === 'object',
        keys: dashboardResponse.data ? Object.keys(dashboardResponse.data) : 'No data',
        hasDashboardStats: dashboardResponse.data?.dashboardStats ? 'Yes' : 'No',
        dashboardStatsKeys: dashboardResponse.data?.dashboardStats ? Object.keys(dashboardResponse.data.dashboardStats) : 'N/A',
      });
      
      // Extract data from the response using proper structure matching the backend
      const {
        totalQuests = 0,
        totalUsers = 0,
        activeUsers = 0,
        topUsers = '',  // The backend is using topUsers, not topQuest
        dashboardStats = {}
      } = dashboardResponse.data || {};
      
      // Process user engagement data from the dashboard stats
      let userEngagement = [];
      
      // Check if dashboardStats contains userEngagement data
      if (dashboardStats && dashboardStats.userEngagement && Array.isArray(dashboardStats.userEngagement)) {
        userEngagement = dashboardStats.userEngagement.map(day => ({
          date: day.date,
          count: day.count || 0
        }));
        console.log('User engagement data processed:', userEngagement);
      } else {
        console.log('No user engagement data found in:', dashboardStats);
      }
      
      // Format the response with proper defaults to prevent UI errors
      // Make sure data types are correct (numbers for counts, strings for text)
      const dashboardData = {
        totalQuests: parseInt(totalQuests) || 0,
        totalUsers: parseInt(totalUsers) || 0,
        activeUsers: parseInt(activeUsers) || 0,
        topQuest: String(topUsers || "No quizzes available"),
        userEngagement,
        lastUpdated: new Date().toISOString()
      };
      
      console.log('Processed dashboard data:', dashboardData);
      
      return dashboardData;
      
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      
      // Enhanced error handling
      const errorMessage = error.response?.data?.message || 
        error.message || 
        'Failed to fetch dashboard data';
      
      // Log detailed error for debugging
      console.error('Detailed error:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: errorMessage
      });
      
      return rejectWithValue(errorMessage);
    }
  }
);

// Verify admin token function
export const verifyAdminToken = async () => {
  try {
    const token = localStorage.getItem('userToken') || localStorage.getItem('token');
    if (!token) {
      console.error('No token found in localStorage');
      return { isValid: false, isAdmin: false };
    }
    
    const response = await axios.get(`${API_URL}/admin/verify-token`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    return { 
      isValid: true, 
      isAdmin: response.data.isAdmin,
      user: response.data.user
    };
  } catch (error) {
    console.error('Error verifying admin token:', error);
    return { isValid: false, isAdmin: false };
  }
};

// Initial state
const initialState = {
  totalQuests: 0,
  totalUsers: 0,
  activeUsers: 0,
  topQuest: "",
  userEngagement: [],
  isLoading: false,
  error: null,
  lastUpdated: null
};

// Create slice
const adminSlice = createSlice({
  name: 'admin',
  initialState,
  reducers: {
    resetError: (state) => {
      state.error = null;
    },
    resetDashboard: () => initialState
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchDashboardStats.pending, (state) => {
        state.isLoading = true;
        state.error = null;
        console.log('Admin dashboard stats loading...');
      })
      .addCase(fetchDashboardStats.fulfilled, (state, action) => {
        state.isLoading = false;
        state.error = null;
        
        // Explicitly parse numeric values
        state.totalQuests = parseInt(action.payload.totalQuests) || 0;
        state.totalUsers = parseInt(action.payload.totalUsers) || 0;
        state.activeUsers = parseInt(action.payload.activeUsers) || 0;
        state.topQuest = action.payload.topQuest || "";
        state.userEngagement = action.payload.userEngagement || [];
        state.lastUpdated = action.payload.lastUpdated;
        
        console.log('Admin dashboard stats updated successfully with parsed values:', {
          totalQuests: state.totalQuests,
          totalUsers: state.totalUsers,
          activeUsers: state.activeUsers
        });
      })
      .addCase(fetchDashboardStats.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload || 'An error occurred while fetching dashboard data';
        console.error('Admin dashboard stats fetch failed:', action.payload);
        // Don't reset the data on error to maintain last known good state
      });
  }
});

export const { resetError, resetDashboard } = adminSlice.actions;
export default adminSlice.reducer;