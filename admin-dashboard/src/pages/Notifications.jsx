import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../config';
import { Send, Bell, History, Repeat, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Notifications() {
  const [history, setHistory] = useState([]);
  const [dealers, setDealers] = useState([]);
  const [networks, setNetworks] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [sending, setSending] = useState(false);

  // Form States
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [type, setType] = useState('broadcast'); // broadcast, urgent, network, dealer
  const [targetId, setTargetId] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      // Load histories, active dealers, and networks
      const [historyRes, dealersRes, networksRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/notifications`, { headers }),
        axios.get(`${API_BASE_URL}/dealers`, { headers }),
        axios.get(`${API_BASE_URL}/networks`, { headers })
      ]);

      if (historyRes.data.success) setHistory(historyRes.data.data);
      if (dealersRes.data.success) {
        const activeDealers = dealersRes.data.data.filter(d => d.status === 'active');
        setDealers(activeDealers);
      }
      if (networksRes.data.success) setNetworks(networksRes.data.data);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load notifications page data.');
    } finally {
      setLoadingHistory(false);
    }
  };

  // When type changes, set default target ID
  useEffect(() => {
    if (type === 'dealer' && dealers.length > 0) {
      setTargetId(dealers[0].id);
    } else if (type === 'network' && networks.length > 0) {
      setTargetId(networks[0].id);
    } else {
      setTargetId('');
    }
  }, [type, dealers, networks]);

  const handleSendNotification = async (e) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) {
      toast.error('Please enter Title and Message.');
      return;
    }

    setSending(true);
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      const payload = {
        title: title.trim(),
        message: message.trim(),
        type,
        targetId: (type === 'dealer' || type === 'network') ? parseInt(targetId) : null
      };

      const res = await axios.post(`${API_BASE_URL}/notifications`, payload, { headers });
      if (res.data.success) {
        toast.success(`Push notification sent to ${res.data.recipients_count} active devices.`);
        setTitle('');
        setMessage('');
        fetchData(); // reload history
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to send notification.');
    } finally {
      setSending(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this notification? It will also be removed from all dealers mobile apps.')) return;
    try {
      const token = localStorage.getItem('token');
      const res = await axios.delete(`${API_BASE_URL}/notifications/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.data.success) {
        toast.success('Notification deleted successfully.');
        fetchData();
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to delete notification.');
    }
  };

  const handleResend = async (id) => {
    if (!window.confirm('Resend this notification to dealers mobile devices now?')) return;
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(`${API_BASE_URL}/notifications/${id}/resend`, {}, { headers: { Authorization: `Bearer ${token}` } });
      if (res.data.success) {
        toast.success(`Reminder sent to ${res.data.recipients_count} active devices.`);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to resend reminder.');
    }
  };

  const user = JSON.parse(localStorage.getItem('user') || '{}');

  return (
    <div>
      <h1>Notification Centre</h1>
      <p className="subtitle">Dispatch push notifications and alerts directly to dealers' mobile devices</p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '24px' }}>
        
        {/* Dispatcher Form Card */}
        <div className="card" style={{ height: 'fit-content' }}>
          <h3 className="card-title">
            <span>📢 Dispatch Push Alert</span>
            <Bell size={20} color="var(--primary-color)" />
          </h3>

          <form onSubmit={handleSendNotification}>
            <div className="input-group">
              <label>Target Audience Type</label>
              <select 
                className="input-field" 
                value={type} 
                onChange={e => setType(e.target.value)}
                style={{ height: '48px' }}
              >
                <option value="broadcast">📢 General Broadcast (All Active Dealers)</option>
                <option value="urgent">🚨 Urgent System Alert (All Active Dealers)</option>
                <option value="network">🌐 Network Specific Group</option>
                <option value="dealer">👤 Single Dealer Specific</option>
              </select>
            </div>

            {/* Network target selector */}
            {type === 'network' && (
              <div className="input-group">
                <label>Select Target Network Group</label>
                <select 
                  className="input-field" 
                  value={targetId} 
                  onChange={e => setTargetId(e.target.value)}
                  style={{ height: '48px' }}
                >
                  {networks.map(n => (
                    <option key={n.id} value={n.id}>{n.name}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Dealer target selector */}
            {type === 'dealer' && (
              <div className="input-group">
                <label>Select Target Dealer Showroom</label>
                <select 
                  className="input-field" 
                  value={targetId} 
                  onChange={e => setTargetId(e.target.value)}
                  style={{ height: '48px' }}
                >
                  {dealers.map(d => (
                    <option key={d.id} value={d.id}>{d.dealer_code} - {d.name}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="input-group">
              <label>Alert Title</label>
              <input 
                type="text" 
                className="input-field" 
                placeholder="Enter Short Notification Title"
                value={title}
                onChange={e => setTitle(e.target.value)}
                required
              />
            </div>

            <div className="input-group" style={{ marginBottom: '24px' }}>
              <label>Message Body</label>
              <textarea 
                className="input-field" 
                rows={4}
                placeholder="Enter alert message details here..."
                value={message}
                onChange={e => setMessage(e.target.value)}
                required
                style={{ resize: 'none', fontFamily: 'inherit' }}
              />
            </div>

            <button type="submit" className="btn" style={{ width: '100%' }} disabled={sending}>
              {sending ? 'Dispatching push...' : <><Send size={18} /> Send Push Notification</>}
            </button>
          </form>
        </div>

        {/* History Card */}
        <div className="card">
          <h3 className="card-title">
            <span>🕰️ Push Logs & History</span>
            <History size={20} color="var(--primary-color)" />
          </h3>

          {loadingHistory ? (
            <div>
              <div className="skeleton" style={{ height: '50px', marginBottom: '10px' }}></div>
              <div className="skeleton" style={{ height: '50px', marginBottom: '10px' }}></div>
              <div className="skeleton" style={{ height: '50px' }}></div>
            </div>
          ) : (
            <div style={{ maxHeight: '420px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {history.length === 0 ? (
                <div style={{ color: '#aaa', textAlign: 'center', padding: '40px 0' }}>No notification logs found.</div>
              ) : (
                history.map(item => (
                  <div key={item.id} style={{ border: '1px solid #f0f0f0', borderRadius: '12px', padding: '14px', position: 'relative' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <span className={`status-badge ${item.type === 'urgent' ? 'late' : item.type === 'broadcast' ? 'submitted' : 'pending'}`}>
                        {item.type}
                      </span>
                      <span style={{ fontSize: '0.75rem', color: '#888' }}>
                        {new Date(item.created_at).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}
                      </span>
                    </div>
                    <h4 style={{ fontSize: '0.95rem', fontWeight: '700', marginBottom: '4px' }}>{item.title}</h4>
                    <p style={{ fontSize: '0.85rem', color: '#555', lineHeight: '18px', marginBottom: '8px' }}>{item.message}</p>
                    <div style={{ fontSize: '0.75rem', color: '#888', borderTop: '1px solid #f5f5f5', paddingTop: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>Sent By: <b>{item.sent_by_user}</b></span>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button 
                          onClick={() => handleResend(item.id)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--primary-color)', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', padding: '4px' }}
                          title="Resend Reminder"
                        >
                          <Repeat size={14} /> Reminder
                        </button>
                        {user.role !== 'network_manager' && (
                          <button 
                            onClick={() => handleDelete(item.id)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#999', display: 'flex', alignItems: 'center', padding: '4px' }}
                            title="Delete Notification"
                            onMouseOver={(e) => e.currentTarget.style.color = '#CC0000'}
                            onMouseOut={(e) => e.currentTarget.style.color = '#999'}
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
