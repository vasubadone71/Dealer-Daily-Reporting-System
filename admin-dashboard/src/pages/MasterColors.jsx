import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../config';
import { Plus, Edit2, Trash2, Save, X, CheckCircle } from 'lucide-react';

export default function MasterColors() {
    const [inventoryTree, setInventoryTree] = useState([]);
    const [colors, setColors] = useState([]);
    
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [successMsg, setSuccessMsg] = useState('');
    
    const [newColorName, setNewColorName] = useState('');
    const [newColorHex, setNewColorHex] = useState('#000000');

    const [selectedVariantId, setSelectedVariantId] = useState('');
    const [selectedColorId, setSelectedColorId] = useState('');

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const headers = { Authorization: `Bearer ${token}` };
            
            const [treeRes, colorsRes] = await Promise.all([
                axios.get(`${API_BASE_URL}/master/inventory-tree`, { headers }),
                axios.get(`${API_BASE_URL}/master/colors`, { headers })
            ]);
            
            setInventoryTree(treeRes.data.data);
            setColors(colorsRes.data.data);
            setError(null);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to fetch master data');
        } finally {
            setLoading(false);
        }
    };

    const showSuccess = (msg) => {
        setSuccessMsg(msg);
        setTimeout(() => setSuccessMsg(''), 3000);
    };

    const handleAddColor = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token');
            await axios.post(`${API_BASE_URL}/master/colors`, 
                { name: newColorName, hex_code: newColorHex },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            showSuccess('Color added successfully!');
            setNewColorName('');
            fetchData();
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to add color');
        }
    };

    const handleAssignColor = async (e) => {
        e.preventDefault();
        if (!selectedVariantId || !selectedColorId) {
            setError('Please select a variant and a color');
            return;
        }
        try {
            const token = localStorage.getItem('token');
            await axios.post(`${API_BASE_URL}/master/variant-colors`, 
                { variant_id: selectedVariantId, color_id: selectedColorId },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            showSuccess('Color assigned to variant!');
            fetchData();
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to assign color');
        }
    };

    const handleRemoveColor = async (variantId, colorId) => {
        if (!window.confirm('Remove this color from the variant?')) return;
        try {
            const token = localStorage.getItem('token');
            await axios.delete(`${API_BASE_URL}/master/variant-colors/${variantId}/${colorId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            showSuccess('Color removed from variant!');
            fetchData();
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to remove color');
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <h1 style={{ fontSize: '1.4rem', color: '#1a1a2e', marginBottom: '4px' }}>Master Colors Management</h1>
            
            {error && <div style={{ background: '#fde8e8', color: '#CC0000', padding: '12px', borderRadius: '8px', border: '1px solid #fad2d2' }}>{error}</div>}
            {successMsg && <div style={{ background: '#e8f5e9', color: '#27ae60', padding: '12px', borderRadius: '8px', border: '1px solid #c3e6cb', display: 'flex', alignItems: 'center', gap: '8px' }}><CheckCircle size={16} /> {successMsg}</div>}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '20px' }}>
                {/* Add Global Color */}
                <div style={{ background: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', border: '1px solid #eee' }}>
                    <h2 style={{ fontSize: '1.1rem', color: '#1a1a2e', marginBottom: '16px' }}>Add Global Color</h2>
                    <form onSubmit={handleAddColor} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div className="form-group">
                            <label>Color Name</label>
                            <input 
                                type="text" 
                                required
                                value={newColorName}
                                onChange={e => setNewColorName(e.target.value)}
                                placeholder="e.g. Matte Axis Grey"
                                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ddd' }}
                            />
                        </div>
                        <div className="form-group">
                            <label>Hex Code</label>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <input 
                                    type="color" 
                                    value={newColorHex}
                                    onChange={e => setNewColorHex(e.target.value)}
                                    style={{ height: '40px', width: '60px', padding: '4px', cursor: 'pointer', border: '1px solid #ddd', borderRadius: '6px' }}
                                />
                                <span style={{ fontFamily: 'monospace', color: '#666' }}>{newColorHex.toUpperCase()}</span>
                            </div>
                        </div>
                        <button type="submit" className="btn-primary" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '10px' }}>
                            <Plus size={16} /> Add Global Color
                        </button>
                    </form>
                </div>

                {/* Assign Color to Variant */}
                <div style={{ background: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', border: '1px solid #eee' }}>
                    <h2 style={{ fontSize: '1.1rem', color: '#1a1a2e', marginBottom: '16px' }}>Assign Color to Variant</h2>
                    <form onSubmit={handleAssignColor} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div className="form-group">
                            <label>Select Model Variant</label>
                            <select 
                                required
                                value={selectedVariantId}
                                onChange={e => setSelectedVariantId(e.target.value)}
                                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ddd' }}
                            >
                                <option value="">-- Choose Variant --</option>
                                {inventoryTree.map(model => (
                                    <optgroup key={model.id} label={`${model.name} (${model.type})`}>
                                        {model.variants.map(v => (
                                            <option key={v.id} value={v.id}>{model.name} - {v.name}</option>
                                        ))}
                                    </optgroup>
                                ))}
                            </select>
                        </div>
                        <div className="form-group">
                            <label>Select Color</label>
                            <select 
                                required
                                value={selectedColorId}
                                onChange={e => setSelectedColorId(e.target.value)}
                                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ddd' }}
                            >
                                <option value="">-- Choose Color --</option>
                                {colors.map(c => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>
                        </div>
                        <button type="submit" className="btn-primary" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '10px' }}>
                            <Plus size={16} /> Assign to Variant
                        </button>
                    </form>
                </div>
            </div>

            {/* Inventory Tree Preview */}
            <div style={{ background: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', border: '1px solid #eee' }}>
                <h2 style={{ fontSize: '1.1rem', color: '#1a1a2e', marginBottom: '16px' }}>Current Vehicle Configurations</h2>
                {loading ? (
                    <div style={{ color: '#666' }}>Loading configurations...</div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        {inventoryTree.map(model => (
                            <div key={model.id} style={{ border: '1px solid #eee', borderRadius: '8px', overflow: 'hidden' }}>
                                <div style={{ background: '#f8f9fa', padding: '12px 16px', borderBottom: '1px solid #eee', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <h3 style={{ margin: 0, fontSize: '1.05rem', color: '#1a1a2e' }}>{model.name}</h3>
                                    <span style={{ fontSize: '0.75rem', fontWeight: 600, background: '#e2e3e5', padding: '4px 10px', borderRadius: '12px' }}>{model.type}</span>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                    {model.variants.map((variant, index) => (
                                        <div key={variant.id} style={{ padding: '16px', display: 'flex', flexWrap: 'wrap', gap: '16px', borderBottom: index < model.variants.length - 1 ? '1px solid #f5f5f5' : 'none' }}>
                                            <div style={{ flex: '1 1 200px', fontWeight: 600, color: '#444' }}>{variant.name}</div>
                                            <div style={{ flex: '3 1 400px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                                {variant.colors.length === 0 ? (
                                                    <span style={{ fontSize: '0.85rem', color: '#999', fontStyle: 'italic' }}>No colors assigned</span>
                                                ) : (
                                                    variant.colors.map(vc => (
                                                        <div key={vc.variant_color_id} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'white', border: '1px solid #e0e0e0', padding: '4px 10px', borderRadius: '20px', fontSize: '0.85rem', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                                                            <div style={{ width: '14px', height: '14px', borderRadius: '50%', border: '1px solid #ccc', backgroundColor: vc.hex_code }}></div>
                                                            <span style={{ color: '#444' }}>{vc.color_name}</span>
                                                            <button 
                                                                onClick={() => handleRemoveColor(variant.id, vc.color_id)}
                                                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#999', padding: '0 0 0 4px', display: 'flex', alignItems: 'center' }}
                                                                title="Remove color from variant"
                                                            >
                                                                <X size={14} />
                                                            </button>
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
