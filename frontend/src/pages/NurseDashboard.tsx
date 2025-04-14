
import React from "react";

const NurseDashboard: React.FC = () => {
  return (
    <div className="p-4">
      <h1>Nurse Dashboard</h1>
      <ul>
        <li>📝 Add Patient Intake</li>
        <li>🌡 Input Vitals</li>
        <li>📅 Manage Follow-ups</li>
      </ul>
    </div>
  );
};

export default NurseDashboard;
