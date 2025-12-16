import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import AdminLoginPage from "../pages/admin/AdminLogin";
import AdminDashboardPage from "../pages/admin/AdminDashboard";
import CreateVotePoll from "../pages/admin/CreateVotePoll";
import VoteEnterEmailPage from "../pages/voter/VoteEnterEmailPage";
import StageRealtimePage from "../pages/stage/StageRealtimePage";

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Admin */}
        <Route path="/admin/login" element={<AdminLoginPage />} />
        <Route path="/" element={<AdminDashboardPage />} />
        <Route path="/admin/create-poll" element={<CreateVotePoll />} />

        {/* Voter */}
        <Route path="/vote" element={<VoteEnterEmailPage />} />

        {/* Stage */}
        <Route path="/stage/realtime" element={<StageRealtimePage />} />

        {/* Default / 404 */}
        <Route path="*" element={<div>404 Not Found</div>} />
      </Routes>
    </BrowserRouter>
  );
}
