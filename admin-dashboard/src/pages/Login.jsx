import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../config';

export default function Login({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  
  // 2FA state flow
  const [requiresOtp, setRequiresOtp] = useState(false);
  const [tempToken, setTempToken] = useState('');
  const [maskedTelegram, setMaskedTelegram] = useState('');
  
  // Lockout & Resend throttling
  const [lockoutTime, setLockoutTime] = useState(0);
  const [resendTimer, setResendTimer] = useState(0);
  const [attemptsLeft, setAttemptsLeft] = useState(5);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Generate a random device identifier for dashboard security
  const getDeviceId = () => {
    let devId = localStorage.getItem('admin_device_id');
    if (!devId) {
      devId = 'web-admin-' + Math.random().toString(36).substring(2, 15);
      localStorage.setItem('admin_device_id', devId);
    }
    return devId;
  };

  // Lockout countdown timer
  useEffect(() => {
    if (lockoutTime <= 0) return;
    const timer = setInterval(() => {
      setLockoutTime((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [lockoutTime]);

  // Resend OTP countdown timer
  useEffect(() => {
    if (resendTimer <= 0) return;
    const timer = setInterval(() => {
      setResendTimer((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [resendTimer]);

  const handleCredentialsSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('Please fill in all fields.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await axios.post(`${API_BASE_URL}/auth/login/admin`, {
        username: username.trim(),
        password: password.trim(),
        deviceId: getDeviceId(),
        deviceName: 'Web Browser (' + navigator.userAgent.split(' ')[0] + ')'
      });

      const { requires_otp, temp_token, telegram_chat_id } = response.data;

      if (requires_otp) {
        setRequiresOtp(true);
        setTempToken(temp_token);
        setMaskedTelegram(telegram_chat_id || 'Registered Chat');
        setResendTimer(60); // 60 seconds throttle
        setAttemptsLeft(5);
      }
    } catch (err) {
      console.error(err);
      const msg = err.response?.data?.message || 'Login failed. Connect error.';
      
      if (msg.includes('temporarily locked')) {
        // Parse minutes from error if possible, default to 30 mins
        setLockoutTime(1800);
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleOtpSubmit = async (e) => {
    e.preventDefault();
    if (!otp.trim() || otp.length !== 6) {
      setError('Please enter a valid 6-digit OTP.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await axios.post(`${API_BASE_URL}/auth/verify-otp`, {
        tempToken: tempToken,
        otp: otp.trim(),
        deviceId: getDeviceId(),
        deviceName: 'Web Browser (' + navigator.userAgent.split(' ')[0] + ')'
      });

      const { access_token, user } = response.data;
      
      // Save tokens
      localStorage.setItem('token', access_token);
      localStorage.setItem('user', JSON.stringify(user));
      
      // Notify parent app
      onLogin(user);
    } catch (err) {
      console.error(err);
      const msg = err.response?.data?.message || 'Verification failed.';
      setError(msg);
      
      if (msg.includes('locked')) {
        setLockoutTime(1800); // 30 minutes lockout
        setRequiresOtp(false);
      } else {
        setAttemptsLeft((prev) => Math.max(0, prev - 1));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendTimer > 0) return;
    
    // Simulate login flow again to trigger a new OTP code
    setLoading(true);
    setError('');
    
    try {
      const response = await axios.post(`${API_BASE_URL}/auth/login/admin`, {
        username: username.trim(),
        password: password.trim(),
        deviceId: getDeviceId()
      });

      const { temp_token } = response.data;
      setTempToken(temp_token);
      setResendTimer(60);
      setOtp('');
      setError('A new OTP has been sent to your Telegram bot.');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to resend OTP.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <div className="login-logo">H</div>
          <h2 className="login-title">My Shiva Honda</h2>
          <p className="login-subtitle">Dealer Daily Reporting System</p>
        </div>

        {error && (
          <div style={{
            backgroundColor: '#fdf3f2',
            color: '#d32f2f',
            padding: '12px',
            borderRadius: '8px',
            fontSize: '0.85rem',
            marginBottom: '20px',
            border: '1px solid #f8d7da',
            textAlign: 'center'
          }}>
            {error}
          </div>
        )}

        {lockoutTime > 0 ? (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <span style={{ fontSize: '2.5rem' }}>🔒</span>
            <h3 style={{ marginTop: '12px', fontSize: '1.1rem' }}>Account Locked</h3>
            <p style={{ fontSize: '0.85rem', color: '#666', marginTop: '6px', lineHeight: '20px' }}>
              Your account is locked for 30 minutes due to excessive failed attempts.
            </p>
            <div style={{ 
              marginTop: '16px', 
              fontSize: '1.3rem', 
              fontWeight: '700', 
              color: 'var(--primary-color)' 
            }}>
              {Math.floor(lockoutTime / 60)}:{(lockoutTime % 60).toString().padStart(2, '0')}
            </div>
          </div>
        ) : !requiresOtp ? (
          // Credentials View
          <form onSubmit={handleCredentialsSubmit}>
            <div className="input-group">
              <label>Admin ID / Username</label>
              <input
                type="text"
                className="input-field"
                placeholder="Enter Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={loading}
              />
            </div>
            
            <div className="input-group" style={{ marginBottom: '24px' }}>
              <label>Password</label>
              <input
                type="password"
                className="input-field"
                placeholder="Enter Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
              />
            </div>

            <button type="submit" className="btn" style={{ width: '100%' }} disabled={loading}>
              {loading ? 'Authenticating...' : 'Sign In →'}
            </button>
          </form>
        ) : (
          // 2FA OTP View
          <form onSubmit={handleOtpSubmit}>
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <span style={{ fontSize: '2.5rem' }}>💬</span>
              <h3 style={{ fontSize: '1.1rem', marginTop: '8px' }}>Enter 2FA Code</h3>
              <p style={{ fontSize: '0.85rem', color: '#666', marginTop: '4px', padding: '0 10px', lineHeight: '18px' }}>
                We sent a 6-digit OTP code to your registered Telegram account (<b>{maskedTelegram}</b>).
              </p>
            </div>

            <div className="input-group" style={{ marginBottom: '20px' }}>
              <input
                type="text"
                className="input-field"
                placeholder="Enter 6-digit OTP"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                disabled={loading}
                style={{ textAlign: 'center', letterSpacing: '8px', fontSize: '1.4rem', fontWeight: 'bold' }}
              />
            </div>

            <button type="submit" className="btn" style={{ width: '100%' }} disabled={loading}>
              {loading ? 'Verifying...' : 'Verify Code & Log In'}
            </button>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '24px', fontSize: '0.85rem' }}>
              <span style={{ color: '#888' }}>
                Attempts left: <b>{attemptsLeft}</b>
              </span>
              <button
                type="button"
                onClick={handleResendOtp}
                disabled={resendTimer > 0 || loading}
                style={{
                  background: 'none',
                  border: 'none',
                  color: resendTimer > 0 ? '#aaa' : 'var(--primary-color)',
                  fontWeight: '600',
                  cursor: resendTimer > 0 ? 'not-allowed' : 'pointer'
                }}
              >
                {resendTimer > 0 ? `Resend in ${resendTimer}s` : 'Resend OTP'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
