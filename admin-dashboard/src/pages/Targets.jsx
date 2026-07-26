import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { Crosshair, Save, X, Target, CheckCircle, Clock, Edit3, Trash2, Download } from 'lucide-react';
import { API_BASE_URL } from '../config';

// ─── Helper ─────────────────────────────────────────────────────────────────
const starColor = (pct) => pct >= 100 ? '#27ae60' : pct >= 80 ? '#f39c12' : pct >= 60 ? '#e67e22' : '#CC0000';
const starCount = (pct) => pct >= 90 ? 5 : pct >= 80 ? 4 : pct >= 70 ? 3 : pct >= 50 ? 2 : 1;

// ─── Dealer Card (Grid Item) ─────────────────────────────────────────────────
function DealerCard({ dealer, targetData, onEdit, user }) {
  const savedTarget = targetData?.target_qty || 0;
  const retail      = targetData?.retail || 0;
  const pct         = savedTarget > 0 ? Math.min(100, Math.round((retail / savedTarget) * 100)) : 0;
  const hasTarget   = savedTarget > 0;
  const stars       = hasTarget ? starCount(pct) : 0;
  const color       = starColor(pct);

  return (
    <div
      onClick={() => { if (user?.role !== 'network_manager') onEdit(dealer); }}
      style={{
        background: 'white',
        borderRadius: '14px',
        padding: '0',
        boxShadow: '0 2px 12px rgba(0,0,0,0.07)',
        border: hasTarget ? '1.5px solid #e8eaf6' : '1.5px dashed #ddd',
        transition: 'all 0.2s',
        overflow: 'hidden',
        position: 'relative',
        cursor: user?.role === 'network_manager' ? 'default' : 'pointer',
      }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.12)'; }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.07)'; }}
    >
      {/* Top stripe (progress bar) */}
      <div style={{ height: '4px', background: '#f0f0f0' }}>
        {hasTarget && (
          <div style={{ width: `${pct}%`, height: '100%', background: color, transition: 'width 0.6s ease', borderRadius: '2px' }} />
        )}
      </div>

      <div style={{ padding: '16px' }}>
        {/* Header Row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <div style={{ width: '28px', height: '28px', background: '#fff0f0', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Target size={15} color="#CC0000" />
              </div>
              <span style={{ fontWeight: 800, color: '#1a1a2e', fontSize: '0.95rem', lineHeight: 1.2 }}>{dealer.name}</span>
            </div>
            <div style={{ paddingLeft: '36px' }}>
              <span style={{ fontSize: '0.72rem', background: '#f4f4f4', color: '#555', padding: '2px 8px', borderRadius: '10px', fontWeight: 700 }}>
                {dealer.dealer_code}
              </span>
              {dealer.dealer_type && (
                <span style={{ fontSize: '0.72rem', background: '#e8f4fd', color: '#2980b9', padding: '2px 8px', borderRadius: '10px', fontWeight: 700, marginLeft: '4px' }}>
                  {dealer.dealer_type}
                </span>
              )}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            {hasTarget ? (
              <>
                <div style={{ fontSize: '1.1rem', fontWeight: 900, color }}>
                  {pct}%
                </div>
                <div style={{ fontSize: '0.7rem', color: '#999', fontWeight: 600 }}>ACHIEVED</div>
              </>
            ) : (
              <span style={{ fontSize: '0.72rem', color: '#aaa', background: '#f8f8f8', padding: '4px 8px', borderRadius: '8px', fontWeight: 600 }}>
                No Target
              </span>
            )}
          </div>
        </div>

        {/* Stats Row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '12px' }}>
          <div style={{ textAlign: 'center', background: '#f8f9fa', padding: '10px 6px', borderRadius: '10px' }}>
            <div style={{ fontSize: '0.65rem', color: '#3498db', fontWeight: 800, textTransform: 'uppercase', marginBottom: '4px' }}>Target</div>
            <div style={{ fontSize: '1.3rem', fontWeight: 900, color: '#1a1a2e', lineHeight: 1 }}>{savedTarget}</div>
          </div>
          <div style={{ textAlign: 'center', background: '#f8f9fa', padding: '10px 6px', borderRadius: '10px' }}>
            <div style={{ fontSize: '0.65rem', color: '#27ae60', fontWeight: 800, textTransform: 'uppercase', marginBottom: '4px' }}>Achieved</div>
            <div style={{ fontSize: '1.3rem', fontWeight: 900, color: '#27ae60', lineHeight: 1 }}>{retail}</div>
          </div>
          <div style={{ textAlign: 'center', background: '#f8f9fa', padding: '10px 6px', borderRadius: '10px' }}>
            <div style={{ fontSize: '0.65rem', color: '#f39c12', fontWeight: 800, textTransform: 'uppercase', marginBottom: '4px' }}>Balance</div>
            <div style={{ fontSize: '1.3rem', fontWeight: 900, color: '#f39c12', lineHeight: 1 }}>{Math.max(0, savedTarget - retail)}</div>
          </div>
        </div>

        {/* Stars + Edit button */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: '1rem', letterSpacing: '2px' }}>
            {hasTarget ? (
              <>
                {'⭐'.repeat(stars)}
                <span style={{ color: '#ddd' }}>{'☆'.repeat(5 - stars)}</span>
              </>
            ) : (
              <span style={{ color: '#ccc', fontSize: '0.85rem' }}>☆☆☆☆☆</span>
            )}
          </div>
          {user?.role !== 'network_manager' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#CC0000', fontSize: '0.78rem', fontWeight: 700 }}>
              <Edit3 size={13} />
              {hasTarget ? 'Edit Target' : 'Set Target'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Target Edit Drawer ───────────────────────────────────────────────────────
function TargetDrawer({ dealer, models, filterMonth, onClose, onSaved, onModelUpdated }) {
  const [dealerTargets, setDealerTargets] = useState({});
  const [savedTotal, setSavedTotal]       = useState(0);
  const [performance, setPerformance]     = useState(null);
  const [isSaving, setIsSaving]           = useState(false);
  const [isLoading, setIsLoading]         = useState(true);

  const load = useCallback(async () => {
    if (!dealer) return;
    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      const [tRes, pRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/targets?target_type=dealer&target_id=${dealer.id}&month=${filterMonth}`, { headers }),
        axios.get(`${API_BASE_URL}/dealers/${dealer.id}/performance?month=${filterMonth}`, { headers }),
      ]);
      
      if (tRes.data.success && tRes.data.data.length > 0) {
        setSavedTotal(tRes.data.data.reduce((s, t) => s + (t.target_qty || 0), 0));
        // Also map individual model targets so we can edit them
        const targetsMap = {};
        tRes.data.data.forEach(t => {
          if (t.model_id) targetsMap[t.model_id] = t.target_qty;
        });
        setDealerTargets(targetsMap);
      } else {
        setSavedTotal(0);
        setDealerTargets({});
      }
      
      if (pRes.data.success) setPerformance(pRes.data.data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }, [dealer, filterMonth]);

  useEffect(() => { load(); }, [load]);

  const toggleFocus = async (model) => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.put(`${API_BASE_URL}/master/models/${model.id}/focus`, 
        { is_focus: !model.is_focus },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.data.success) {
        toast.success(res.data.message);
        if (onModelUpdated) onModelUpdated();
      }
    } catch (e) {
      toast.error('Failed to update focus');
    }
  };

  const handleChange = (modelId, val) => {
    if (val !== '' && !/^\d+$/.test(val)) return;
    setDealerTargets(prev => ({ ...prev, [modelId]: val === '' ? '' : parseInt(val, 10) }));
  };

  const handleSave = async () => {
    const arr = Object.keys(dealerTargets)
      .map(id => ({ model_id: parseInt(id, 10), target_qty: parseInt(dealerTargets[id] || 0, 10) }))
      .filter(t => t.target_qty > 0);
    if (arr.length === 0) return toast.error('Please enter at least one model target.');
    setIsSaving(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(`${API_BASE_URL}/targets`, {
        target_type: 'dealer', target_id: dealer.id, month: filterMonth, targets: arr
      }, { headers: { Authorization: `Bearer ${token}` } });
      if (res.data.success) {
        toast.success('Target saved!');
        await load();
        onSaved(dealer.id, arr.reduce((s, t) => s + t.target_qty, 0));
        onClose(); // Automatically close drawer on success
      } else {
        toast.error(res.data.message || 'Save failed');
      }
    } catch (e) {
      toast.error(e.response?.data?.message || 'Save failed');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this target?')) return;
    setIsSaving(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.delete(`${API_BASE_URL}/targets?target_type=dealer&target_id=${dealer.id}&month=${filterMonth}`, { 
        headers: { Authorization: `Bearer ${token}` } 
      });
      if (res.data.success) {
        toast.success('Target deleted!');
        onSaved(dealer.id, 0); 
        onClose(); 
      } else {
        toast.error(res.data.message || 'Delete failed');
      }
    } catch (e) {
      toast.error('Failed to delete target');
    } finally {
      setIsSaving(false);
    }
  };

  const currentTotal = Object.values(dealerTargets).reduce((s, v) => s + (parseInt(v) || 0), 0);
  const displayTarget = currentTotal > 0 ? currentTotal : savedTotal;
  const retail = performance?.totalRetail || 0;
  const pct = displayTarget > 0 ? Math.min(100, Math.round((retail / displayTarget) * 100)) : 0;
  const color = starColor(pct);
  const stars = displayTarget > 0 ? starCount(pct) : 0;

  return (
    <div style={{
      position: 'fixed', top: 0, right: 0, width: '440px', height: '100vh',
      background: 'white', boxShadow: '-8px 0 40px rgba(0,0,0,0.15)',
      zIndex: 1000, display: 'flex', flexDirection: 'column', overflowY: 'auto'
    }}>
      {/* Drawer Header */}
      <div style={{ background: 'linear-gradient(135deg, #1a1a2e, #0f3460)', padding: '24px', color: 'white', position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.6)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: '6px' }}>
              Setting Target · {filterMonth}
            </div>
            <div style={{ fontSize: '1.2rem', fontWeight: 900, lineHeight: 1.2 }}>{dealer.name}</div>
            <div style={{ marginTop: '8px', display: 'flex', gap: '6px' }}>
              <span style={{ background: 'rgba(255,255,255,0.15)', padding: '3px 10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 700 }}>
                {dealer.dealer_code}
              </span>
              {dealer.dealer_type && (
                <span style={{ background: 'rgba(255,255,255,0.1)', padding: '3px 10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 700 }}>
                  {dealer.dealer_type}
                </span>
              )}
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '10px', width: '36px', height: '36px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={18} color="white" />
          </button>
        </div>

        {/* Performance summary inside header */}
        <div style={{ marginTop: '18px', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
          {[
            { label: 'Target', val: displayTarget, c: '#60a5fa' },
            { label: 'Achieved', val: retail, c: '#34d399' },
            { label: 'Balance', val: Math.max(0, displayTarget - retail), c: '#fbbf24' },
            { label: 'Pct', val: `${pct}%`, c: color === '#CC0000' ? '#f87171' : color === '#27ae60' ? '#34d399' : '#fbbf24' },
          ].map(s => (
            <div key={s.label} style={{ background: 'rgba(255,255,255,0.08)', borderRadius: '10px', padding: '10px 8px', textAlign: 'center' }}>
              <div style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.55)', fontWeight: 700, textTransform: 'uppercase', marginBottom: '4px' }}>{s.label}</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 900, color: s.c }}>{s.val}</div>
            </div>
          ))}
        </div>

        {/* Progress bar */}
        <div style={{ marginTop: '14px', height: '6px', background: 'rgba(255,255,255,0.15)', borderRadius: '3px', overflow: 'hidden' }}>
          <div style={{ width: `${pct}%`, height: '100%', background: color, transition: 'width 0.5s ease', borderRadius: '3px' }} />
        </div>
        <div style={{ marginTop: '6px', display: 'flex', justifyContent: 'space-between' }}>
          <div style={{ fontSize: '0.85rem', letterSpacing: '2px' }}>
            {'⭐'.repeat(stars)}<span style={{ opacity: 0.3 }}>{'☆'.repeat(5 - stars)}</span>
          </div>
          <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.72rem', fontWeight: 600 }}>{pct}% achieved</span>
        </div>
      </div>

      {/* Model List */}
      <div style={{ flex: 1, padding: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#888', textTransform: 'uppercase', letterSpacing: 1, marginBottom: '4px', display: 'flex', justifyContent: 'space-between' }}>
          <span>Model</span>
          <span>Monthly Target (Units)</span>
        </div>

        {isLoading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>Loading...</div>
        ) : models.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>No models found.</div>
        ) : (
          models.map(m => {
            const val = dealerTargets[m.id];
            const has = val !== undefined && val !== '' && val > 0;
            return (
              <div key={m.id} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                background: has ? '#fff8f8' : '#fafafa',
                padding: '12px 16px', borderRadius: '10px',
                border: has ? '1.5px solid #f3c1c1' : '1.5px solid #eee',
                transition: 'all 0.15s'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '6px', height: '32px', borderRadius: '3px', background: m.type === 'Scooter' ? '#3498db' : '#9b59b6', flexShrink: 0 }} />
                  <div>
                    <div style={{ fontWeight: 700, color: '#1a1a2e', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {m.name}
                      <span 
                        onClick={() => toggleFocus(m)}
                        style={{ cursor: 'pointer', opacity: m.is_focus ? 1 : 0.2, filter: m.is_focus ? 'drop-shadow(0 0 2px #CC0000)' : 'none', transition: 'all 0.2s' }}
                        title={m.is_focus ? "Remove Focus" : "Mark as Focus Model"}
                      >
                        ⭐
                      </span>
                    </div>
                    <div style={{ fontSize: '0.68rem', color: '#aaa', textTransform: 'uppercase', fontWeight: 600 }}>{m.type}</div>
                  </div>
                </div>
                <input
                  type="number" min="0"
                  value={val !== undefined ? val : ''}
                  onChange={e => handleChange(m.id, e.target.value)}
                  placeholder="0"
                  style={{
                    width: '80px', height: '42px', textAlign: 'center', borderRadius: '10px',
                    border: has ? '2px solid #CC0000' : '2px solid #ddd',
                    fontWeight: 900, color: has ? '#CC0000' : '#333',
                    fontSize: '1.2rem', outline: 'none', transition: 'all 0.15s'
                  }}
                  onFocus={e => e.target.style.borderColor = '#CC0000'}
                  onBlur={e => e.target.style.borderColor = has ? '#CC0000' : '#ddd'}
                />
              </div>
            );
          })
        )}
      </div>

      {/* Drawer Footer */}
      <div style={{ padding: '16px 20px', borderTop: '1px solid #f0f0f0', background: 'white', position: 'sticky', bottom: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <span style={{ color: '#888', fontSize: '0.85rem', fontWeight: 600 }}>Total Target</span>
          <span style={{ color: currentTotal > 0 ? '#CC0000' : '#333', fontWeight: 900, fontSize: '1.3rem' }}>
            {currentTotal > 0 ? currentTotal : (savedTotal || '—')}
          </span>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {savedTotal > 0 && (
            <button
              onClick={handleDelete}
              disabled={isSaving}
              style={{
                background: '#f8d7da', color: '#CC0000', border: 'none', padding: '14px', borderRadius: '12px',
                cursor: isSaving ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', 
                flex: '0 0 50px', transition: 'all 0.2s'
              }}
              title="Delete Target"
            >
              <Trash2 size={18} />
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={isSaving}
            style={{
              flex: 1, background: isSaving ? '#ccc' : 'linear-gradient(135deg, #CC0000, #ff4757)',
              color: 'white', border: 'none', padding: '14px', borderRadius: '12px',
              fontSize: '1rem', fontWeight: 800, cursor: isSaving ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              boxShadow: isSaving ? 'none' : '0 4px 18px rgba(204,0,0,0.35)', transition: 'all 0.2s'
            }}
          >
            <Save size={18} />
            {isSaving ? 'Saving...' : 'Save Target'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function Targets() {
  const [dealers,      setDealers]      = useState([]);
  const [models,       setModels]       = useState([]);
  const [allTargets,   setAllTargets]   = useState({}); // dealerId -> { target_qty, retail }
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const [loading,      setLoading]      = useState(true);
  const [filterMonth,  setFilterMonth]  = useState(() => {
    const t = new Date();
    return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}`;
  });
  const [editDealer, setEditDealer] = useState(null); // dealer object being edited

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const token   = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      const [dlRes, treeRes, targetsRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/dealers`,                                          { headers }),
        axios.get(`${API_BASE_URL}/master/inventory-tree`,                            { headers }),
        axios.get(`${API_BASE_URL}/targets?target_type=dealer&month=${filterMonth}`,  { headers }),
      ]);

      const activeD = dlRes.data.success
        ? dlRes.data.data.filter(d => d.status === 'active')
        : [];
      setDealers(activeD);

      if (treeRes.data.success) {
        setModels(treeRes.data.data.map(m => ({ id: m.id, name: m.name, type: m.type, is_focus: m.is_focus === 1 })));
      }

      // Build targets map: dealerId -> { target_qty, retail }
      const tMap = {};
      
      // If we could get performance for all dealers for this month, we'd add it here.
      // We will loop through dealers and try to fetch their performance to populate retail data in the grid.
      // However, making 20 API calls might be slow, so we'll do it if there's a specific route or skip it.
      // Since there's no bulk performance endpoint we just initialize retail as 0. 
      // The drawer fetches performance individually which is fine.

      if (targetsRes.data.success) {
        targetsRes.data.data.forEach(t => {
          if (!tMap[t.target_id]) tMap[t.target_id] = { target_qty: 0, retail: 0 };
          tMap[t.target_id].target_qty += t.target_qty || 0;
        });
      }
      
      setAllTargets(tMap);
    } catch (e) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [filterMonth]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleSaved = (dealerId, newTotal) => {
    setAllTargets(prev => ({
      ...prev,
      [dealerId]: { ...(prev[dealerId] || {}), target_qty: newTotal }
    }));
  };

  const dealersWithTarget    = dealers.filter(d => allTargets[d.id]?.target_qty > 0);
  const dealersWithoutTarget = dealers.filter(d => !allTargets[d.id]?.target_qty);

  const totalTarget   = Object.values(allTargets).reduce((s, t) => s + (t.target_qty || 0), 0);
  const totalAchieved = Object.values(allTargets).reduce((s, t) => s + (t.retail || 0), 0);
  const overallPct    = totalTarget > 0 ? Math.min(100, Math.round((totalAchieved / totalTarget) * 100)) : 0;

  const generateReport = () => {
    let csv = "Dealer Name,Dealer Code,Type,Month,Target,Achieved,Balance\n";
    dealersWithTarget.forEach(d => {
      const t = allTargets[d.id] || {};
      const target = t.target_qty || 0;
      const retail = t.retail || 0;
      const balance = Math.max(0, target - retail);
      csv += `"${d.name}","${d.dealer_code}","${d.dealer_type || ''}","${filterMonth}",${target},${retail},${balance}\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Targets_Report_${filterMonth}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

      {/* ── Header ── */}
      <div style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)', padding: '28px 32px', borderRadius: '20px', boxShadow: '0 8px 32px rgba(0,0,0,0.18)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '14px', color: '#fff', margin: 0, fontSize: '1.9rem', fontWeight: 800 }}>
            <div style={{ background: 'linear-gradient(135deg, #CC0000, #ff4757)', borderRadius: '12px', padding: '10px', display: 'flex' }}>
              <Crosshair size={28} color="white" />
            </div>
            Monthly Target Manager
          </h1>
          <p style={{ color: '#8fa3bf', margin: '10px 0 0', fontSize: '1rem', fontWeight: 500 }}>
            Set model-wise sales targets per dealer. Click any card to edit.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
          {[
            { label: 'Active Dealers', val: dealers.length, c: 'white' },
            { label: 'Targets Set',    val: dealersWithTarget.length, c: '#34d399' },
          ].map(s => (
            <div key={s.label} style={{ textAlign: 'right' }}>
              <div style={{ color: '#8fa3bf', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>{s.label}</div>
              <div style={{ color: s.c, fontSize: '2rem', fontWeight: 900, lineHeight: 1 }}>{s.val}</div>
            </div>
          ))}
          <button 
            onClick={generateReport}
            style={{
              background: 'rgba(255,255,255,0.1)', color: 'white', border: '1px solid rgba(255,255,255,0.2)',
              padding: '10px 16px', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '8px',
              fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s',
              marginLeft: '10px'
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
          >
            <Download size={16} />
            Target Report
          </button>
        </div>
      </div>

      {/* ── Month Filter ── */}
      <div style={{ background: 'white', padding: '16px 24px', borderRadius: '14px', display: 'flex', alignItems: 'center', gap: '16px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', border: '1px solid #f1f2f6' }}>
        <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#555', textTransform: 'uppercase', letterSpacing: 1 }}>Month</label>
        <input
          type="month"
          value={filterMonth}
          onChange={e => setFilterMonth(e.target.value)}
          style={{ height: '42px', borderRadius: '10px', border: '2px solid #e0e0e0', padding: '0 14px', fontSize: '1rem', outline: 'none', cursor: 'pointer' }}
          onFocus={e => e.target.style.borderColor = '#CC0000'}
          onBlur={e => e.target.style.borderColor = '#e0e0e0'}
        />
        {/* Network progress */}
        {totalTarget > 0 && (
          <div style={{ flex: 1, marginLeft: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#555' }}>Network Achievement</span>
              <span style={{ fontSize: '0.8rem', fontWeight: 800, color: starColor(overallPct) }}>{overallPct}%</span>
            </div>
            <div style={{ height: '8px', background: '#f0f0f0', borderRadius: '4px', overflow: 'hidden' }}>
              <div style={{ width: `${overallPct}%`, height: '100%', background: starColor(overallPct), borderRadius: '4px', transition: 'width 0.6s ease' }} />
            </div>
          </div>
        )}
        {loading && <span style={{ color: '#aaa', fontSize: '0.85rem', marginLeft: 'auto' }}>Loading...</span>}
      </div>

      {/* ── Dealers WITH target ── */}
      {dealersWithTarget.length > 0 && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
            <CheckCircle size={18} color="#27ae60" />
            <span style={{ fontWeight: 800, color: '#1a1a2e', fontSize: '1rem' }}>Targets Set</span>
            <span style={{ background: '#e8f8f0', color: '#27ae60', padding: '2px 10px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 700 }}>
              {dealersWithTarget.length} dealers
            </span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
            {dealersWithTarget.map(d => (
              <DealerCard key={d.id} dealer={d} targetData={allTargets[d.id]} onEdit={setEditDealer} user={user} />
            ))}
          </div>
        </div>
      )}

      {/* ── Dealers WITHOUT target ── */}
      {dealersWithoutTarget.length > 0 && (
        <div style={{ marginTop: dealersWithTarget.length > 0 ? '16px' : '0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
            <Clock size={18} color="#f39c12" />
            <span style={{ fontWeight: 800, color: '#1a1a2e', fontSize: '1rem' }}>Awaiting Target</span>
            <span style={{ background: '#fff8e1', color: '#f39c12', padding: '2px 10px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 700 }}>
              {dealersWithoutTarget.length} dealers
            </span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
            {dealersWithoutTarget.map(d => (
              <DealerCard key={d.id} dealer={d} targetData={null} onEdit={setEditDealer} user={user} />
            ))}
          </div>
        </div>
      )}

      {!loading && dealers.length === 0 && (
        <div style={{ background: 'white', borderRadius: '16px', padding: '60px', textAlign: 'center' }}>
          <div style={{ fontSize: '3.5rem', marginBottom: '16px' }}>🎯</div>
          <h3 style={{ color: '#1a1a2e', margin: '0 0 8px' }}>No Active Dealers</h3>
          <p style={{ color: '#888', margin: 0 }}>No active dealers found in the system.</p>
        </div>
      )}

      {/* ── Backdrop ── */}
      {editDealer && (
        <div
          onClick={() => setEditDealer(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 999, backdropFilter: 'blur(2px)' }}
        />
      )}

      {/* ── Target Edit Drawer ── */}
      {editDealer && (
        <TargetDrawer
          dealer={editDealer}
          models={models}
          filterMonth={filterMonth}
          onClose={() => setEditDealer(null)}
          onSaved={handleSaved}
          onModelUpdated={fetchAll}
        />
      )}
    </div>
  );
}

