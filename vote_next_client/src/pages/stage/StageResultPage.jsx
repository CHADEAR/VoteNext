// src/pages/stage/StageResultPage.jsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../../components/layout/Navbar';

const StageResultPage = () => {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("votenext_admin");
    navigate("/admin/login");
  };

  return (
    <div className="stage-result-container">
      <Navbar showProfile onLogout={handleLogout} />
      
      <main className="stage-content">
        <h1>Stage Result Screen</h1>
        <p>หน้านี้จะใช้แสดงผลลัพธ์โหวตบนจอเวที</p>
      </main>
    </div>
  );
};

export default StageResultPage;