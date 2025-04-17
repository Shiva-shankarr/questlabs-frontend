/**
 * Utility functions to check task availability and troubleshoot task loading issues
 */

/**
 * Check if a task exists by trying multiple API endpoints
 * @param {string} taskId The task ID to check
 * @param {string} quizId Optional quiz ID for additional endpoint checking
 * @returns {Promise<Object>} The task data if found, or error details if not
 */
export const checkTaskExists = async (taskId, quizId = null) => {
  const API_URL = 'http://localhost:5000/api';
  const token = localStorage.getItem('userToken');
  const authHeaders = token ? { 'Authorization': `Bearer ${token}` } : {};
  
  // Define the endpoints to try
  const endpoints = [
    `${API_URL}/questions/${taskId}`,
    `${API_URL}/tasks/${taskId}`
  ];
  
  // Add quiz-specific endpoints if quiz ID is provided
  if (quizId) {
    endpoints.push(
      `${API_URL}/quizzes/${quizId}/questions/${taskId}`,
      `${API_URL}/quizzes/${quizId}/tasks/${taskId}`
    );
  }
  
  // Try each endpoint
  const results = {
    taskId,
    quizId,
    found: false,
    data: null,
    attempts: [],
    timestamp: new Date().toISOString()
  };
  
  for (const endpoint of endpoints) {
    try {
      console.log(`Checking task at endpoint: ${endpoint}`);
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          ...authHeaders
        },
        credentials: 'include'
      });
      
      const result = {
        endpoint,
        status: response.status,
        success: response.ok
      };
      
      if (response.ok) {
        const data = await response.json();
        result.data = data;
        
        // If this is our first success, store the data
        if (!results.found) {
          results.found = true;
          results.data = data;
          results.successEndpoint = endpoint;
        }
      } else {
        try {
          result.error = await response.text();
        } catch (e) {
          result.error = 'Failed to parse error response';
        }
      }
      
      results.attempts.push(result);
    } catch (error) {
      results.attempts.push({
        endpoint,
        status: 'Network Error',
        success: false,
        error: error.message
      });
    }
  }
  
  // If we haven't found the task, try getting all tasks
  if (!results.found && quizId) {
    try {
      // Try to get all questions in the quiz
      const allQuestionsEndpoint = `${API_URL}/quizzes/${quizId}/questions`;
      const response = await fetch(allQuestionsEndpoint, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          ...authHeaders
        },
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.questions && Array.isArray(data.questions)) {
          results.allQuestions = data.questions;
          
          // Check if task exists in all questions
          const foundTask = data.questions.find(q => q.id === taskId);
          if (foundTask) {
            results.found = true;
            results.data = foundTask;
            results.successEndpoint = allQuestionsEndpoint;
            results.foundInAllQuestions = true;
          } else {
            // Try normalized ID comparison
            const normalizedTaskId = taskId.toLowerCase().replace(/-/g, '');
            const similarTasks = data.questions.filter(q => {
              const normalizedId = q.id.toLowerCase().replace(/-/g, '');
              return normalizedId === normalizedTaskId;
            });
            
            if (similarTasks.length > 0) {
              results.similarTasks = similarTasks;
            }
          }
        }
      }
    } catch (error) {
      console.error('Error fetching all questions:', error);
    }
  }
  
  // Add final status message
  if (results.found) {
    results.message = `Task found via ${results.successEndpoint}`;
  } else {
    results.message = 'Task not found via any endpoint';
  }
  
  console.log('Task check results:', results);
  return results;
};

export default {
  checkTaskExists
}; 