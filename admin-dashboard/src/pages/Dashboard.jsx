import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../config';
import { 
  TrendingUp, HardHat, FileSpreadsheet, AlertCircle, 
  BarChart2, Award, Calendar, ShoppingBag, Users, CheckCircle, HelpCircle
} from 'lucide-react';

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [dealersToday, setDealersToday] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  // Calendar states
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const today = new Date();
    return today.toISOString().substring(0, 7); // 'YYYY-MM'
  });
  const [calendarData, setCalendarData] = useState([]);
  const [daysInMonth, setDaysInMonth] = useState(31);

  // Compute number of days in the selected calendar month
  useEffect(() => {
    const [year, month] = calendarMonth.split('-').map(Number);
    if (year && month) {
      const days = new Date(year, month, 0).getDate();
      setDaysInMonth(days);
    }
  }, [calendarMonth]);

  const fetchDashboardData = async (showRefreshIndicator = false) => {
    if (showRefreshIndicator) setRefreshing(true);
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      const [statsRes, dealersRes, calendarRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/reports/dashboard`, { headers }),
        axios.get(`${API_BASE_URL}/reports/statuses`, { headers }),
        axios.get(`${API_BASE_URL}/reports/calendar?month=${calendarMonth}`, { headers })
      ]);

      if (statsRes.data.success) {
        setStats(statsRes.data.data);
      }
      if (dealersRes.data.success) {
        setDealersToday(dealersRes.data.data);
      }
      if (calendarRes.data.success) {
        setCalendarData(calendarRes.data.data);
      }
      setError('');
    } catch (err) {
      console.error('Error fetching dashboard stats:', err);
      setError('Failed to sync live data. Server connection issue.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Poll dashboard data every 5 seconds for real-time reporting updates
  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(() => {
      fetchDashboardData(true);
    }, 5000);
    return () => clearInterval(interval);
  }, [calendarMonth]);

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <div className="skeleton" style={{ height: '80px', marginBottom: '24px', borderRadius: '16px' }}></div>
        <div className="skeleton" style={{ height: '200px', marginBottom: '24px', borderRadius: '24px' }}></div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <div className="skeleton" style={{ height: '240px', borderRadius: '24px' }}></div>
          <div className="skeleton" style={{ height: '240px', borderRadius: '24px' }}></div>
        </div>
      </div>
    );
  }

  const safeStats = stats || {};
  const summary = safeStats.summary || {
    total_dealers: safeStats.totalDealers || 0,
    submitted: safeStats.submittedCount || 0,
    pending: safeStats.pendingCount || 0,
    not_sent: (safeStats.notSentCount || 0) + (safeStats.lateCount || 0),
    today_sales: safeStats.today_total_sales || 0,
    today_stock: safeStats.today_stock || 0,
    monthly_sales: safeStats.mtd_total_sales || 0
  };

  const rankings = safeStats.rankings || {
    dealer_sales: [], dealer_stock: [], network_sales: []
  };

  const topDealer = rankings.dealer_sales.length > 0 ? rankings.dealer_sales[0] : null;
  const lowestDealer = rankings.dealer_sales.length > 1 ? rankings.dealer_sales[rankings.dealer_sales.length - 1] : null;

  const highestStock = rankings.dealer_stock.length > 0 ? rankings.dealer_stock[0] : null;
  const lowestStock = rankings.dealer_stock.length > 1 ? rankings.dealer_stock[rankings.dealer_stock.length - 1] : null;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span>Live Admin Dashboard</span>
            <span style={{ fontSize: '0.75rem', padding: '4px 8px', borderRadius: '20px', backgroundColor: '#e2f0d9', color: '#385723', fontWeight: 'bold' }}>
              ● LIVE AUTO-SYNC
            </span>
          </h1>
          <p className="subtitle" style={{ marginBottom: 0 }}>
            Live data reporting screen. Automatically refreshes every 5 seconds.
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {refreshing && <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Updating...</span>}
          <button className="btn btn-secondary" onClick={() => fetchDashboardData(true)} disabled={refreshing}>
            🔄 Sync Now
          </button>
        </div>
      </div>

      {error && (
        <div style={{ backgroundColor: '#fdf3f2', color: '#d32f2f', padding: '12px 20px', borderRadius: '12px', marginBottom: '24px', fontSize: '0.9rem' }}>
          ⚠️ {error}
        </div>
      )}

      {/* 7 Exact Dashboard Cards at the top */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '16px', marginBottom: '28px' }}>
        
        {/* 1. Total Dealers */}
        <div className="stat-card red" style={{ padding: '14px', borderLeftWidth: '4px' }}>
          <div className="stat-info">
            <span className="stat-label" style={{ fontSize: '0.7rem' }}>Total Dealers</span>
            <span className="stat-value" style={{ fontSize: '1.4rem' }}>{summary.total_dealers || 0}</span>
          </div>
          <div className="stat-icon-wrapper" style={{ width: '32px', height: '32px', borderRadius: '8px' }}>
            <Users size={16} />
          </div>
        </div>

        {/* 2. Submitted Today */}
        <div className="stat-card green" style={{ padding: '14px', borderLeftWidth: '4px' }}>
          <div className="stat-info">
            <span className="stat-label" style={{ fontSize: '0.7rem' }}>Submitted Today</span>
            <span className="stat-value" style={{ fontSize: '1.4rem', color: 'var(--status-submitted)' }}>{summary.submitted || 0}</span>
          </div>
          <div className="stat-icon-wrapper" style={{ width: '32px', height: '32px', borderRadius: '8px' }}>
            <CheckCircle size={16} />
          </div>
        </div>

        {/* 3. Pending */}
        <div className="stat-card orange" style={{ padding: '14px', borderLeftWidth: '4px' }}>
          <div className="stat-info">
            <span className="stat-label" style={{ fontSize: '0.7rem' }}>Pending</span>
            <span className="stat-value" style={{ fontSize: '1.4rem', color: 'var(--status-pending)' }}>{summary.pending || 0}</span>
          </div>
          <div className="stat-icon-wrapper" style={{ width: '32px', height: '32px', borderRadius: '8px' }}>
            <HelpCircle size={16} />
          </div>
        </div>

        {/* 4. Not Sent */}
        <div className="stat-card gray" style={{ padding: '14px', borderLeftWidth: '4px' }}>
          <div className="stat-info">
            <span className="stat-label" style={{ fontSize: '0.7rem' }}>Not Sent</span>
            <span className="stat-value" style={{ fontSize: '1.4rem', color: '#7f8c8d' }}>{summary.not_sent || 0}</span>
          </div>
          <div className="stat-icon-wrapper" style={{ width: '32px', height: '32px', borderRadius: '8px' }}>
            <AlertCircle size={16} />
          </div>
        </div>

        {/* 5. Today's Sale */}
        <div className="stat-card red" style={{ padding: '14px', borderLeftWidth: '4px' }}>
          <div className="stat-info">
            <span className="stat-label" style={{ fontSize: '0.7rem' }}>Today's Sale</span>
            <span className="stat-value" style={{ fontSize: '1.4rem' }}>{summary.today_sales || 0}</span>
          </div>
          <div className="stat-icon-wrapper" style={{ width: '32px', height: '32px', borderRadius: '8px' }}>
            <TrendingUp size={16} />
          </div>
        </div>

        {/* 6. Today's Stock */}
        <div className="stat-card gray" style={{ padding: '14px', borderLeftWidth: '4px' }}>
          <div className="stat-info">
            <span className="stat-label" style={{ fontSize: '0.7rem' }}>Today's Stock</span>
            <span className="stat-value" style={{ fontSize: '1.4rem' }}>{summary.today_stock || 0}</span>
          </div>
          <div className="stat-icon-wrapper" style={{ width: '32px', height: '32px', borderRadius: '8px' }}>
            <HardHat size={16} />
          </div>
        </div>

        {/* 7. Monthly Sale */}
        <div className="stat-card orange" style={{ padding: '14px', borderLeftWidth: '4px' }}>
          <div className="stat-info">
            <span className="stat-label" style={{ fontSize: '0.7rem' }}>Monthly Sale</span>
            <span className="stat-value" style={{ fontSize: '1.4rem' }}>{summary.monthly_sales || 0}</span>
          </div>
          <div className="stat-icon-wrapper" style={{ width: '32px', height: '32px', borderRadius: '8px' }}>
            <BarChart2 size={16} />
          </div>
        </div>

      </div>

      {/* Dealer Submission Calendar Grid Section */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
          <h3 className="card-title" style={{ marginBottom: 0 }}>
            <span>📅 Dealer Submission Calendar Grid</span>
            <Calendar size={20} color="var(--primary-color)" />
          </h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <label style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#555' }}>Select Month:</label>
            <input 
              type="month" 
              className="input-field" 
              value={calendarMonth} 
              onChange={e => setCalendarMonth(e.target.value)} 
              style={{ padding: '6px 12px', borderRadius: '8px', fontSize: '0.85rem' }}
            />
          </div>
        </div>

        {/* Legend */}
        <div style={{ display: 'flex', gap: '14px', fontSize: '0.8rem', marginBottom: '16px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <div style={{ width: '12px', height: '12px', borderRadius: '3px', backgroundColor: 'var(--status-submitted)' }} />
            <span>🟢 Submitted</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <div style={{ width: '12px', height: '12px', borderRadius: '3px', backgroundColor: 'var(--status-late)' }} />
            <span>🔴 Not Sent (Deadline Missed)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <div style={{ width: '12px', height: '12px', borderRadius: '3px', backgroundColor: 'var(--status-pending)' }} />
            <span>🟡 Late Submission</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <div style={{ width: '12px', height: '12px', borderRadius: '3px', backgroundColor: '#ffe6e6', border: '1px dashed #ffa8a0' }} />
            <span>Pending (Active Draft / Unlocked)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <div style={{ width: '12px', height: '12px', borderRadius: '3px', backgroundColor: '#fafafa', border: '1px solid #ddd' }} />
            <span>Gray = Future Dates</span>
          </div>
        </div>

        {/* Table of Grid Calendar cells */}
        <div style={{ overflowX: 'auto', border: '1px solid var(--border-color)', borderRadius: '12px' }}>
          <table style={{ minWidth: '920px', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#fafbfc' }}>
                <th style={{ position: 'sticky', left: 0, backgroundColor: '#fafbfc', zIndex: 10, minWidth: '150px', borderRight: '1.5px solid var(--border-color)', padding: '10px 14px' }}>
                  Showroom Code
                </th>
                {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => (
                  <th key={day} style={{ textAlign: 'center', width: '24px', fontSize: '0.75rem', fontWeight: 'bold', padding: '6px 2px', borderBottom: '1.5px solid var(--border-color)' }}>
                    {day}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {dealersToday.length === 0 ? (
                <tr>
                  <td colSpan={daysInMonth + 1} style={{ textAlign: 'center', padding: '20px', color: '#999' }}>
                    No dealers configured.
                  </td>
                </tr>
              ) : (
                dealersToday.map(dealer => {
                  return (
                    <tr key={dealer.dealer_id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                      <td style={{ position: 'sticky', left: 0, backgroundColor: '#ffffff', zIndex: 8, fontWeight: '700', fontSize: '0.8rem', padding: '8px 14px', borderRight: '1.5px solid var(--border-color)' }}>
                        <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '140px' }} title={dealer.dealer_name}>
                          {dealer.dealer_code} - {dealer.dealer_name}
                        </div>
                      </td>
                      
                      {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
                        const dateStr = `${calendarMonth}-${day.toString().padStart(2, '0')}`;
                        const report = calendarData.find(c => c.dealer_id === dealer.dealer_id && c.date === dateStr);
                        
                        let bgColor = '#ffffff'; 
                        let borderStyle = '1px solid #e0e0e0';
                        let title = `${dealer.dealer_name} - ${dateStr}: No Entry`;
                        
                        if (report) {
                          if (report.status === 'Submitted') {
                            bgColor = 'var(--status-submitted)';
                            borderStyle = 'none';
                            title = `${dealer.dealer_name} - ${dateStr}: Submitted`;
                          } else if (report.status === 'Not Sent') {
                            bgColor = 'var(--status-late)';
                            borderStyle = 'none';
                            title = `${dealer.dealer_name} - ${dateStr}: Not Sent`;
                          } else if (report.status === 'Late') {
                            bgColor = 'var(--status-pending)';
                            borderStyle = 'none';
                            title = `${dealer.dealer_name} - ${dateStr}: Late`;
                          }
                        } else {
                          const today = new Date().toISOString().split('T')[0];
                          if (dateStr > today) {
                            bgColor = '#fafafa';
                            borderStyle = '1px solid #eee';
                            title = `${dateStr}: Future Date`;
                          } else {
                            bgColor = '#ffe6e6';
                            borderStyle = '1px dashed #ffa8a0';
                            title = `${dealer.dealer_name} - ${dateStr}: Pending / Draft`;
                          }
                        }

                        return (
                          <td key={day} style={{ padding: '4px 2px', textAlign: 'center' }}>
                            <div 
                              title={title}
                              style={{
                                width: '16px',
                                height: '16px',
                                borderRadius: '4px',
                                backgroundColor: bgColor,
                                border: borderStyle,
                                margin: '0 auto'
                              }}
                            />
                          </td>
                        );
                      })}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bookings & Completion Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px', marginBottom: '28px' }}>
        <div className="card">
          <h3 className="card-title">
            <span>📅 Bookings Summary</span>
            <ShoppingBag size={20} color="var(--primary-color)" />
          </h3>
          <div style={{ display: 'flex', justifyContent: 'space-around', margin: '12px 0' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', fontWeight: '800', color: 'var(--primary-color)' }}>{summary.today_booking}</div>
              <div style={{ fontSize: '0.85rem', color: '#666', marginTop: '4px' }}>Today's Bookings</div>
            </div>
            <div style={{ width: '1px', backgroundColor: '#eee' }}></div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', fontWeight: '800', color: '#1a1a2e' }}>{summary.total_booking}</div>
              <div style={{ fontSize: '0.85rem', color: '#666', marginTop: '4px' }}>MTD Total Bookings</div>
            </div>
          </div>
        </div>

        <div className="card">
          <h3 className="card-title">
            <span>📊 Reporting Completion Today</span>
            <AlertCircle size={20} color="var(--status-pending)" />
          </h3>
          {summary.total_dealers > 0 && (
            <div style={{ marginTop: '10px' }}>
              <div style={{ display: 'flex', height: '24px', borderRadius: '12px', overflow: 'hidden', marginBottom: '16px' }}>
                <div style={{ width: `${(summary.submitted / summary.total_dealers) * 100}%`, backgroundColor: 'var(--status-submitted)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '0.75rem', fontWeight: 'bold' }}>
                  {summary.submitted > 0 && `${Math.round((summary.submitted / summary.total_dealers) * 100)}%`}
                </div>
                <div style={{ width: `${(summary.pending / summary.total_dealers) * 100}%`, backgroundColor: 'var(--status-pending)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '0.75rem', fontWeight: 'bold' }}>
                  {summary.pending > 0 && `${Math.round((summary.pending / summary.total_dealers) * 100)}%`}
                </div>
                <div style={{ width: `${(summary.not_sent / summary.total_dealers) * 100}%`, backgroundColor: 'var(--status-not-sent)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '0.75rem', fontWeight: 'bold' }}>
                  {summary.not_sent > 0 && `${Math.round((summary.not_sent / summary.total_dealers) * 100)}%`}
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#555' }}>
                <div>🟢 Submitted: <b>{summary.submitted}</b></div>
                <div>🟡 Drafts/Pending: <b>{summary.pending}</b></div>
                <div>⚫ Not Sent: <b>{summary.not_sent}</b></div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Rankings Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px', marginBottom: '28px' }}>
        <div className="card">
          <h3 className="card-title">
            <span>🏆 Dealer Performance Today</span>
            <Award size={20} color="#f1c40f" />
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', borderRadius: '12px', background: '#f9f9f9', borderLeft: '4px solid #27ae60' }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: '#888', fontWeight: '600' }}>⭐ TOP RETAIL</div>
                <div style={{ fontWeight: '700', fontSize: '0.95rem', marginTop: '2px' }}>{topDealer ? topDealer.dealer_name : 'No sales'}</div>
                <div style={{ fontSize: '0.8rem', color: '#666' }}>{topDealer?.network_name}</div>
              </div>
              <div style={{ textAlign: 'right', alignSelf: 'center' }}>
                <div style={{ fontSize: '1.25rem', fontWeight: '800', color: '#27ae60' }}>{topDealer ? topDealer.total_retail : 0}</div>
                <div style={{ fontSize: '0.7rem', color: '#888' }}>Units</div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', borderRadius: '12px', background: '#f9f9f9', borderLeft: '4px solid #e74c3c' }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: '#888', fontWeight: '600' }}>⚠️ LOWEST RETAIL</div>
                <div style={{ fontWeight: '700', fontSize: '0.95rem', marginTop: '2px' }}>{lowestDealer ? lowestDealer.dealer_name : 'N/A'}</div>
                <div style={{ fontSize: '0.8rem', color: '#666' }}>{lowestDealer?.network_name}</div>
              </div>
              <div style={{ textAlign: 'right', alignSelf: 'center' }}>
                <div style={{ fontSize: '1.25rem', fontWeight: '800', color: '#e74c3c' }}>{lowestDealer ? lowestDealer.total_retail : 0}</div>
                <div style={{ fontSize: '0.7rem', color: '#888' }}>Units</div>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <h3 className="card-title">
            <span>📦 Stock Inventory Levels</span>
            <HardHat size={20} color="var(--primary-color)" />
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', borderRadius: '12px', background: '#f9f9f9', borderLeft: '4px solid #3498db' }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: '#888', fontWeight: '600' }}>📈 HIGHEST STOCK</div>
                <div style={{ fontWeight: '700', fontSize: '0.95rem', marginTop: '2px' }}>{highestStock ? highestStock.dealer_name : 'No reports'}</div>
                <div style={{ fontSize: '0.8rem', color: '#666' }}>{highestStock?.network_name}</div>
              </div>
              <div style={{ textAlign: 'right', alignSelf: 'center' }}>
                <div style={{ fontSize: '1.25rem', fontWeight: '800', color: '#3498db' }}>{highestStock ? highestStock.total_stock : 0}</div>
                <div style={{ fontSize: '0.7rem', color: '#888' }}>Units</div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', borderRadius: '12px', background: '#f9f9f9', borderLeft: '4px solid #f39c12' }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: '#888', fontWeight: '600' }}>📉 LOWEST STOCK</div>
                <div style={{ fontWeight: '700', fontSize: '0.95rem', marginTop: '2px' }}>{lowestStock ? lowestStock.dealer_name : 'N/A'}</div>
                <div style={{ fontSize: '0.8rem', color: '#666' }}>{lowestStock?.network_name}</div>
              </div>
              <div style={{ textAlign: 'right', alignSelf: 'center' }}>
                <div style={{ fontSize: '1.25rem', fontWeight: '800', color: '#f39c12' }}>{lowestStock ? lowestStock.total_stock : 0}</div>
                <div style={{ fontSize: '0.7rem', color: '#888' }}>Units</div>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <h3 className="card-title">
            <span>🌐 Network Rankings Today</span>
            <BarChart2 size={20} color="var(--primary-color)" />
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '144px', overflowY: 'auto' }}>
            {rankings.network_sales.length === 0 ? (
              <div style={{ color: '#aaa', textAlign: 'center', padding: '20px' }}>No network sales today</div>
            ) : (
              rankings.network_sales.map((net, i) => (
                <div key={net.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 12px', borderBottom: '1px solid #f0f0f0', fontSize: '0.9rem' }}>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <span style={{ fontWeight: '800', width: '20px', color: i === 0 ? '#f1c40f' : '#666' }}>#{i + 1}</span>
                    <span>{net.network_name}</span>
                  </div>
                  <div style={{ fontWeight: 'bold' }}>{net.total_retail} sold</div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Today's Reporting Status Table */}
      <div className="card">
        <h3 className="card-title">
          <span>📋 Today's Dealer Submissions Status</span>
          <FileSpreadsheet size={20} color="var(--primary-color)" />
        </h3>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Dealer Code</th>
                <th>Dealer Name</th>
                <th>Network</th>
                <th>District</th>
                <th>Type</th>
                <th>Reporting Status</th>
                <th>Submission Time</th>
              </tr>
            </thead>
            <tbody>
              {dealersToday.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '20px', color: '#999' }}>
                    No dealers configured.
                  </td>
                </tr>
              ) : (
                dealersToday.map((row) => (
                  <tr key={row.dealer_id}>
                    <td style={{ fontWeight: '600' }}>{row.dealer_code}</td>
                    <td>{row.dealer_name}</td>
                    <td>{row.network_name}</td>
                    <td>{row.district}</td>
                    <td style={{ fontWeight: '600', color: '#555' }}>{row.dealer_type}</td>
                    <td>
                      <span className={`status-badge ${row.status.toLowerCase().replace(' ', '-')}`}>
                        {row.status === 'Submitted' ? '🟢 Submitted' : 
                         row.status === 'Pending' ? '🟡 Draft / Pending' :
                         row.status === 'Late' ? '🔴 Late' : '⚫ Not Sent'}
                      </span>
                    </td>
                    <td style={{ color: '#666', fontSize: '0.85rem' }}>
                      {row.submitted_at 
                        ? new Date(row.submitted_at.endsWith('Z') ? row.submitted_at : row.submitted_at.replace(' ', 'T') + 'Z').toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) 
                        : '--:--'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
