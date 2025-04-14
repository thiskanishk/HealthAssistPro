import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import TriageDashboard from '../components/triage/TriageDashboard';
import PatientIntakeForm from '../components/triage/PatientIntakeForm';
import TriageAssessmentView from '../components/triage/TriageAssessmentView';

const TriageRoutes: React.FC = () => {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <Routes>
      <Route path="/" element={<TriageDashboard />} />
      <Route path="/intake/:patientId" element={<PatientIntakeForm />} />
      <Route path="/assessment/:assessmentId" element={<TriageAssessmentView />} />
      <Route path="*" element={<Navigate to="/triage" replace />} />
    </Routes>
  );
};

export default TriageRoutes; 