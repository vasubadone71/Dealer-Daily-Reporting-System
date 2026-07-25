import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../config';
import { Settings as SettingsIcon, Shield, Globe, Lock, Plus, Trash2, Edit2, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Settings() {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Settings states
  const [companyName, setCompanyName] = useState('My Shiva Honda');
  const [telegramBotToken, setTelegramBotToken] = useState('');
  const [reminder1, setReminder1] = useState('18:30');
  const [reminder2, setReminder2] = useState('19:30');
  const [reminder3, setReminder3] = useState('20:30');
  const [reminder4, setReminder4] = useState('21:30');
  
  // Dynamic layout settings
  const [hondaLogo, setHondaLogo] = useState('');
  const [pdfHeader, setPdfHeader] = useState('');
  const [pdfFooter, setPdfFooter] = useState('');

  // Admin users list
  const [admins, setAdmins] = useState([]);
  const [networks, setNetworks] = useState([]);

  // Change password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');

  // Modals state
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState(null);
  const [adminUsername, setAdminUsername] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminTelegram, setAdminTelegram] = useState('');
  const [adminRole, setAdminRole] = useState('network_manager');
  const [adminStatus, setAdminStatus] = useState('active');

  // Networks State
  const [newNetworkName, setNewNetworkName] = useState('');

  useEffect(() => {
    try {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        setCurrentUser(JSON.parse(userStr));
      }
    } catch (e) {
      console.error(e);
    }
    fetchSettingsAndAdmins();
  }, []);

  const fetchSettingsAndAdmins = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      const [settingsRes, adminsRes, networksRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/settings`, { headers }),
        axios.get(`${API_BASE_URL}/settings/admins`, { headers }),
        axios.get(`${API_BASE_URL}/networks`, { headers })
      ]);

      if (settingsRes.data.success) {
        const s = settingsRes.data.data;
        setCompanyName(s.company_name);
        setTelegramBotToken(s.telegram_bot_token || '');
        setReminder1(s.notification_reminder_1);
        setReminder2(s.notification_reminder_2);
        setReminder3(s.notification_reminder_3);
        setReminder4(s.notification_reminder_4);
        setHondaLogo(s.honda_logo || '');
        setPdfHeader(s.pdf_header || '');
        setPdfFooter(s.pdf_footer || '');
      }

      if (adminsRes.data.success) setAdmins(adminsRes.data.data);
      if (networksRes.data.success) setNetworks(networksRes.data.data);

    } catch (err) {
      console.error(err);
      toast.error('Failed to load system configuration.');
    } finally {
      setLoading(false);
    }
  };

  const isSuperAdmin = currentUser?.role === 'super_admin';

  // ----------------------------------------------------
  // SETTINGS SAVE
  // ----------------------------------------------------
  const handleSaveSettings = async (e) => {
    e.preventDefault();
    if (!isSuperAdmin) return;

    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      const res = await axios.put(`${API_BASE_URL}/settings`, {
        companyName,
        telegramBotToken,
        reminder1,
        reminder2,
        reminder3,
        reminder4,
        hondaLogo,
        pdfHeader,
        pdfFooter
      }, { headers });

      if (res.data.success) {
        toast.success('System settings saved successfully.');
        fetchSettingsAndAdmins();
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to save settings.');
    }
  };

  // ----------------------------------------------------
  // ADMIN SAVE (CRUD)
  // ----------------------------------------------------
  const handleOpenAddAdmin = () => {
    setSelectedAdmin(null);
    setAdminUsername('');
    setAdminPassword('');
    setAdminTelegram('');
    setAdminRole('network_manager');
    setAdminStatus('active');
    setIsAdminModalOpen(true);
  };

  const handleOpenEditAdmin = (admin) => {
    setSelectedAdmin(admin);
    setAdminUsername(admin.username);
    setAdminPassword('');
    setAdminTelegram(admin.telegram_chat_id || '');
    setAdminRole(admin.role);
    setAdminStatus(admin.status);
    setIsAdminModalOpen(true);
  };

  const handleAdminFormSubmit = async (e) => {
    e.preventDefault();
    if (!adminUsername.trim() || !adminRole) {
      toast.error('Username and Role are required.');
      return;
    }

    const payload = {
      username: adminUsername.trim(),
      telegramChatId: adminTelegram.trim(),
      role: adminRole,
      status: adminStatus
    };

    if (!selectedAdmin && !adminPassword) {
      toast.error('Password is required for new accounts.');
      return;
    }

    if (adminPassword) payload.password = adminPassword;

    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      if (selectedAdmin) {
        const res = await axios.put(`${API_BASE_URL}/settings/admins/${selectedAdmin.id}`, payload, { headers });
        if (res.data.success) toast.success('Admin updated.');
      } else {
        const res = await axios.post(`${API_BASE_URL}/settings/admins`, payload, { headers });
        if (res.data.success) toast.success('Admin created successfully.');
      }
      setIsAdminModalOpen(false);
      fetchSettingsAndAdmins();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Error processing admin.');
    }
  };

  const handleDeleteAdmin = async (id, name) => {
    if (!isSuperAdmin) return;
    if (!window.confirm(`Delete administrator account: ${name}?`)) return;

    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      const res = await axios.delete(`${API_BASE_URL}/settings/admins/${id}`, { headers });
      if (res.data.success) {
        toast.success('Admin deleted.');
        fetchSettingsAndAdmins();
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to delete admin.');
    }
  };

  // ----------------------------------------------------
  // PASSWORD CHANGE
  // ----------------------------------------------------
  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (!currentPassword.trim() || !newPassword.trim()) {
      toast.error('Please enter both passwords.');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      const res = await axios.post(`${API_BASE_URL}/settings/change-password`, {
        currentPassword,
        newPassword
      }, { headers });

      if (res.data.success) {
        toast.success('Your password has been changed successfully.');
        setCurrentPassword('');
        setNewPassword('');
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Current password incorrect.');
    }
  };

  // ----------------------------------------------------
  // NETWORK ADD/DELETE
  // ----------------------------------------------------
  const handleAddNetwork = async (e) => {
    e.preventDefault();
    if (!newNetworkName.trim() || !isSuperAdmin) return;

    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      const res = await axios.post(`${API_BASE_URL}/networks`, { name: newNetworkName.trim() }, { headers });
      if (res.data.success) {
        toast.success(`Network "${newNetworkName}" created.`);
        setNewNetworkName('');
        fetchSettingsAndAdmins();
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to create network.');
    }
  };

  const handleDeleteNetwork = async (id, name) => {
    if (!isSuperAdmin) return;
    if (!window.confirm(`Delete network: "${name}"?`)) return;

    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      const res = await axios.delete(`${API_BASE_URL}/networks/${id}`, { headers });
      if (res.data.success) {
        toast.success('Network removed successfully.');
        fetchSettingsAndAdmins();
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to remove network. Verify that no active dealers are assigned.');
    }
  };

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center' }}>Loading system settings...</div>;
  }

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h1>System Settings</h1>
        <p className="subtitle">Configure corporate metadata, scheduler configurations, and admin access levels</p>
      </div>

      {!isSuperAdmin && (
        <div style={{
          backgroundColor: '#fff9e6',
          borderLeft: '4px solid #f39c12',
          padding: '16px 20px',
          borderRadius: '12px',
          marginBottom: '24px',
          display: 'flex',
          gap: '12px',
          alignItems: 'center'
        }}>
          <AlertTriangle color="#f39c12" size={24} />
          <div>
            <h4 style={{ color: '#d48806', fontSize: '0.95rem', fontWeight: '700' }}>Read-Only Settings Mode</h4>
            <p style={{ color: '#d48806', fontSize: '0.85rem', marginTop: '2px' }}>
              Your Network Manager profile only has access to review settings, network groups, and admin users. Password updates for yourself are allowed.
            </p>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '24px', marginBottom: '28px' }}>
        
        {/* General System Configurations */}
        <div className="card">
          <h3 className="card-title">
            <span>⚙️ General Settings</span>
            <SettingsIcon size={20} color="var(--primary-color)" />
          </h3>

          <form onSubmit={handleSaveSettings}>
            <div className="input-group">
              <label>Company Branding Title</label>
              <input
                type="text"
                className="input-field"
                value={companyName}
                onChange={e => setCompanyName(e.target.value)}
                disabled={!isSuperAdmin}
                required
              />
            </div>

            <div className="input-group">
              <label>Honda Logo URL (PNG/JPEG for PDF branding)</label>
              <input
                type="text"
                className="input-field"
                value={hondaLogo}
                onChange={e => setHondaLogo(e.target.value)}
                disabled={!isSuperAdmin}
                placeholder="Logo URL e.g. https://domain.com/logo.png"
              />
            </div>

            <div className="input-group">
              <label>PDF Report Header Line Text</label>
              <input
                type="text"
                className="input-field"
                value={pdfHeader}
                onChange={e => setPdfHeader(e.target.value)}
                disabled={!isSuperAdmin}
                placeholder="Header title in exported PDFs"
              />
            </div>

            <div className="input-group">
              <label>PDF Report Footer Line Text</label>
              <input
                type="text"
                className="input-field"
                value={pdfFooter}
                onChange={e => setPdfFooter(e.target.value)}
                disabled={!isSuperAdmin}
                placeholder="Footer details in exported PDFs"
              />
            </div>

            <div className="input-group">
              <label>Telegram Bot Token (for OTP 2FA Alerts)</label>
              <input
                type="password"
                className="input-field"
                value={telegramBotToken}
                onChange={e => setTelegramBotToken(e.target.value)}
                disabled={!isSuperAdmin}
                placeholder="Paste Telegram Bot Token"
              />
            </div>

            <h4 style={{ fontSize: '0.85rem', color: '#666', marginTop: '16px', marginBottom: '8px', textTransform: 'uppercase', fontWeight: 'bold' }}>
              Push Notification Timings (IST)
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="input-group">
                <label>Reminder 1</label>
                <input type="text" className="input-field" value={reminder1} onChange={e => setReminder1(e.target.value)} disabled={!isSuperAdmin} placeholder="e.g. 18:30" />
              </div>
              <div className="input-group">
                <label>Reminder 2</label>
                <input type="text" className="input-field" value={reminder2} onChange={e => setReminder2(e.target.value)} disabled={!isSuperAdmin} placeholder="e.g. 19:30" />
              </div>
              <div className="input-group">
                <label>Reminder 3</label>
                <input type="text" className="input-field" value={reminder3} onChange={e => setReminder3(e.target.value)} disabled={!isSuperAdmin} placeholder="e.g. 20:30" />
              </div>
              <div className="input-group">
                <label>Final Lockout</label>
                <input type="text" className="input-field" value={reminder4} onChange={e => setReminder4(e.target.value)} disabled={!isSuperAdmin} placeholder="e.g. 21:30" />
              </div>
            </div>

            {isSuperAdmin && (
              <button type="submit" className="btn" style={{ width: '100%', marginTop: '16px' }}>
                Save Settings & PDF branding
              </button>
            )}
          </form>
        </div>

        {/* Change Own Password Card */}
        <div className="card" style={{ height: 'fit-content' }}>
          <h3 className="card-title">
            <span>🔒 Change Account Password</span>
            <Lock size={20} color="var(--primary-color)" />
          </h3>

          <form onSubmit={handlePasswordSubmit}>
            <div className="input-group">
              <label>Current Password</label>
              <input
                type="password"
                className="input-field"
                value={currentPassword}
                onChange={e => setCurrentPassword(e.target.value)}
                required
              />
            </div>

            <div className="input-group" style={{ marginBottom: '24px' }}>
              <label>New Strong Password</label>
              <input
                type="password"
                className="input-field"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                required
              />
            </div>

            <button type="submit" className="btn" style={{ width: '100%' }}>
              Update Password
            </button>
          </form>
        </div>

      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '24px' }}>
        
        {/* Admin Accounts List Card */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 className="card-title" style={{ marginBottom: 0 }}>
              <span>👥 Admin Accounts</span>
              <Shield size={20} color="var(--primary-color)" />
            </h3>
            {isSuperAdmin && (
              <button className="btn" onClick={handleOpenAddAdmin} style={{ padding: '8px 12px', fontSize: '0.85rem' }}>
                <Plus size={14} /> Add Admin
              </button>
            )}
          </div>

          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Username</th>
                  <th>Role</th>
                  <th>Telegram Chat ID</th>
                  <th>Status</th>
                  {isSuperAdmin && <th style={{ textAlign: 'right' }}>Action</th>}
                </tr>
              </thead>
              <tbody>
                {admins.map(admin => (
                  <tr key={admin.id}>
                    <td style={{ fontWeight: '700' }}>{admin.username}</td>
                    <td>{admin.role === 'super_admin' ? 'Super Admin' : 'Network Manager'}</td>
                    <td>{admin.telegram_chat_id || 'Not Registered'}</td>
                    <td>
                      <span className={`status-badge ${admin.status === 'active' ? 'submitted' : 'late'}`}>
                        {admin.status}
                      </span>
                    </td>
                    {isSuperAdmin && (
                      <td style={{ textAlign: 'right' }}>
                        {admin.role !== 'super_admin' && (
                          <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                            <button className="btn btn-secondary" onClick={() => handleOpenEditAdmin(admin)} style={{ padding: '4px 8px', borderRadius: '4px' }}>
                              <Edit2 size={12} />
                            </button>
                            <button className="btn btn-secondary" onClick={() => handleDeleteAdmin(admin.id, admin.username)} style={{ padding: '4px 8px', borderRadius: '4px', color: '#e74c3c' }}>
                              <Trash2 size={12} />
                            </button>
                          </div>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>



      </div>

      {/* Admin Add/Edit Modal */}
      {isAdminModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>{selectedAdmin ? '✏️ Modify Admin Account' : '👥 Add Admin Account'}</h3>
              <button className="modal-close" onClick={() => setIsAdminModalOpen(false)}>×</button>
            </div>

            <form onSubmit={handleAdminFormSubmit}>
              <div className="input-group">
                <label>Admin Username *</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="Enter username identifier"
                  value={adminUsername}
                  onChange={e => setAdminUsername(e.target.value)}
                  disabled={selectedAdmin !== null}
                  required
                />
              </div>

              <div className="input-group">
                <label>Password {selectedAdmin ? '(Leave blank to keep current)' : '*'}</label>
                <input
                  type="password"
                  className="input-field"
                  placeholder="Password"
                  value={adminPassword}
                  onChange={e => setAdminPassword(e.target.value)}
                  required={!selectedAdmin}
                />
              </div>

              <div className="input-group">
                <label>Telegram Chat ID (Mandatory for 2FAOTP)</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="e.g. 548392019"
                  value={adminTelegram}
                  onChange={e => setAdminTelegram(e.target.value)}
                />
              </div>

              <div className="input-group">
                <label>Admin Access Level *</label>
                <select
                  className="input-field"
                  value={adminRole}
                  onChange={e => setAdminRole(e.target.value)}
                  style={{ height: '48px' }}
                  required
                >
                  <option value="network_manager">Network Manager (Read Only + Reports + Push Messages)</option>
                  <option value="super_admin">Super Admin (All Privileges)</option>
                </select>
              </div>

              {selectedAdmin && (
                <div className="input-group">
                  <label>Status</label>
                  <select
                    className="input-field"
                    value={adminStatus}
                    onChange={e => setAdminStatus(e.target.value)}
                    style={{ height: '48px' }}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              )}

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsAdminModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn">Save Administrator</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
