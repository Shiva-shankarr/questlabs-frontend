/**
 * Direct Storage Loader Utility
 * 
 * This utility provides functions to directly load data from Application storage
 * into the Redux store for our progress and leaderboard features.
 */

import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { setProgress, setLeaderboard, resetProgress } from '../redux/slices/progressSlice';

// The fixed ID we see in the Application storage
const FIXED_ID = '0c54617c-3116-4bcd-bb53-bf31ca8044d5';

/**
 * Hook to load progress and leaderboard data directly from Application storage
 * 
 * @param {string} courseId - The current course ID
 * @returns {boolean} - Whether data was found and loaded
 */
export const useDirectStorageLoader = (courseId) => {
  const dispatch = useDispatch();
  
  useEffect(() => {
    if (!courseId) return;
    
    // Load data directly from Application storage
    try {
      // Reset the progress state first to ensure clean data
      dispatch(resetProgress());
      
      // Then load fresh data
      loadProgressData(courseId, dispatch);
      loadLeaderboardData(courseId, dispatch);
    } catch (error) {
      console.error('Error in direct storage loader:', error);
    }
  }, [courseId, dispatch]);
};

/**
 * Load progress data from Application storage
 * 
 * @param {string} courseId - The current course ID
 * @param {Function} dispatch - Redux dispatch function
 * @returns {boolean} - Whether data was found and loaded
 */
export const loadProgressData = (courseId, dispatch) => {
  try {
    // Try current course ID first
    let progressJSON = localStorage.getItem(`progress_${courseId}`);
    
    // If not found, try with the fixed ID from the screenshot
    if (!progressJSON) {
      progressJSON = localStorage.getItem(`progress_${FIXED_ID}`);
    }
    
    if (progressJSON) {
      let progressData;
      try {
        progressData = JSON.parse(progressJSON);
        console.log('STORAGE LOADER: Found progress data:', progressData);
      } catch (e) {
        console.error('Error parsing progress data:', e);
        return false;
      }
      
      // Use imported action creator for type safety
      dispatch(setProgress(progressData));
      
      // Cache with current ID for consistency
      localStorage.setItem(`progress_${courseId}`, progressJSON);
      
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Error loading progress data from storage:', error);
    return false;
  }
};

/**
 * Load leaderboard data from Application storage
 * 
 * @param {string} courseId - The current course ID
 * @param {Function} dispatch - Redux dispatch function
 * @returns {boolean} - Whether data was found and loaded
 */
export const loadLeaderboardData = (courseId, dispatch) => {
  try {
    // Try current course ID first
    let leaderboardJSON = localStorage.getItem(`leaderboard_${courseId}`);
    
    // If not found, try with the fixed ID from the screenshot
    if (!leaderboardJSON) {
      leaderboardJSON = localStorage.getItem(`leaderboard_${FIXED_ID}`);
    }
    
    if (leaderboardJSON) {
      let leaderboardData;
      try {
        leaderboardData = JSON.parse(leaderboardJSON);
        console.log('STORAGE LOADER: Found leaderboard data:', leaderboardData);
      } catch (e) {
        console.error('Error parsing leaderboard data:', e);
        return false;
      }
      
      // Use imported action creator for type safety
      dispatch(setLeaderboard(leaderboardData));
      
      // Cache with current ID for consistency
      localStorage.setItem(`leaderboard_${courseId}`, leaderboardJSON);
      
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Error loading leaderboard data from storage:', error);
    return false;
  }
};

// Define the module as a named object
const storageLoader = {
  useDirectStorageLoader,
  loadProgressData,
  loadLeaderboardData,
  FIXED_ID
};

export default storageLoader; 