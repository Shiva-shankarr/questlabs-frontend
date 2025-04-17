import React from 'react';
import { Link } from 'react-router-dom';
import './Home.css';

const Home = () => {
  return (
    <div className="home-container">
      <div className="home-content">
        <h1 className="home-heading">Welcome to Quest Labs</h1>
        
        <div className="home-description">
          <p>
            Quest Labs is your gateway to interactive learning through engaging quests and challenges.
            Join our community of learners and embark on a journey of knowledge and discovery.
          </p>
          <p>
            Whether you're a beginner or an expert, our platform offers a unique way to learn,
            practice, and master new skills through hands-on quests.
          </p>
        </div>

        <div className="home-buttons">
          <Link to="/login" className="home-btn home-btn-primary">
            Login
          </Link>
          <Link to="/register" className="home-btn home-btn-secondary">
            Register
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Home;