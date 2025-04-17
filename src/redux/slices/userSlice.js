import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

// Mock API function
const mockFetchUserData = async (userId) => {
  await new Promise(resolve => setTimeout(resolve, 500)); // Simulate API delay
  
  // Mock user data
  return {
    id: userId,
    name: 'Test User',
    email: 'user@example.com',
    profileImage: null,
    joinedDate: '2023-01-15',
    completedQuests: 12,
    inProgressQuests: 3,
    badges: [
      { id: 1, name: 'Quick Learner', icon: '🚀' },
      { id: 2, name: 'Persistent Coder', icon: '💻' },
      { id: 3, name: 'Team Player', icon: '👥' }
    ],
    skills: [
      { name: 'JavaScript', level: 85 },
      { name: 'React', level: 78 },
      { name: 'CSS', level: 70 },
      { name: 'Node.js', level: 65 }
    ],
    recentActivity: [
      { id: 1, type: 'completed', quest: 'JavaScript Fundamentals', date: '2023-05-01' },
      { id: 2, type: 'started', quest: 'React Component Mastery', date: '2023-05-02' },
      { id: 3, type: 'earned', badge: 'Persistent Coder', date: '2023-04-28' }
    ]
  };
};

// Async thunks
export const fetchUserProfile = createAsyncThunk(
  'user/fetchProfile',
  async (userId, { rejectWithValue }) => {
    try {
      // In a real app, this would be an API call
      const data = await mockFetchUserData(userId);
      return data;
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to fetch user profile');
    }
  }
);

export const updateUserProfile = createAsyncThunk(
  'user/updateProfile',
  async (userData, { rejectWithValue }) => {
    try {
      // In a real app, this would be an API call
      await new Promise(resolve => setTimeout(resolve, 800)); // Simulate API delay
      return userData;
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to update profile');
    }
  }
);

const initialState = {
  profile: null,
  loading: false,
  error: null,
  recentActivity: [],
  notifications: []
};

const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    clearUserError: (state) => {
      state.error = null;
    },
    
    markNotificationAsRead: (state, action) => {
      const notificationId = action.payload;
      state.notifications = state.notifications.map(notification => 
        notification.id === notificationId 
          ? { ...notification, read: true } 
          : notification
      );
    },
    
    clearAllNotifications: (state) => {
      state.notifications = state.notifications.map(notification => ({
        ...notification,
        read: true
      }));
    }
  },
  extraReducers: (builder) => {
    builder
      // Fetch profile cases
      .addCase(fetchUserProfile.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchUserProfile.fulfilled, (state, action) => {
        state.loading = false;
        state.profile = action.payload;
        state.recentActivity = action.payload.recentActivity || [];
      })
      .addCase(fetchUserProfile.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Update profile cases
      .addCase(updateUserProfile.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateUserProfile.fulfilled, (state, action) => {
        state.loading = false;
        state.profile = { ...state.profile, ...action.payload };
      })
      .addCase(updateUserProfile.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  }
});

export const { 
  clearUserError, 
  markNotificationAsRead, 
  clearAllNotifications 
} = userSlice.actions;

export default userSlice.reducer;