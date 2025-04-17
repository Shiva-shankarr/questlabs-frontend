/**
 * Utility functions for managing session storage related to quest creation and editing
 */

/**
 * Clear temporary quest data from session storage
 * This should be called when navigating away from the quest creation/edit flow
 */
export const clearQuestSessionData = () => {
  try {
    // Remove quest details and tasks from session storage
    sessionStorage.removeItem('questDetails');
    sessionStorage.removeItem('questTasks');
    sessionStorage.removeItem('questSessionTimestamp'); // Also remove timestamp
    sessionStorage.removeItem('editingTaskId'); // Also remove any editing task ID
    console.log('Cleared temporary quest data from session storage');
  } catch (error) {
    console.error('Error clearing quest session data:', error);
  }
};

/**
 * Check if we're in the quest creation/edit flow
 * @param {string} pathname - Current route pathname
 * @returns {boolean} - True if in quest creation/edit flow, false otherwise
 */
export const isInQuestFlow = (pathname) => {
  const questFlowRoutes = [
    '/admin/create-quest',
    '/admin/create-quest/tasks',
    '/admin/create-quest/task-details',
    '/admin/create-quest/preview'
  ];
  
  // Check if current path is in the quest flow routes or starts with them
  return questFlowRoutes.some(route => 
    pathname === route || pathname.startsWith(`${route}/`)
  );
};

/**
 * Save quest data to session storage
 * @param {Object} questDetails - Quest details to save
 */
export const saveQuestDetails = (questDetails) => {
  try {
    // Always update timestamp when saving quest details
    updateQuestSessionTimestamp();
    // Save the quest details to session storage
    sessionStorage.setItem('questDetails', JSON.stringify(questDetails));
    console.log('Quest details saved to session storage');
  } catch (error) {
    console.error('Error saving quest details to session storage:', error);
  }
};

/**
 * Save quest tasks to session storage
 * @param {Array} questTasks - Quest tasks to save
 */
export const saveQuestTasks = (questTasks) => {
  try {
    updateQuestSessionTimestamp(); // Update timestamp when saving
    sessionStorage.setItem('questTasks', JSON.stringify(questTasks));
  } catch (error) {
    console.error('Error saving quest tasks to session storage:', error);
  }
};

/**
 * Update quest session timestamp
 * This helps identify stale data
 */
export const updateQuestSessionTimestamp = () => {
  try {
    sessionStorage.setItem('questSessionTimestamp', Date.now().toString());
  } catch (error) {
    console.error('Error updating quest session timestamp:', error);
  }
};

/**
 * Check if quest session data is stale (older than maxAgeHours)
 * @param {number} maxAgeHours - Maximum age in hours for session data to be considered fresh
 * @returns {boolean} - True if session data is stale, false otherwise
 */
export const isQuestSessionDataStale = (maxAgeHours = 24) => {
  try {
    const timestamp = sessionStorage.getItem('questSessionTimestamp');
    
    // If no timestamp, consider data stale
    if (!timestamp) return true;
    
    // Calculate max age in milliseconds
    const maxAgeMs = maxAgeHours * 60 * 60 * 1000;
    
    // Check if timestamp is older than max age
    const isStale = (Date.now() - parseInt(timestamp)) > maxAgeMs;
    
    if (isStale) {
      console.log(`Quest session data is stale (older than ${maxAgeHours} hours)`);
    }
    
    return isStale;
  } catch (error) {
    console.error('Error checking quest session data age:', error);
    
    // In case of error, consider data stale
    return true;
  }
};

/**
 * Load quest data for editing from session storage
 * @param {string} questId - Quest ID to load
 * @param {Function} navigate - React Router navigate function
 * @param {Function} toast - Toast notification function
 * @param {boolean} forceRefresh - Whether to force refresh data from API even if already in session storage
 * @returns {Promise<boolean>} - Promise resolving to true if data was loaded successfully, false otherwise
 */
export const loadQuestDataForEdit = async (questId, navigate, toast, forceRefresh = false) => {
  try {
    const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
    // Check if we already have this quest data in session storage
    const storedQuestDetails = sessionStorage.getItem('questDetails');
    const storedQuestTasks = sessionStorage.getItem('questTasks');
    const timestamp = sessionStorage.getItem('questSessionTimestamp');
    
    // Only use stored data if available, matches the requested ID, and not forcing refresh
    if (
      !forceRefresh && 
      storedQuestDetails && 
      storedQuestTasks && 
      timestamp
    ) {
      try {
        const parsedDetails = JSON.parse(storedQuestDetails);
        // Check if the stored quest ID matches the requested ID
        if (parsedDetails.id === questId || parsedDetails._id === questId) {
          console.log('Using existing quest data from session storage for editing');
          return true;
        }
      } catch (parseError) {
        console.error('Error parsing stored quest data:', parseError);
        // Continue to fetch from API if parsing fails
      }
    }
    
    // Get auth token for API requests
    const token = localStorage.getItem('userToken');
    if (!token) {
      console.error('No authentication token found');
      toast?.error('Please log in to edit quest details');
      navigate?.('/login', { state: { from: `/admin/quests/${questId}` } });
      return false;
    }
    
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
    
    // Import axios dynamically
    const axios = (await import('axios')).default;
    
    // Fetch quest details and tasks in parallel for better performance
    const [questResponse, tasksResponse] = await Promise.all([
      axios.get(`${API_URL}/quizzes/${questId}`, { headers }),
      axios.get(`${API_URL}/quizzes/${questId}/questions`, { headers })
    ]);
    
    // Extract the quiz data and handle different API response formats
    const quizData = questResponse.data?.quiz || questResponse.data;
    if (!quizData) {
      throw new Error('Invalid quiz data format received');
    }
    
    // Store quest details in session storage
    saveQuestDetails(quizData);
    
    // Extract and store tasks
    if (tasksResponse.data?.questions) {
      saveQuestTasks(tasksResponse.data.questions);
    } else if (Array.isArray(tasksResponse.data)) {
      saveQuestTasks(tasksResponse.data);
    } else {
      saveQuestTasks([]);
    }
    
    console.log('Successfully loaded quest data for editing:', questId);
    return true;
  } catch (error) {
    console.error('Error loading quest data for editing:', error);
    toast?.error(error.response?.data?.message || 'Failed to load quest data for editing');
    return false;
  }
}; 