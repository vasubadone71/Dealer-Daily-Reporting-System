import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../config';
import { Plus, Edit2, Trash2, Key, Users, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Dealers() {
  const [dealers, setDealers] = useState([]);
  const [networks, setNetworks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // Modals state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isResetOpen, setIsResetOpen] = useState(false);
  const [selectedDealer, setSelectedDealer] = useState(null);
  
  // Current logged in user info (for role checking)
  const [currentUser, setCurrentUser] = useState(null);

  // Form states
  const [dealerCode, setDealerCode] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [district, setDistrict] = useState('');
  const [state, setState] = useState('Madhya Pradesh'); // default
  const [dealerType, setDealerType] = useState('AD');
  const [status, setStatus] = useState('active');
  const [resetPasswordVal, setResetPasswordVal] = useState('');

  useEffect(() => {
    // Load logged in user
    try {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        setCurrentUser(JSON.parse(userStr));
      }
    } catch (e) {
      console.error(e);
    }
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      const [dealersRes, networksRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/dealers`, { headers }),
        axios.get(`${API_BASE_URL}/networks`, { headers })
      ]);

      if (dealersRes.data.success) setDealers(dealersRes.data.data);
      if (networksRes.data.success) setNetworks(networksRes.data.data);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load dealer records.');
    } finally {
      setLoading(false);
    }
  };

  const isSuperAdmin = currentUser?.role === 'super_admin';

  const resetForm = () => {
    setSelectedDealer(null);
    setDealerCode('');
    setName('');
    setPassword('');
    setDistrict('');
    setState('Madhya Pradesh');
    setDealerType('AD');
    setStatus('active');
  };

  const handleOpenAddModal = () => {
    if (!isSuperAdmin) {
      toast.error('Only Super Admins can add dealers.');
      return;
    }
    resetForm();
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (dealer) => {
    if (!isSuperAdmin) {
      toast.error('Only Super Admins can modify dealers.');
      return;
    }
    setSelectedDealer(dealer);
    setDealerCode(dealer.dealer_code);
    setName(dealer.name);
    setPassword('');
    setDistrict(dealer.district);
    setState(dealer.state);
    setDealerType(dealer.dealer_type);
    setStatus(dealer.status);
    setIsModalOpen(true);
  };

  const handleOpenResetModal = (dealer) => {
    if (!isSuperAdmin) {
      toast.error('Only Super Admins can reset passwords.');
      return;
    }
    setSelectedDealer(dealer);
    setResetPasswordVal('');
    setIsResetOpen(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!dealerCode.trim() || !name.trim() || !district.trim() || !state.trim() || !dealerType) {
      toast.error('Please fill in all required fields.');
      return;
    }

    const payload = {
      dealerCode: dealerCode.trim(),
      name: name.trim(),
      district: district.trim(),
      state: state.trim(),
      dealerType,
      status
    };

    if (!selectedDealer && !password) {
      toast.error('Password is required for new dealers.');
      return;
    }

    if (password) payload.password = password;

    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      if (selectedDealer) {
        // Edit Mode
        const res = await axios.put(`${API_BASE_URL}/dealers/${selectedDealer.id}`, payload, { headers });
        if (res.data.success) {
          toast.success('Dealer updated successfully.');
        }
      } else {
        // Create Mode
        const res = await axios.post(`${API_BASE_URL}/dealers`, payload, { headers });
        if (res.data.success) {
          toast.success('Dealer created successfully.');
        }
      }
      setIsModalOpen(false);
      fetchData();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Error processing request.');
    }
  };

  const handleDeleteDealer = async (id, code) => {
    if (!isSuperAdmin) return;
    if (!window.confirm(`Are you sure you want to permanently delete dealer: ${code}?`)) return;

    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      const res = await axios.delete(`${API_BASE_URL}/dealers/${id}`, { headers });
      if (res.data.success) {
        toast.success('Dealer record deleted.');
        fetchData();
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to delete dealer.');
    }
  };

  const handleResetPasswordSubmit = async (e) => {
    e.preventDefault();
    if (!resetPasswordVal.trim()) {
      toast.error('Password cannot be empty.');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      const res = await axios.post(
        `${API_BASE_URL}/dealers/${selectedDealer.id}/reset-password`,
        { password: resetPasswordVal.trim() },
        { headers }
      );
      if (res.data.success) {
        toast.success(`Password reset completed for ${selectedDealer.dealer_code}`);
        setIsResetOpen(false);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to reset password.');
    }
  };

  const filteredDealers = dealers.filter(d => 
    d.name.toLowerCase().includes(search.toLowerCase()) ||
    d.dealer_code.toLowerCase().includes(search.toLowerCase()) ||
    d.district.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1>Dealer Accounts</h1>
          <p className="subtitle" style={{ marginBottom: 0 }}>Create, deactivate, and manage dealer codes</p>
        </div>
        {isSuperAdmin && (
          <button className="btn" onClick={handleOpenAddModal}>
            <Plus size={18} /> Add New Dealer
          </button>
        )}
      </div>

      {/* Network Manager read-only warning */}
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
            <h4 style={{ color: '#d48806', fontSize: '0.95rem', fontWeight: '700' }}>Read-Only Mode</h4>
            <p style={{ color: '#d48806', fontSize: '0.85rem', marginTop: '2px' }}>
              Your Network Manager account only has permission to view dealer records. Modifications and password resets are disabled.
            </p>
          </div>
        </div>
      )}

      {/* Search Filter card */}
      <div className="card" style={{ padding: '16px 24px', borderRadius: '16px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <span style={{ fontSize: '0.9rem', fontWeight: '600', color: '#666' }}>🔍 Search</span>
          <input
            type="text"
            className="input-field"
            placeholder="Search by Code, Name, or District..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ flex: 1, padding: '10px 16px', borderRadius: '8px' }}
          />
        </div>
      </div>

      {/* Dealers Table Card */}
      <div className="card">
        <h3 className="card-title">
          <span>👥 Configure Dealer Accounts ({filteredDealers.length})</span>
          <Users size={20} color="var(--primary-color)" />
        </h3>
        
        {loading ? (
          <div style={{ padding: '40px 0' }}>
            <div className="skeleton" style={{ height: '40px', marginBottom: '10px' }}></div>
            <div className="skeleton" style={{ height: '40px', marginBottom: '10px' }}></div>
            <div className="skeleton" style={{ height: '40px' }}></div>
          </div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Dealer Name</th>

                  <th>District / State</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Last Logged In</th>
                  {isSuperAdmin && <th style={{ textAlign: 'right' }}>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {filteredDealers.length === 0 ? (
                  <tr>
                    <td colSpan={isSuperAdmin ? 8 : 7} style={{ textAlign: 'center', padding: '24px', color: '#999' }}>
                      No matching dealer records found.
                    </td>
                  </tr>
                ) : (
                  filteredDealers.map(d => (
                    <tr key={d.id}>
                      <td style={{ fontWeight: '700' }}>{d.dealer_code}</td>
                      <td>{d.name}</td>

                      <td>{d.district}, {d.state}</td>
                      <td style={{ fontWeight: '600' }}>{d.dealer_type}</td>
                      <td>
                        <span className={`status-badge ${d.status === 'active' ? 'submitted' : 'late'}`}>
                          {d.status === 'active' ? '● Active' : '○ Deactivated'}
                        </span>
                      </td>
                      <td style={{ color: '#666', fontSize: '0.85rem' }}>
                        {d.last_login_at
                          ? new Date(d.last_login_at).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })
                          : 'Never'}
                      </td>
                      {isSuperAdmin && (
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                            <button className="btn btn-secondary" onClick={() => handleOpenEditModal(d)} style={{ padding: '6px 10px', borderRadius: '6px' }} title="Edit Details">
                              <Edit2 size={14} />
                            </button>
                            <button className="btn btn-secondary" onClick={() => handleOpenResetModal(d)} style={{ padding: '6px 10px', borderRadius: '6px', color: '#f39c12' }} title="Reset Password">
                              <Key size={14} />
                            </button>
                            <button className="btn btn-secondary" onClick={() => handleDeleteDealer(d.id, d.dealer_code)} style={{ padding: '6px 10px', borderRadius: '6px', color: '#e74c3c' }} title="Delete Dealer">
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CRUD Add/Edit Modal */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '550px' }}>
            <div className="modal-header">
              <h3>{selectedDealer ? '✏️ Edit Dealer Details' : '➕ Create New Dealer'}</h3>
              <button className="modal-close" onClick={() => setIsModalOpen(false)}>×</button>
            </div>
            
            <form onSubmit={handleFormSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="input-group">
                  <label>Dealer Code *</label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="e.g. DL001"
                    value={dealerCode}
                    onChange={(e) => setDealerCode(e.target.value.toUpperCase())}
                    disabled={selectedDealer !== null}
                    required
                  />
                </div>

                <div className="input-group">
                  <label>Dealer Name *</label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="Dealer Showroom Name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
              </div>

              {!selectedDealer && (
                <div className="input-group">
                  <label>Password *</label>
                  <input
                    type="password"
                    className="input-field"
                    placeholder="Set Dealer Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px' }}>
                <div className="input-group">
                  <label>Dealer Type *</label>
                  <select
                    className="input-field"
                    value={dealerType}
                    onChange={(e) => setDealerType(e.target.value)}
                    required
                    style={{ height: '48px' }}
                  >
                    <option value="AD">AD (Authorised Dealer)</option>
                    <option value="FO">FO (Fleet Operator)</option>
                    <option value="EC">EC (Extension Counter)</option>
                    <option value="ASC">ASC (Authorised Service Center)</option>
                    <option value="Sub Dealer">Sub Dealer</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="input-group">
                  <label>District *</label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="e.g. Bhopal"
                    value={district}
                    onChange={(e) => setDistrict(e.target.value)}
                    required
                  />
                </div>

                <div className="input-group">
                  <label>State *</label>
                  <input
                    type="text"
                    className="input-field"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    required
                  />
                </div>
              </div>

              {selectedDealer && (
                <div className="input-group">
                  <label>Account Status</label>
                  <select
                    className="input-field"
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    style={{ height: '48px' }}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive / Deactivated</option>
                  </select>
                </div>
              )}

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn">Save Dealer</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {isResetOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>🔑 Reset Dealer Password</h3>
              <button className="modal-close" onClick={() => setIsResetOpen(false)}>×</button>
            </div>
            
            <form onSubmit={handleResetPasswordSubmit}>
              <div style={{ marginBottom: '14px', fontSize: '0.9rem' }}>
                Resetting password for dealer: <b>{selectedDealer?.dealer_code} - {selectedDealer?.name}</b>
              </div>
              
              <div className="input-group">
                <label>New Strong Password</label>
                <input
                  type="password"
                  className="input-field"
                  placeholder="Enter new password"
                  value={resetPasswordVal}
                  onChange={(e) => setResetPasswordVal(e.target.value)}
                  required
                />
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsResetOpen(false)}>Cancel</button>
                <button type="submit" className="btn">Change Password</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
