import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import VideoConsultation from '../components/telemedicine/VideoConsultation';
import TelemedicineSchedule from '../pages/telemedicine/TelemedicineSchedule';
import TelemedicineHistory from '../pages/telemedicine/TelemedicineHistory';
import TelemedicineWaitingRoom from '../pages/telemedicine/TelemedicineWaitingRoom';

const TelemedicineRoutes: React.FC = () => {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  return (
    <Routes>
      <Route path="schedule" element={<TelemedicineSchedule />} />
      <Route path="history" element={<TelemedicineHistory />} />
      <Route 
        path="session/:sessionId" 
        element={
          <VideoConsultation
            sessionId={window.location.pathname.split('/').pop() || ''}
            patientId={user?.role === 'doctor' ? '' : user?.id || ''}
            doctorId={user?.role === 'doctor' ? user?.id || '' : ''}
            isDoctor={user?.role === 'doctor'}
          />
        }
      />
      <Route 
        path="waiting-room"
        element={
          user?.role === 'doctor' 
            ? <TelemedicineWaitingRoom /> 
            : <Navigate to="/telemedicine/schedule" />
        }
      />
      <Route path="*" element={<Navigate to="/telemedicine/schedule" />} />
    </Routes>
  );
};

export default TelemedicineRoutes; 