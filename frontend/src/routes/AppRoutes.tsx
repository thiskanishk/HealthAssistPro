
import React from "react";
import { Routes, Route } from "react-router-dom";
import ProtectedRoute from "../components/ProtectedRoute";
import DoctorDashboard from "../pages/DoctorDashboard";
import NurseDashboard from "../pages/NurseDashboard";
import AdminDashboard from "../pages/AdminDashboard";

const AppRoutes: React.FC = () => {
  return (
    <Routes>
      <Route path="/dashboard/doctor" element={
        <ProtectedRoute allowedRoles={['Doctor']}>
          <DoctorDashboard />
        </ProtectedRoute>
      } />
      <Route path="/dashboard/nurse" element={
        <ProtectedRoute allowedRoles={['Nurse']}>
          <NurseDashboard />
        </ProtectedRoute>
      } />
      <Route path="/dashboard/admin" element={
        <ProtectedRoute allowedRoles={['Admin']}>
          <AdminDashboard />
        </ProtectedRoute>
      } />
      <Route path="/unauthorized" element={<div className="p-4 text-red-600">Unauthorized Access</div>} />
    </Routes>
  );
};

export default AppRoutes;
