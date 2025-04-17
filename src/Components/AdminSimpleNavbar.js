import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { Bell, User, LogOut } from 'lucide-react';
import { toast } from 'react-toastify';
import { logout } from '../redux/slices/authSlice';
import { fetchNotifications, markNotificationAsRead, markAllNotificationsAsRead } from '../redux/slices/notificationSlice';
import './AdminSimpleNavbar.css';
import logo from '../assets/images/adVlogo7.png';

const AdminSimpleNavbar = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  
  // Get user data and notifications from Redux store
  const { user } = useSelector(state => state.auth);
  const { notifications, unreadCount } = useSelector(state => state.notifications);

  // State for dropdowns
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  
  // Refs for click outside handling
  const notificationRef = useRef(null);
  const userDropdownRef = useRef(null);

  // Fetch notifications on component mount
  useEffect(() => {
    dispatch(fetchNotifications());
    
    // Polling for notifications every minute
    const intervalId = setInterval(() => {
      dispatch(fetchNotifications());
    }, 60000);
    
    return () => clearInterval(intervalId);
  }, [dispatch]);

  // Handle click outside to close dropdowns
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
      if (userDropdownRef.current && !userDropdownRef.current.contains(event.target)) {
        setShowUserDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Handlers
  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
    toast.success('Logged out successfully');
  };

  const toggleNotifications = () => {
    setShowNotifications(!showNotifications);
    setShowUserDropdown(false);
  };

  const toggleUserDropdown = () => {
    console.log('Current dropdown state:', showUserDropdown);
    setShowUserDropdown(!showUserDropdown);
    setShowNotifications(false);
  };

  const handleMarkAsRead = (id) => {
    dispatch(markNotificationAsRead(id));
  };

  const handleMarkAllAsRead = () => {
    dispatch(markAllNotificationsAsRead());
  };

  // Format time
  const formatNotificationTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 60) {
      return diffMins <= 1 ? 'just now' : `${diffMins} mins ago`;
    } else if (diffHours < 24) {
      return `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`;
    } else {
      return `${diffDays} ${diffDays === 1 ? 'day' : 'days'} ago`;
    }
  };

  // Add mouse enter/leave handlers for better user experience
  const handleMouseEnter = () => {
    if (!showUserDropdown) {
      setShowUserDropdown(true);
    }
  };

  const handleMouseLeave = () => {
    setTimeout(() => {
      setShowUserDropdown(false);
    }, 300);
  };

  return (
    <div className="admin-simple-navbar">
      <div className="navbar-left">
        <div 
          className="navbar-logo-container" 
          onClick={() => navigate('/admin/dashboard')}
        >
          <img src={logo} alt="Logo" className="navbar-logo" />
          <span className="navbar-logo-text">Admin Panel</span>
        </div>
      </div>
      
      <div className="navbar-right">
        <div className="notification-container" ref={notificationRef}>
          <div onClick={toggleNotifications}>
            <Bell className="notification-icon" size={20} />
            {unreadCount > 0 && (
              <span className="notification-badge">{unreadCount}</span>
            )}
          </div>
          
          {showNotifications && (
            <div className="notifications-dropdown">
              <div className="notifications-header">
                <h3>Notifications</h3>
                {unreadCount > 0 && (
                  <button 
                    onClick={handleMarkAllAsRead}
                    style={{ background: 'none', border: 'none', color: '#FFB84D', cursor: 'pointer', fontSize: '12px' }}
                  >
                    Mark all as read
                  </button>
                )}
              </div>
              
              <div className="notifications-list">
                {notifications && notifications.length > 0 ? (
                  notifications.map(notification => (
                    <div
                      key={notification.id}
                      className={`notification-item ${!notification.read ? 'unread' : ''}`}
                      onClick={() => handleMarkAsRead(notification.id)}
                    >
                      <p>{notification.message}</p>
                      <span>{formatNotificationTime(notification.createdAt)}</span>
                    </div>
                  ))
                ) : (
                  <div className="no-notifications">No notifications</div>
                )}
              </div>
            </div>
          )}
        </div>
        
        <div className="user-container" 
             ref={userDropdownRef} 
             onMouseEnter={handleMouseEnter}
             onMouseLeave={handleMouseLeave}
        >
          <div 
            className="navbar-user-avatar" 
            onClick={toggleUserDropdown}
          >
            <User size={18} />
          </div>
          
          {showUserDropdown && (
            <div className="user-dropdown">
              <div className="user-dropdown-header">
                <div className="user-dropdown-info">
                  <div className="navbar-user-avatar dropdown-avatar">
                    <User size={18} />
                  </div>
                  <div className="user-details">
                    <span className="user-name">{user?.username || 'Admin User'}</span>
                    <span className="user-role">Administrator</span>
                  </div>
                </div>
              </div>
              <div className="user-dropdown-divider"></div>
              <div className="user-dropdown-item" onClick={handleLogout}>
                <LogOut size={16} />
                <span>Logout</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminSimpleNavbar; 