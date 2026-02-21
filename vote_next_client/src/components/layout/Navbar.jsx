import React, { useRef, useState, useEffect } from 'react';
import { FiUser } from 'react-icons/fi';
import { IoCamera } from 'react-icons/io5';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import logo from '../../assets/Black_White_Modern_Bold_Design_Studio_Logo-removebg-preview.png';
import { uploadImageToCloudinary } from '../../services/cloudinaryUpload.service';
import apiClient from '../../api/apiClient';
import './Navbar.css';

const Navbar = ({ showProfile = false, onLogout }) => {
  const [openProfile, setOpenProfile] = useState(false);
  const [profileImage, setProfileImage] = useState(null);
  const [adminInfo, setAdminInfo] = useState(null);
  const fileInputRef = useRef(null);
  const profileRef = useRef(null);

  // ดึงข้อมูล admin จาก localStorage เมื่อ component mount
  useEffect(() => {
    console.log('🔍 [Profile Debug] Component mounted, checking localStorage...');
    const adminData = localStorage.getItem('votenext_admin');
    console.log('📦 [Profile Debug] Raw admin data from localStorage:', adminData);
    
    if (adminData) {
      const admin = JSON.parse(adminData);
      console.log('👤 [Profile Debug] Parsed admin data:', admin);
      setAdminInfo(admin);
      
      // ดึง profile image ถ้ามี - จัดการกรณีที่เป็น object หรือ string
      if (admin.profile_img) {
        let profileImageUrl = admin.profile_img;
        
        // ถ้า profile_img เป็น object ให้ดึง imageUrl
        if (typeof admin.profile_img === 'object' && admin.profile_img.imageUrl) {
          profileImageUrl = admin.profile_img.imageUrl;
          console.log('� [Profile Debug] profile_img is object, extracting imageUrl:', profileImageUrl);
        } else if (typeof admin.profile_img === 'string') {
          profileImageUrl = admin.profile_img;
          console.log('🔧 [Profile Debug] profile_img is string:', profileImageUrl);
        }
        
        console.log('🖼️ [Profile Debug] Final profile image URL:', profileImageUrl);
        setProfileImage(profileImageUrl);
      } else {
        console.log('❌ [Profile Debug] No profile_img found in admin data');
      }
    } else {
      console.log('❌ [Profile Debug] No admin data found in localStorage');
    }
  }, []);

  // Debug profileImage state changes
  useEffect(() => {
    console.log('🎨 [Profile Debug] ProfileImage state changed:', profileImage);
  }, [profileImage]);

  // ฟังก์ชันสำหรับอัพเดต profile ใน database
  const updateAdminProfile = async (adminId, profileImageUrl) => {
    try {
      const response = await apiClient.post('/admin/update-profile', {
        adminId,
        profile_img: profileImageUrl
      });
      
      return response.data;
    } catch (error) {
      console.error('Error updating admin profile:', error);
      throw error;
    }
  };

  // Close profile dropdown when clicking outside
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
    console.log('📁 [Profile Debug] File selected:', file);
    
    if (file) {
      try {
        // ตรวจสอบว่าเป็นรูปภาพหรือไม่
        if (!file.type.startsWith('image/')) {
          toast.error('กรุณาเลือกไฟล์รูปภาพเท่านั้น');
          return;
        }

        // ตรวจสอบขนาดไฟล์ (ไม่เกิน 5MB)
        if (file.size > 5 * 1024 * 1024) {
          toast.error('ขนาดไฟล์ต้องไม่เกิน 5MB');
          return;
        }

        // แสดง loading
        toast.info('กำลังอัพโหลดรูปภาพ...');

        // อัพโหลดขึ้น Cloudinary
        const imageUrl = await uploadImageToCloudinary(file);
        console.log('☁️ [Profile Debug] Image uploaded to Cloudinary:', imageUrl);
        
        // อัพเดต state
        setProfileImage(imageUrl);
        console.log('🖼️ [Profile Debug] Profile image state updated:', imageUrl);
        
        // อัพเดต localStorage
        if (adminInfo) {
          const updatedAdmin = { ...adminInfo, profile_img: imageUrl };
          setAdminInfo(updatedAdmin);
          localStorage.setItem('votenext_admin', JSON.stringify(updatedAdmin));
          console.log('💾 [Profile Debug] Updated localStorage:', updatedAdmin);
          
          // เรียก API อัพเดต database (ถ้ามี)
          await updateAdminProfile(adminInfo.id, imageUrl);
        }
        
        toast.success('อัพโหลดรูปภาพสำเร็จ');
        
      } catch (error) {
        console.error('❌ [Profile Debug] Error uploading profile image:', error);
        toast.error('อัพโหลดรูปภาพไม่สำเร็จ');
      }
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
            style={{ display: 'none' }}
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
                {adminInfo?.email || 'admin@votenext.com'}
              </div>
              
              <div className="profile-name">
                {adminInfo?.full_name || 'Admin User'}
              </div>

              <button
                className="logout-btn"
                onClick={handleLogout}
              >
                LOGOUT
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
        style={{display: 'none'}} 
        accept="image/*" 
      />
    </header>
  );
};

Navbar.propTypes = {
  showProfile: PropTypes.bool,
  onLogout: PropTypes.func
};

export default Navbar;
