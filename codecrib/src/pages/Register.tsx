import React, { useState, ChangeEvent } from 'react';
import './Register.css';
import { Link, useNavigate } from 'react-router-dom';
const base = import.meta.env.VITE_API_ENDPOINT;

const Register: React.FC = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    rememberMe: false,
  });
  const [profilePic, setProfilePic] = useState<File | null>(null);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const navigate = useNavigate();

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value,
    });
  };

  const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        setError('Profile picture must be less than 5MB.');
        return;
      }
      setProfilePic(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsLoading(true);

    if (formData.name.length < 2) {
      setError('Name must be at least 2 characters long.');
      setIsLoading(false);
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      setError('Please enter a valid email address.');
      setIsLoading(false);
      return;
    }

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters long.');
      setIsLoading(false);
      return;
    }

    const data = new FormData();
    data.append('name', formData.name);
    data.append('email', formData.email);
    data.append('password', formData.password);
    data.append('rememberMe', String(formData.rememberMe));
    if (profilePic) data.append('profilePic', profilePic);

    try {
      const response = await fetch(`${base}/api/register`, {
        method: 'POST',
        body: data,
      });

      const result = await response.json();
      setIsLoading(false);

      if (response.ok) {
        localStorage.setItem('token', result.token);
        setSuccess('Registration successful! You will be redirected to your dashboard shortly.');
        setTimeout(() => navigate('/main'), 2000);
      } else {
        if (result.message === 'Email already registered') {
          setError('This email is already registered. Please use a different email or log in.');
        } else {
          setError(result.message || 'An error occurred during registration. Please try again.');
        }
      }
    } catch (err) {
      setIsLoading(false);
      setError('Failed to connect to the server. Please check your internet connection and try again.');
    }
  };

  return (
    <div className="container">
      <div className="header">
        <div className="logo">Code Crib</div>
        <div className="nav-buttons">
          <Link to="/login">
            <button className="btn-login">Login</button>
          </Link>
          <Link to="/">
            <button className="btn-home">Home</button>
          </Link>
        </div>
      </div>

      <div className="register-container">
        <h1>Register</h1>

        {error && <p className="error-message">{error}</p>}
        {success && <p className="success-message">{success}</p>}

        {isLoading && (
          <div className="loading-bar">
            <div className="loading-progress"></div>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label htmlFor="name">Name</label>
            <input
              type="text"
              id="name"
              name="name"
              placeholder="Enter your name"
              value={formData.name}
              onChange={handleChange}
              required
              disabled={isLoading}
            />
          </div>

          <div className="input-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              name="email"
              placeholder="example@gmail.com"
              value={formData.email}
              onChange={handleChange}
              required
              disabled={isLoading}
            />
          </div>

          <div className="input-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              name="password"
              placeholder="Create a password"
              value={formData.password}
              onChange={handleChange}
              required
              disabled={isLoading}
            />
          </div>

          <div className="profile-upload">
            <div className="profile-circle">
              {profilePic && <img src={URL.createObjectURL(profilePic)} alt="Profile Preview" />}
            </div>
            <div className="upload-btn-wrapper">
              <button type="button" className="btn-upload" disabled={isLoading}>
                Upload
              </button>
              <input
                type="file"
                name="profilePic"
                accept="image/*"
                onChange={handleFileUpload}
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="remember-me">
            <label>
              <input
                type="checkbox"
                id="rememberMe"
                name="rememberMe"
                checked={formData.rememberMe}
                onChange={handleChange}
                disabled={isLoading}
              />
              <span className="checkmark"></span>
              Remember me
            </label>
          </div>

          <button type="submit" className="btn-register" disabled={isLoading}>
            {isLoading ? 'Registering...' : 'Register'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Register;