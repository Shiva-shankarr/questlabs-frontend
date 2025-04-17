import React, { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { setProgress, setLeaderboard } from '../redux/slices/progressSlice';

// Simple component to directly access and display Application storage data
const TestDataDisplay = () => {
  const [storageData, setStorageData] = useState({
    progress: null,
    leaderboard: null
  });
  const [courseId, setCourseId] = useState('0c54617c-3116-4bcd-bb53-bf31ca8044d5');
  const dispatch = useDispatch();
  
  useEffect(() => {
    // Directly load data from Application storage
    const loadData = () => {
      try {
        // Get progress data
        const progressJSON = localStorage.getItem(`progress_${courseId}`);
        const leaderboardJSON = localStorage.getItem(`leaderboard_${courseId}`);
        
        const data = {
          progress: progressJSON ? JSON.parse(progressJSON) : null,
          leaderboard: leaderboardJSON ? JSON.parse(leaderboardJSON) : null
        };
        
        setStorageData(data);
        
        // Update Redux store
        if (data.progress) {
          dispatch(setProgress(data.progress));
        }
        
        if (data.leaderboard) {
          dispatch(setLeaderboard(data.leaderboard));
        }
      } catch (error) {
        console.error('Error loading data from storage:', error);
      }
    };
    
    loadData();
  }, [courseId, dispatch]);
  
  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h1>Direct Application Storage Data</h1>
      <div>
        <label>
          Course ID: 
          <input 
            type="text" 
            value={courseId} 
            onChange={(e) => setCourseId(e.target.value)}
            style={{ width: '100%', marginBottom: '10px' }}
          />
        </label>
      </div>
      
      <h2>Progress Data</h2>
      {storageData.progress ? (
        <pre>{JSON.stringify(storageData.progress, null, 2)}</pre>
      ) : (
        <p>No progress data found in storage</p>
      )}
      
      <h2>Leaderboard Data</h2>
      {storageData.leaderboard ? (
        <pre>{JSON.stringify(storageData.leaderboard, null, 2)}</pre>
      ) : (
        <p>No leaderboard data found in storage</p>
      )}
    </div>
  );
};

export default TestDataDisplay; 