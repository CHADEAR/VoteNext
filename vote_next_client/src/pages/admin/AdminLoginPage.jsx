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
      setError("Please enter your email and password");
      return;
    }

    try {
      setLoading(true);
      const { admin, token } = await adminLogin({ email, password });

      localStorage.setItem(ADMIN_STORAGE_KEY, JSON.stringify(admin));
      localStorage.setItem('adminToken', token);

      setInfo("Login successful. Redirecting...");
      navigate(from, { replace: true });
    } catch (err) {
      console.error(err);
      const msg =
        err?.response?.data?.message || "Login failed. Please try again.";
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
      setResetError("Please enter your email, new password, and password confirmation");
      return;
    }

    if (newPassword !== resetConfirmPassword) {
      setResetError("New password and confirmation do not match");
      return;
    }

    if (newPassword.length < 6) {
      setResetError("Password must be at least 6 characters");
      return;
    }

    try {
      setResetLoading(true);
      await resetPassword(resetEmail, newPassword);
      setResetSuccess("Password updated successfully");
      setTimeout(() => {
        setShowReset(false);
        setResetEmail("");
        setNewPassword("");
        setResetConfirmPassword("");
      }, 2000);
    } catch (err) {
      console.error(err);
      const msg =
        err?.response?.data?.message || "Failed to update password";
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
                {loading ? "Signing in..." : "Login"}
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
                    placeholder="Enter your email"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    className="input-field"
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="input-label">New Password</label>
                <div className="input-wrapper">
                  <span className="input-icon"><MdLock size={18} /></span>
                  <input
                    type="password"
                    placeholder="Enter a new password (at least 6 characters)"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="input-field"
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="input-label">Confirm New Password</label>
                <div className="input-wrapper">
                  <span className="input-icon"><MdLock size={18} /></span>
                  <input
                    type="password"
                    placeholder="Enter your new password again"
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
                  Back to Login
                </button>
                <button type="submit" className="reset-button" disabled={resetLoading}>
                  {resetLoading ? "Updating..." : "Update Password"}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

