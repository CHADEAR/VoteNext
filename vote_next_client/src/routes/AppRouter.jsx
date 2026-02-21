import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import ProtectedRoute from "./ProtectedRoute";
import { isAdminLoggedIn } from "../services/auth.service";

import AdminLoginPage from "../pages/admin/AdminLoginPage";
import AdminDashboardPage from "../pages/admin/AdminDashboardPage";
import CreateVotePollPage from "../pages/admin/CreateVotePollPage";
import AdminPreviewVotePollPage from "../pages/admin/AdminPreviewVotePollPage";
import AdminRoundResultsPage from "../pages/admin/AdminRoundResultsPage";

import VoteEnterEmailPage from "../pages/voter/VoteEnterEmailPage";
import VotePublicPage from "../pages/voter/VotePublicPage";
import VoteRankPage from "../pages/voter/VoteRankPage";

/** ถ้าแอดมิน login แล้ว ไม่ให้เข้า login อีก ไป dashboard แทน */
function AdminLoginGuard({ children }) {
  if (isAdminLoggedIn()) {
    return <Navigate to="/" replace />;
  }
  return children;
}

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        {/* ================= Admin ================= */}
        <Route
          path="/admin/login"
          element={
            <AdminLoginGuard>
              <AdminLoginPage />
            </AdminLoginGuard>
          }
        />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <AdminDashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/create-poll"
          element={
            <ProtectedRoute>
              <CreateVotePollPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/preview/:pollId"
          element={
            <ProtectedRoute>
              <AdminPreviewVotePollPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/rounds/:roundId"
          element={
            <ProtectedRoute>
              <AdminRoundResultsPage />
            </ProtectedRoute>
          }
        />

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
        
        {/* ================= 404 ================= */}
        <Route path="*" element={<div>404 Not Found</div>} />
      </Routes>
    </BrowserRouter>
  );
}
