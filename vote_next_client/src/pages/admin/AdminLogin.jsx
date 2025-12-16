// src/pages/admin/AdminLoginPage.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { adminLogin } from "../../services/auth.service";
import logo from '../../assets/Black_White_Modern_Bold_Design_Studio_Logo-removebg-preview.png';
import "./AdminLogin.css"; 

export default function AdminLoginPage() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

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
      const admin = await adminLogin({ email, password });

      // เก็บ admin ไว้ใช้ต่อ (ง่าย ๆ ก่อน)
      localStorage.setItem("votenext_admin", JSON.stringify(admin));

      setInfo("Login สำเร็จ กำลังเปลี่ยนหน้า...");
      navigate("/");
    } catch (err) {
      console.error(err);
      const msg =
        err?.response?.data?.message || "Login ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง";
      setError(msg);
    } finally {
      setLoading(false);
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

        <h1 className="admin-login-title">Login</h1>

        <form className="admin-login-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="input-label">Email</label>
            <div className="input-wrapper">
              <span className="input-icon">✉️</span>
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
              <span className="input-icon">🔒</span>
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field"
              />
            </div>
            <div className="forgot-password">Forgot Password?</div>
          </div>

          {error && <div className="form-error">{error}</div>}
          {info && <div className="form-info">{info}</div>}

          <button
            type="submit"
            className="login-button"
            disabled={loading}
          >
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>

        <div className="signup-row">
          Don&apos;t have an account?{" "}
          <span className="signup-link">Sign up</span>
        </div>
      </div>
    </div>
  );
}
