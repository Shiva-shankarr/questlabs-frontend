import React from 'react';
import { useSelector } from 'react-redux';
import Navbar from './Navbar';
import AdminNavbar from '../pages/adminNavbar';

/**
 * NavbarManager - Renders the appropriate navbar based on user role
 * 
 * This component checks the user's role from the Redux store and renders
 * either the regular user Navbar or AdminNavbar accordingly.
 */
const NavbarManager = () => {
  const { user, isAuthenticated } = useSelector(state => state.auth);
  
  // If user is not authenticated, show regular navbar
  if (!isAuthenticated) {
    return <Navbar />;
  }
  
  // If user is authenticated and has admin role, show admin navbar
  if (user && user.role === 'admin') {
    return <AdminNavbar />;
  }
  
  // Default to regular navbar for regular users
  return <Navbar />;
};

export default NavbarManager; 