import React, { useState, ChangeEvent } from 'react';
import './ForgotPassword.css'; 
import { Link, useNavigate } from 'react-router-dom';

const ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const navigate = useNavigate();

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      const response = await fetch('http://localhost:5000/api/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const result = await response.json();
      if (response.ok) {
        setSuccess(result.message);
        setTimeout(() => navigate('/login'), 3000); // Redirect after 3s
      } else {
        setError(result.message);
      }
    } catch (err) {
      setError('Failed to connect to the server');
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

      <div className="forgot-password-container">
        <h1>Forgot Password</h1>

        {error && <p className="error-message">{error}</p>}
        {success && <p className="success-message">{success}</p>}

        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              name="email"
              placeholder="example@gmail.com"
              value={email}
              onChange={handleChange}
              required
            />
          </div>

          <button type="submit" className="btn-submit">Send Reset Link</button>
        </form>
      </div>
    </div>
  );
};

export default ForgotPassword;