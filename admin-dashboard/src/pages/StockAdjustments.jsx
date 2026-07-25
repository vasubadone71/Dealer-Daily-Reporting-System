import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { API_BASE_URL } from '../config';
import { Settings2 } from 'lucide-react';

const SC_MODELS = [
  { key: 'activa_110_std', name: 'Activa 110 Std' },
  { key: 'activa_110_dlx', name: 'Activa 110 DLX' },
  { key: 'activa_h_smart', name: 'Activa H Smart' },
  { key: 'activa_125', name: 'Activa 125' },
  { key: 'activa_125_h_smart', name: 'Activa 125 H Smart' }
];

const MC_MODELS = [
  { key: 'cb_hornet125', name: 'CB Hornet 125' },
  { key: 'shine100dx', name: 'Shine 100 DX' },
  { key: 'sp160', name: 'SP 160' },
  { key: 'sp125_drum', name: 'SP 125 Drum' },
  { key: 'sp125_disc', name: 'SP 125 Disc' },
  { key: 'shine125_drum', name: 'Shine 125 Drum' },
  { key: 'shine125_disc', name: 'Shine 125 Disc' },
  { key: 'shine100', name: 'Shine 100' },
  { key: 'shine100_2b', name: 'Shine 100 2B' },
  { key: 'hornet2_0', name: 'Hornet 2.0' }
];

const ALL_MODELS = [...SC_MODELS, ...MC_MODELS];

export default function StockAdjustments() {
  const [adjustments, setAdjustments] = useState([]);
  const [dealers, setDealers] = useState([]);
  
  const [formData, setFormData] = useState({
    dealerId: '',
    date: new Date().toISOString().split('T')[0],
    modelKey: '',
    adjustmentQty: '',
    type: 'correction',
    reason: ''
  });
  
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchDealers();
    fetchAdjustments();
  }, []);

  const fetchDealers = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_BASE_URL}/dealers`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        setDealers(res.data.data.filter(d => d.role === 'dealer' || d.dealer_type));
      }
    } catch (e) {
      console.error(e);
      toast.error('Failed to load dealers');
    }
  };

  const fetchAdjustments = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_BASE_URL}/stock-adjustments`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        setAdjustments(res.data.data);
      }
    } catch (e) {
      console.error(e);
      toast.error('Failed to fetch stock adjustments');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.dealerId || !formData.date || !formData.modelKey || !formData.adjustmentQty) {
      return toast.error('Please fill all required fields.');
    }
    
    // Validate qty is an integer (can be negative or positive)
    if (!/^-?\d+$/.test(formData.adjustmentQty)) {
      return toast.error('Adjustment Qty must be a valid integer.');
    }

    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(`${API_BASE_URL}/stock-adjustments`, {
        dealerId: formData.dealerId,
        date: formData.date,
        modelKey: formData.modelKey,
        adjustmentQty: parseInt(formData.adjustmentQty, 10),
        reason: formData.reason
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.data.success) {
        toast.success(res.data.message);
        fetchAdjustments();
        // Reset form but keep date and dealer
        setFormData(prev => ({
          ...prev,
          modelKey: '',
          adjustmentQty: '',
          reason: ''
        }));
      } else {
        toast.error(res.data.message);
      }
    } catch (e) {
      console.error(e);
      toast.error(e.response?.data?.message || 'Failed to save adjustment');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this adjustment? This will immediately recalculate stock for this dealer.')) return;
    try {
      const token = localStorage.getItem('token');
      const res = await axios.delete(`${API_BASE_URL}/stock-adjustments/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        toast.success('Adjustment deleted.');
        fetchAdjustments();
      }
    } catch (e) {
      toast.error('Failed to delete adjustment.');
    }
  };

  const getModelName = (key) => {
    const m = ALL_MODELS.find(x => x.key === key);
    return m ? m.name : key;
  };

  return (
    <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
      {/* Adjustment Form */}
      <div className="card" style={{ flex: '1', minWidth: '400px', height: 'fit-content' }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px', gap: '10px' }}>
          <Settings2 color="var(--primary-color)" />
          <h2 style={{ margin: 0 }}>New Stock Adjustment</h2>
        </div>
        
        <form onSubmit={handleSave}>
          <div className="input-group" style={{ marginBottom: '16px' }}>
            <label>Dealer</label>
            <select 
              className="input-field"
              value={formData.dealerId}
              onChange={e => setFormData({...formData, dealerId: e.target.value})}
              required
            >
              <option value="">-- Choose Dealer --</option>
              {dealers.map(d => (
                <option key={d.id} value={d.id}>{d.dealer_code} - {d.name}</option>
              ))}
            </select>
          </div>

          <div className="input-group" style={{ marginBottom: '16px' }}>
            <label>Effective Date</label>
            <input 
              type="date"
              className="input-field"
              value={formData.date}
              onChange={e => setFormData({...formData, date: e.target.value})}
              required
            />
          </div>

          <div className="input-group" style={{ marginBottom: '16px' }}>
            <label>Model</label>
            <select 
              className="input-field"
              value={formData.modelKey}
              onChange={e => setFormData({...formData, modelKey: e.target.value})}
              required
            >
              <option value="">-- Select Model --</option>
              <optgroup label="Scooters">
                {SC_MODELS.map(m => (
                  <option key={m.key} value={m.key}>{m.name}</option>
                ))}
              </optgroup>
              <optgroup label="Motorcycles">
                {MC_MODELS.map(m => (
                  <option key={m.key} value={m.key}>{m.name}</option>
                ))}
              </optgroup>
            </select>
          </div>

          <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
            <div className="input-group" style={{ flex: 1 }}>
              <label>Adjustment Type</label>
              <select 
                className="input-field"
                value={formData.type}
                onChange={e => setFormData({...formData, type: e.target.value})}
              >
                <option value="correction">Correction (Audit)</option>
                <option value="damage">Transit Damage / Scrapped</option>
                <option value="display">Display Vehicle</option>
                <option value="transfer">Dealer Transfer</option>
              </select>
            </div>
            
            <div className="input-group" style={{ flex: 1 }}>
              <label>Qty (Use +/-)</label>
              <input 
                type="text"
                placeholder="-1, +2, etc."
                className="input-field"
                value={formData.adjustmentQty}
                onChange={e => setFormData({...formData, adjustmentQty: e.target.value})}
                required
              />
            </div>
          </div>

          <div className="input-group" style={{ marginBottom: '20px' }}>
            <label>Reason / Remarks (Optional)</label>
            <input 
              type="text"
              className="input-field"
              value={formData.reason}
              onChange={e => setFormData({...formData, reason: e.target.value})}
              placeholder="E.g., Audit mismatch found on MM/DD"
            />
          </div>

          <button 
            type="submit" 
            className="btn" 
            style={{ width: '100%', padding: '12px' }}
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Apply Adjustment & Recalculate'}
          </button>
        </form>
      </div>

      {/* Adjustment History List */}
      <div className="card" style={{ flex: '2', minWidth: '400px' }}>
        <h2>📝 Adjustment Ledger</h2>
        {loading ? <p>Loading...</p> : (
          <div className="table-responsive" style={{ marginTop: '16px' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Dealer</th>
                  <th>Model</th>
                  <th>Type</th>
                  <th>Qty</th>
                  <th>Reason</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {adjustments.map(item => (
                  <tr key={item.id}>
                    <td>{item.date}</td>
                    <td><b>{item.dealer_code}</b></td>
                    <td>{getModelName(item.model_key)}</td>
                    <td style={{ textTransform: 'capitalize' }}>{item.type}</td>
                    <td style={{ 
                      color: item.adjustment_qty < 0 ? '#e74c3c' : '#27ae60', 
                      fontWeight: 'bold' 
                    }}>
                      {item.adjustment_qty > 0 ? `+${item.adjustment_qty}` : item.adjustment_qty}
                    </td>
                    <td>{item.reason}</td>
                    <td>
                      <button 
                        onClick={() => handleDelete(item.id)}
                        style={{ border: 'none', background: 'transparent', color: 'red', cursor: 'pointer', fontSize: '16px' }}
                        title="Delete & Reverse Stock"
                      >
                        🗑️
                      </button>
                    </td>
                  </tr>
                ))}
                {adjustments.length === 0 && (
                  <tr><td colSpan="7" style={{textAlign: 'center'}}>No adjustments found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
