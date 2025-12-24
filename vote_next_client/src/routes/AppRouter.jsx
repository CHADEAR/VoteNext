import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import AdminLoginPage from "../pages/admin/AdminLoginPage";
import AdminDashboardPage from "../pages/admin/AdminDashboardPage";
import CreateVotePollPage from "../pages/admin/CreateVotePollPage";
import AdminPreviewVotePollPage from "../pages/admin/AdminPreviewVotePollPage";

import VoteEnterEmailPage from "../pages/voter/VoteEnterEmailPage";
import VotePublicPage from "../pages/voter/VotePublicPage";
import StageRealtimePage from "../pages/stage/StageRealtimePage";

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Admin */}
        <Route path="/admin/login" element={<AdminLoginPage />} />
        <Route path="/" element={<AdminDashboardPage />} />
        <Route path="/admin/create-poll" element={<CreateVotePollPage />} />
        <Route
          path="/admin/preview/:pollId"
          element={<AdminPreviewVotePollPage />}
        />

        {/* Voter */}
        <Route path="/vote/:public_slug/email" element={<VoteEnterEmailPage />} />
        <Route path="/vote/:public_slug" element={<VotePublicPage />} />


        {/* Stage */}
        <Route path="/stage/realtime" element={<StageRealtimePage />} />

        {/* 404 */}
        <Route path="*" element={<div>404 Not Found</div>} />
      </Routes>
    </BrowserRouter>
  );
}
