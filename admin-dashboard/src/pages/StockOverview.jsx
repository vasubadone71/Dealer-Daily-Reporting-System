import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { Package, Box, MapPin, Truck, RefreshCw } from 'lucide-react';
import { API_BASE_URL } from '../config';

export default function StockOverview() {
  const [data, setData] = useState({
    companyTotal: 0,
    godownTotal: 0,
    showroomTotal: 0,
    dealerTotal: 0,
    breakdown: []
  });
  const [loading, setLoading] = useState(true);

  const fetchStock = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_BASE_URL}/reports/stock-overview`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        setData(res.data.data);
      }
    } catch (error) {
      toast.error('Failed to fetch stock overview');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStock();
  }, []);

  const groupDataByRole = (role) => {
    return data.breakdown.filter(d => d.role === role);
  };

  const groupDataByModel = (items) => {
    const grouped = {};
    items.forEach(item => {
      if (!grouped[item.model_name]) {
        grouped[item.model_name] = 0;
      }
      grouped[item.model_name] += item.total_stock;
    });
    return Object.entries(grouped).map(([model_name, total]) => ({ model_name, total }));
  };

  const Card = ({ title, value, subtitle, icon: Icon, color, bgColor }) => (
    <div style={{
      padding: '24px',
      borderRadius: '12px',
      boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
      border: `1px solid ${color}40`,
      backgroundColor: bgColor,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      color: color
    }}>
      <div>
        <p style={{ fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', opacity: 0.8, margin: 0 }}>{title}</p>
        <h3 style={{ fontSize: '2rem', fontWeight: 900, margin: '8px 0 0 0' }}>{value}</h3>
        {subtitle && <p style={{ fontSize: '0.75rem', marginTop: '4px', opacity: 0.75, margin: 0 }}>{subtitle}</p>}
      </div>
      <div style={{ padding: '12px', backgroundColor: 'rgba(255,255,255,0.4)', borderRadius: '10px' }}>
        <Icon size={28} />
      </div>
    </div>
  );

  const BreakdownTable = ({ title, items, showDealerFilter }) => {
    const [selectedDealer, setSelectedDealer] = useState('All');
    
    // Unique dealers for dropdown
    const dealers = [...new Set(items.map(i => i.dealer_name))].filter(Boolean).sort();
    
    const filteredItems = selectedDealer === 'All'
      ? items
      : items.filter(i => i.dealer_name === selectedDealer);

    const byModel = groupDataByModel(filteredItems);
    
    return (
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
        border: '1px solid #eee',
        marginBottom: '24px',
        overflow: 'hidden'
      }}>
        <div style={{
          padding: '16px 24px',
          borderBottom: '1px solid #eee',
          backgroundColor: '#fafafa',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <h4 style={{ margin: 0, fontWeight: 800, color: '#333', fontSize: '1.1rem' }}>{title}</h4>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {showDealerFilter && dealers.length > 0 && (
              <select 
                value={selectedDealer}
                onChange={(e) => setSelectedDealer(e.target.value)}
                style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '0.85rem', fontWeight: 600, color: '#444', backgroundColor: 'white', outline: 'none' }}
              >
                <option value="All">All Dealers</option>
                {dealers.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            )}
            <span style={{ fontSize: '0.75rem', fontWeight: 800, backgroundColor: '#eee', color: '#555', padding: '4px 10px', borderRadius: '20px' }}>
              {filteredItems.reduce((acc, curr) => acc + curr.total_stock, 0)} Total
            </span>
          </div>
        </div>
        <div style={{ padding: '24px' }}>
          {byModel.length === 0 ? (
            <p style={{ fontSize: '0.9rem', color: '#888', textAlign: 'center', padding: '20px 0', margin: 0 }}>No stock found.</p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px' }}>
              {byModel.map(model => (
                <div key={model.model_name} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '12px 16px', backgroundColor: '#f9f9f9', borderRadius: '8px', border: '1px solid #f0f0f0'
                }}>
                  <span style={{ fontSize: '0.9rem', color: '#555', fontWeight: 600 }}>{model.model_name}</span>
                  <span style={{ fontSize: '1.2rem', fontWeight: 800, color: '#1a1a2e' }}>{model.total}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.8rem', fontWeight: 900, color: '#1a1a2e' }}>Company Stock Overview</h1>
          <p style={{ margin: '6px 0 0 0', fontSize: '0.9rem', color: '#666', fontWeight: 500 }}>Real-time centralized inventory</p>
        </div>
        <button 
          onClick={fetchStock}
          disabled={loading}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            backgroundColor: 'white', border: '1px solid #ddd', color: '#444',
            padding: '10px 20px', borderRadius: '8px', cursor: loading ? 'not-allowed' : 'pointer',
            fontWeight: 700, fontSize: '0.9rem', transition: 'all 0.2s',
            boxShadow: '0 2px 5px rgba(0,0,0,0.05)'
          }}
          onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f9f9f9'}
          onMouseLeave={e => e.currentTarget.style.backgroundColor = 'white'}
        >
          <RefreshCw size={16} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
          <span>Refresh</span>
        </button>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
          <div style={{ width: '40px', height: '40px', border: '3px solid #f3f3f3', borderTop: '3px solid #CC0000', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        </div>
      ) : (
        <>
          {/* Top KPI Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '24px', marginBottom: '40px' }}>
            <Card 
              title="Total Company Stock" 
              value={data.companyTotal} 
              subtitle="All locations combined"
              icon={Package} 
              color="#CC0000" 
              bgColor="#fff0f0" 
            />
            <Card 
              title="Godown Stock" 
              value={data.godownTotal} 
              subtitle="Pending Distribution"
              icon={Box} 
              color="#2980b9" 
              bgColor="#e8f4fd" 
            />
            <Card 
              title="Showroom Stock" 
              value={data.showroomTotal} 
              subtitle="Ready for Retail"
              icon={MapPin} 
              color="#8e44ad" 
              bgColor="#f4e8fd" 
            />
            <Card 
              title="Dealer Network" 
              value={data.dealerTotal} 
              subtitle="External Network"
              icon={Truck} 
              color="#27ae60" 
              bgColor="#e8fdf0" 
            />
          </div>

          <div>
            <h3 style={{ fontSize: '1.4rem', fontWeight: 900, color: '#1a1a2e', marginBottom: '20px', margin: 0 }}>Location Breakdowns</h3>
            
            <BreakdownTable title="Godown Inventory" items={groupDataByRole('godown')} />
            <BreakdownTable title="Showroom Inventory" items={groupDataByRole('showroom')} />
            <BreakdownTable title="Dealer Network Inventory" items={groupDataByRole('dealer')} showDealerFilter={true} />
            
          </div>
        </>
      )}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
