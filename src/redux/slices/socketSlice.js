import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  connected: false,
  socketId: null,
  error: null,
  connecting: false,
  retryCount: 0,
  maxRetriesReached: false
};

const socketSlice = createSlice({
  name: 'socket',
  initialState,
  reducers: {
    connect: (state) => {
      state.connecting = true;
      state.error = null;
    },
    connected: (state, action) => {
      state.connected = true;
      state.connecting = false;
      state.socketId = action.payload?.socketId || null;
      state.error = null;
      state.retryCount = 0;
      state.maxRetriesReached = false;
    },
    disconnected: (state, action) => {
      state.connected = false;
      state.connecting = false;
      state.error = action.payload?.reason || null;
    },
    connectionError: (state, action) => {
      state.connected = false;
      state.connecting = false;
      state.error = action.payload?.error || 'Connection error';
      state.retryCount = state.retryCount + 1;
    },
    maxRetriesReached: (state, action) => {
      state.maxRetriesReached = true;
      state.connecting = false;
      state.error = action.payload?.error || 'Max retries reached';
    },
    clearError: (state) => {
      state.error = null;
    }
  }
});

export const {
  connect,
  connected,
  disconnected,
  connectionError,
  maxRetriesReached,
  clearError
} = socketSlice.actions;

export default socketSlice.reducer; 