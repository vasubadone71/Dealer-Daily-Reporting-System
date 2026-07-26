import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { Package, Search, Minus, Plus, Upload, Save, Send } from 'lucide-react';
import { API_BASE_URL } from '../config';
import InvoicePrintModal from '../components/InvoicePrintModal';

export default function Dispatches() {
  const [dealers, setDealers] = useState([]);
  const [inventoryTree, setInventoryTree] = useState([]);
  
  const [dealerId, setDealerId] = useState('');
  const [dispatchDate, setDispatchDate] = useState(new Date().toISOString().split('T')[0]);
  const [searchTerm, setSearchTerm] = useState('');
  
  // quantities: { variant_color_id: qty }
  const [quantities, setQuantities] = useState({});
  const [saving, setSaving] = useState(false);
  
  const [isOpeningStockMode, setIsOpeningStockMode] = useState(false);
  const [isReset, setIsReset] = useState(false);
  
  // Invoice print states
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [printData, setPrintData] = useState(null);
  
  // Need to know if super admin to show reset checkbox
  const [userRole, setUserRole] = useState('');

  useEffect(() => {
    fetchDealers();
    fetchInventoryTree();
    
    try {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        const user = JSON.parse(userStr);
        setUserRole(user.role);
      }
    } catch(e) {}
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
      toast.error('Failed to load dealers');
    }
  };

  const fetchInventoryTree = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_BASE_URL}/master/inventory-tree`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        setInventoryTree(res.data.data);
      }
    } catch (e) {
      toast.error('Failed to load inventory tree');
    }
  };

  // Extract flat models with their colors
  const models = useMemo(() => {
    return inventoryTree.map(model => {
      // Assuming a dummy 'Base' variant holds all the colors
      const colors = model.variants.length > 0 ? model.variants[0].colors : [];
      return {
        id: model.id,
        name: model.name,
        type: model.type, // 'Scooter' or 'Motorcycle'
        colors: colors.sort((a, b) => a.color_name.localeCompare(b.color_name))
      };
    });
  }, [inventoryTree]);

  const filteredModels = useMemo(() => {
    if (!searchTerm) return models;
    const lower = searchTerm.toLowerCase();
    return models.filter(m => m.name.toLowerCase().includes(lower));
  }, [models, searchTerm]);

  const handleQtyChange = (vcId, value) => {
    let num = parseInt(value, 10);
    if (isNaN(num) || num < 0) num = 0;
    
    setQuantities(prev => {
        const next = { ...prev };
        if (num === 0) {
            delete next[vcId];
        } else {
            next[vcId] = num;
        }
        return next;
    });
  };

  const incrementQty = (vcId) => {
    setQuantities(prev => ({ ...prev, [vcId]: (prev[vcId] || 0) + 1 }));
  };

  const decrementQty = (vcId) => {
    setQuantities(prev => {
      const current = prev[vcId] || 0;
      if (current <= 1) {
          const next = { ...prev };
          delete next[vcId];
          return next;
      }
      return { ...prev, [vcId]: current - 1 };
    });
  };

  // Calculations for Summary
  const totals = useMemo(() => {
    let scooterTotal = 0;
    let mcTotal = 0;
    let totalQty = 0;
    const colorVariants = new Set();

    Object.entries(quantities).forEach(([vcId, qty]) => {
      if (qty > 0) {
        totalQty += qty;
        colorVariants.add(vcId);
        
        // Find which model type this belongs to
        const model = models.find(m => m.colors.some(c => c.variant_color_id === parseInt(vcId, 10)));
        if (model) {
          if (model.type === 'Scooter') scooterTotal += qty;
          else if (model.type === 'Motorcycle') mcTotal += qty;
        }
      }
    });

    return { scooterTotal, mcTotal, totalQty, colorsCount: colorVariants.size };
  }, [quantities, models]);

  const handleSave = async (e) => {
    if (e) e.preventDefault();
    if (!dealerId || !dispatchDate) return toast.error('Dealer and Date are required.');
    
    const itemsArray = Object.entries(quantities)
      .filter(([_, qty]) => qty > 0)
      .map(([vcId, qty]) => ({
          variant_color_id: parseInt(vcId, 10),
          quantity: parseInt(qty, 10)
      }));

    if (itemsArray.length === 0) return toast.error('Please enter at least one dispatch quantity.');

    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(`${API_BASE_URL}/dispatches`, {
        dealerId,
        date: dispatchDate,
        items: itemsArray,
        isOpeningStock: isOpeningStockMode,
        isReset: isReset
      }, { headers: { Authorization: `Bearer ${token}` } });

      if (res.data.success) {
        toast.success(isOpeningStockMode ? 'Opening Stock Initialized!' : 'Dispatch saved and dealer notified!');
        
        // Prepare print invoice data
        if (!isOpeningStockMode) {
          const selectedDealerObj = dealers.find(d => d.id === parseInt(dealerId));
          const invoiceItems = [];
          Object.entries(quantities).forEach(([vcId, qty]) => {
            if (qty > 0) {
              const model = models.find(m => m.colors.some(c => c.variant_color_id === parseInt(vcId)));
              const color = model?.colors.find(c => c.variant_color_id === parseInt(vcId));
              invoiceItems.push({
                model_name: model?.name || 'Unknown',
                color_name: color?.color_name || 'Unknown',
                hex_code: color?.hex_code || '#ccc',
                qty: qty
              });
            }
          });
          
          setPrintData({
            dealer: selectedDealerObj,
            date: dispatchDate,
            items: invoiceItems,
            dispatchId: res.data.data?.id
          });
          setShowPrintModal(true);
        }

        setQuantities({});
        setDealerId('');
      }
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to save dispatch');
    } finally {
      setSaving(false);
    }
  };

  const handleExcelImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const text = evt.target.result;
        const lines = text.split('\n').map(l => l.trim()).filter(l => l);
        if (lines.length < 2) return toast.error('CSV appears to be empty.');

        let importedDealerCode = null;
        const newQuantities = { ...quantities };
        let importCount = 0;
        
        // Skip header line
        for (let i = 1; i < lines.length; i++) {
          const parts = lines[i].split(',').map(p => p.trim());
          if (parts.length >= 4) {
            const dealerCode = parts[0];
            const modelName = parts[1];
            const colorName = parts[2];
            const qty = parseInt(parts[3], 10);

            if (!importedDealerCode) importedDealerCode = dealerCode;
            if (importedDealerCode !== dealerCode) continue; // Only process one dealer at a time

            if (qty > 0) {
              const targetModel = models.find(m => m.name.toLowerCase() === modelName.toLowerCase());
              if (targetModel) {
                const targetColor = targetModel.colors.find(c => c.color_name.toLowerCase() === colorName.toLowerCase());
                if (targetColor) {
                  newQuantities[targetColor.variant_color_id] = (newQuantities[targetColor.variant_color_id] || 0) + qty;
                  importCount++;
                }
              }
            }
          }
        }

        if (importCount > 0) {
           const targetDealer = dealers.find(d => d.dealer_code.toLowerCase() === importedDealerCode.toLowerCase());
           if (targetDealer) setDealerId(targetDealer.id);
           setQuantities(newQuantities);
           toast.success(`Imported ${importCount} items successfully.`);
        } else {
           toast.error('No matching models/colors found in CSV.');
        }
      } catch (err) {
        console.error(err);
        toast.error('Failed to parse CSV.');
      }
    };
    reader.readAsText(file);
    e.target.value = ''; // reset file input
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 100px)', overflow: 'hidden' }}>
      
      {/* Top Header & Filters */}
      <div style={{ flexShrink: 0, paddingBottom: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
          <div>
            <h1 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#1a1a2e', margin: 0 }}>
              <Package size={28} color="#CC0000" /> {isOpeningStockMode ? 'Initialize Opening Stock' : 'Fast Dispatch Entry'}
            </h1>
            <p style={{ color: '#666', marginTop: '4px' }}>{isOpeningStockMode ? 'Set the initial physical stock for a dealer.' : 'Color-wise unified dispatch system.'}</p>
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <button 
              className={`btn ${isOpeningStockMode ? 'btn-primary' : 'btn-secondary'}`} 
              onClick={() => setIsOpeningStockMode(!isOpeningStockMode)}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', border: isOpeningStockMode ? 'none' : '1px solid #ccc' }}
            >
              {isOpeningStockMode ? 'Switch to Dispatch Entry' : 'Initialize Opening Stock'}
            </button>

            {isOpeningStockMode && (
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#CC0000', fontWeight: '600', cursor: 'pointer', background: '#fff0f0', padding: '0 10px', borderRadius: '6px', border: '1px solid #ffcccc' }}>
                <input type="checkbox" checked={isReset} onChange={e => setIsReset(e.target.checked)} />
                Overwrite Existing
              </label>
            )}

            {!isOpeningStockMode && (
              <label className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <Upload size={16} /> Excel Import
                <input type="file" accept=".csv" onChange={handleExcelImport} style={{ display: 'none' }} />
              </label>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '16px', background: 'white', padding: '16px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', flexWrap: 'wrap' }}>
          <div style={{ flex: 1 }}>
            <select 
              value={dealerId} 
              onChange={e => setDealerId(e.target.value)}
              style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '2px solid #e0e0e0', outline: 'none', fontSize: '1rem', fontWeight: 600 }}
            >
              <option value="">-- Select Dealer --</option>
              {dealers.map(d => (
                <option key={d.id} value={d.id}>{d.dealer_code} - {d.name}</option>
              ))}
            </select>
          </div>
          <div style={{ width: '200px' }}>
            <input 
              type="date" 
              value={dispatchDate} 
              onChange={e => setDispatchDate(e.target.value)}
              style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '2px solid #e0e0e0', outline: 'none', fontSize: '1rem' }}
            />
          </div>
          <div style={{ flex: 1, position: 'relative' }}>
            <Search size={20} color="#999" style={{ position: 'absolute', left: '12px', top: '14px' }} />
            <input 
              type="text"
              placeholder="Search Activa, SP125..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{ width: '100%', padding: '12px 12px 12px 40px', borderRadius: '8px', border: '2px solid #e0e0e0', outline: 'none', fontSize: '1rem' }}
            />
          </div>
        </div>
      </div>

      {/* Main Grid Area (Scrollable) */}
      <div style={{ flex: 1, overflowY: 'auto', paddingRight: '4px', paddingBottom: '20px' }}>
        <div style={{ columnCount: 'auto', columnWidth: '320px', columnGap: '20px' }}>
          {filteredModels.map(model => {
            let modelTotal = 0;
            model.colors.forEach(c => {
                modelTotal += (quantities[c.variant_color_id] || 0);
            });

            return (
              <div key={model.id} style={{ breakInside: 'avoid', marginBottom: '20px', background: 'white', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', border: '1px solid #f0f0f0', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <div style={{ background: '#CC0000', padding: '12px 16px', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>{model.name}</h3>
                  <span style={{ background: 'rgba(255,255,255,0.2)', padding: '2px 8px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 600 }}>Total: {modelTotal}</span>
                </div>
                
                <div style={{ padding: '12px', flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {model.colors.map(color => {
                    const qty = quantities[color.variant_color_id] || 0;
                    return (
                      <div key={color.variant_color_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: qty > 0 ? '#fff5f5' : '#f8f9fa', borderRadius: '8px', border: qty > 0 ? '1px solid #fcc' : '1px solid transparent' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                           <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: color.hex_code, border: '1px solid #ddd' }}></div>
                           <span style={{ fontSize: '0.9rem', fontWeight: qty > 0 ? 700 : 500, color: '#1a1a2e' }}>{color.color_name}</span>
                        </div>
                        
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <button 
                            onClick={() => decrementQty(color.variant_color_id)}
                            style={{ width: '28px', height: '28px', borderRadius: '6px', background: '#fff', border: '1px solid #ddd', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#666' }}
                          >
                            <Minus size={14} />
                          </button>
                          <input 
                            type="text" 
                            value={qty === 0 ? '' : qty} 
                            onChange={(e) => handleQtyChange(color.variant_color_id, e.target.value)}
                            placeholder="0"
                            style={{ width: '40px', height: '28px', textAlign: 'center', border: '1px solid #ddd', borderRadius: '6px', fontSize: '0.9rem', fontWeight: 600, outline: 'none' }}
                          />
                          <button 
                            onClick={() => incrementQty(color.variant_color_id)}
                            style={{ width: '28px', height: '28px', borderRadius: '6px', background: '#fff', border: '1px solid #ddd', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#666' }}
                          >
                            <Plus size={14} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
          {filteredModels.length === 0 && (
            <div style={{ gridColumn: '1 / -1', padding: '40px', textAlign: 'center', color: '#666' }}>No models found matching "{searchTerm}"</div>
          )}
        </div>
      </div>

      {/* Sticky Bottom Footer Summary */}
      <div style={{ flexShrink: 0, background: 'white', borderRadius: '12px 12px 0 0', boxShadow: '0 -4px 12px rgba(0,0,0,0.05)', padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '2px solid #CC0000', marginTop: '10px' }}>
        <div style={{ display: 'flex', gap: '40px' }}>
          <div>
            <div style={{ fontSize: '0.75rem', color: '#666', textTransform: 'uppercase', fontWeight: 700 }}>Scooter Total</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#1a1a2e' }}>{totals.scooterTotal}</div>
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: '#666', textTransform: 'uppercase', fontWeight: 700 }}>Motorcycle Total</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#1a1a2e' }}>{totals.mcTotal}</div>
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: '#666', textTransform: 'uppercase', fontWeight: 700 }}>Color Variants Selected</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#1a1a2e' }}>{totals.colorsCount}</div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.8rem', color: '#CC0000', textTransform: 'uppercase', fontWeight: 800 }}>Grand Total</div>
            <div style={{ fontSize: '2.2rem', fontWeight: 900, color: '#CC0000', lineHeight: 1 }}>{totals.totalQty}</div>
          </div>
          
          {isOpeningStockMode && userRole === 'super_admin' && (
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.9rem', color: '#666' }}>
              <input type="checkbox" checked={isReset} onChange={e => setIsReset(e.target.checked)} />
              Force Reset (Archive Old)
            </label>
          )}
          <button 
            onClick={handleSave}
            disabled={saving || totals.totalQty === 0}
            style={{ 
                background: (saving || totals.totalQty === 0) ? '#e0e0e0' : (isOpeningStockMode ? '#27ae60' : '#CC0000'), 
                color: (saving || totals.totalQty === 0) ? '#999' : 'white', 
                border: 'none', 
                padding: '16px 32px', 
                borderRadius: '8px', 
                fontSize: '1.1rem', 
                fontWeight: 700, 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px',
                cursor: (saving || totals.totalQty === 0) ? 'not-allowed' : 'pointer',
                transition: '0.2s'
            }}
          >
            {saving ? 'Saving...' : (isOpeningStockMode ? 'Save Opening Stock' : 'Create Dispatch')} <Send size={20} />
          </button>
        </div>
      </div>
      
      <InvoicePrintModal 
        isOpen={showPrintModal} 
        onClose={() => setShowPrintModal(false)} 
        dispatchData={printData} 
      />
    </div>
  );
}
