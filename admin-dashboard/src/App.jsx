import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Toaster } from 'react-hot-toast';
import './index.css';
import { API_BASE_URL } from './config';

// Import Pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Dealers from './pages/Dealers';
import Reports from './pages/Reports';
import Dispatches from './pages/Dispatches';
import StockAdjustments from './pages/StockAdjustments';
import Notifications from './pages/Notifications';
import ActivityLogs from './pages/ActivityLogs';
import Settings from './pages/Settings';
import Targets from './pages/Targets';
import DealerStock from './pages/DealerStock';
import ErrorBoundary from './components/ErrorBoundary';

import MasterColors from './pages/MasterColors';

export default function App() {
  const [user, setUser] = useState(null);
  const [activeMenu, setActiveMenu] = useState('Dashboard');
  const [isReady, setIsReady] = useState(false);

  const handleLogin = (userData) => {
    setUser(userData);
    const token = localStorage.getItem('token');
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  };

  const handleLogout = async (message = '') => {
    try {
      const token = localStorage.getItem('token');
      if (token) {
        axios.post(`${API_BASE_URL}/settings/logs/log-action`, {
          action: 'Logout',
          details: 'User signed out of reporting dashboard'
        }, { headers: { Authorization: `Bearer ${token}` } });
      }
    } catch (e) {
      console.error(e);
    }
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    delete axios.defaults.headers.common['Authorization'];
    setUser(null);
    if (message && typeof message === 'string') {
      alert(message);
    }
  };

  // Global response interceptor to handle 401 Unauthorized errors automatically
  useEffect(() => {
    const interceptor = axios.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response && error.response.status === 401) {
          console.warn('Unauthorized token or session expired. Logging out...');
          handleLogout('Your session has expired or is invalid. Please sign in again.');
        }
        return Promise.reject(error);
      }
    );
    return () => {
      axios.interceptors.response.eject(interceptor);
    };
  }, []);

  // Inactivity timeout tracker (15 minutes)
  useEffect(() => {
    if (!user) return;

    let inactivityTimer;
    
    const resetTimer = () => {
      clearTimeout(inactivityTimer);
      inactivityTimer = setTimeout(() => {
        handleLogout('Session expired due to 15 minutes of inactivity.');
      }, 15 * 60 * 1000); // 15 minutes in ms
    };

    // Listen to user interactions
    const events = ['mousedown', 'keydown', 'touchstart', 'mousemove', 'click'];
    events.forEach(event => window.addEventListener(event, resetTimer));

    resetTimer(); // Init timer

    return () => {
      clearTimeout(inactivityTimer);
      events.forEach(event => window.removeEventListener(event, resetTimer));
    };
  }, [user]);

  // Set default auth token and configure global responses
  useEffect(() => {
    try {
      const savedUser = localStorage.getItem('user');
      const token = localStorage.getItem('token');
      if (savedUser && token) {
        setUser(JSON.parse(savedUser));
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      }
    } catch (e) {
      console.error('Failed to restore session', e);
      localStorage.removeItem('user');
      localStorage.removeItem('token');
    }
    setIsReady(true);
  }, []);

  if (!isReady) return null;

  if (!user) {
    return (
      <>
        <Toaster position="top-right" />
        <Login onLogin={handleLogin} />
      </>
    );
  }

  // Sidebar Menu Items based on role privileges
  const menuItems = [
    { name: 'Dashboard', icon: '📊' },
    { name: 'Dealers', icon: '👥' },
    { name: 'Dealer Stock', icon: '📦' },
    { name: 'Reports & Analytics', icon: '📈' },
    { name: 'Notifications', icon: '🔔' }
  ];

  // Only Super Admin can see Activity Logs, Dispatches, and Stock Adjustments
  if (user.role === 'super_admin') {
    menuItems.push({ name: 'Dispatches', icon: '🚚' });
    menuItems.push({ name: 'Stock Adjustments', icon: '🔧' });
    menuItems.push({ name: 'Master Colors', icon: '🎨' });
    menuItems.push({ name: 'Targets', icon: '🎯' });
    menuItems.push({ name: 'Activity Logs', icon: '🛡️' });
  }

  menuItems.push({ name: 'Settings', icon: '⚙️' });

  const renderContent = () => {
    switch (activeMenu) {
      case 'Dashboard': return <Dashboard />;
      case 'Dealers': return <Dealers />;
      case 'Dealer Stock': return <DealerStock />;
      case 'Reports & Analytics': return <Reports />;
      case 'Dispatches': return <Dispatches />;
      case 'Stock Adjustments': return <StockAdjustments />;
      case 'Master Colors': return <MasterColors />;
      case 'Targets': return <Targets />;
      case 'Notifications': return <Notifications />;
      case 'Activity Logs': return <ActivityLogs />;
      case 'Settings': return <Settings />;
      default: return <Dashboard />;
    }
  };

  return (
    <div className="app-container">
      <Toaster position="top-right" />
      
      {/* Sidebar Navigation */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="logo-icon">H</div>
          <h2>Shiva Honda</h2>
        </div>
        
        <div className="sidebar-nav">
          {menuItems.map((item) => (
            <div 
              key={item.name}
              className={`nav-item ${activeMenu === item.name ? 'active' : ''}`}
              onClick={() => setActiveMenu(item.name)}
            >
              <span className="nav-icon">{item.icon}</span>
              <span>{item.name}</span>
            </div>
          ))}
        </div>
        
        {/* Logout bottom trigger */}
        <div style={{ marginTop: 'auto', padding: '16px' }}>
          <div style={{ 
            padding: '10px 14px', 
            backgroundColor: 'rgba(255,255,255,0.05)', 
            borderRadius: '8px', 
            fontSize: '0.8rem',
            marginBottom: '12px'
          }}>
            <div>Active Profile:</div>
            <div style={{ fontWeight: 'bold', color: 'var(--primary-color)' }}>
              {user.username}
            </div>
            <div style={{ fontSize: '0.7rem', color: '#aaa', textTransform: 'capitalize' }}>
              {user.role.replace('_', ' ')}
            </div>
          </div>
          
          <button 
            onClick={() => handleLogout()}
            style={{ 
              width: '100%', 
              padding: '12px', 
              background: '#CC0000', 
              color: 'white', 
              border: 'none', 
              borderRadius: '8px', 
              cursor: 'pointer',
              fontWeight: '600',
              boxShadow: '0 4px 12px rgba(204,0,0,0.2)'
            }}
          >
            Sign Out 👋
          </button>
        </div>
      </aside>

      {/* Main Panel Content */}
      <main className="main-content">
        <header className="top-header">
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: '500' }}>
            Reporting Portal / <b style={{ color: 'var(--text-color)' }}>{activeMenu}</b>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontWeight: '700', fontSize: '0.9rem' }}>{user.username}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'capitalize' }}>
                {user.role.replace('_', ' ')}
              </div>
            </div>
            <div style={{ 
              width: '40px', 
              height: '40px', 
              borderRadius: '50%', 
              backgroundColor: 'var(--primary-color)', 
              color: 'white', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              fontWeight: 'bold', 
              fontSize: '1.2rem',
              boxShadow: 'var(--shadow-red)'
            }}>
              {user.username[0].toUpperCase()}
            </div>
          </div>
        </header>

        <section className="content-area">
          <ErrorBoundary>
            {renderContent()}
          </ErrorBoundary>
        </section>
      </main>
    </div>
  );
}
