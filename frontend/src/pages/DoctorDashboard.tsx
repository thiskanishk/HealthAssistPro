
import React from "react";

const DoctorDashboard: React.FC = () => {
  return (
    <div className="p-4">
      <h1>Doctor Dashboard</h1>
      <ul>
        <li>👨‍⚕️ View Patients</li>
        <li>🧠 Run AI Diagnosis</li>
        <li>💊 Export Treatment Plans</li>
        <li>📜 Review Visit History</li>
      </ul>
    </div>
  );
};

export default DoctorDashboard;
