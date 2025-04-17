import React from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { logout } from '../redux/slices/authSlice';

const UserProfileDropdown = ({ user = {}, onClose }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const getInitials = (name) => {
    if (!name) return '?';
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase();
  };

  const handleLogout = async () => {
    try {
      await dispatch(logout()).unwrap();
      navigate('/login');
    } catch (error) {
      console.error('Failed to logout:', error);
    }
  };

  return (
    <div className="user-profile-dropdown">
      <div className="user-info">
        <div className="user-avatar">
          {user.profileImage ? (
            <img src={user.profileImage} alt={user.name || 'User'} />
          ) : (
            <div className="avatar-initials">{getInitials(user.name)}</div>
          )}
        </div>
        <div className="user-details">
          <h4>{user.name || 'User'}</h4>
          <p>{user.email || 'No email'}</p>
        </div>
      </div>
      <div className="dropdown-divider"></div>
      <div className="dropdown-menu">
        <button
          className="dropdown-item"
          onClick={() => {
            navigate('/profile');
            onClose();
          }}
        >
          <i className="fas fa-user"></i> Profile
        </button>
        <button
          className="dropdown-item"
          onClick={() => {
            navigate('/settings');
            onClose();
          }}
        >
          <i className="fas fa-cog"></i> Settings
        </button>
        <div className="dropdown-divider"></div>
        <button
          className="dropdown-item text-danger"
          onClick={handleLogout}
        >
          <i className="fas fa-sign-out-alt"></i> Logout
        </button>
      </div>
    </div>
  );
};

export default UserProfileDropdown; 