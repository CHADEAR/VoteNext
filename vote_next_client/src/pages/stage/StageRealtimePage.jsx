// src/pages/stage/StageRealtimePage.jsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../../components/layout/Navbar';

export default function StageRealtimePage() {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("votenext_admin");
    navigate("/admin/login");
  };

  return (
    <div className="stage-realtime-container">
      <Navbar showProfile onLogout={handleLogout} />
      
      <main className="stage-content">
        <h1>Stage Realtime Screen</h1>
        <p>หน้านี้จะใช้แสดงผลโหวตแบบ realtime บนจอเวที</p>
      </main>
    </div>
  );
}
