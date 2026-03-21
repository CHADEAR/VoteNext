import React, { useRef, useState, useEffect } from "react";
import { FiUser } from "react-icons/fi";
import { IoCamera } from "react-icons/io5";
import PropTypes from "prop-types";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import logo from "../../assets/Black_White_Modern_Bold_Design_Studio_Logo-removebg-preview.png";
import { uploadImageToCloudinary } from "../../services/cloudinaryUpload.service";
import apiClient from "../../api/apiClient";
import { getAdminFromStorage, ADMIN_STORAGE_KEY } from "../../services/auth.service";
import "./Navbar.css";

const Navbar = ({ showProfile = false, onLogout }) => {
  const [openProfile, setOpenProfile] = useState(false);
  const [profileImage, setProfileImage] = useState(null);
  const [adminInfo, setAdminInfo] = useState(null);
  const fileInputRef = useRef(null);
  const profileRef = useRef(null);

  useEffect(() => {
    const admin = getAdminFromStorage();
    console.log("[Navbar Debug] Admin from localStorage:", admin);

    if (admin) {
      let adminData = admin;
      if (admin.admin) {
        console.log("[Navbar Debug] Found old format, extracting admin property");
        adminData = admin.admin;
      }

      console.log("[Navbar Debug] Final adminData:", adminData);
      console.log("[Navbar Debug] adminData.email =", adminData.email);

      setAdminInfo(adminData);

      if (adminData.profile_img) {
        let profileImageUrl = adminData.profile_img;

        if (typeof adminData.profile_img === "object" && adminData.profile_img.imageUrl) {
          profileImageUrl = adminData.profile_img.imageUrl;
          console.log("[Mount Debug] profile_img is object, extracting imageUrl:", profileImageUrl);
        } else if (typeof admin.profile_img === "string") {
          profileImageUrl = admin.profile_img;
          console.log("[Mount Debug] profile_img is string:", profileImageUrl);
        } else if (typeof admin.profile_img === "object" && !admin.profile_img.imageUrl) {
          console.log("[Mount Debug] profile_img is object but no imageUrl property");
        }

        console.log("[Mount Debug] Final profile image URL:", profileImageUrl);
        setProfileImage(profileImageUrl);
      } else {
        console.log("[Mount Debug] No profile image found in admin data");
      }
    } else {
      console.log("[Mount Debug] No admin data found in localStorage");
    }
  }, []);

  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      console.log("[Upload Debug] ProfileImage state changed to:", profileImage);
    }
  }, [profileImage]);

  const updateAdminProfile = async (adminId, profileImageUrl) => {
    try {
      const response = await apiClient.post("/admin/update-profile", {
        adminId,
        profile_img: profileImageUrl,
      });

      return response.data;
    } catch (error) {
      console.error("Error updating admin profile:", error);
      throw error;
    }
  };

  React.useEffect(() => {
    const handleClickOutside = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setOpenProfile(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleFileChange = async (e) => {
    const file = e.target.files[0];

    if (!file) return;

    try {
      if (!file.type.startsWith("image/")) {
        toast.error("Please select an image file only");
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        toast.error("File size must not exceed 5MB");
        return;
      }

      toast.info("Uploading profile image...");

      const cloudinaryResponse = await uploadImageToCloudinary(file);
      console.log("[Upload Debug] Image uploaded to Cloudinary:", cloudinaryResponse);

      const imageUrl = cloudinaryResponse.imageUrl || cloudinaryResponse;
      console.log("[Upload Debug] Extracted imageUrl:", imageUrl);

      setProfileImage(imageUrl);

      if (adminInfo) {
        const updatedAdmin = { ...adminInfo, profile_img: imageUrl };
        setAdminInfo(updatedAdmin);
        localStorage.setItem(ADMIN_STORAGE_KEY, JSON.stringify(updatedAdmin));

        const response = await updateAdminProfile(adminInfo.id, imageUrl);
        if (response.token) {
          localStorage.setItem("adminToken", response.token);
        }
      }

      toast.success("Profile image uploaded successfully");
    } catch (error) {
      console.error("Error uploading profile image:", error);
      toast.error("Failed to upload profile image");
    }
  };

  const handleLogout = () => {
    if (onLogout) {
      onLogout();
    }
  };

  return (
    <header className="topbar">
      <Link to="/" className="logo-link" aria-label="Go to dashboard">
        <img src={logo} alt="logo" className="logo-img" />
      </Link>

      {showProfile && (
        <div className="topbar-right">
          <Link to="/" className="topbar-link">
            Dashboard
          </Link>

          <div className="profile-wrapper" ref={profileRef}>
            <button
              className="profile-btn"
              onClick={() => setOpenProfile(!openProfile)}
              aria-label="Profile menu"
            >
              {profileImage ? (
                <img src={profileImage} alt="profile" className="profile-img" />
              ) : (
                <FiUser size={26} className="person-icon-small" />
              )}
            </button>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*"
              style={{ display: "none" }}
            />

            {openProfile && (
              <div className="profile-dropdown">
                <div className="profile-avatar">
                  {!profileImage && <FiUser size={70} className="person-icon" />}
                  {profileImage && <img src={profileImage} alt="avatar" className="avatar-img" />}
                  <span
                    className="camera"
                    onClick={() => fileInputRef.current?.click()}
                    aria-label="Change profile picture"
                  >
                    <IoCamera />
                  </span>
                </div>

                <div className="profile-email">
                  {adminInfo?.email || "admin@votenext.com"}
                </div>

                <div className="profile-name">
                  {adminInfo?.full_name || "Admin User"}
                </div>

                <button
                  className="logout-btn"
                  onClick={handleLogout}
                >
                  LOG OUT
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        style={{ display: "none" }}
        accept="image/*"
      />
    </header>
  );
};

Navbar.propTypes = {
  showProfile: PropTypes.bool,
  onLogout: PropTypes.func,
};

export default Navbar;
