import React from 'react';
import AdminSimpleNavbar from './AdminSimpleNavbar';

const AdminSimpleLayout = ({ children }) => {
  return (
    <div className="admin-layout-container">
      <AdminSimpleNavbar />
      <div className="admin-content" style={{ marginTop: '64px', padding: '24px' }}>
        {children}
      </div>
    </div>
  );
};

export default AdminSimpleLayout; 