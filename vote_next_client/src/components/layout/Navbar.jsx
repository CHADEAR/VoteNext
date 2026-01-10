import React, { useRef, useState } from 'react';
import { CgProfile } from 'react-icons/cg';
import { IoCamera } from 'react-icons/io5';
import PropTypes from 'prop-types';
import logo from '../../assets/Black_White_Modern_Bold_Design_Studio_Logo-removebg-preview.png';
import './Navbar.css';

const Navbar = ({ showProfile = false, onLogout }) => {
  const [openProfile, setOpenProfile] = useState(false);
  const [profileImage, setProfileImage] = useState(null);
  const fileInputRef = useRef(null);
  const profileRef = useRef(null);

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

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          const size = Math.min(img.width, img.height);
          canvas.width = size;
          canvas.height = size;
          const x = (img.width - size) / 2;
          const y = (img.height - size) / 2;
          ctx.drawImage(img, x, y, size, size, 0, 0, size, size);
          const resizedDataUrl = canvas.toDataURL('image/jpeg');
          setProfileImage(resizedDataUrl);
        };
        img.src = event.target.result;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleLogout = () => {
    if (onLogout) {
      onLogout();
    }
  };

  return (
    <header className="topbar">
      <img src={logo} alt="logo" className="logo-img" />

      {showProfile && (
        <div className="profile-wrapper" ref={profileRef}>
          <button
            className="profile-btn"
            onClick={() => setOpenProfile(!openProfile)}
            aria-label="Profile menu"
          >
            {profileImage ? (
              <img src={profileImage} alt="profile" className="profile-img" />
            ) : (
              <CgProfile size={30} className="person-icon-small" />
            )}
          </button>

          {openProfile && (
            <div className="profile-dropdown">
              <div className="profile-avatar">
                {!profileImage && <CgProfile size={90} className="person-icon" />}
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
                admin1@gmail.com
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
