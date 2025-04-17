import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { Bell, Search, User, Menu, X, LogOut } from 'lucide-react';
import { toast } from 'react-toastify';
import { logout } from '../redux/slices/authSlice';
import { fetchNotifications } from '../redux/slices/notificationSlice';
import './adminNavbar.css';
import logo from '../assets/images/adVlogo7.png';

const AdminNavbar = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Get user data from Redux store
  const { user } = useSelector(state => state.auth);
  const { notifications: notificationsData } = useSelector(state => state.notifications || { notifications: [] });

  const [searchQuery, setSearchQuery] = useState('');
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  
  // Create refs for click outside handling
  const notificationRef = useRef(null);
  const userDropdownRef = useRef(null);

  // Get notifications from Redux or use default if not available
  const notifications = notificationsData || [
    { id: 1, message: 'New quest added', time: '2 hours ago', read: false },
    { id: 2, message: 'User completed task', time: '1 day ago', read: true }
  ];
  
  // Fetch notifications on component mount
  useEffect(() => {
    dispatch(fetchNotifications());
  }, [dispatch]);

  // Handle click outside notification panel
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        notificationRef.current && 
        !notificationRef.current.contains(event.target)
      ) {
        setShowNotifications(false);
      }
      
      if (
        userDropdownRef.current && 
        !userDropdownRef.current.contains(event.target)
      ) {
        setShowUserDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleSearch = (e) => {
    const query = e.target.value;
    setSearchQuery(query);
  };

  const toggleNotifications = () => {
    setShowNotifications(!showNotifications);
  };

  // Handle mouse enter/leave for better user experience
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

  const toggleUserDropdown = () => {
    console.log('Current dropdown state:', showUserDropdown);
    setShowUserDropdown(!showUserDropdown);
  };

  const toggleMobileSidebar = () => {
    setMobileSidebarOpen(!mobileSidebarOpen);
  };

  const markAsRead = (id) => {
    // Implement notification marking logic here
  };
  
  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
    toast.success('Logged out successfully');
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  const menuItems = [
    { name: 'Dashboard', path: '/admin/dashboard' },
    { name: 'Quests', path: '/admin/quests' },
    { name: 'Tasks', path: '/admin/tasks' },
    { name: 'User Management', path: '/admin/users' },
    { name: 'Leaderboard', path: '/admin/leaderboard' }
  ];

  return (
    <div className="admin-layout">
      {/* Mobile Menu Toggle */}
      <button 
        className="mobile-menu-toggle"
        onClick={toggleMobileSidebar}
        aria-label="Toggle menu"
      >
        {mobileSidebarOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Sidebar */}
      <div className={`sidebar ${mobileSidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-logo-container">
          <img src={logo} alt="Quest Labs Logo" className="sidebar-logo" />
          <h2 className="sidebar-logo-text">Quest Labs</h2>
        </div>

        <nav className="sidebar-nav">
          {menuItems.map((item) => (
            <Link 
              key={item.path} 
              to={item.path} 
              className={`sidebar-nav-item ${
                location.pathname === item.path ? 'active' : ''
              }`}
              onClick={() => setMobileSidebarOpen(false)}
            >
              {item.name}
            </Link>
          ))}
        </nav>
      </div>

      {/* Top Navbar */}
      <div className="topbar">
        <div className="search-container">
          <Search size={18} className="search-icon" />
          <input 
            type="text" 
            placeholder="Search Quest" 
            value={searchQuery}
            onChange={handleSearch}
            className="search-input"
          />
        </div>

        <div className="topbar-right">
          <div className="notification-icon-container" ref={notificationRef} onClick={toggleNotifications}>
            <Bell size={20} />
            {unreadCount > 0 && <span className="notification-badge">{unreadCount}</span>}
            
            {showNotifications && (
              <div className="notifications-panel">
                <div className="notifications-header">
                  <h3>Notifications</h3>
                </div>
                {notifications.map(notification => (
                  <div 
                    key={notification.id} 
                    className={`notification-item ${notification.read ? '' : 'unread'}`}
                    onClick={() => markAsRead(notification.id)}
                  >
                    <p>{notification.message}</p>
                    <span>{notification.time}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div 
            className="user-container" 
            ref={userDropdownRef} 
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
          >
            <div className="navbar-user-avatar" onClick={toggleUserDropdown}>
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
    </div>
  );
};

export default AdminNavbar;