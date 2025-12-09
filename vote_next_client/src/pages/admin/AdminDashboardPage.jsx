// src/pages/admin/AdminDashboardPage.jsx
import React, { useEffect, useState } from "react";

export default function AdminDashboardPage() {
  const [admin, setAdmin] = useState(null);

  useEffect(() => {
    const raw = localStorage.getItem("votenext_admin");
    if (raw) {
      try {
        setAdmin(JSON.parse(raw));
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  return (
    <div style={{ padding: 24 }}>
      <h1>Admin Dashboard</h1>
      {admin ? (
        <p>Welcome, {admin.full_name || admin.email}</p>
      ) : (
        <p>ยังไม่ได้ login หรือไม่มีข้อมูล admin ใน localStorage</p>
      )}
    </div>
  );
}
