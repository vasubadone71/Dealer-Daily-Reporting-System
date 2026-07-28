import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { API_BASE_URL } from '../config';
import { Package, Search, RefreshCw, Edit3 } from 'lucide-react';

function ModelGrid({ breakdown, onEditStock }) {
  if (!breakdown || breakdown.length === 0) return <div style={{ padding: '20px', color: '#666' }}>No stock available.</div>;
  
  const scooters = breakdown.filter(b => b.model_type === 'Scooter');
  const motorcycles = breakdown.filter(b => b.model_type === 'Motorcycle');

  const renderModels = (models, title) => {
    if (models.length === 0) return null;
    return (
      <div style={{ marginBottom: '16px' }}>
        <div style={{ fontWeight: 700, color: '#CC0000', fontSize: '0.8rem', marginBottom: '10px', textTransform: 'uppercase' }}>
          {title}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {models.map(m => {
            const allColorsMap = new Map();
            if (m.colors) {
                m.colors.filter(c => c.closing !== 0).forEach(c => {
                    if (allColorsMap.has(c.variant_color_id)) {
                        allColorsMap.get(c.variant_color_id).closing += c.closing;
                    } else {
                        allColorsMap.set(c.variant_color_id, { ...c });
                    }
                });
            }
            const allColors = Array.from(allColorsMap.values());

            return (
              <div key={m.model_name} style={{ background: '#fcfcfc', padding: '12px', borderRadius: '8px', border: '1px solid #e0e0e0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', borderBottom: '1px solid #eee', paddingBottom: '8px' }}>
                    <span style={{ fontWeight: 800, color: '#1a1a2e', fontSize: '0.9rem' }}>{m.model_name}</span>
                    <span style={{ fontWeight: 800, color: '#CC0000', fontSize: '0.9rem' }}>Total: {m.closing}</span>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {allColors.map(c => (
                        <div key={c.variant_color_id} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'white', padding: '4px 8px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '0.85rem' }}>
                            <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: c.hex_code, border: '1px solid #ccc' }}></div>
                            <span style={{ color: '#444' }}>{c.color_name}:</span> <strong style={{ color: '#1a1a2e' }}>{c.closing}</strong>
                            <Edit3 size={14} color="#0066cc" style={{ cursor: 'pointer', marginLeft: '4px' }} onClick={(e) => { e.stopPropagation(); onEditStock(c, m.model_name); }} />
                        </div>
                    ))}
                    {allColors.length === 0 && <span style={{ fontSize: '0.85rem', color: '#999', fontStyle: 'italic' }}>Out of stock</span>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div style={{ padding: '16px', background: '#fafafa', borderTop: '1px solid #f0f0f0' }}>
      {renderModels(scooters, '🛵 Scooters')}
      {renderModels(motorcycles, '🏍️ Motorcycles')}
    </div>
  );
}

export default function DealerStock() {
  const [stockData, setStockData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState(null);

  // Edit Modal State
  const [editModal, setEditModal] = useState({ open: false, dealer: null, colorInfo: null, modelName: '', adjustmentQty: '', reason: '' });
  const [saving, setSaving] = useState(false);

  const fetchStock = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE_URL}/dealer-stock/overview`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
      if (res.data && res.data.success) {
        setStockData(res.data.data.dealers || []);
      }
    } catch (e) {
      console.error(e);
      toast.error(e.response?.data?.message || 'Failed to load dealer stock data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStock();
  }, [fetchStock]);

  const toggleExpand = (id) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const openEditModal = (dealer, color, modelName) => {
    setEditModal({
      open: true,
      dealer,
      colorInfo: color,
      modelName,
      adjustmentQty: '',
      reason: ''
    });
  };

  const submitAdjustment = async () => {
    if (!editModal.adjustmentQty || isNaN(parseInt(editModal.adjustmentQty, 10))) {
      return toast.error("Please enter a valid adjustment quantity (e.g. -1 or 2)");
    }
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      const today = new Date().toISOString().split('T')[0];
      const payload = {
        dealerId: editModal.dealer.id,
        date: today,
        variantColorId: editModal.colorInfo.variant_color_id,
        adjustmentQty: parseInt(editModal.adjustmentQty, 10),
        reason: editModal.reason || 'Manual correction from Live Stock'
      };
      
      const res = await axios.post(`${API_BASE_URL}/dispatches/adjustments`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (res.data.success) {
        toast.success('Stock adjusted successfully');
        setEditModal({ open: false, dealer: null, colorInfo: null, modelName: '', adjustmentQty: '', reason: '' });
        fetchStock();
      } else {
        toast.error(res.data.message || 'Failed to adjust stock');
      }
    } catch (e) {
      console.error(e);
      toast.error(e.response?.data?.message || 'Error saving adjustment');
    } finally {
      setSaving(false);
    }
  };

  const filteredData = (stockData || []).filter(d => {
    if (!d) return false;
    const n = d.name || '';
    const c = d.dealer_code || '';
    const nw = d.network_name || '';
    const s = search || '';
    return n.toLowerCase().includes(s.toLowerCase()) ||
           c.toLowerCase().includes(s.toLowerCase()) ||
           nw.toLowerCase().includes(s.toLowerCase());
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Header Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', color: '#1a1a2e', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Package size={24} color="#CC0000" />
            Live Network Stock
          </h2>
          <p style={{ color: '#666', fontSize: '0.85rem' }}>View real-time inventory balances and edit stock.</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <div style={{ position: 'relative' }}>
            <Search size={16} color="#999" style={{ position: 'absolute', top: '10px', left: '12px' }} />
            <input 
              type="text" 
              placeholder="Search dealer code..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ padding: '8px 12px 8px 36px', borderRadius: '8px', border: '1px solid #ddd', width: '250px', fontSize: '0.9rem' }}
            />
          </div>
          <button onClick={fetchStock} className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px' }}>
            <RefreshCw size={16} /> Sync
          </button>
        </div>
      </div>

      {/* Grid Layout */}
      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>Loading live stock...</div>
      ) : filteredData.length === 0 ? (
        <div style={{ padding: '40px', textAlign: 'center', color: '#666', background: 'white', borderRadius: '12px' }}>No dealers found.</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '20px' }}>
          {filteredData.map(d => {
            if (!d) return null;
            const stock = d.stock || {};
            return (
              <div key={d.id || Math.random()} style={{ background: 'white', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', border: '1px solid #e0e0e0', display: 'flex', flexDirection: 'column' }}>
                <div 
                  style={{ padding: '20px', cursor: 'pointer', transition: '0.2s', borderBottom: expandedId === d.id ? '1px solid #eee' : 'none' }}
                  onClick={() => toggleExpand(d.id)}
                  className="hover-bg-light"
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                    <div>
                      <div style={{ fontWeight: 800, color: '#1a1a2e', fontSize: '1.1rem' }}>
                        {d.dealer_code}
                      </div>
                      <div style={{ fontSize: '0.9rem', color: '#444', fontWeight: 600 }}>{d.name}</div>
                      <div style={{ fontSize: '0.75rem', color: '#888', marginTop: '2px' }}>{d.network_name} • {d.district}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '0.75rem', color: '#666', textTransform: 'uppercase' }}>Total Closing</div>
                      <div style={{ fontWeight: 800, fontSize: '1.5rem', color: '#CC0000' }}>{stock.totalClosing || 0}</div>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', background: '#f8f9fa', padding: '12px', borderRadius: '8px' }}>
                    <div>
                      <div style={{ fontSize: '0.7rem', color: '#666', textTransform: 'uppercase' }}>Opening</div>
                      <div style={{ fontWeight: 700, fontSize: '1rem', color: '#1a1a2e' }}>{stock.totalOpening || 0}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.7rem', color: '#666', textTransform: 'uppercase' }}>Dispatch</div>
                      <div style={{ fontWeight: 700, fontSize: '1rem', color: '#27ae60' }}>+{stock.totalDispatched || 0}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.7rem', color: '#666', textTransform: 'uppercase' }}>Retail</div>
                      <div style={{ fontWeight: 700, fontSize: '1rem', color: '#f39c12' }}>-{stock.totalRetail || 0}</div>
                    </div>
                  </div>
                  
                  <div style={{ marginTop: '12px', textAlign: 'center' }}>
                    <span style={{ fontSize: '0.8rem', color: expandedId === d.id ? '#CC0000' : '#0066cc', fontWeight: 600 }}>
                      {expandedId === d.id ? 'Hide Breakdown ▲' : 'View Breakdown & Edit Stock ▼'}
                    </span>
                  </div>
                </div>

                {expandedId === d.id && (
                  <div style={{ flex: 1, overflowY: 'auto', maxHeight: '400px' }}>
                    <ModelGrid breakdown={stock.breakdown || []} onEditStock={(color, modelName) => openEditModal(d, color, modelName)} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Edit Modal */}
      {editModal.open && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 9999,
          display: 'flex', justifyContent: 'center', alignItems: 'center'
        }}>
          <div style={{
            background: 'white', padding: '24px', borderRadius: '12px',
            width: '400px', maxWidth: '90%', boxShadow: '0 4px 20px rgba(0,0,0,0.15)'
          }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '1.2rem', color: '#1a1a2e' }}>Adjust Stock</h3>
            
            <div style={{ marginBottom: '16px', background: '#f5f5f5', padding: '12px', borderRadius: '8px' }}>
              <p style={{ margin: '0 0 4px 0', fontSize: '0.9rem', color: '#444' }}><strong>Dealer:</strong> {editModal.dealer?.name}</p>
              <p style={{ margin: '0 0 4px 0', fontSize: '0.9rem', color: '#444' }}><strong>Model:</strong> {editModal.modelName}</p>
              <p style={{ margin: '0 0 4px 0', fontSize: '0.9rem', color: '#444' }}><strong>Color:</strong> {editModal.colorInfo?.color_name}</p>
              <p style={{ margin: 0, fontSize: '0.9rem', color: '#444' }}><strong>Current Stock:</strong> <span style={{ color: '#CC0000', fontWeight: 'bold' }}>{editModal.colorInfo?.closing}</span></p>
            </div>

            <div className="input-group" style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '0.9rem', fontWeight: 600 }}>Adjustment Qty (Use +/-)</label>
              <input 
                type="text" 
                className="input-field" 
                placeholder="e.g., -1 or +2" 
                value={editModal.adjustmentQty}
                onChange={e => setEditModal({...editModal, adjustmentQty: e.target.value})}
              />
              <span style={{ fontSize: '0.75rem', color: '#666', marginTop: '4px', display: 'block' }}>
                Note: Entering -1 will reduce stock by 1.
              </span>
            </div>

            <div className="input-group" style={{ marginBottom: '24px' }}>
              <label style={{ fontSize: '0.9rem', fontWeight: 600 }}>Reason (Optional)</label>
              <input 
                type="text" 
                className="input-field" 
                placeholder="Reason for adjustment" 
                value={editModal.reason}
                onChange={e => setEditModal({...editModal, reason: e.target.value})}
              />
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button 
                className="btn btn-secondary" 
                onClick={() => setEditModal({ open: false, dealer: null, colorInfo: null, modelName: '', adjustmentQty: '', reason: '' })}
                disabled={saving}
              >
                Cancel
              </button>
              <button 
                className="btn" 
                style={{ background: '#CC0000', color: 'white' }} 
                onClick={submitAdjustment}
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Apply Adjustment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
