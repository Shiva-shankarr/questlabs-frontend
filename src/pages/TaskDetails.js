import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { submitTaskAnswer } from '../redux/slices/quizSlice';
import { fetchProgressAndLeaderboard } from '../utils/progressFetcher';
//import { refreshCourseData } from '../redux/slices/courseSlice';
import {  Spinner,ToastContainer } from 'react-bootstrap';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import './TaskDetails.css';
import store from '../redux/store';
import { getAnswerHint,  evaluateAnswer } from '../utils/answerEvaluator';
import { connect } from '../redux/slices/socketSlice';
import userProgressTracker from '../utils/userProgressTracker';
//import api from '../services/apiService';
import { loadProgressData, loadLeaderboardData } from '../utils/storageLoader';
import ProgressBoard from '../Components/ProgressBoard';
import LeaderboardComponent from '../Components/LeaderboardComponent';
//import TimerComponent from '../Components/TimerComponent';

// Final fallback: Try to get task from Redux state
const findTaskInReduxState = (courseId, taskId) => {
  const state = store.getState();
  const course = state.course.currentCourse;
  
  if (course && Array.isArray(course.questions)) {
    return course.questions.find(q => 
      q.id === taskId || 
      q._id === taskId || 
      (parseInt(taskId) && q.questionId === parseInt(taskId))
    );
  }
  return null;
};

// Utility function to try loading task data from multiple sources
const loadTaskData = async (courseId, taskId, headers) => {
  // Keep track of all attempts
  const attempts = [];
  let lastError = null;
  
  // Set default headers if not provided
  if (!headers) {
    const token = localStorage.getItem('userToken');
    headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }
  
  console.log(`Attempting to load task data for courseId=${courseId}, taskId=${taskId}`);
  
  // Attempt 1: Try the primary task endpoint
  try {
    const primaryUrl = `http://localhost:5000/api/quizzes/${courseId}/tasks/${taskId}`;
    attempts.push({url: primaryUrl, type: 'primary-task'});
    
    console.log(`Attempt 1: Trying primary task endpoint: ${primaryUrl}`);
    const response = await fetch(primaryUrl, {
      method: 'GET',
      headers,
      credentials: 'include'
    });
    
    if (response.ok) {
      console.log('✅ Successfully fetched task from primary task endpoint');
      return await response.json();
    }
    
    lastError = `Status ${response.status}: ${response.statusText}`;
    console.log(`❌ Primary task endpoint failed: ${lastError}`);
  } catch (err) {
    lastError = err.message;
    console.log(`❌ Primary task endpoint error: ${lastError}`);
  }

  // Attempt 2: Try the question endpoint 
  try {
    const questionUrl = `http://localhost:5000/api/quizzes/${courseId}/questions/${taskId}`;
    attempts.push({url: questionUrl, type: 'primary-question'});
    
    console.log(`Attempt 2: Trying question endpoint: ${questionUrl}`);
    const response = await fetch(questionUrl, {
      method: 'GET',
      headers,
      credentials: 'include'
    });
    
    if (response.ok) {
      console.log('✅ Successfully fetched task from question endpoint');
      return await response.json();
    }
    
    lastError = `Status ${response.status}: ${response.statusText}`;
    console.log(`❌ Question endpoint failed: ${lastError}`);
  } catch (err) {
    lastError = err.message;
    console.log(`❌ Question endpoint error: ${lastError}`);
  }

  // Attempt 3: Try getting the whole quiz and finding the task
  try {
    const quizUrl = `http://localhost:5000/api/quizzes/${courseId}`;
    attempts.push({url: quizUrl, type: 'quiz'});
    
    console.log(`Attempt 3: Trying whole quiz endpoint: ${quizUrl}`);
    const response = await fetch(quizUrl, {
      method: 'GET',
      headers,
      credentials: 'include'
    });
    
    if (response.ok) {
      const quizData = await response.json();
      
      if (Array.isArray(quizData.questions)) {
        const foundTask = quizData.questions.find(q => 
          q.id === taskId || 
          q._id === taskId || 
          (parseInt(taskId) && q.questionId === parseInt(taskId))
        );
        
        if (foundTask) {
          console.log('✅ Found task in quiz data');
          return foundTask;
        }
        console.log(`❌ Task not found in quiz data (${quizData.questions.length} questions available)`);
        console.log('Available question IDs:', quizData.questions.map(q => q.id || q._id).join(', '));
      } else {
        console.log('❌ Quiz data does not contain questions array');
      }
    } else {
      lastError = `Status ${response.status}: ${response.statusText}`;
      console.log(`❌ Quiz endpoint failed: ${lastError}`);
    }
  } catch (err) {
    lastError = err.message;
    console.log(`❌ Quiz endpoint error: ${lastError}`);
  }
  
  // Attempt 4: Try the direct question endpoint
  try {
    const directUrl = `http://localhost:5000/api/questions/${taskId}`;
    attempts.push({url: directUrl, type: 'direct-question'});
    
    console.log(`Attempt 4: Trying direct question endpoint: ${directUrl}`);
    const response = await fetch(directUrl, {
      method: 'GET',
      headers,
      credentials: 'include'
    });
    
    if (response.ok) {
      console.log('✅ Successfully fetched task from direct question endpoint');
      return await response.json();
    }
    
    lastError = `Status ${response.status}: ${response.statusText}`;
    console.log(`❌ Direct question endpoint failed: ${lastError}`);
  } catch (err) {
    lastError = err.message;
    console.log(`❌ Direct question endpoint error: ${lastError}`);
  }
  
  // Attempt 5: Try using the find-question utility endpoint
  try {
    const findUrl = `http://localhost:5000/api/quizzes/find-question?id=${taskId}&pattern=partial`;
    attempts.push({url: findUrl, type: 'find-question'});
    
    console.log(`Attempt 5: Trying find-question utility: ${findUrl}`);
    const response = await fetch(findUrl, {
      method: 'GET',
      headers,
      credentials: 'include'
    });
    
    if (response.ok) {
      const findData = await response.json();
      console.log('✅ Successfully queried find-question utility', findData);
      
      if (findData.found && findData.questions?.length > 0) {
        // Take the first match
        const matchedId = findData.questions[0].id;
        console.log(`Found a potential match with ID: ${matchedId}`);
        
        // Try to fetch this matched question
        const matchUrl = `http://localhost:5000/api/questions/${matchedId}`;
        console.log(`Fetching matched question from: ${matchUrl}`);
        
        const matchResponse = await fetch(matchUrl, {
          method: 'GET',
          headers,
          credentials: 'include'
        });
        
        if (matchResponse.ok) {
          console.log('✅ Successfully fetched the matched question');
          return await matchResponse.json();
        } else {
          console.log(`❌ Failed to fetch matched question: ${matchResponse.status}`);
        }
      } else {
        console.log('❌ No matches found in find-question utility');
      }
    } else {
      lastError = `Status ${response.status}: ${response.statusText}`;
      console.log(`❌ Find-question utility failed: ${lastError}`);
    }
  } catch (err) {
    lastError = err.message;
    console.log(`❌ Find-question utility error: ${lastError}`);
  }
  
  // Attempt 6: Try all questions in the quiz and find by questionId
  try {
    const allQuestionsUrl = `http://localhost:5000/api/quizzes/${courseId}/questions`;
    attempts.push({url: allQuestionsUrl, type: 'all-questions'});
    
    console.log(`Attempt 6: Trying all questions endpoint: ${allQuestionsUrl}`);
    const response = await fetch(allQuestionsUrl, {
      method: 'GET',
      headers,
      credentials: 'include'
    });
    
    if (response.ok) {
      const questionsData = await response.json();
      
      if (questionsData && Array.isArray(questionsData.questions)) {
        // Try to find by questionId if taskId is a number
        const parsedId = parseInt(taskId);
        if (!isNaN(parsedId)) {
          const foundByQuestionId = questionsData.questions.find(q => q.questionId === parsedId);
          if (foundByQuestionId) {
            console.log(`✅ Found question by questionId: ${parsedId}`);
            return foundByQuestionId;
          }
        }
        console.log('❌ No matching question found in all questions');
      } else {
        console.log('❌ Invalid questions data received');
      }
    } else {
      lastError = `Status ${response.status}: ${response.statusText}`;
      console.log(`❌ All questions endpoint failed: ${lastError}`);
    }
  } catch (err) {
    lastError = err.message;
    console.log(`❌ All questions endpoint error: ${lastError}`);
  }
  
  // Attempt 7: Look in Redux store state
  try {
    console.log(`Attempt 7: Looking in Redux store for taskId=${taskId}`);
    const reduxTask = findTaskInReduxState(courseId, taskId);
    attempts.push({type: 'redux'});
    
    if (reduxTask) {
      console.log('✅ Found task in Redux state');
      return reduxTask;
    }
    
    console.log('❌ Task not found in Redux state');
  } catch (err) {
    lastError = err.message;
    console.log(`❌ Redux state error: ${lastError}`);
  }
  
  // If we get here, all attempts failed
  console.error(`Failed to load task after ${attempts.length} attempts. Last error: ${lastError}`);
  console.error(`All attempts:`, attempts);
  const error = new Error(`Failed to load task after ${attempts.length} attempts. Last error: ${lastError}`);
  error.attempts = attempts;
  throw error;
};

// New component for keyword help
const KeywordHelp = ({ missingKeywords }) => {
  if (!missingKeywords || missingKeywords.length === 0) return null;
  
  return (
    <div className="keyword-help-container">
      <h4>Missing Keywords</h4>
      <p>Your answer should include the following keywords:</p>
      <div className="keyword-list">
        {missingKeywords.map((keyword, index) => (
          <span key={index} className="keyword-tag">{keyword}</span>
        ))}
      </div>
      <p className="keyword-help-tip">
        <i className="bi bi-lightbulb"></i> 
        Tip: Including these keywords in your answer will help ensure it's evaluated correctly.
      </p>
    </div>
  );
};

const TaskDetails = () => {
  const { courseId, taskId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  
  // State for task data
  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // State for answer submission and feedback
  const [answer, setAnswer] = useState('');
  const [isSubmitting] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
 // const [feedbackData, setFeedbackData] = useState(null);
  
  // State for UI controls
  const [showHints, setShowHints] = useState(false);
  const [showBookHints, setShowBookHints] = useState(false);
  const [timerActive, setTimerActive] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);
  
  // New state for answer hints and evaluation
  const [answerHint, setAnswerHint] = useState(null);
  const [showHintButton, setShowHintButton] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [feedback, setFeedback] = useState(null);
  
  // Add missing state variables for refresh functionality
  const [setIsRefreshing] = useState(false);
  const [ setShowLastUpdated] = useState(false);
  
  // Get progress and leaderboard data from Redux
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useSelector(state => {
    console.log("TASK DETAILS: full Redux state:", state);
    
    // Log specific redux state for debugging
    console.log("TASK DETAILS: progress slice state:", state.progress);
    
    // Always return Redux state data if it exists
    return {
      progress: state.progress?.progress || {
        completedTasks: 0,
        totalTasks: 0,
        percentage: 0,
        timeSpentMinutes: 0,
        streak: 0
      },
      leaderboard: state.progress?.leaderboard || []
    };
  });
  
  // References
  const timerRef = useRef(null);
  const answerBoxRef = useRef(null);
  
  // New state for missing keywords
  const [missingKeywords, setMissingKeywords] = useState([]);
  
  // Define forceRefreshData inside the component to fix reference errors
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const forceRefreshData = (overrideCourseId = null, dispatchFn = null) => {
    const effectiveDispatch = dispatchFn || dispatch;
    const effectiveCourseId = overrideCourseId || courseId;
    
    console.log('Manually refreshing progress and leaderboard data');
    
    // Reset Redux store first
    effectiveDispatch({ type: 'progress/resetProgress' });
    
    // Direct access to Application storage data - most reliable source
    const progressLoaded = loadProgressData(effectiveCourseId, effectiveDispatch);
    const leaderboardLoaded = loadLeaderboardData(effectiveCourseId, effectiveDispatch);
    
    // Show loading state briefly for better UX feedback
    setIsRefreshing(true);
    
    // If we found data in storage, show success immediately
    if (progressLoaded || leaderboardLoaded) {
      setTimeout(() => {
        setIsRefreshing(false);
        setShowLastUpdated(true);
        toast.success('Data refreshed from storage!');
      }, 300);
    } else {
      // Otherwise try the API
      try {
        fetchProgressAndLeaderboard(effectiveDispatch, courseId, effectiveCourseId)
          .then(success => {
            console.log(`API data fetch ${success ? 'successful' : 'failed'}`);
            setIsRefreshing(false);
            setShowLastUpdated(true);
            
            if (success) {
              toast.success('Data refreshed from API!');
            } else {
              toast.info('Using stored data');
            }
          })
          .catch(error => {
            console.error('Error refreshing data from API:', error);
            setIsRefreshing(false);
            toast.error('Failed to refresh data');
          });
      } catch (error) {
        console.error('Error with API fetch attempt:', error);
        setIsRefreshing(false);
        toast.error('Failed to refresh data');
      }
    }
  };
  
  // Format time for display (HH:MM:SS)
  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Add a new useEffect that runs once on component mount to initialize the Redux store from Application storage
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    // This effect runs only once at component initialization
    if (!courseId) return;
    
    console.log('Loading data directly from Application storage for TaskDetails component');
    
    // Use the storage loader utility to load data directly from Application storage
    const progressLoaded = loadProgressData(courseId, dispatch);
    const leaderboardLoaded = loadLeaderboardData(courseId, dispatch);
    
    if (progressLoaded || leaderboardLoaded) {
      // If we loaded data from storage, show a success toast
      toast.success('Loaded your progress data');
    } else {
      // If we couldn't load data from storage, try the API
      console.log('No data found in Application storage, trying API');
      // Only call forceRefreshData if we couldn't load from storage
      forceRefreshData();
    }
  }, [courseId, dispatch, forceRefreshData]);

  // Fetch task details on component mount
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    const fetchTaskDetails = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // Prepare headers
        const token = localStorage.getItem('userToken');
        const headers = {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        };
        
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }
        
        // Use our enhanced loadTaskData function to attempt all endpoints
        const taskData = await loadTaskData(courseId, taskId, headers);
        
        // Process and format the data
        const formattedTask = {
          id: taskData.id || taskData._id || taskId,
          quizId: taskData.quizId || courseId,
          questionId: taskData.questionId || 1,
          questionText: taskData.questionText || taskData.title || 'Task',
          description: Array.isArray(taskData.description) ? taskData.description : 
                      (taskData.description ? [taskData.description] : []),
          objective: Array.isArray(taskData.objective) ? taskData.objective : 
                    (taskData.objective ? [taskData.objective] : []),
          hints: Array.isArray(taskData.hints) ? taskData.hints : 
                  (taskData.hints ? [taskData.hints] : []),
          bookHints: Array.isArray(taskData.bookHints) ? taskData.bookHints : 
                    (taskData.bookHints ? [taskData.bookHints] : []),
          resources: Array.isArray(taskData.resources) ? taskData.resources : 
                    (taskData.resources ? [taskData.resources] : []),
          questions: Array.isArray(taskData.questions) ? taskData.questions : 
                    (taskData.questions ? [taskData.questions] : []),
          question: taskData.questionText || 'No question provided'
        };
        
        setTask(formattedTask);
        setLoading(false);
        setTimerActive(true);
        
      } catch (err) {
        console.error('Error fetching task details:', err);
        setError(err.message || 'Failed to load task details');
        setLoading(false);
      }
    };
    
    fetchTaskDetails();
    
    // Load progress and leaderboard data
    if (courseId) {
      // Use our direct forceRefreshData function to load initial data
      forceRefreshData(courseId, dispatch);
      
      // Set up regular refreshes
      const refreshInterval = setInterval(() => {
        forceRefreshData(courseId, dispatch);
      }, 60000); // Refresh every minute
      
      return () => {
        clearInterval(refreshInterval);
      };
    }
    
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [courseId, taskId, dispatch]);

  // Timer setup
  useEffect(() => {
    if (timerActive) {
      timerRef.current = setInterval(() => {
        setTimerSeconds(prev => prev + 1);
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [timerActive]);

  // Handle answer changes with debounced hint generation
  const handleAnswerChange = (e) => {
    const value = e.target.value;
    setAnswer(value);
    
    // Reset any previous feedback when the user changes their answer
    if (showFeedback) setShowFeedback(false);
    
    // Show hint button after user has typed something substantial
    if (value.length > 15 && !showHintButton) {
      setShowHintButton(true);
    }
  };
  
  // Generate hint based on current answer
  const generateHint = async () => {
    try {
      if (!task || !answer.trim()) return;
      
      // Get hint based on current answer
      const hint = await getAnswerHint(answer, task);
      setAnswerHint(hint);
      
      // Automatically show hint
      setShowHints(true);
    } catch (error) {
      console.error('Error generating hint:', error);
    }
  };

  // Handle answer submission
  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    
    if (!answer.trim()) {
      toast.error("Please enter an answer before submitting");
      return;
    }
    
    setIsEvaluating(true);
    setFeedback(null);
    setMissingKeywords([]);
    
    // Log submission details for debugging
    console.log("Submitting answer:", {
      quizId: task?.quizId || courseId,
      taskId: task?.id || taskId,
      answer: answer,
      timeSpent: timerSeconds
    });
    
    try {
      // Client-side answer evaluation using the universal evaluator
      let clientEvaluation = null;
      
      // Check if this is Task 5 (The Genre Chronicles)
      const isTask5 = task && 
        (task.questionId === 5 || (task.questionText && task.questionText.includes("Genre Chronicles")));
      
      if (isTask5) {
        console.log("Task 5 detected - using minimal client evaluation");
        
        // For Task 5, we'll use a very basic evaluation with low confidence
        // to ensure the server makes the final decision
        clientEvaluation = {
          isCorrect: null,  // Defer to server
          score: 0,
          confidence: 0.1,  // Very low confidence
          feedback: null
        };
      } else if (task) {
        // Normal evaluation for other tasks
        console.log("Performing client-side evaluation with task data");
        clientEvaluation = evaluateAnswer(answer, task);
        console.log("Client evaluation result:", clientEvaluation);
      } else {
        // No task data available, defer to backend
        console.log("No task data available for client-side evaluation");
        clientEvaluation = {
          isCorrect: null,
          score: 0,
          confidence: 0.1,
          feedback: null
        };
      }
      
      // Create a unique ID for this submission
      const submissionId = `submission-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      
      // Use direct Redux dispatch to submit answer with client evaluation
      const result = await dispatch(submitTaskAnswer({
        quizId: task?.quizId || courseId,
        taskId: task?.id || taskId,
        answer: answer.trim(),
        timeSpent: timerSeconds,
        clientEvaluation,
        submissionId // Include submission ID for tracking
      })).unwrap();
      
      // Log the result
      console.log("Submission result:", result);
      
      // Create a combined timestamp for all updates from this submission
      const updateTimestamp = new Date().toISOString();
      
      // Ensure both progress and leaderboard data are properly handled
      // Enhanced logging for progress data
      if (result.progress) {
        console.log("Received progress data with submission result:", result.progress);
        
        // Normalize the progress format
        const normalizedProgress = {
          completedTasks: result.progress.completedTasks || 0,
          totalTasks: result.progress.totalTasks || 0,
          percentage: result.progress.percentage || 0,
          timeSpentMinutes: result.progress.timeSpentMinutes || 0,
          streak: result.progress.streak || 0,
          lastUpdated: updateTimestamp
        };
        
        // Store in localStorage for fallback
        try {
          localStorage.setItem(`progress_${task?.quizId || courseId}`, 
            JSON.stringify(normalizedProgress));
        } catch (storageError) {
          console.error('Error storing progress in localStorage:', storageError);
        }
        
        // Update Redux store with progress data
        dispatch({
          type: 'course/updateProgress',
          payload: {
            quizId: task?.quizId || courseId,
            progress: normalizedProgress,
            updateId: `direct-${submissionId}`,
            timestamp: updateTimestamp
          }
        });
      }
      
      // Enhanced logging for leaderboard data
      if (result.leaderboard && Array.isArray(result.leaderboard)) {
        console.log("Received leaderboard data with submission result:", 
          { entries: result.leaderboard.length });
        
        // Store in localStorage for fallback
        try {
          localStorage.setItem(`leaderboard_${task?.quizId || courseId}`, 
            JSON.stringify(result.leaderboard));
        } catch (storageError) {
          console.error('Error storing leaderboard in localStorage:', storageError);
        }
        
        // Update Redux store with leaderboard data
        dispatch({
          type: 'course/updateLeaderboard',
          payload: {
            quizId: task?.quizId || courseId,
            leaderboard: result.leaderboard,
            updateId: `direct-${submissionId}`,
            timestamp: updateTimestamp
          }
        });
      }
      
      // Determine correctness from both client and server evaluations
      const isAnswerCorrect = result.isCorrect === true;
      
      // Show feedback immediately based on evaluation result
      setIsCorrect(isAnswerCorrect);
      
      // For incorrect answers, provide more detailed feedback
      if (!isAnswerCorrect && clientEvaluation && clientEvaluation.missingKeywords && clientEvaluation.missingKeywords.length > 0) {
        // Store missing keywords for display
        setMissingKeywords(clientEvaluation.missingKeywords);
        
        // Build more helpful feedback message
        const missingCount = clientEvaluation.missingKeywords.length;
        const keywordSample = clientEvaluation.missingKeywords.slice(0, 3).join(', ');
        const hasMore = missingCount > 3;
        
        // Display enhanced message with keyword guidance
        const enhancedMessage = `Your answer is missing ${missingCount} keyword${missingCount === 1 ? '' : 's'}. Try including: ${keywordSample}${hasMore ? '...' : ''}`;
        
        setFeedback({
          message: enhancedMessage,
          isCorrect: false
        });
        
        toast.error(enhancedMessage);
      } else {
        // Display standard popup message based on result
        setFeedback({
          message: result.feedback || (isAnswerCorrect ? 
            "Your Answer is Correct Well Done" : 
            "Your answer is wrong, Try Again"),
          isCorrect: isAnswerCorrect
        });
        
        // Show toast message also
        if (isAnswerCorrect) {
          toast.success(result.feedback || "Your Answer is Correct Well Done");
          
          // If socket is available and answer is correct, request a refresh to ensure everyone sees the update
          if (window.socket && isAnswerCorrect) {
            console.log("Emitting refresh request to update all connected clients");
            window.socket.emit('requestRefresh', { 
              quizId: task?.quizId || courseId,
              userId: localStorage.getItem('userId')
            });
          }
          
          // For correct answers, navigate back to course page after delay
          setTimeout(() => {
            navigate(`/course/${task?.quizId || courseId}`, { 
              state: { 
                taskCompleted: true,
                submissionId: submissionId // Pass the submission ID to prevent duplicate processing
              } 
            });
          }, 3000);
        } else {
          toast.error(result.feedback || "Your answer is wrong, Try Again");
        }
      }
      
      // Set evaluating to false to allow further submissions for incorrect answers
      setIsEvaluating(false);
    } catch (error) {
      console.error("Error submitting answer:", error);
      toast.error("Failed to submit your answer. Please try again.");
      setFeedback({
        message: "There was an error evaluating your answer. Please try again.",
        isCorrect: false
      });
      setIsEvaluating(false);
    }
  };

  // Navigation
  const goBackToCourse = () => {
    navigate(`/course/${courseId}`);
  };

  // Add to component initialization
  useEffect(() => {
    // Fetch latest progress data when the task is loaded
    if (task?.quizId || courseId) {
      console.log('Fetching latest progress data for task view');
      fetchProgressAndLeaderboard(task?.quizId || courseId, dispatch)
        .then(data => {
          console.log('Successfully fetched latest progress data');
          if (data.progress) {
            // If this task is already completed, we can show that information
            const isTaskCompleted = task && data.progress.completedTasks > 0;
            if (isTaskCompleted) {
              console.log('This task may already be completed by the user');
            }
          }
        })
        .catch(error => {
          console.error('Error fetching latest progress data:', error);
          // We don't need to show an error since this is just enhancing the experience
        });
    }
  }, [task, courseId, dispatch]);

  // Add socket connection initialization in the initial useEffect
  useEffect(() => {
    // Initialize socket connection for real-time updates
    dispatch(connect());
    console.log('Socket connection initialized for TaskDetails');
    
    // Fetch latest progress and leaderboard data on initial load
    const fetchInitialData = async () => {
      try {
        console.log('Initializing progress and leaderboard data for TaskDetails');
        const userId = localStorage.getItem('userId');
        
        if (userId && (task?.quizId || courseId)) {
          const quizId = task?.quizId || courseId;
          
          // Use userProgressTracker to initialize real-time data
          await userProgressTracker.initializeUserProgress(userId, quizId, dispatch);
          console.log('Successfully initialized real-time data');
          
          // Register custom socket event handlers for this component
          if (window.socket) {
            console.log('Registering socket event handlers for TaskDetails');
            
            // Join the quiz room
            window.socket.emit('joinQuiz', { quizId });
            
            // Request recent data
            window.socket.emit('requestRefresh', { quizId });
            
            // Handle progress updates
            window.socket.on('progress_update', (data) => {
              try {
                console.log('TaskDetails received progress update:', data);
                
                // Skip if not for this quiz
                if (data.quizId !== quizId) return;
                
                // Dispatch to Redux
                dispatch({
                  type: 'course/updateProgress',
                  payload: data
                });
              } catch (error) {
                console.error('Error handling progress update in TaskDetails:', error);
              }
            });
            
            // Handle camelCase version of progress updates
            window.socket.on('progressUpdate', (data) => {
              try {
                console.log('TaskDetails received progressUpdate:', data);
                
                // Skip if not for this quiz
                if (data.quizId !== quizId) return;
                
                // Dispatch to Redux
                dispatch({
                  type: 'course/updateProgress',
                  payload: data
                });
              } catch (error) {
                console.error('Error handling progressUpdate in TaskDetails:', error);
              }
            });
            
            // Handle leaderboard updates
            window.socket.on('leaderboard_update', (data) => {
              try {
                console.log('TaskDetails received leaderboard update:', data);
                
                // Skip if not for this quiz
                if (data.quizId !== quizId) return;
                
                // Dispatch to Redux
                dispatch({
                  type: 'course/updateLeaderboard',
                  payload: data
                });
              } catch (error) {
                console.error('Error handling leaderboard update in TaskDetails:', error);
              }
            });
            
            // Handle camelCase version of leaderboard updates
            window.socket.on('leaderboardUpdate', (data) => {
              try {
                console.log('TaskDetails received leaderboardUpdate:', data);
                
                // Skip if not for this quiz
                if (data.quizId !== quizId) return;
                
                // Dispatch to Redux
                dispatch({
                  type: 'course/updateLeaderboard',
                  payload: data
                });
              } catch (error) {
                console.error('Error handling leaderboardUpdate in TaskDetails:', error);
              }
            });
            
            // Handle answer processed events
            window.socket.on('answer_processed', (data) => {
              try {
                console.log('TaskDetails received answer processed event:', data);
                
                // Skip if not for this quiz
                if (data.quizId !== quizId) return;
                
                // Request refresh of data
                window.socket.emit('requestRefresh', { quizId, userId });
              } catch (error) {
                console.error('Error handling answer processed event in TaskDetails:', error);
              }
            });
          }
        }
      } catch (error) {
        console.error('Error initializing real-time data:', error);
        
        // Fallback to regular fetch
        if (task?.quizId || courseId) {
          fetchProgressAndLeaderboard(task?.quizId || courseId, dispatch)
            .then(() => console.log('Fallback progress fetch completed'))
            .catch(err => console.error('Fallback progress fetch failed:', err));
        }
      }
    };
    
    fetchInitialData();
    
    // Clean up event handlers on unmount
    return () => {
      if (window.socket && (task?.quizId || courseId)) {
        const quizId = task?.quizId || courseId;
        window.socket.emit('leaveQuiz', { quizId });
        
        // Clean up all event listeners
        window.socket.off('progress_update');
        window.socket.off('progressUpdate');
        window.socket.off('leaderboard_update');
        window.socket.off('leaderboardUpdate');
        window.socket.off('answer_processed');
      }
    };
  }, [task, courseId, dispatch]);

  // Add this at the start of the useEffect that handles component mounting
  // Make sure useEffect includes progress and leaderboard in its dependencies
  useEffect(() => {
    // Start the timer when the component mounts
    if (!timerActive) {
      setTimerActive(true);
      timerRef.current = setInterval(() => {
        setTimerSeconds(prev => prev + 1);
      }, 1000);
    }
    
    const userId = localStorage.getItem('userId');
    
    // Initialize socket connection and user progress tracker
    if (userId && courseId) {
      console.log(`Initializing progress tracking for user ${userId} in task ${taskId} of course ${courseId}`);
      
      // Connect to socket for real-time updates
      dispatch(connect());
      
      // Initialize user progress tracking
      userProgressTracker.initializeUserProgress(userId, courseId, dispatch)
        .then(() => {
          console.log('Progress tracking initialized successfully');
        })
        .catch(err => {
          console.error('Error initializing progress tracking:', err);
        });
        
      // Force refresh data from localStorage and API
      forceRefreshData(courseId, dispatch);
    }
    
    // Load task data with the proper parameters
    if (courseId && taskId) {
      console.log('Loading task data from the second useEffect hook');
      const token = localStorage.getItem('userToken');
      const headers = {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      loadTaskData(courseId, taskId, headers)
        .then(data => {
          console.log('Task data loaded successfully in second useEffect:', data.questionText || data.id);
        })
        .catch(err => {
          console.error('Error loading task data in second useEffect:', err);
        });
    }
    
    // Cleanup function to clear timer and socket listeners
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      
      // Reset user progress tracking when leaving the component
      if (courseId) {
        userProgressTracker.resetTracking(courseId);
      }
    };
  }, [courseId, taskId, dispatch, timerActive, forceRefreshData]);

  // Add this function to format time spent for display
  // eslint-disable-next-line no-unused-vars
  const formatTimeSpent = (minutes) => {
    if (!minutes) return '0 min';
    
    if (minutes < 60) {
      return `${minutes} min`;
    }
    
    const hours = Math.floor(minutes / 60);
    const remainingMins = minutes % 60;
    
    if (remainingMins === 0) {
      return `${hours} hr`;
    }
    
    return `${hours} hr ${remainingMins} min`;
  };

  // Add this function to format last updated time
  // eslint-disable-next-line no-unused-vars
  const formatLastUpdated = (timestamp) => {
    if (!timestamp) return 'Never';
    
    try {
      const date = new Date(timestamp);
      const now = new Date();
      const diffMs = now - date;
      const diffSecs = Math.floor(diffMs / 1000);
      
      if (diffSecs < 60) return 'Just now';
      if (diffSecs < 3600) return `${Math.floor(diffSecs / 60)} min ago`;
      if (diffSecs < 86400) return `${Math.floor(diffSecs / 3600)} hr ago`;
      
      return date.toLocaleString();
    } catch (e) {
      return 'Unknown';
    }
  };

  // Add this useEffect to handle URL parameters at component mount
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    // Function to extract quiz/course ID from various places
    const findCourseId = () => {
      // First check if we have it from useParams
      if (courseId) return courseId;
      
      // Check URL query parameters
      const urlParams = new URLSearchParams(window.location.search);
      const urlCourseId = urlParams.get('courseId') || urlParams.get('quizId');
      if (urlCourseId) return urlCourseId;
      
      // Check if it's in the path format /task/{courseId}/{taskId}
      const pathParts = window.location.pathname.split('/');
      if (pathParts.length >= 3 && pathParts[1] === 'task') {
        return pathParts[2];
      }
      
      // Check localStorage for recent courses
      try {
        // Look for the specific hardcoded ID we saw in local storage
        const fixedId = '0c54617c-3116-4bcd-bb53-bf31ca8044d5';
        
        // Check if we have data for this ID
        if (localStorage.getItem(`progress_${fixedId}`)) {
          return fixedId;
        }
        
        // Check for recent course IDs
        const recentCourses = localStorage.getItem('recentCourses');
        if (recentCourses) {
          const parsed = JSON.parse(recentCourses);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed[0];
          }
        }
      } catch (e) {
        console.error('Error reading course ID from localStorage:', e);
      }
      
      return null;
    };
    
    // Get effective course ID
    const effectiveCourseId = findCourseId();
    
    if (effectiveCourseId && effectiveCourseId !== courseId) {
      console.log(`Found effective course ID: ${effectiveCourseId} (different from params: ${courseId})`);
      
      // Load data for this course ID
      forceRefreshData(effectiveCourseId, dispatch);
    }
  }, [courseId, taskId, dispatch, forceRefreshData]);

  // Loading state
  if (loading) {
    return (
      <div className="task-container">
        <div className="loading-spinner">
          <Spinner animation="border" role="status">
          <span className="visually-hidden">Loading...</span>
          </Spinner>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="task-container">
        <div className="error-message">
          <i className="bi bi-exclamation-triangle"></i>
          <h3>Error Loading Task</h3>
          <p>{error}</p>
          <button className="btn btn-primary" onClick={goBackToCourse}>
            Back to Course
          </button>
        </div>
      </div>
    );
  }

  // Main task view
    return (
    <div className="task-container">
      {/* Answer submission feedback toast */}
      <ToastContainer className="p-3" position="top-end" />

      {/* Dynamic feedback alert */}
      {feedback && (
        <div className={`answer-feedback ${feedback.isCorrect ? 'correct' : 'incorrect'}`}>
          <div className="feedback-icon">
            <i className={`bi ${feedback.isCorrect ? 'bi-check-circle-fill' : 'bi-exclamation-circle-fill'}`}></i>
        </div>
          <div className="feedback-message">
            {feedback.message}
      </div>
          <button className="feedback-close" onClick={() => setFeedback(null)}>
            <i className="bi bi-x"></i>
          </button>
        </div>
      )}

      <div className="task-main">
        {/* Header with back button and title */}
        <div className="task-header">
          <button className="back-button" onClick={goBackToCourse}>
                  <i className="bi bi-arrow-left"></i> Back to Course
                </button>
          <h1>Task {task.questionId}: {task.questionText}</h1>
              </div>
              
        {/* Task description section */}
        <div className="task-section">
          <h2>Task Description</h2>
          <div className="task-content-box">
            {task.description.map((paragraph, index) => (
              <p key={index}>{paragraph}</p>
            ))}
          </div>
              </div>
              
        {/* Objective section */}
        {task.objective.length > 0 && (
          <div className="task-section">
            <h2>Objective</h2>
            <div className="task-content-box">
              <ul>
                {task.objective.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
              </div>
          </div>
        )}

        {/* Hints section */}
        {task.hints.length > 0 && (
          <div className="task-section">
            <div className="hint-toggle" onClick={() => setShowHints(!showHints)}>
              <h2>Hints</h2>
              <i className={`bi bi-chevron-${showHints ? 'up' : 'down'}`}></i>
            </div>
            {showHints && (
              <div className="task-content-box">
                <ul>
                  {task.hints.map((hint, index) => (
                    <li key={index}>{hint}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Question section */}
        {Array.isArray(task.questions) && task.questions.length > 0 ? (
          <div className="task-section">
            <h2>Question</h2>
            <div className="task-content-box">
              <ul>
                {task.questions.map((question, index) => (
                  <li key={index}>{question}</li>
                ))}
              </ul>
                      </div>
                      </div>
        ) : task.question ? (
          <div className="task-section">
            <h2>Question</h2>
            <div className="task-content-box">
              <p>{task.question}</p>
                    </div>
          </div>
        ) : null}

        {/* Book hints section */}
        {task.bookHints.length > 0 && (
          <div className="task-section">
            <div className="hint-toggle" onClick={() => setShowBookHints(!showBookHints)}>
              <h2>Book Hints</h2>
              <i className={`bi bi-chevron-${showBookHints ? 'up' : 'down'}`}></i>
            </div>
            {showBookHints && (
              <div className="task-content-box">
                <ul>
                  {task.bookHints.map((hint, index) => (
                    <li key={index}>{hint}</li>
                  ))}
                </ul>
                </div>
            )}
              </div>
        )}

        {/* Resources/Attachments section */}
        {task.resources.length > 0 && (
          <div className="task-section">
            <h2><i className="bi bi-paperclip"></i> Attachments</h2>
            <div className="task-content-box">
              <div className="resource-grid">
                {task.resources.map((resource, index) => {
                  // Determine icon based on resource type
                  let icon = "bi-link-45deg";
                  let displayName = resource;
                  let fileType = "Link";
                  
                  // Only process resources that are actual strings
                  if (typeof resource !== 'string') return null;
                  
                  if (resource.endsWith('.pdf')) {
                    icon = "bi-file-earmark-pdf";
                    displayName = resource.split('/').pop();
                    fileType = "PDF";
                  } else if (resource.endsWith('.doc') || resource.endsWith('.docx')) {
                    icon = "bi-file-earmark-word";
                    displayName = resource.split('/').pop();
                    fileType = "Word";
                  } else if (resource.endsWith('.xls') || resource.endsWith('.xlsx')) {
                    icon = "bi-file-earmark-excel";
                    displayName = resource.split('/').pop();
                    fileType = "Excel";
                  } else if (resource.endsWith('.zip') || resource.endsWith('.rar')) {
                    icon = "bi-file-earmark-zip";
                    displayName = resource.split('/').pop();
                    fileType = "Archive";
                  } else if (resource.endsWith('.jpg') || resource.endsWith('.png') || resource.endsWith('.gif')) {
                    icon = "bi-file-earmark-image";
                    displayName = resource.split('/').pop();
                    fileType = "Image";
                  } else if (resource.includes('github.com')) {
                    icon = "bi-github";
                    displayName = "GitHub Repository";
                    fileType = "GitHub";
                  } else if (resource.includes('youtube.com') || resource.includes('youtu.be')) {
                    icon = "bi-youtube";
                    displayName = "YouTube Video";
                    fileType = "Video";
                  } else if (resource.match(/https?:\/\//)) {
                    try {
                      displayName = new URL(resource).hostname;
                      fileType = "Website";
                    } catch (e) {
                      displayName = resource;
                    }
                  }
                  
                  return (
                    <a 
                      key={index} 
                      href={resource} 
                      className="resource-item" 
                      target="_blank" 
                      rel="noopener noreferrer"
                    >
                      <div className="resource-icon">
                        <i className={`bi ${icon}`}></i>
                </div>
                      <div className="resource-details">
                        <div className="resource-name">{displayName}</div>
                        <div className="resource-type">{fileType}</div>
                      </div>
                    </a>
                  );
                }).filter(Boolean)}
                      </div>
                    </div>
                </div>
        )}

        {/* Answer submission form */}
        <div className="task-section">
          <h2>Your Answer</h2>
          <form onSubmit={handleSubmit} className="answer-form">
            <div className="answer-input-container">
              <textarea
                ref={answerBoxRef}
                value={answer}
                onChange={handleAnswerChange}
                placeholder="Type your answer here..."
                disabled={isSubmitting}
                className="answer-input"
                rows={6}
              />
              
              {isEvaluating && (
                <div className="evaluation-overlay">
                  <Spinner animation="border" role="status" size="sm" className="me-2" />
                  <span>Evaluating your answer...</span>
                </div>
              )}
            </div>
            
            <div className="timer-container">
              <div className="timer">
                <i className="bi bi-clock me-2"></i>
                Time: {formatTime(timerSeconds)}
              </div>
            </div>
            
            <div className="form-buttons">
              {showHintButton && (
                  <button 
                  type="button" 
                  onClick={generateHint} 
                  className="hint-button"
                  disabled={isSubmitting}
                >
                  <i className="bi bi-lightbulb me-1"></i> Get Hint
                </button>
              )}
              
                  <button 
                type="submit" 
                className="submit-button" 
                disabled={isSubmitting || !answer.trim()}
              >
                {isSubmitting ? (
                  <>
                    <Spinner animation="border" role="status" size="sm" className="me-2" />
                    Submitting...
                  </>
                ) : 'Submit Answer'}
                  </button>
                </div>
            
            {missingKeywords.length > 0 && !isCorrect && (
              <KeywordHelp missingKeywords={missingKeywords} />
            )}
            
            {answerHint && (
              <div className={`answer-hint ${answerHint.type}`}>
                <i className="bi bi-lightbulb-fill me-2"></i>
                {answerHint.hint}
              </div>
            )}
          </form>
            </div>
          </div>

      {/* Sidebar */}
      <div className="task-sidebar">
        <div className="sidebar-section">
          <h3>Timer</h3>
          <div className="timer-circle">
            <div className="timer-text">{formatTime(timerSeconds)}</div>
          </div>
        </div>

        <ProgressBoard courseId={task?.quizId || courseId} />
        <LeaderboardComponent courseId={task?.quizId || courseId} />
      </div>
    </div>
  );
};

export default TaskDetails;