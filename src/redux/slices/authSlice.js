import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Helper to get initial auth state from localStorage
const getInitialAuthState = () => {
  const token = localStorage.getItem('userToken');
  const role = localStorage.getItem('userRole');
  
  return {
    token,
    user: null,
    userRole: role || null,
    isAuthenticated: !!token, // Only true if token exists
    loading: false,
    error: null
  };
};

// Async thunks
export const registerUser = createAsyncThunk(
  'auth/register',
  async ({ username, email, password }, { rejectWithValue }) => {
    try {
      const response = await axios.post(`${API_URL}/auth/register`, {
        username,
        email,
        password,
        role: "user"
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Registration failed');
    }
  }
);

export const loginUser = createAsyncThunk(
  'auth/login',
  async ({ email, password }, { rejectWithValue }) => {
    try {
      const response = await axios.post(`${API_URL}/auth/login`, {
        email,
        password
      });
      
      // Ensure we have user data with role
      if (!response.data?.user || !response.data?.user?.role) {
        console.error('Invalid user data received from server:', response.data);
        return rejectWithValue('Invalid user data received from server');
      }
      
      const userRole = response.data.user.role;
      
      // Store token and role in localStorage
      localStorage.setItem('userToken', response.data.token);
      localStorage.setItem('userRole', userRole);
      
      console.log('Login successful, user role:', userRole);
      
      return {
        token: response.data.token,
        user: response.data.user
      };
    } catch (error) {
      console.error('Login error:', error);
      return rejectWithValue(error.response?.data?.message || 'Login failed');
    }
  }
);

export const checkAuthStatus = createAsyncThunk(
  'auth/checkAuthStatus',
  async (_, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem('userToken');
      if (!token) {
        console.log('No token found in localStorage');
        localStorage.removeItem('userRole');
        return null;
      }
      
      // Configure axios instance with the token
      const config = {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      };
      
      // Try to get user profile with the token
      console.log('Attempting to verify token and fetch user profile');
      
      // First try to get from /api/users/profile endpoint
      try {
        const response = await axios.get(`${API_URL}/users/profile`, config);
        
        if (response.data) {
          console.log('User profile fetched successfully:', response.data);
          
          // Store the latest role from backend
          localStorage.setItem('userRole', response.data.role);
          
          return {
            token,
            user: response.data,
            isAuthenticated: true
          };
        }
      } catch (profileError) {
        console.warn('Error fetching from /users/profile, trying /auth/me fallback', profileError);
        // Continue to fallback route
      }
      
      // Fallback to /auth/me endpoint if profile endpoint fails
      const response = await axios.get(`${API_URL}/auth/me`, config);

      // Ensure the response contains valid user data
      if (!response.data?.user) {
        throw new Error('Invalid user data');
      }

      // Store the latest role from backend
      localStorage.setItem('userRole', response.data.user.role);
      
      return {
        token,
        user: response.data.user,
        isAuthenticated: true
      };
    } catch (error) {
      console.error('Auth status check failed:', error.message);
      
      // Check if error is due to token expiration or invalid token
      const isAuthError = 
        error.response?.status === 401 || 
        error.response?.status === 403 ||
        error.message?.includes('expired') ||
        error.message?.includes('invalid');
      
      if (isAuthError) {
        // Clear invalid token
        localStorage.removeItem('userToken');
        localStorage.removeItem('userRole');
        
        return rejectWithValue('Your session has expired. Please login again.');
      }
      
      return rejectWithValue(error.message || 'Failed to verify authentication status');
    }
  }
);

export const forgotPassword = createAsyncThunk(
  'auth/forgotPassword',
  async (email, { rejectWithValue }) => {
    try {
      const response = await axios.post(`${API_URL}/auth/forgot-password`, { email });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Password reset failed');
    }
  }
);

export const resetPassword = createAsyncThunk(
  'auth/resetPassword',
  async ({ token, newPassword }, { rejectWithValue }) => {
    try {
      const response = await axios.post(`${API_URL}/auth/reset-password`, {
        token,
        newPassword
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Password reset failed');
    }
  }
);

// Add token refresh functionality
export const refreshToken = createAsyncThunk(
  'auth/refreshToken',
  async (_, { rejectWithValue }) => {
    try {
      const refreshToken = localStorage.getItem('userRefreshToken');
      
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }
      
      const response = await axios.post(`${API_URL}/auth/refresh-token`, { 
        refreshToken 
      });
      
      const { token, user } = response.data;
      
      // Update tokens in storage
      localStorage.setItem('userToken', token);
      
      return { token, user };
    } catch (error) {
      console.error('Failed to refresh token:', error);
      
      // Clear tokens on refresh failure
      localStorage.removeItem('userToken');
      localStorage.removeItem('userRefreshToken');
      
      return rejectWithValue(
        error.response?.data?.message || 
        error.message || 
        'Authentication refresh failed'
      );
    }
  }
);

// Add profile update thunk
export const updateUserProfile = createAsyncThunk(
  'auth/updateProfile',
  async (profileData, { rejectWithValue }) => {
    try {
      // Get the token from localStorage
      const token = localStorage.getItem('userToken');
      
      if (!token) {
        throw new Error('Not authenticated');
      }
      
      // Configure headers with the auth token
      const config = {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      };
      
      const response = await axios.put(
        `${API_URL}/users/profile`, 
        profileData,
        config
      );
      
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 
        error.message || 
        'Failed to update profile'
      );
    }
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState: getInitialAuthState(),
  reducers: {
    logout: (state) => {
      state.token = null;
      state.user = null;
      state.userRole = null;
      state.isAuthenticated = false;
      // Clear all auth-related items from localStorage
      localStorage.removeItem('userToken');
      localStorage.removeItem('userRole');
      localStorage.removeItem('userRefreshToken');
      sessionStorage.removeItem('prevPath');
    },
    clearError: (state) => {
      state.error = null;
    },
    updateUserProfileLocal: (state, action) => {
      if (state.user) {
        state.user = {
          ...state.user,
          ...action.payload
        };
      }
    }
  },
  extraReducers: (builder) => {
    builder
      // Register
      .addCase(registerUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(registerUser.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(registerUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Login
      .addCase(loginUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.loading = false;
        state.token = action.payload.token;
        state.user = action.payload.user;
        state.userRole = action.payload.user.role;
        state.isAuthenticated = true;
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Check Auth Status
      .addCase(checkAuthStatus.pending, (state) => {
        state.loading = true;
      })
      .addCase(checkAuthStatus.fulfilled, (state, action) => {
        state.loading = false;
        if (action.payload) {
          state.token = action.payload.token;
          state.user = action.payload.user;
          state.userRole = action.payload.user.role;
          state.isAuthenticated = true;
        } else {
          state.isAuthenticated = false;
        }
      })
      .addCase(checkAuthStatus.rejected, (state) => {
        state.loading = false;
        state.isAuthenticated = false;
      })
      
      // Forgot Password
      .addCase(forgotPassword.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(forgotPassword.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(forgotPassword.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Reset Password
      .addCase(resetPassword.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(resetPassword.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(resetPassword.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Add cases for token refresh
      .addCase(refreshToken.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(refreshToken.fulfilled, (state, action) => {
        state.loading = false;
        state.token = action.payload.token;
      })
      .addCase(refreshToken.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Profile update
      .addCase(updateUserProfile.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateUserProfile.fulfilled, (state, action) => {
        state.loading = false;
        // Update the user object with the new profile data
        if (action.payload) {
          state.user = {
            ...state.user,
            ...action.payload
          };
        }
      })
      .addCase(updateUserProfile.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  }
});

export const { logout, clearError, updateUserProfileLocal } = authSlice.actions;
export default authSlice.reducer;