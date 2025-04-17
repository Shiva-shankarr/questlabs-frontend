import { createSlice } from '@reduxjs/toolkit';

// Initial state with empty values
const initialState = {
  progress: {
    completedTasks: 0,
    totalTasks: 0,
    timeSpentMinutes: 0,
    streak: 0,
    percentage: 0,
    lastUpdated: null
  },
  leaderboard: [],
  loading: false,
  error: null
};

// Create a clean new slice
const progressSlice = createSlice({
  name: 'progress',
  initialState,
  reducers: {
    // Explicitly set progress data - used by our direct storage loader
    setProgress: (state, action) => {
      console.log("PROGRESS SLICE: Setting progress with:", action.payload);
      
      // Handle different data formats that might come from storage
      let data = action.payload;
      
      // Ensure we have an object
      if (typeof data !== 'object' || data === null) {
        console.warn("Invalid progress data format:", data);
        return;
      }
      
      // Update state with normalized data structure
      state.progress = {
        completedTasks: Number(data.completedTasks || 0),
        totalTasks: Number(data.totalTasks || 5),
        timeSpentMinutes: Number(data.timeSpentMinutes || 0),
        streak: Number(data.streak || 0),
        percentage: Number(data.percentage || 0),
        lastUpdated: data.lastUpdated || new Date().toISOString()
      };
      
      // Log the updated state
      console.log("PROGRESS SLICE: Progress updated to:", state.progress);
    },
    
    // Explicitly set leaderboard data - used by our direct storage loader
    setLeaderboard: (state, action) => {
      console.log("PROGRESS SLICE: Setting leaderboard with:", action.payload);
      
      let data = action.payload;
      
      // Ensure we have an array
      if (!Array.isArray(data)) {
        // Try to convert to array if it's an object
        if (typeof data === 'object' && data !== null) {
          data = Object.values(data);
        } else {
          data = [];
        }
      }
      
      // Map to consistent structure
      state.leaderboard = data.map((entry, index) => ({
        rank: entry.rank || index + 1,
        userId: entry.userId || entry.id || `user-${index}`,
        username: entry.username || 'Anonymous',
        completedTasks: Number(entry.completedTasks || entry.score || 0),
        score: Number(entry.score || 0),
        streak: Number(entry.streak || 0),
        isCurrentUser: !!entry.isCurrentUser
      }));
      
      console.log("PROGRESS SLICE: Leaderboard updated to:", state.leaderboard);
    },
    
    // Set loading state
    setLoading: (state, action) => {
      state.loading = action.payload;
    },
    
    // Set error state
    setError: (state, action) => {
      state.error = action.payload;
    },
    
    // Reset to initial state
    resetProgress: (state) => {
      state.progress = initialState.progress;
      state.leaderboard = initialState.leaderboard;
      state.error = null;
    },
    
    // Update a specific field in progress
    updateProgressField: (state, action) => {
      const { field, value } = action.payload;
      if (state.progress && field) {
        state.progress[field] = value;
      }
    }
  }
});

// Export actions
export const { 
  setProgress, 
  setLeaderboard, 
  setLoading, 
  setError,
  resetProgress,
  updateProgressField
} = progressSlice.actions;

// Export the reducer
export default progressSlice.reducer; 