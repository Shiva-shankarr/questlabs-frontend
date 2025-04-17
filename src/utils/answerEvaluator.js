/* eslint-disable */
// Utility functions for evaluating user answers client-side

/**
 * Answer Evaluator Utility
 * 
 * This utility provides client-side pre-evaluation of answers before sending to the server.
 * It's useful for providing immediate feedback and hints to users.
 */

/**
 * Performs basic keyword matching for text answers
 * @param {string} answer - User's answer text
 * @param {string[]} keywords - Array of keywords that should appear in correct answer
 * @param {object} options - Configuration options
 * @returns {object} Evaluation result
 */
export const evaluateByKeywords = (answer, keywords, options = {}) => {
  const {
    matchThreshold = 0.5, // Percentage of keywords needed for a passing score
    caseSensitive = false,
    fuzzyMatching = true,
    partialCredit = true
  } = options;
  
  if (!answer || !keywords || !keywords.length) {
    return {
      isCorrect: false,
      score: 0,
      matchedKeywords: [],
      feedback: "Missing answer or keywords for evaluation."
    };
  }

  // Normalize the answer for comparison
  const normalizedAnswer = caseSensitive ? answer.trim() : answer.toLowerCase().trim();
  
  // Log keywords for debugging
  console.log(`Evaluating answer "${normalizedAnswer}" against keywords:`, keywords);
  
  // First check for exact match with any keyword
  const exactMatchKeyword = keywords.find(keyword => {
    const normalizedKeyword = caseSensitive ? keyword.trim() : keyword.toLowerCase().trim();
    const isMatch = normalizedAnswer === normalizedKeyword;
    if (isMatch) console.log(`Exact match found with "${keyword}"`);
    return isMatch;
  });
  
  if (exactMatchKeyword) {
    console.log(`Exact match found with keyword: "${exactMatchKeyword}"`);
    return {
      isCorrect: true,
      score: 1.0,
      matchedKeywords: [exactMatchKeyword],
      feedback: "Exact match! Your answer is correct."
    };
  }
  
  // If no exact match, check for partial matches
  // Count matched keywords
  const matchedKeywords = [];
  
  keywords.forEach(keyword => {
    const normalizedKeyword = caseSensitive ? keyword.trim() : keyword.toLowerCase().trim();
    
    if (fuzzyMatching) {
      // Check for partial keyword matches (e.g. "function" would match "functions")
      if (normalizedAnswer.includes(normalizedKeyword)) {
        matchedKeywords.push(keyword);
        console.log(`Partial match found with "${keyword}"`);
      }
    } else {
      // Exact word boundary matching
      const regex = new RegExp(`\\b${normalizedKeyword}\\b`, caseSensitive ? '' : 'i');
      if (regex.test(normalizedAnswer)) {
        matchedKeywords.push(keyword);
        console.log(`Word boundary match found with "${keyword}"`);
      }
    }
  });
  
  // Calculate score as percentage of matched keywords
  const score = matchedKeywords.length / keywords.length;
  const isCorrect = score >= matchThreshold;
  
  // Generate feedback message
  let feedback = "";
  if (isCorrect) {
    feedback = "Great job! Your answer contains the key concepts.";
  } else if (partialCredit && score > 0) {
    feedback = `You're on the right track, but your answer is missing some important concepts.`;
  } else {
    feedback = "Your answer doesn't include the key concepts required.";
  }
  
  console.log(`Keyword evaluation result: matched=${matchedKeywords.length}/${keywords.length}, score=${score}, isCorrect=${isCorrect}`);
  
  return {
    isCorrect,
    score: Math.round(score * 100) / 100,
    matchedKeywords,
    feedback
  };
};

/**
 * Evaluates code answers against expected patterns or outputs
 * @param {string} code - User's code answer
 * @param {object} criteria - Evaluation criteria
 * @returns {object} Evaluation result
 */
export const evaluateCode = (code, criteria = {}) => {
  const {
    requiredFunctions = [],
    requiredPatterns = [],
    prohibitedPatterns = []
  } = criteria;
  
  if (!code) {
    return {
      isCorrect: false,
      score: 0,
      feedback: "No code submitted for evaluation."
    };
  }
  
  // Check for required functions
  const missingFunctions = [];
  requiredFunctions.forEach(func => {
    const funcRegex = new RegExp(`(function\\s+${func}\\s*\\(|const\\s+${func}\\s*=\\s*\\(|${func}\\s*:\\s*function)`);
    if (!funcRegex.test(code)) {
      missingFunctions.push(func);
    }
  });
  
  // Check for required patterns
  const missingPatterns = [];
  requiredPatterns.forEach(pattern => {
    if (!code.includes(pattern.text)) {
      missingPatterns.push(pattern.name || pattern.text);
    }
  });
  
  // Check for prohibited patterns
  const foundProhibited = [];
  prohibitedPatterns.forEach(pattern => {
    if (code.includes(pattern.text)) {
      foundProhibited.push(pattern.name || pattern.text);
    }
  });
  
  // Calculate score and correctness
  const hasAllRequired = missingFunctions.length === 0 && missingPatterns.length === 0;
  const hasNoProhibited = foundProhibited.length === 0;
  const isCorrect = hasAllRequired && hasNoProhibited;
  
  // Generate feedback
  let feedback = "";
  if (isCorrect) {
    feedback = "Your code includes all the required elements!";
  } else {
    if (missingFunctions.length > 0) {
      feedback += `Missing functions: ${missingFunctions.join(", ")}. `;
    }
    if (missingPatterns.length > 0) {
      feedback += `Missing required elements: ${missingPatterns.join(", ")}. `;
    }
    if (foundProhibited.length > 0) {
      feedback += `Your code includes prohibited elements: ${foundProhibited.join(", ")}. `;
    }
  }
  
  return {
    isCorrect,
    score: isCorrect ? 1 : 0,
    missingFunctions,
    missingPatterns,
    foundProhibited,
    feedback
  };
};

/**
 * Parses keywords and evaluation criteria from question data
 * @param {object} questionData - The question/task data from the API
 * @returns {object} Extracted evaluation criteria
 */
export const extractEvaluationCriteria = (questionData) => {
  if (!questionData) return null;
  
  console.log('Extracting criteria from question data:', 
    questionData.id && questionData.questionText ? 
    { id: questionData.id, text: questionData.questionText } : 'Invalid question data');
  
  // ONLY use database-sourced criteria that comes directly from the backend
  // Check if there's an explicit evaluationCriteria field with keywords
  if (questionData.evaluationCriteria && questionData.evaluationCriteria.keywords) {
    console.log('Found database-provided evaluation criteria with keywords:', 
      questionData.evaluationCriteria.keywords);
    
    return {
      keywords: questionData.evaluationCriteria.keywords,
      threshold: questionData.evaluationCriteria.threshold || 0.6,
      caseSensitive: questionData.evaluationCriteria.caseSensitive || false,
      exactMatch: questionData.evaluationCriteria.exactMatch || false,
      matchType: questionData.evaluationCriteria.matchType || 'CONTAINS',
      requiredPatterns: questionData.evaluationCriteria.requiredPatterns || [],
      prohibitedPatterns: questionData.evaluationCriteria.prohibitedPatterns || [],
      answerType: 'text'
    };
  }
  
  // For multiple choice questions, extract criteria from options
  if (questionData.type === 'MULTIPLE_CHOICE' && questionData.options && Array.isArray(questionData.options)) {
    const correctOptions = questionData.options.filter(opt => opt.isCorrect);
    if (correctOptions.length > 0) {
      const keywords = correctOptions.map(opt => opt.text || opt.optionText);
      console.log('Extracted criteria from multiple choice options:', keywords);
      
      return {
        keywords,
        threshold: 1.0, // Exact match needed for multiple choice
        caseSensitive: false,
        exactMatch: true,
        matchType: 'EXACT',
        answerType: 'multipleChoice'
      };
    }
  }
  
  // If no clear criteria found, return minimal criteria with very low confidence
  console.log('No database evaluation criteria available, using minimal confidence placeholder');
  return {
    keywords: [],
    threshold: 0.5,
    caseSensitive: false,
    exactMatch: false,
    matchType: 'CONTAINS',
    confidence: 0.1, // Very low confidence when no database criteria exists
    answerType: 'text'
  };
};

/**
 * High-level function to evaluate an answer based on question data
 * @param {string} answer - User's answer
 * @param {object} questionData - The question/task data
 * @returns {object} Evaluation result
 */
export const evaluateAnswer = (answer, questionData) => {
  if (!answer || !questionData) {
    return {
      isCorrect: false,
      score: 0,
      confidence: 0.5,
      feedback: "Missing answer or question data",
      missingKeywords: []
    };
  }

  try {
    console.log("Evaluating answer:", answer.substring(0, 30) + (answer.length > 30 ? "..." : ""));
    
    // Get evaluation criteria
    const criteria = extractEvaluationCriteria(questionData);
    console.log("Using criteria:", criteria);
    
    if (!criteria || !criteria.keywords || criteria.keywords.length === 0) {
      return {
        isCorrect: false,
        score: 0,
        confidence: 0.1,
        feedback: "Cannot evaluate without proper criteria",
        missingKeywords: []
      };
    }
    
    // Special handling for Task 5 - lower confidence to ensure server evaluation
    if (questionData.questionId === 5 || 
        (questionData.questionText && questionData.questionText.includes("Genre Chronicles"))) {
      console.log("Task 5 detected - using very low confidence to ensure server evaluation");
      
      // For Task 5, we'll check if there's at least one keyword match
      const normalizedAnswer = answer.toLowerCase();
      let hasAnyKeyword = false;
      
      for (const keyword of criteria.keywords) {
        if (normalizedAnswer.includes(keyword.toLowerCase())) {
          hasAnyKeyword = true;
          break;
        }
      }
      
      return {
        isCorrect: hasAnyKeyword,  // Tentatively mark as correct if any keyword found
        score: hasAnyKeyword ? 0.5 : 0,
        confidence: 0.1,  // Very low confidence to ensure server has final say
        feedback: hasAnyKeyword ? 
          "Your answer contains at least one relevant keyword." : 
          "Your answer doesn't contain any relevant keywords.",
        missingKeywords: criteria.keywords.filter(kw => 
          !normalizedAnswer.includes(kw.toLowerCase())
        )
      };
    }
    
    // For text answers, use the keyword matching approach
    const matchedKeywords = [];
    const missingKeywords = [];
    
    // Check each keyword
    criteria.keywords.forEach(keyword => {
      const normalizedAnswer = criteria.caseSensitive ? answer : answer.toLowerCase();
      const normalizedKeyword = criteria.caseSensitive ? keyword : keyword.toLowerCase();
      
      let isMatch = false;
      
      // Match based on the matchType
      switch (criteria.matchType) {
        case 'EXACT':
          isMatch = normalizedAnswer === normalizedKeyword;
          break;
        case 'REGEX':
          try {
            const regex = new RegExp(normalizedKeyword, criteria.caseSensitive ? '' : 'i');
            isMatch = regex.test(normalizedAnswer);
          } catch (e) {
            console.error('Invalid regex:', normalizedKeyword, e);
          }
          break;
        case 'CONTAINS':
        default:
          isMatch = normalizedAnswer.includes(normalizedKeyword);
          break;
      }
      
      // Track matched and missing keywords
      if (isMatch) {
        matchedKeywords.push(keyword);
        console.log(`✓ Matched keyword: "${keyword}"`);
      } else {
        missingKeywords.push(keyword);
        console.log(`✗ Missing keyword: "${keyword}"`);
      }
    });
    
    // Calculate score and determine correctness
    const score = criteria.keywords.length > 0 ? 
      matchedKeywords.length / criteria.keywords.length : 0;
    
    const isCorrect = score >= (criteria.threshold || 0.5);
    
    // Generate detailed feedback
    let feedback = "";
    if (isCorrect) {
      feedback = "Your answer contains all the required elements.";
    } else {
      const missingCount = missingKeywords.length;
      feedback = `Your answer is missing ${missingCount} required element${missingCount === 1 ? '' : 's'}.`;
      
      if (missingKeywords.length > 0) {
        // Show up to 3 missing keywords in the feedback
        const keywordSample = missingKeywords.slice(0, 3).join(', ');
        feedback += ` Try including: ${keywordSample}${missingKeywords.length > 3 ? '...' : ''}`;
      }
    }
    
    // Create the evaluation result
    return {
      isCorrect,
      score,
      confidence: 0.8,
      feedback,
      matchedKeywords,
      missingKeywords,
      threshold: criteria.threshold || 0.5
    };
  } catch (error) {
    console.error("Error during answer evaluation:", error);
    
    return {
      isCorrect: false,
      score: 0,
      confidence: 0.1,
      feedback: "An error occurred during evaluation.",
      missingKeywords: []
    };
  }
};

// Helper functions

function evaluateMultipleChoiceAnswer(normalizedAnswer, questionData) {
  const options = questionData.options || [];
  
  // Find selected option
  const selectedOption = options.find(option => {
    const optionText = option.text.toLowerCase().trim();
    return normalizedAnswer === optionText || 
           normalizedAnswer === option.id.toLowerCase() ||
           normalizedAnswer.includes(optionText);
  });
  
  if (!selectedOption) {
    return {
      isCorrect: false,
      score: 0.0,
      confidence: 0.3, // Medium-low confidence when no match found
      feedback: "Your answer doesn't match any of the available options",
      matchedOption: null
    };
  }
  
  return {
    isCorrect: selectedOption.isCorrect,
    score: selectedOption.isCorrect ? 1.0 : 0.0,
    confidence: 0.7, // Higher confidence for multiple choice
    feedback: selectedOption.isCorrect ? 
      "Your selected answer appears to be correct!" : 
      "Your selected answer may not be correct",
    matchedOption: selectedOption.id
  };
}

// Helper functions for keyword extraction

/**
 * Extract objectives from question data
 */
function getObjectives(questionData) {
  // Combine all potential sources of keywords
  const sources = [];
  
  // Add question text
  if (questionData.questionText) {
    sources.push(questionData.questionText);
  }
  
  // Add objectives if available
  if (Array.isArray(questionData.objective)) {
    sources.push(...questionData.objective);
  } else if (questionData.objective) {
    sources.push(questionData.objective);
  }
  
  // Add description if available
  if (Array.isArray(questionData.description)) {
    sources.push(...questionData.description);
  } else if (questionData.description) {
    sources.push(questionData.description);
  }
  
  // Add hints if available
  if (Array.isArray(questionData.hints)) {
    sources.push(...questionData.hints);
  } else if (questionData.hints) {
    sources.push(questionData.hints);
  }
  
  return sources;
}

/**
 * Extract keywords from objectives or other text
 */
function extractKeywords(textSources) {
  if (!textSources || textSources.length === 0) {
    return [];
  }
  
  // Join all sources
  const combinedText = textSources.join(' ').toLowerCase();
  
  // Common words to exclude
  const commonWords = ['a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'with', 'by', 'about', 'as', 'of', 'is', 'are'];
  
  // Split text into words and remove common words
  const words = combinedText.split(/\W+/).filter(word => 
    word.length > 3 && !commonWords.includes(word)
  );
  
  // Get unique words
  const uniqueWords = [...new Set(words)];
  
  // Take top N most relevant words
  const keywords = uniqueWords.slice(0, Math.min(15, uniqueWords.length));
  
  return keywords;
}

/**
 * Checks if a keyword matches in an answer text based on match type
 * @param {string} answer - The normalized answer text
 * @param {string} keyword - The keyword to check
 * @param {string} matchType - The match type: 'CONTAINS', 'EXACT', or 'REGEX'
 * @param {boolean} caseSensitive - Whether the match should be case sensitive
 * @returns {boolean} Whether the keyword matches
 */
export const checkKeywordMatch = (answer, keyword, matchType = 'CONTAINS', caseSensitive = false) => {
  if (!answer || !keyword) return false;
  
  // Normalize the answer and keyword based on case sensitivity
  const normalizedAnswer = caseSensitive ? answer : answer.toLowerCase();
  const normalizedKeyword = caseSensitive ? keyword : keyword.toLowerCase();
  
  // Perform matching based on match type
  switch (matchType) {
    case 'EXACT':
      return normalizedAnswer === normalizedKeyword;
      
    case 'REGEX':
      try {
        const flags = caseSensitive ? '' : 'i';
        const regex = new RegExp(normalizedKeyword, flags);
        return regex.test(normalizedAnswer);
      } catch (error) {
        console.error(`Invalid regex pattern: ${normalizedKeyword}`, error);
        return false;
      }
      
    case 'CONTAINS':
    default:
      return normalizedAnswer.includes(normalizedKeyword);
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
  
  // If we have matched keywords but not enough
  if (evaluation.matchedKeywords && evaluation.matchedKeywords.length > 0) {
    const matchedCount = evaluation.matchedKeywords.length;
    const totalKeywords = evaluation.keywords ? evaluation.keywords.length : 0;
    
    if (matchedCount / totalKeywords < 0.5) {
      return {
        hint: "You're on the right track, but your answer may be missing some important concepts.",
        type: "conceptual"
      };
    } else {
      return {
        hint: "You've covered several key concepts. Make sure your answer addresses all the requirements.",
        type: "refinement"
      };
    }
  }
  
  // For code answers
  if (taskData.evaluationCriteria && taskData.evaluationCriteria.requiredPatterns && taskData.evaluationCriteria.requiredPatterns.length > 0) {
    return {
      hint: "Your solution should include certain required elements. Check the task description carefully.",
      type: "technical"
    };
  }
  
  // Default hint
  return {
    hint: "Think about the core concepts described in the task objective and make sure your answer covers them.",
    type: "general"
  };
};

const answerEvaluator = {
  evaluateByKeywords,
  evaluateCode,
  extractEvaluationCriteria,
  evaluateAnswer,
  getAnswerHint
};

export default answerEvaluator; 