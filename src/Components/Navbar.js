import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { FaSearch, FaBell, FaBars, FaTimes, FaUser, FaSignOutAlt } from 'react-icons/fa';
import { toast } from 'react-toastify';
import { fetchQuizzes } from '../redux/slices/quizSlice';
import { fetchNotifications, markNotificationAsRead, markAllNotificationsAsRead } from '../redux/slices/notificationSlice';
import { logout } from '../redux/slices/authSlice';
import logo from '../assets/images/adVlogo7.png';
import './Navbar.css';
import './SearchBox.css';

const Navbar = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  
  const { user, isAuthenticated } = useSelector(state => state.auth);
  const { notifications, unreadCount } = useSelector(state => state.notifications);

  const [searchQuery, setSearchQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);

  const searchRef = useRef(null);
  const notificationRef = useRef(null);
  const profileRef = useRef(null);
  const searchTimeoutRef = useRef(null);

  // Fetch notifications on mount and poll
  useEffect(() => {
    if (isAuthenticated) {
      dispatch(fetchNotifications());
      const pollInterval = setInterval(() => {
        dispatch(fetchNotifications());
      }, 30000);

      return () => clearInterval(pollInterval);
    }
  }, [dispatch, isAuthenticated]);

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setShowProfileDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Reset states on route change
  useEffect(() => {
    setSearchQuery('');
    setShowSuggestions(false);
    setShowNotifications(false);
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  const handleSearch = async (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    setIsSearching(true);

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (query.length >= 2) {
      searchTimeoutRef.current = setTimeout(async () => {
        try {
          const response = await dispatch(fetchQuizzes()).unwrap();
          const filteredResults = response.filter(quiz =>
            quiz.title.toLowerCase().includes(query.toLowerCase()) ||
            quiz.description.toLowerCase().includes(query.toLowerCase())
          ).slice(0, 5);
          
          setSuggestions(filteredResults);
          setShowSuggestions(true);
        } catch (error) {
          console.error('Search error:', error);
          toast.error('Failed to fetch search results');
        } finally {
          setIsSearching(false);
        }
      }, 300);
    } else {
      setShowSuggestions(false);
      setIsSearching(false);
    }
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
      setShowSuggestions(false);
    }
  };

  const selectSuggestion = (suggestion) => {
    navigate(`/course/${suggestion.id}`);
    setSearchQuery('');
    setShowSuggestions(false);
  };

  const handleMarkAsRead = async (notificationId) => {
    try {
      await dispatch(markNotificationAsRead(notificationId)).unwrap();
      toast.success('Notification marked as read');
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
      toast.error('Failed to mark notification as read');
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await dispatch(markAllNotificationsAsRead()).unwrap();
      toast.success('All notifications marked as read');
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
      toast.error('Failed to mark all notifications as read');
    }
  };

  const handleLogout = () => {
    console.log('Logging out user');
    // Clear the auth data from Redux
    dispatch(logout());
    
    // Double-check that localStorage is cleared
    localStorage.removeItem('userToken');
    localStorage.removeItem('userRole');
    localStorage.removeItem('userRefreshToken');
    
    // Delay navigation slightly to ensure state is updated
    setTimeout(() => {
      navigate('/');
      toast.success('Logged out successfully');
    }, 100);
  };

  const isActive = (path) => {
    return location.pathname === path;
  };

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <div className="navbar-left">
          <Link to="/" className="logo-container">
            <img src={logo} alt="Quest Labs Logo" className="logo" />
          </Link>

          <button className="mobile-menu-btn" onClick={toggleMobileMenu}>
            {isMobileMenuOpen ? <FaTimes /> : <FaBars />}
          </button>

          <div className={`nav-links ${isMobileMenuOpen ? 'active' : ''}`}>
            <Link to="/dashboard" className={`nav-link ${isActive('/dashboard') ? 'active' : ''}`}>
              Home
            </Link>
            <Link to="/quests" className={`nav-link ${isActive('/quests') ? 'active' : ''}`}>
              Quests
            </Link>
            <Link to="/events" className={`nav-link ${isActive('/events') ? 'active' : ''}`}>
              Events
            </Link>
            <Link to="/playlists" className={`nav-link ${isActive('/playlist') ? 'active' : ''}`}>
              Playlist
            </Link>
            <Link to="/favorites" className={`nav-link ${isActive('/favorites') ? 'active' : ''}`}>
              Favorites
            </Link>
          </div>
        </div>

        <div className="navbar-right">
          <div className="search-container" ref={searchRef}>
            <form onSubmit={handleSearchSubmit}>
              <div className="search-box">
                <input
                  type="text"
                  placeholder="Search Quest"
                  value={searchQuery}
                  onChange={handleSearch}
                  disabled={isSearching}
                />
                <FaSearch className="search-icon" />
                {isSearching && <div className="search-spinner" />}
              </div>
            </form>

            {showSuggestions && suggestions.length > 0 && (
              <div className="search-suggestions">
                {suggestions.map(suggestion => (
                  <div
                    key={suggestion.id}
                    className="suggestion-item"
                    onClick={() => selectSuggestion(suggestion)}
                  >
                    <span>{suggestion.title}</span>
                    <span className="suggestion-type">Quest</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {isAuthenticated && (
            <>
              <div className="notifications-container" ref={notificationRef}>
                <div className="notifications" onClick={() => setShowNotifications(!showNotifications)}>
                  <FaBell className="bell-icon" />
                  {unreadCount > 0 && <span className="notification-badge">{unreadCount}</span>}
                </div>

                {showNotifications && (
                  <div className="notifications-panel">
                    <div className="notifications-header">
                      <h3>Notifications</h3>
                      {unreadCount > 0 && (
                        <button className="mark-all-read" onClick={handleMarkAllAsRead}>
                          Mark all as read
                        </button>
                      )}
                    </div>
                    <div className="notifications-list">
                      {notifications && notifications.length > 0 ? (
                        notifications.map(notification => (
                          <div
                            key={notification.id}
                            className={`notification-item ${notification.isRead ? 'read' : 'unread'}`}
                            onClick={() => handleMarkAsRead(notification.id)}
                          >
                            <p className="notification-message">{notification.message}</p>
                            <span className="notification-time">
                              {new Date(notification.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        ))
                      ) : (
                        <p className="no-notifications">No notifications yet</p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="profile-container" ref={profileRef}>
                <div 
                  className="profile-avatar"
                  onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                >
                  <div className="avatar-circle">
                    <FaUser />
                  </div>
                </div>
                
                {showProfileDropdown && (
                  <div className="profile-dropdown">
                    <div className="profile-header">
                      <div className="profile-info">
                        <div className="avatar-circle">
                          <FaUser />
                        </div>
                        <div className="user-details">
                          <h4>{user?.name || user?.username}</h4>
                          <p>{user?.email}</p>
                        </div>
                      </div>
                    </div>
                    <div className="profile-menu">
                      <Link to="/profile" className="profile-menu-item">
                        <FaUser /> Profile
                      </Link>
                      <button onClick={handleLogout} className="profile-menu-item">
                        <FaSignOutAlt /> Logout
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {!isAuthenticated && (
            <Link to="/login" className="login-btn">
              Login
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;