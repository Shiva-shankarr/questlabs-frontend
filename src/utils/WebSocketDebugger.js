/**
 * WebSocketDebugger.js
 * A utility to help debug WebSocket/Socket.io connection issues
 */

import { io } from 'socket.io-client';

class WebSocketDebugger {
  constructor() {
    this.socket = null;
    this.connected = false;
    this.retryCount = 0;
    this.maxRetries = 5;
    this.retryDelay = 2000;
    this.events = {};
  }

  /**
   * Initializes the WebSocket connection with detailed logging
   * @param {string} url - The server URL to connect to
   * @param {object} options - Socket.io options
   */
  initialize(url = 'http://localhost:5000', options = {}) {
    try {
      console.log(`[WebSocketDebugger] Attempting to connect to: ${url}`);
      
      // Merge provided options with defaults
      const finalOptions = {
        reconnectionAttempts: 5,
        reconnectionDelay: 2000,
        timeout: 20000,
        transports: ['websocket', 'polling'],
        ...options
      };
      
      console.log(`[WebSocketDebugger] Connection options:`, finalOptions);
      
      // Close existing connection if any
      if (this.socket) {
        console.log(`[WebSocketDebugger] Closing existing connection`);
        this.socket.disconnect();
        this.socket = null;
      }
      
      // Create new connection
      this.socket = io(url, finalOptions);
      this.connected = false;
      
      // Set up basic event handlers
      this.socket.on('connect', () => {
        this.connected = true;
        this.retryCount = 0;
        console.log(`[WebSocketDebugger] Connected successfully. Socket ID: ${this.socket.id}`);
      });
      
      // Added explicit handlers for progress and leaderboard updates
      this.socket.on('progressUpdate', (data) => {
        console.log(`[WebSocketDebugger] PROGRESS UPDATE RECEIVED:`, data);
      });
      
      this.socket.on('leaderboardUpdate', (data) => {
        console.log(`[WebSocketDebugger] LEADERBOARD UPDATE RECEIVED:`, data);
      });
      
      this.socket.on('disconnect', (reason) => {
        this.connected = false;
        console.log(`[WebSocketDebugger] Disconnected. Reason: ${reason}`);
      });
      
      this.socket.on('connect_error', (error) => {
        this.connected = false;
        this.retryCount++;
        console.error(`[WebSocketDebugger] Connection error (attempt ${this.retryCount}/${this.maxRetries}):`, error.message);
        
        if (this.retryCount >= this.maxRetries) {
          console.error(`[WebSocketDebugger] Max reconnection attempts reached. Switching to polling fallback.`);
          // Switch to polling if websocket fails
          this.socket.io.opts.transports = ['polling'];
        }
      });
      
      this.socket.on('reconnect', (attemptNumber) => {
        console.log(`[WebSocketDebugger] Reconnected after ${attemptNumber} attempts`);
        this.connected = true;
      });
      
      // Make socket available globally for debugging
      window._socketDebugger = this;
      window.socket = this.socket;
      
      return this.socket;
    } catch (error) {
      console.error(`[WebSocketDebugger] Initialization error:`, error);
      return null;
    }
  }
  
  /**
   * Register an event listener with tracking
   */
  on(eventName, callback) {
    if (!this.events[eventName]) {
      this.events[eventName] = [];
    }
    
    this.events[eventName].push(callback);
    
    if (this.socket && this.connected) {
      this.socket.on(eventName, callback);
    }
  }
  
  /**
   * Send heartbeat to check connection
   */
  sendHeartbeat() {
    if (this.socket && this.connected) {
      console.log(`[WebSocketDebugger] Sending heartbeat`);
      this.socket.emit('heartbeat', { timestamp: Date.now() });
      return true;
    } else {
      console.warn(`[WebSocketDebugger] Cannot send heartbeat - not connected`);
      return false;
    }
  }
  
  /**
   * Connection status check
   */
  status() {
    return {
      initialized: !!this.socket,
      connected: this.connected,
      socketId: this.socket?.id,
      transport: this.socket?.io?.engine?.transport?.name,
      retryCount: this.retryCount
    };
  }
}

// Create singleton instance
const socketDebugger = new WebSocketDebugger();

export default socketDebugger; 