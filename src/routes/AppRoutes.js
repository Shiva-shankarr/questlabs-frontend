import React, { useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { isInQuestFlow, clearQuestSessionData, isQuestSessionDataStale } from '../utils/sessionManager';

// Page components
import Home from '../pages/Home';
import LoginPage from '../pages/LoginPage';
import UserHomePage from '../pages/User_HomePage';
import CoursePage from '../pages/CoursePage';
import TaskDetails from '../pages/TaskDetails';
import QuestsPage from '../pages/QuestsPage';
import PlaylistsPage from '../pages/Playlists';
import FavoritesPage from '../pages/Favorites';
import RegisterPage from '../pages/RegisterPage';
import UserProfile from '../pages/UserProfile';

// Admin components
import AdminDashboardContent from '../pages/adminDashboard';
import AdminLayout from '../Components/AdminLayout';
import AdminSimpleLayout from '../Components/AdminSimpleLayout';
import Navbar from '../Components/Navbar';
import AdminQuests from '../pages/adminQuest';
import AdminTasks from '../pages/adminTask';
import AdminUserManagement from '../pages/adminUserManagement';
import AdminUserProfileManagement from '../pages/adminUserProfileManagement';
import AdminLeaderboard from '../pages/adminLeaderboard';
import AdminQuestView from '../pages/adminQuestView';
import AdminTaskView from '../pages/adminTaskView';

// Quest Creation components
import CreateQuest from '../pages/CreateQuest';
import CreateQuestTasks from '../pages/CreateQuestTasks';
import CreateQuestTaskDetails from '../pages/CreateQuestTaskDetails';
import CreateQuestPreview from '../pages/CreateQuestPreview';
import TaskPreview from '../pages/TaskPreview';

// Protected route wrapper
const ProtectedRoute = ({ children, adminOnly = false, guestOnly = false }) => {
  const { isAuthenticated, userRole, loading } = useSelector(state => state.auth);
  const token = localStorage.getItem('userToken');
  const roleFromStorage = localStorage.getItem('userRole');
  const location = useLocation();
  
  // Check if redux and localStorage have different roles
  if (userRole !== roleFromStorage && roleFromStorage && userRole) {
    console.warn('Role mismatch detected! Redux:', userRole, 'LocalStorage:', roleFromStorage);
  }
  
  // Use role from redux state, fall back to localStorage if needed
  const effectiveRole = userRole || roleFromStorage;
  
  console.log('Protected route check:', {
    path: location.pathname,
    adminOnly,
    isAuthenticated,
    userRole: effectiveRole,
    hasToken: !!token
  });
  
  if (guestOnly && isAuthenticated) {
    console.log('Guest only route but user is authenticated, redirecting to dashboard');
    return <Navigate to="/dashboard" />;
  }
  
  if (!guestOnly) {
    // Check both Redux auth state AND token in localStorage
    if (!isAuthenticated && !token) {
      console.log('Not authenticated, redirecting to login');
      return <Navigate to="/login" state={{ from: location }} replace />;
    }
    
    if (adminOnly && effectiveRole !== 'admin') {
      console.log('Admin only route but user is not admin, redirecting to dashboard');
      // If not admin but trying to access admin route, redirect to user dashboard
      return <Navigate to="/dashboard" replace />;
    }
  }
  
  // If authentication status is still loading, show a loader
  if (loading) {
    return (
      <div className="route-loading">
        <div className="loading-spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }
  
  return children;
};

const RouteWrapper = ({ children }) => {
  const { userRole } = useSelector(state => state.auth);
  
  // If admin, return children directly as AdminLayout is handled in admin routes
  if (userRole === 'admin') {
    return children;
  }
  
  // For regular users, wrap with the user navbar
  return (
    <>
      <Navbar />
      {children}
    </>
  );
};

// Custom route change listener component
const RouteChangeListener = () => {
  const location = useLocation();
  
  useEffect(() => {
    // Get previous path from session storage
    const prevPath = sessionStorage.getItem('prevPath');
    
    // If we're navigating away from the quest flow to a non-quest flow page
    if (prevPath && isInQuestFlow(prevPath) && !isInQuestFlow(location.pathname)) {
      console.log('Navigating away from quest flow, clearing session data');
      clearQuestSessionData();
    }
    
    // Only check for stale data when ENTERING the quest flow, not on every route change
    // This prevents constant clearing of session data
    if (isInQuestFlow(location.pathname) && (!prevPath || !isInQuestFlow(prevPath))) {
      // Check if existing data is stale (older than 2 hours)
      if (isQuestSessionDataStale(2)) {
        console.log('Detected stale quest session data on entering quest flow, clearing it');
        clearQuestSessionData();
      }
    }
    
    // Update the previous path
    sessionStorage.setItem('prevPath', location.pathname);
  }, [location.pathname]);
  
  return null;
};

const AppRoutes = () => {
  const { isAuthenticated, userRole } = useSelector(state => state.auth);

  return (
    <>
      <RouteChangeListener />
      <Routes>
        {/* Root redirect */}
        <Route 
          path="/"
          element={
            isAuthenticated ? (
              userRole === 'admin' ? (
                <Navigate to="/admin/dashboard" replace />
              ) : (
                <Navigate to="/dashboard" replace />
              )
            ) : (
              <Home />
            )
          } 
        />

        {/* Auth routes - made accessible without being logged in */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* User routes */}
        <Route 
          path="/dashboard" 
          element={
            <ProtectedRoute>
              <RouteWrapper>
                <UserHomePage />
              </RouteWrapper>
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/course/:courseId" 
          element={
            <ProtectedRoute>
              <RouteWrapper>
                <CoursePage />
              </RouteWrapper>
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/task/:courseId/:taskId" 
          element={
            <ProtectedRoute>
              <RouteWrapper>
                <TaskDetails />
              </RouteWrapper>
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/quests" 
          element={
            <ProtectedRoute>
              <RouteWrapper>
                <QuestsPage />
              </RouteWrapper>
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/playlists" 
          element={
            <ProtectedRoute>
              <RouteWrapper>
                <PlaylistsPage />
              </RouteWrapper>
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/favorites" 
          element={
            <ProtectedRoute>
              <RouteWrapper>
                <FavoritesPage />
              </RouteWrapper>
            </ProtectedRoute>
          } 
        />

        <Route 
          path="/profile" 
          element={
            <ProtectedRoute>
              <RouteWrapper>
                <UserProfile />
              </RouteWrapper>
            </ProtectedRoute>
          } 
        />

        {/* Admin routes */}
        <Route 
          path="/admin/dashboard" 
          element={
            <ProtectedRoute adminOnly>
              <AdminLayout>
                <AdminDashboardContent />
              </AdminLayout>
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/admin/quests" 
          element={
            <ProtectedRoute adminOnly>
              <AdminLayout>
                <AdminQuests />
              </AdminLayout>
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/admin/tasks" 
          element={
            <ProtectedRoute adminOnly>
              <AdminLayout>
                <AdminTasks />
              </AdminLayout>
            </ProtectedRoute>
          } 
        />

        <Route 
          path="/admin/users" 
          element={
            <ProtectedRoute adminOnly>
              <AdminLayout>
                <AdminUserManagement />
              </AdminLayout>
            </ProtectedRoute>
          } 
        />

        <Route 
          path="/admin/users/profile/:userId" 
          element={
            <ProtectedRoute adminOnly>
              <AdminSimpleLayout>
                <AdminUserProfileManagement />
              </AdminSimpleLayout>
            </ProtectedRoute>
          } 
        />

        <Route 
          path="/admin/leaderboard" 
          element={
            <ProtectedRoute adminOnly>
              <AdminLayout>
                <AdminLeaderboard />
              </AdminLayout>
            </ProtectedRoute>
          } 
        />

        {/* Quest Creation routes - using AdminSimpleLayout */}
        <Route 
          path="/admin/create-quest" 
          element={
            <ProtectedRoute adminOnly>
              <AdminSimpleLayout>
                <CreateQuest />
              </AdminSimpleLayout>
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/admin/create-quest/tasks" 
          element={
            <ProtectedRoute adminOnly>
              <AdminSimpleLayout>
                <CreateQuestTasks />
              </AdminSimpleLayout>
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/admin/create-quest/task-details" 
          element={
            <ProtectedRoute adminOnly>
              <AdminSimpleLayout>
                <CreateQuestTaskDetails />
              </AdminSimpleLayout>
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/admin/create-quest/task-details/:taskId" 
          element={
            <ProtectedRoute adminOnly>
              <AdminSimpleLayout>
                <CreateQuestTaskDetails />
              </AdminSimpleLayout>
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/admin/create-quest/preview" 
          element={
            <ProtectedRoute adminOnly>
              <AdminSimpleLayout>
                <CreateQuestPreview />
              </AdminSimpleLayout>
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/admin/create-quest/preview/:questId" 
          element={
            <ProtectedRoute adminOnly>
              <AdminSimpleLayout>
                <CreateQuestPreview />
              </AdminSimpleLayout>
            </ProtectedRoute>
          } 
        />
        
        {/* Task Preview routes */}
        <Route 
          path="/admin/create-quest/task/:taskId" 
          element={
            <ProtectedRoute adminOnly>
              <AdminSimpleLayout>
                <TaskPreview />
              </AdminSimpleLayout>
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/admin/quest/:questId/task/:taskId" 
          element={
            <ProtectedRoute adminOnly>
              <AdminSimpleLayout>
                <AdminTaskView />
              </AdminSimpleLayout>
            </ProtectedRoute>
          } 
        />

        {/* AdminQuestView route */}
        <Route 
          path="/admin/quest/:questId" 
          element={
            <ProtectedRoute adminOnly>
              <AdminSimpleLayout>
                <AdminQuestView />
              </AdminSimpleLayout>
            </ProtectedRoute>
          } 
        />

        {/* Catch all route */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
};

export default AppRoutes;