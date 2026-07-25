import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../config';
import { ShieldCheck, ArrowLeft, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ActivityLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const limit = 50; // logs per page

  useEffect(() => {
    fetchLogs();
  }, [page]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      const offset = (page - 1) * limit;

      const res = await axios.get(`${API_BASE_URL}/settings/logs?limit=${limit}&offset=${offset}`, { headers });
      if (res.data.success) {
        setLogs(res.data.data);
        setTotal(res.data.total);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load activity logs.');
    } finally {
      setLoading(false);
    }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1>Security Audit Logs</h1>
          <p className="subtitle" style={{ marginBottom: 0 }}>Review all admin logins, OTP dispatches, new device alerts, and reporting actions</p>
        </div>
      </div>

      <div className="card">
        <h3 className="card-title">
          <span>🛡️ Audit Trails ({total} events logged)</span>
          <ShieldCheck size={20} color="var(--primary-color)" />
        </h3>

        {loading ? (
          <div style={{ padding: '40px 0' }}>
            <div className="skeleton" style={{ height: '40px', marginBottom: '10px' }}></div>
            <div className="skeleton" style={{ height: '40px', marginBottom: '10px' }}></div>
            <div className="skeleton" style={{ height: '40px' }}></div>
          </div>
        ) : (
          <div>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>User Role</th>
                    <th>Username / Code</th>
                    <th>Event Action</th>
                    <th>Description Details</th>
                    <th>IP / Device</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', padding: '24px', color: '#999' }}>
                        No audit logs captured.
                      </td>
                    </tr>
                  ) : (
                    logs.map(log => (
                      <tr key={log.id}>
                        <td style={{ color: '#666', fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
                          {new Date(log.created_at).toLocaleString('en-IN')}
                        </td>
                        <td>
                          <span className={`status-badge ${
                            log.actor_type === 'admin' ? 'submitted' : 
                            log.actor_type === 'system' ? 'pending' : 'not-sent'
                          }`}>
                            {log.actor_type}
                          </span>
                        </td>
                        <td style={{ fontWeight: '600' }}>{log.username}</td>
                        <td style={{ fontWeight: '700', color: log.action.includes('Failed') || log.action.includes('Locked') || log.action.includes('Unauthorized') ? '#d32f2f' : '#2e7d32' }}>
                          {log.action}
                        </td>
                        <td>{log.details || '--'}</td>
                        <td style={{ fontSize: '0.8rem', color: '#666' }}>
                          <div>IP: <b>{log.ip_address || 'unknown'}</b></div>
                          <div>Dev: <b>{log.device_name || 'unknown'}</b></div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '24px', padding: '0 8px' }}>
                <span style={{ fontSize: '0.85rem', color: '#555' }}>
                  Showing page <b>{page}</b> of <b>{totalPages}</b>
                </span>
                
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button 
                    className="btn btn-secondary" 
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    <ArrowLeft size={16} /> Prev
                  </button>
                  <button 
                    className="btn btn-secondary" 
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    Next <ArrowRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
