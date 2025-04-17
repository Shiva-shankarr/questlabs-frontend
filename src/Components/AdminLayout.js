// src/components/AdminLayout.js
import React from 'react';
import AdminNavbar from '../pages/adminNavbar';

const AdminLayout = ({ children }) => {
  return (
    <div className="admin-layout-container">
      <AdminNavbar />
      <div className="admin-content">
        {children}
      </div>
    </div>
  );
};

export default AdminLayout;