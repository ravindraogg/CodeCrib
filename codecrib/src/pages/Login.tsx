import React, { useState, ChangeEvent } from 'react';
import './Login.css';
import { Link, useNavigate } from 'react-router-dom';
const base = import.meta.env.VITE_API_ENDPOINT;

const Login: React.FC = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    rememberMe: false,
  });
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsLoading(true);

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

    try {
      const response = await fetch(`${base}/api/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();
      setIsLoading(false);

      if (response.ok) {
        localStorage.setItem('token', result.token);
        setSuccess('Login successful! You will be redirected to your dashboard shortly.');
        setTimeout(() => navigate('/main'), 2000);
      } else {
        if (result.message === 'Invalid email or password') {
          setError('The email or password you entered is incorrect. Please try again.');
        } else {
          setError(result.message || 'An error occurred during login. Please try again.');
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
          <Link to="/register">
            <button className="btn-login">Register</button>
          </Link>
          <Link to="/">
            <button className="btn-home">Home</button>
          </Link>
        </div>
      </div>

      <div className="login-container">
        <h1>Login</h1>

        {error && <p className="error-message">{error}</p>}
        {success && <p className="success-message">{success}</p>}

        {isLoading && (
          <div className="loading-bar">
            <div className="loading-progress"></div>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              name="email"
              placeholder="Enter your email"
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
              placeholder="Enter your password"
              value={formData.password}
              onChange={handleChange}
              required
              disabled={isLoading}
            />
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

          <div className="forgot-password">
            <Link to="/forgot-password" className="forgot-password-link">
              Forgot Password?
            </Link>
          </div>

          <button type="submit" className="btn-login-submit" disabled={isLoading}>
            {isLoading ? 'Logging in...' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;