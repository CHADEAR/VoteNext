import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import AdminLoginPage from "../pages/admin/AdminLoginPage";
import AdminDashboardPage from "../pages/admin/AdminDashboardPage";
import CreateVotePollPage from "../pages/admin/CreateVotePollPage";
import VoteEnterEmailPage from "../pages/voter/VoteEnterEmailPage";
import StageRealtimePage from "../pages/stage/StageRealtimePage";
import VotePublicPage from "../pages/voter/VotePublicPage";

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Admin */}
        <Route path="/admin/login" element={<AdminLoginPage />} />
        <Route path="/" element={<AdminDashboardPage />} />
        <Route path="/admin/create-poll" element={<CreateVotePollPage />} />

        {/* Voter */}
        <Route path="/vote" element={<VoteEnterEmailPage />} />
        <Route path="/vote/:public_slug" element={<VotePublicPage />} />

        {/* Stage */}
        <Route path="/stage/realtime" element={<StageRealtimePage />} />

        {/* Default / 404 */}
        <Route path="*" element={<div>404 Not Found</div>} />
      </Routes>
    </BrowserRouter>
  );
}
