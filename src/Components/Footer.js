import React from 'react';

const Footer = () => {
  return (
    <footer className="footer">
      <div className="footer-container">
        <div className="footer-content">
          <p>&copy; {new Date().getFullYear()} Quest Labs. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer; 