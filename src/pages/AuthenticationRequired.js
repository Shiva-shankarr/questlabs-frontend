import React from 'react';
import { useNavigate } from 'react-router-dom';
import './UserProfile.css'; // Using the same CSS for styling

const AuthenticationRequired = () => {
  const navigate = useNavigate();

  const handleLogin = () => {
    navigate('/login', { state: { from: window.location.pathname } });
  };

  return (
    <div className="profile-container error">
      <div className="error-message">
        <h3>Authentication Required</h3>
        <p>Please log in to view your profile.</p>
        <button className="back-btn" onClick={handleLogin}>
          Log In
        </button>
      </div>
    </div>
  );
};

export default AuthenticationRequired; 