
import React from "react";

const AdminDashboard: React.FC = () => {
  return (
    <div className="p-4">
      <h1>Admin Dashboard</h1>
      <ul>
        <li>🔒 View Audit Logs</li>
        <li>👥 Manage Users</li>
        <li>📊 Monitor System Health</li>
      </ul>
    </div>
  );
};

export default AdminDashboard;
