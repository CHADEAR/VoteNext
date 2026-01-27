import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import AdminLoginPage from "../pages/admin/AdminLoginPage";
import AdminDashboardPage from "../pages/admin/AdminDashboardPage";
import CreateVotePollPage from "../pages/admin/CreateVotePollPage";
import AdminPreviewVotePollPage from "../pages/admin/AdminPreviewVotePollPage";
import AdminPreviewManualVotePollPage from "../pages/admin/AdminPreviewManualVotePollPage";
import AdminRoundResultsPage from "../pages/admin/AdminRoundResultsPage";

import VoteEnterEmailPage from "../pages/voter/VoteEnterEmailPage";
import VotePublicPage from "../pages/voter/VotePublicPage";
import VoteRankPage from "../pages/voter/VoteRankPage";

import StageRealtimePage from "../pages/stage/StageRealtimePage";

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        {/* ================= Admin ================= */}
        <Route path="/admin/login" element={<AdminLoginPage />} />
        <Route path="/" element={<AdminDashboardPage />} />
        <Route path="/admin/create-poll" element={<CreateVotePollPage />} />
        <Route
          path="/admin/preview-manual/:pollId"
          element={<AdminPreviewManualVotePollPage />}
        />
        <Route
          path="/admin/preview/:pollId"
          element={<AdminPreviewVotePollPage />}
        />
        <Route path="/admin/rounds/:roundId" element={<AdminRoundResultsPage />} />

        {/* ================= Voter ================= */}
        <Route
          path="/vote/:publicSlug/email"
          element={<VoteEnterEmailPage />}
        />
        <Route
          path="/vote/:publicSlug"
          element={<VotePublicPage />}
        />
        <Route
          path="/vote/:publicSlug/rank"
          element={<VoteRankPage />}
        />

        {/* ================= Stage ================= */}
        <Route path="/stage/realtime" element={<StageRealtimePage />} />

        {/* ================= 404 ================= */}
        <Route path="*" element={<div>404 Not Found</div>} />
      </Routes>
    </BrowserRouter>
  );
}
