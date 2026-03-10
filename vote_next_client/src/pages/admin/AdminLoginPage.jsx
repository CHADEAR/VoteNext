// src/pages/admin/AdminLoginPage.jsx
import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { adminLogin, resetPassword, ADMIN_STORAGE_KEY } from "../../services/auth.service";
import logo from '../../assets/Black_White_Modern_Bold_Design_Studio_Logo-removebg-preview.png';
import "./AdminLogin.css";
import { MdEmail, MdLock } from "react-icons/md";

export default function AdminLoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from || "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  const [showReset, setShowReset] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [resetConfirmPassword, setResetConfirmPassword] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState("");
  const [resetSuccess, setResetSuccess] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setInfo("");

    if (!email || !password) {
      setError("กรุณากรอก Email และ Password");
      return;
    }

    try {
      setLoading(true);
      const { admin, token } = await adminLogin({ email, password });

      localStorage.setItem(ADMIN_STORAGE_KEY, JSON.stringify(admin));
      localStorage.setItem('adminToken', token);

      setInfo("Login สำเร็จ กำลังเปลี่ยนหน้า...");
      navigate(from, { replace: true });
    } catch (err) {
      console.error(err);
      const msg =
        err?.response?.data?.message || "Login ไม่สำเร็จ กรุณาลองอีกครั้ง";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  async function handleResetPassword(e) {
    e.preventDefault();
    setResetError("");
    setResetSuccess("");

    if (!resetEmail || !newPassword || !resetConfirmPassword) {
      setResetError("กรุณากรอก Email, รหัสผ่านใหม่ และยืนยันรหัสผ่าน");
      return;
    }

    if (newPassword !== resetConfirmPassword) {
      setResetError("รหัสผ่านใหม่และยืนยันรหัสผ่านไม่ตรงกัน");
      return;
    }

    if (newPassword.length < 6) {
      setResetError("รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร");
      return;
    }

    try {
      setResetLoading(true);
      await resetPassword(resetEmail, newPassword);
      setResetSuccess("รหัสผ่านได้รับการอัพเดตเรียบร้อยแล้ว");
      setTimeout(() => {
        setShowReset(false);
        setResetEmail("");
        setNewPassword("");
        setResetConfirmPassword("");
      }, 2000);
    } catch (err) {
      console.error(err);
      const msg =
        err?.response?.data?.message || "อัพเดตรหัสผ่านไม่สำเร็จ";
      setResetError(msg);
    } finally {
      setResetLoading(false);
    }
  }

  return (
    <div className="admin-login-page">
      <div className="admin-login-card">
        <div className="admin-login-logo">
          <div className="logo-placeholder">
             <img src={logo} alt="logo" />
          </div>
        </div>

        {!showReset ? (
          <>
            <h1 className="admin-login-title">Login</h1>

            <form className="admin-login-form" onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="input-label">Email</label>
                <div className="input-wrapper">
                  <span className="input-icon"><MdEmail size={18} /></span>
                  <input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="input-field"
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="input-label">Password</label>
                <div className="input-wrapper">
                  <span className="input-icon"><MdLock size={18} /></span>
                  <input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="input-field"
                  />
                </div>
                <div className="forgot-password" onClick={() => setShowReset(true)}>
                  Forgot Password?
                </div>
              </div>

              {error && <div className="error-message">{error}</div>}
              {info && <div className="info-message">{info}</div>}

              <button type="submit" className="login-button" disabled={loading}>
                {loading ? "กำลังเข้าสู่ระบบ..." : "Login"}
              </button>
            </form>
          </>
        ) : (
          <>
            <h1 className="admin-login-title">Reset Password</h1>

            <form className="admin-login-form" onSubmit={handleResetPassword}>
              <div className="form-group">
                <label className="input-label">Email</label>
                <div className="input-wrapper">
                  <span className="input-icon"><MdEmail size={18} /></span>
                  <input
                    type="email"
                    placeholder="กรอกอีเมลของคุณ"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    className="input-field"
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="input-label">รหัสผ่านใหม่</label>
                <div className="input-wrapper">
                  <span className="input-icon"><MdLock size={18} /></span>
                  <input
                    type="password"
                    placeholder="กรอกรหัสผ่านใหม่ (อย่างน้อย 6 ตัวอักษร)"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="input-field"
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="input-label">ยืนยันรหัสผ่านใหม่</label>
                <div className="input-wrapper">
                  <span className="input-icon"><MdLock size={18} /></span>
                  <input
                    type="password"
                    placeholder="กรอกรหัสผ่านใหม่อีกครั้ง"
                    value={resetConfirmPassword}
                    onChange={(e) => setResetConfirmPassword(e.target.value)}
                    className="input-field"
                  />
                </div>
              </div>

              {resetError && <div className="error-message">{resetError}</div>}
              {resetSuccess && <div className="success-message">{resetSuccess}</div>}

              <div className="form-actions">
                <button 
                  type="button" 
                  className="back-button" 
                  onClick={() => {
                    setShowReset(false);
                    setResetEmail("");
                    setNewPassword("");
                    setResetConfirmPassword("");
                    setResetError("");
                    setResetSuccess("");
                  }}
                >
                  กลับไป Login
                </button>
                <button type="submit" className="reset-button" disabled={resetLoading}>
                  {resetLoading ? "กำลังอัพเดต..." : "อัพเดตรหัสผ่าน"}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

