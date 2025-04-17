/**
 * Direct Application Storage Data Loader
 * This utility provides functions to directly load data from Application storage
 * without relying on API calls or other mechanisms.
 */

import { setProgress, setLeaderboard } from '../redux/slices/progressSlice';

/**
 * The fixed ID seen in Application storage (visible in screenshots)
 */
const FIXED_QUIZ_ID = '0c54617c-3116-4bcd-bb53-bf31ca8044d5';

/**
 * Loads progress data directly from Application storage
 * @param {string} quizId - The current quiz/course ID
 * @param {function} dispatch - Redux dispatch function
 * @returns {boolean} - Whether data was found and loaded
 */
export const loadProgressFromStorage = (quizId, dispatch) => {
  try {
    console.log("DIRECT LOADER: Attempting to load progress for:", quizId);
    
    // Try with the provided quiz ID
    let progressKey = `progress_${quizId}`;
    let progressData = localStorage.getItem(progressKey);
    
    // If not found, try with the fixed ID from screenshots
    if (!progressData && quizId !== FIXED_QUIZ_ID) {
      progressKey = `progress_${FIXED_QUIZ_ID}`;
      progressData = localStorage.getItem(progressKey);
      console.log("DIRECT LOADER: Fallback to fixed ID for progress:", progressKey);
    }
    
    if (progressData) {
      try {
        const parsedData = JSON.parse(progressData);
        console.log("DIRECT LOADER: Found progress data:", parsedData);
        
        // Dispatch to Redux store
        dispatch(setProgress(parsedData));
        
        // Cache with current quiz ID for future use
        if (quizId !== FIXED_QUIZ_ID) {
          localStorage.setItem(`progress_${quizId}`, progressData);
        }
        
        return true;
      } catch (parseError) {
        console.error("DIRECT LOADER: Error parsing progress data:", parseError);
      }
    } else {
      console.log("DIRECT LOADER: No progress data found in storage");
    }
    
    return false;
  } catch (error) {
    console.error("DIRECT LOADER: Error accessing storage for progress:", error);
    return false;
  }
};

/**
 * Loads leaderboard data directly from Application storage
 * @param {string} quizId - The current quiz/course ID
 * @param {function} dispatch - Redux dispatch function
 * @returns {boolean} - Whether data was found and loaded
 */
export const loadLeaderboardFromStorage = (quizId, dispatch) => {
  try {
    console.log("DIRECT LOADER: Attempting to load leaderboard for:", quizId);
    
    // Try with the provided quiz ID
    let leaderboardKey = `leaderboard_${quizId}`;
    let leaderboardData = localStorage.getItem(leaderboardKey);
    
    // If not found, try with the fixed ID from screenshots
    if (!leaderboardData && quizId !== FIXED_QUIZ_ID) {
      leaderboardKey = `leaderboard_${FIXED_QUIZ_ID}`;
      leaderboardData = localStorage.getItem(leaderboardKey);
      console.log("DIRECT LOADER: Fallback to fixed ID for leaderboard:", leaderboardKey);
    }
    
    if (leaderboardData) {
      try {
        const parsedData = JSON.parse(leaderboardData);
        console.log("DIRECT LOADER: Found leaderboard data:", parsedData);
        
        // Dispatch to Redux store
        dispatch(setLeaderboard(parsedData));
        
        // Cache with current quiz ID for future use
        if (quizId !== FIXED_QUIZ_ID) {
          localStorage.setItem(`leaderboard_${quizId}`, leaderboardData);
        }
        
        return true;
      } catch (parseError) {
        console.error("DIRECT LOADER: Error parsing leaderboard data:", parseError);
      }
    } else {
      console.log("DIRECT LOADER: No leaderboard data found in storage");
    }
    
    return false;
  } catch (error) {
    console.error("DIRECT LOADER: Error accessing storage for leaderboard:", error);
    return false;
  }
};

/**
 * Loads both progress and leaderboard data from Application storage
 * @param {string} quizId - The current quiz/course ID
 * @param {function} dispatch - Redux dispatch function
 * @returns {object} - Status of both loading operations
 */
export const loadAllDataFromStorage = (quizId, dispatch) => {
  console.log("DIRECT LOADER: Loading all data for quiz:", quizId);
  
  // Load progress
  const progressLoaded = loadProgressFromStorage(quizId, dispatch);
  
  // Load leaderboard
  const leaderboardLoaded = loadLeaderboardFromStorage(quizId, dispatch);
  
  // If neither loaded with the provided ID, try with fixed ID
  if (!progressLoaded && !leaderboardLoaded && quizId !== FIXED_QUIZ_ID) {
    console.log("DIRECT LOADER: No data found with provided ID, trying fixed ID");
    return loadAllDataFromStorage(FIXED_QUIZ_ID, dispatch);
  }
  
  return {
    progressLoaded,
    leaderboardLoaded,
    anyDataLoaded: progressLoaded || leaderboardLoaded
  };
};

// Define the exported object
const directLoader = {
  loadProgressFromStorage,
  loadLeaderboardFromStorage,
  loadAllDataFromStorage,
  FIXED_QUIZ_ID
};

export default directLoader; 