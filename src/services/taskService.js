import store from '../redux/store';
import { submitTaskAnswer } from '../redux/slices/quizSlice';
import { evaluateAnswer } from '../utils/answerEvaluator';

/**
 * Task Service - Handles task submission operations with pre-evaluation
 */

/**
 * Submit a task answer with client-side pre-evaluation
 * @param {string} quizId - The quiz ID
 * @param {string} taskId - The task/question ID
 * @param {string} answer - The user's answer
 * @param {object} options - Additional options
 * @returns {Promise} Result of submission
 */
export const submitAnswer = async (quizId, taskId, answer, options = {}) => {
  const {
    skipPreEvaluation = false,
    evaluationThreshold = 0.3, // Lower threshold to defer to backend evaluation
    timeSpent = 0,
    taskData = null, // Optional task data that can be passed directly
    forceEvaluation = false // Force server to evaluate even with low confidence
  } = options;
  
  try {
    // Use provided taskData or get it from Redux store
    let currentTaskData = taskData;
    
    if (!currentTaskData) {
      // Get current task data from Redux store
      const state = store.getState();
      currentTaskData = state.quiz.currentTask;
    }
    
    console.log('Submitting answer for task:', {
      quizId,
      taskId,
      answerLength: answer?.length,
      taskData: currentTaskData ? 'Found' : 'Not found',
      answer: answer
    });
    
    let preEvaluationResult = null;
    
    // Regular client-side pre-evaluation if not skipped and task data exists
    if (!skipPreEvaluation && currentTaskData) {
      preEvaluationResult = evaluateAnswer(answer, currentTaskData);
      
      // Log pre-evaluation for debugging
      console.log('Client-side pre-evaluation:', preEvaluationResult);
    } else {
      console.log('Skipping client-side pre-evaluation:', {
        skipPreEvaluation,
        hasTaskData: !!currentTaskData
      });
    }
    
    // Add a safety check for evaluation result
    if (!preEvaluationResult) {
      preEvaluationResult = {
        isCorrect: false,
        score: 0,
        confidence: 0.2, // Very low confidence when no evaluation was performed
        feedback: 'No client-side evaluation was performed'
      };
    }
    
    // Ensure client-side evaluation always has low confidence
    // This makes backend evaluation the authoritative source
    if (preEvaluationResult.confidence > 0.3) {
      console.log('Reducing client-side confidence to prioritize backend evaluation');
      preEvaluationResult.confidence = 0.3; // Cap at 0.3 to ensure backend is authoritative
    }
    
    // Prepare submission data
    const submissionData = {
      quizId,
      questionId: taskId, // Use questionId for backend compatibility
      answer,
      timeSpent,
      clientEvaluation: preEvaluationResult
    };
    
    // Dispatch the Redux action to submit the answer
    const result = await store.dispatch(submitTaskAnswer(submissionData)).unwrap();
    
    // Log the result for debugging
    console.log('Server response for answer submission:', result);
    
    // Return the server's evaluation result directly - trust the backend
    return result;
  } catch (error) {
    console.error('Error submitting answer:', error);
    throw error;
  }
};

/**
 * Get hints for a task based on a wrong answer
 * @param {string} answer - The user's answer
 * @param {object} taskData - The task data
 * @returns {object} Hint information
 */
export const getAnswerHint = (answer, taskData) => {
  if (!answer || !taskData) {
    return {
      hint: "Please provide an answer to get help.",
      type: "general"
    };
  }
  
  // Run client-side evaluation to determine what's missing
  const evaluation = evaluateAnswer(answer, taskData);
  
  // If the answer is correct according to client-side evaluation,
  // suggest submission but don't guarantee correctness
  if (evaluation.isCorrect) {
    return {
      hint: "Your answer might be correct. Try submitting it to verify.",
      type: "suggestion"
    };
  }
  
  // For text answers with keywords
  if (evaluation.matchedKeywords && taskData.objective) {
    // Create a hint based on objectives and missing keywords
    const matchedCount = evaluation.matchedKeywords.length;
    const totalKeywords = evaluation.keywords ? evaluation.keywords.length : 0;
    
    if (matchedCount === 0) {
      return {
        hint: "Your answer doesn't seem to include key concepts. Review the task objectives carefully.",
        type: "conceptual"
      };
    } else if (matchedCount / totalKeywords < 0.5) {
      return {
        hint: "You're on the right track, but your answer may be missing important concepts.",
        type: "conceptual"
      };
    } else {
      return {
        hint: "You've covered some key concepts. Make sure your answer addresses all the requirements.",
        type: "refinement"
      };
    }
  }
  
  // For code answers
  if (evaluation.missingFunctions && evaluation.missingFunctions.length > 0) {
    return {
      hint: `Your code might need to include: ${evaluation.missingFunctions.join(", ")}`,
      type: "technical"
    };
  }
  
  if (evaluation.foundProhibited && evaluation.foundProhibited.length > 0) {
    return {
      hint: `Try solving this without using: ${evaluation.foundProhibited.join(", ")}`,
      type: "technical"
    };
  }
  
  // Default hint
  return {
    hint: "Review the task requirements and make sure your answer addresses all the points.",
    type: "general"
  };
};

const taskService = {
  submitAnswer,
  getAnswerHint
};

export default taskService; 