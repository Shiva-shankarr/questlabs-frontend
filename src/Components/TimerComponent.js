import React, { useState, useEffect, useRef } from 'react';
import { FiRefreshCw } from 'react-icons/fi';
import './TimerComponent.css';

const TimerComponent = ({ initialSeconds = 0 }) => {
  const [seconds, setSeconds] = useState(initialSeconds);
  const [isActive, setIsActive] = useState(true);
  const timerRef = useRef(null);

  useEffect(() => {
    if (isActive) {
      timerRef.current = setInterval(() => {
        setSeconds(prevSeconds => prevSeconds + 1);
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isActive]);

  const formatTime = (totalSeconds) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const toggleTimer = () => {
    setIsActive(!isActive);
  };

  const resetTimer = () => {
    setSeconds(0);
    if (!isActive) {
      setIsActive(true);
    }
  };

  return (
    <div className="timer-component">
      <div className="timer-header">
        <h3 className="timer-title">Timer</h3>
        <button 
          className="timer-control"
          onClick={toggleTimer}
          title={isActive ? "Pause" : "Resume"}
        >
          {isActive ? 
            <span className="pause-icon"></span> : 
            <span className="play-icon"></span>
          }
        </button>
      </div>
      
      <div className="timer-circle">
        <div className="timer-text">{formatTime(seconds)}</div>
        <button 
          className="reset-button"
          onClick={resetTimer}
          title="Reset Timer"
        >
          <FiRefreshCw />
        </button>
      </div>
    </div>
  );
};

export default TimerComponent; 