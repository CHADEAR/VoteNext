import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import AdminLoginPage from "../pages/admin/AdminLoginPage";
import VoteEnterEmailPage from "../pages/voter/VoteEnterEmailPage";
import StageRealtimePage from "../pages/stage/StageRealtimePage";

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/admin/login" element={<AdminLoginPage />} />
        <Route path="/vote" element={<VoteEnterEmailPage />} />
        <Route path="/stage/realtime" element={<StageRealtimePage />} />
        <Route path="*" element={<div>404 Not Found</div>} />
      </Routes>
    </BrowserRouter>
  );
}
