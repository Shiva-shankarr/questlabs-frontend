import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import axios from 'axios';
import './UserProfile.css';

const UserProfile = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { isAuthenticated } = useSelector((state) => state.auth);

  // State for user profile data
  const [userData, setUserData] = useState({
    name: '',
    email: '',
    location: '',
  });

  // State for form data when editing
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    location: '',
  });

  // State for password form
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  // UI states
  const [loading, setLoading] = useState(true);
  const [editingProfile, setEditingProfile] = useState(false);
  const [editingPassword, setEditingPassword] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Fetch user data when component mounts
  useEffect(() => {
    const fetchUserData = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem('userToken');
        
        if (!token) {
          setError('Authentication required');
          setLoading(false);
          return;
        }

        const config = {
          headers: {
            Authorization: `Bearer ${token}`
          }
        };

        // First try /auth/me endpoint
        const response = await axios.get('/api/auth/me', config);
        
        if (response.data && response.data.user) {
          const profile = response.data.user;
          setUserData({
            name: profile.username || '',
            email: profile.email || '',
            location: profile.location || 'Not specified',
          });
          
          setFormData({
            name: profile.username || '',
            email: profile.email || '',
            location: profile.location || '',
          });
        }
      } catch (err) {
        console.error('Error fetching profile:', err);
        setError('Failed to load profile data');
      } finally {
        setLoading(false);
      }
    };

    if (isAuthenticated) {
      fetchUserData();
    } else {
      setLoading(false);
      setError('Authentication required');
    }
  }, [isAuthenticated]);

  // Handle profile form input changes
  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  // Handle password form input changes
  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordForm({
      ...passwordForm,
      [name]: value,
    });
  };

  // Toggle profile edit mode
  const toggleProfileEdit = () => {
    if (editingProfile) {
      // Cancel editing - reset form
      setFormData({
        name: userData.name,
        email: userData.email,
        location: userData.location === 'Not specified' ? '' : userData.location,
      });
    }
    setEditingProfile(!editingProfile);
    setSuccess(null);
    setError(null);
  };

  // Toggle password edit mode
  const togglePasswordEdit = () => {
    if (editingPassword) {
      // Cancel editing - reset form
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    }
    setEditingPassword(!editingPassword);
    setSuccess(null);
    setError(null);
  };

  // Submit profile changes
  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    
    try {
      const token = localStorage.getItem('userToken');
      
      if (!token) {
        setError('Authentication required');
        return;
      }
      
      const config = {
        headers: {
          Authorization: `Bearer ${token}`
        }
      };
      
      const updateData = {
        username: formData.name,
        email: formData.email,
        location: formData.location,
      };
      
      // Send update request
      const response = await axios.put('/api/auth/update-profile', updateData, config);
      
      if (response.data) {
        // Update local state with new data
        setUserData({
          name: formData.name,
          email: formData.email,
          location: formData.location || 'Not specified',
        });
        
        // Update Redux state
        dispatch({
          type: 'auth/updateUserProfile',
          payload: {
            username: formData.name,
            email: formData.email,
            location: formData.location,
          }
        });
        
        setSuccess('Profile updated successfully');
        
        // Exit edit mode after success
        setTimeout(() => {
          setEditingProfile(false);
          setSuccess(null);
        }, 1500);
      }
    } catch (err) {
      console.error('Error updating profile:', err);
      setError(err.response?.data?.message || 'Failed to update profile');
    }
  };

  // Submit password changes
  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    
    // Validate password
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setError('New passwords do not match');
      return;
    }
    
    if (passwordForm.newPassword.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }
    
    try {
      const token = localStorage.getItem('userToken');
      
      if (!token) {
        setError('Authentication required');
        return;
      }
      
      const config = {
        headers: {
          Authorization: `Bearer ${token}`
        }
      };
      
      const updateData = {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      };
      
      // Send password update request
      const response = await axios.put('/api/auth/update-password', updateData, config);
      
      if (response.data) {
        setSuccess('Password updated successfully');
        
        // Reset form and exit edit mode after success
        setPasswordForm({
          currentPassword: '',
          newPassword: '',
          confirmPassword: '',
        });
        
        setTimeout(() => {
          setEditingPassword(false);
          setSuccess(null);
        }, 1500);
      }
    } catch (err) {
      console.error('Error updating password:', err);
      setError(err.response?.data?.message || 'Failed to update password');
    }
  };

  // Navigate back to home
  const handleGoBack = () => {
    navigate('/');
  };

  // Get user's initial letter for avatar
  const getInitialLetter = (name) => {
    return name && name.length > 0 ? name.charAt(0).toUpperCase() : 'U';
  };

  // Show login screen if not authenticated
  if (error === 'Authentication required') {
    return (
      <div className="profile-container error">
        <div className="error-message">
          <h3>Authentication Required</h3>
          <p>Please log in to view your profile.</p>
          <button className="back-btn" onClick={() => navigate('/login')}>
            Log In
          </button>
        </div>
      </div>
    );
  }

  // Show loading spinner while data is being fetched
  if (loading) {
    return (
      <div className="profile-container loading">
        <div className="spinner"></div>
        <p>Loading profile...</p>
      </div>
    );
  }

  return (
    <div className="profile-page">
      <div className="profile-header-wrapper">
        <button className="back-button" onClick={handleGoBack}>
          <i className="arrow-left"></i> Home
        </button>
      </div>
      
      <div className="profile-content">
        <div className="profile-sections">
          <h1 className="profile-title">My Profile</h1>
          
          {/* Profile Information Section */}
          <div className="profile-section">
            <div className="section-header">
              <h2>Personal Information</h2>
              <button 
                className="edit-icon-button" 
                onClick={toggleProfileEdit}
                aria-label={editingProfile ? "Cancel editing" : "Edit profile information"}
              >
                {editingProfile ? (
                  <span className="icon-cancel">✕</span>
                ) : (
                  <span className="icon-edit">✎</span>
                )}
              </button>
            </div>
            
            {editingProfile ? (
              <form onSubmit={handleProfileSubmit} className="profile-form">
                <div className="form-group">
                  <label>Name</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleProfileChange}
                    required
                    className="form-input"
                  />
                </div>
                
                <div className="form-group">
                  <label>Email</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleProfileChange}
                    required
                    className="form-input"
                  />
                </div>
                
                <div className="form-group">
                  <label>Location</label>
                  <input
                    type="text"
                    name="location"
                    value={formData.location}
                    onChange={handleProfileChange}
                    className="form-input"
                  />
                </div>
                
                {error && <div className="error-alert">{error}</div>}
                {success && <div className="success-alert">{success}</div>}
                
                <button type="submit" className="save-button">Save Changes</button>
              </form>
            ) : (
              <div className="profile-info">
                <div className="info-group">
                  <label>Name</label>
                  <p className="info-value">{userData.name}</p>
                </div>
                
                <div className="info-group">
                  <label>Email</label>
                  <p className="info-value">{userData.email}</p>
                </div>
                
                <div className="info-group">
                  <label>Location</label>
                  <p className="info-value">{userData.location}</p>
                </div>
              </div>
            )}
          </div>
          
          {/* Password Section */}
          <div className="profile-section">
            <div className="section-header">
              <h2>Password</h2>
              <button 
                className="edit-icon-button" 
                onClick={togglePasswordEdit}
                aria-label={editingPassword ? "Cancel editing" : "Edit password"}
              >
                {editingPassword ? (
                  <span className="icon-cancel">✕</span>
                ) : (
                  <span className="icon-edit">✎</span>
                )}
              </button>
            </div>
            
            {editingPassword ? (
              <form onSubmit={handlePasswordSubmit} className="profile-form">
                <div className="form-group">
                  <label>Current Password</label>
                  <input
                    type="password"
                    name="currentPassword"
                    value={passwordForm.currentPassword}
                    onChange={handlePasswordChange}
                    required
                    className="form-input"
                  />
                </div>
                
                <div className="form-group">
                  <label>New Password</label>
                  <input
                    type="password"
                    name="newPassword"
                    value={passwordForm.newPassword}
                    onChange={handlePasswordChange}
                    required
                    className="form-input"
                  />
                </div>
                
                <div className="form-group">
                  <label>Confirm New Password</label>
                  <input
                    type="password"
                    name="confirmPassword"
                    value={passwordForm.confirmPassword}
                    onChange={handlePasswordChange}
                    required
                    className="form-input"
                  />
                </div>
                
                {error && <div className="error-alert">{error}</div>}
                {success && <div className="success-alert">{success}</div>}
                
                <button type="submit" className="save-button">Save Changes</button>
              </form>
            ) : (
              <div className="profile-info">
                <div className="info-group">
                  <label>Current Password</label>
                  <p className="info-value">••••••••••</p>
                </div>
              </div>
            )}
          </div>
        </div>
        
        <div className="profile-sidebar">
          <div className="avatar-container">
            <div className="letter-avatar">
              {getInitialLetter(userData.name)}
            </div>
          </div>
          <h2 className="sidebar-username">{userData.name || 'User'}</h2>
        </div>
      </div>
    </div>
  );
};

export default UserProfile; 