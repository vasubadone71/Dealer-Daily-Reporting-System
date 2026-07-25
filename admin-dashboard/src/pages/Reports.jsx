import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../config';
import { FileDown, Search, ChevronDown, ChevronUp, Calendar, X, Printer, BarChart, Download } from 'lucide-react';
import toast from 'react-hot-toast';
import InvoicePrintModal from '../components/InvoicePrintModal';

const MONTHS = [
  { value: '01', name: 'January' },
  { value: '02', name: 'February' },
  { value: '03', name: 'March' },
  { value: '04', name: 'April' },
  { value: '05', name: 'May' },
  { value: '06', name: 'June' },
  { value: '07', name: 'July' },
  { value: '08', name: 'August' },
  { value: '09', name: 'September' },
  { value: '10', name: 'October' },
  { value: '11', name: 'November' },
  { value: '12', name: 'December' }
];

export default function Reports() {
  const [activeTab, setActiveTab] = useState('liveStock');
  const [dealers, setDealers] = useState([]);
  const [networks, setNetworks] = useState([]);
  const [inventoryTree, setInventoryTree] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expandedRows, setExpandedRows] = useState({});

  // Auth User
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  // Filter States
  const [selectedDealer, setSelectedDealer] = useState('');
  const [selectedNetwork, setSelectedNetwork] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  });
  const [startDate, setStartDate] = useState(() => {
    const today = new Date();
    const firstDay = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`;
    return firstDay;
  });
  const [endDate, setEndDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });

  // Report Specific States
  const [liveStockData, setLiveStockData] = useState(null);
  const [ledgerData, setLedgerData] = useState([]);
  const [modelWiseData, setModelWiseData] = useState([]);
  const [colorWiseData, setColorWiseData] = useState([]);
  const [dispatchData, setDispatchData] = useState([]);
  const [retailData, setRetailData] = useState([]);
  const [monthlySummaryData, setMonthlySummaryData] = useState(null);
  const [performanceData, setPerformanceData] = useState(null);
  const [networkSummaryData, setNetworkSummaryData] = useState([]);

  // Original Daily Submissions view states (inside Retail tab)
  const [submissionsList, setSubmissionsList] = useState([]);
  const [selectedSubmissionStatus, setSelectedSubmissionStatus] = useState('');
  const [editingReport, setEditingReport] = useState(null);
  const [editFormData, setEditFormData] = useState({});
  const [savingEdit, setSavingEdit] = useState(false);

  // Invoice printing state
  const [printInvoiceData, setPrintInvoiceData] = useState(null);
  const [isInvoiceOpen, setIsInvoiceOpen] = useState(false);

  useEffect(() => {
    fetchMetadata();
  }, []);

  const fetchMetadata = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      const [dealersRes, networksRes, treeRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/dealers`, { headers }),
        axios.get(`${API_BASE_URL}/networks`, { headers }),
        axios.get(`${API_BASE_URL}/master/inventory-tree`, { headers })
      ]);

      if (dealersRes.data.success) {
        const dealerList = dealersRes.data.data.filter(d => d.role === 'dealer' || d.dealer_type);
        setDealers(dealerList);
        if (dealerList.length > 0) setSelectedDealer(dealerList[0].id.toString());
      }
      if (networksRes.data.success) {
        setNetworks(networksRes.data.data);
        if (networksRes.data.data.length > 0) setSelectedNetwork(networksRes.data.data[0].id.toString());
      }
      if (treeRes.data.success) setInventoryTree(treeRes.data.data);
    } catch (e) {
      console.error('Metadata load failed:', e);
    }
  };

  // Triggers API loads based on active tab
  useEffect(() => {
    if (selectedDealer) {
      loadReportData();
    }
  }, [activeTab, selectedDealer, selectedMonth, startDate, endDate, selectedNetwork]);

  const loadReportData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      switch (activeTab) {
        case 'liveStock': {
          const res = await axios.get(`${API_BASE_URL}/reporting/live-stock`, { headers, params: { dealer_id: selectedDealer } });
          if (res.data.success) setLiveStockData(res.data.data);
          break;
        }
        case 'stockLedger': {
          const res = await axios.get(`${API_BASE_URL}/reporting/ledger`, { 
            headers, 
            params: { dealer_id: selectedDealer, start_date: startDate, end_date: endDate } 
          });
          if (res.data.success) setLedgerData(res.data.data);
          break;
        }
        case 'modelColorReports': {
          const [modelRes, colorRes] = await Promise.all([
            axios.get(`${API_BASE_URL}/reporting/model-wise`, { headers, params: { dealer_id: selectedDealer, month: selectedMonth } }),
            axios.get(`${API_BASE_URL}/reporting/color-wise`, { headers, params: { dealer_id: selectedDealer } })
          ]);
          if (modelRes.data.success) setModelWiseData(modelRes.data.data);
          if (colorRes.data.success) setColorWiseData(colorRes.data.data);
          break;
        }
        case 'dispatchReports': {
          const res = await axios.get(`${API_BASE_URL}/reporting/dispatch-history`, { headers, params: { dealer_id: selectedDealer, month: selectedMonth } });
          if (res.data.success) setDispatchData(res.data.data);
          break;
        }
        case 'retailReports': {
          const [retailRes, subRes] = await Promise.all([
            axios.get(`${API_BASE_URL}/reporting/retail-history`, { headers, params: { dealer_id: selectedDealer, month: selectedMonth } }),
            axios.get(`${API_BASE_URL}/reports/analytics`, { 
              headers, 
              params: { 
                dealer_id: selectedDealer, 
                start_date: `${selectedMonth}-01`, 
                end_date: `${selectedMonth}-31`,
                status: selectedSubmissionStatus 
              } 
            })
          ]);
          if (retailRes.data.success) setRetailData(retailRes.data.data);
          if (subRes.data.success) setSubmissionsList(subRes.data.data);
          break;
        }
        case 'performanceReports': {
          const [perfRes, sumRes] = await Promise.all([
            axios.get(`${API_BASE_URL}/dealers/${selectedDealer}/performance`, { headers, params: { month: selectedMonth } }),
            axios.get(`${API_BASE_URL}/reporting/monthly-summary`, { headers, params: { dealer_id: selectedDealer, month: selectedMonth } })
          ]);
          if (perfRes.data.success) setPerformanceData(perfRes.data.data);
          if (sumRes.data.success) setMonthlySummaryData(sumRes.data.data);
          break;
        }
        case 'networkReports': {
          const res = await axios.get(`${API_BASE_URL}/reporting/network-summary`, { headers, params: { network_id: selectedNetwork, month: selectedMonth } });
          if (res.data.success) setNetworkSummaryData(res.data.data);
          break;
        }
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load report data.');
    } finally {
      setLoading(false);
    }
  };

  // Helper: Trigger CSV Download
  const triggerCSVDownload = (headers, rows, filename) => {
    const csvContent = [
      headers.join(','),
      ...rows.map(r => r.map(val => `"${val.toString().replace(/"/g, '""')}"`).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Print Report Handler
  const handlePrintReport = () => {
    window.print();
  };

  // Invoice print builder for dispatch history
  const handlePrintInvoice = (dispatchId, date) => {
    const selectedDealerObj = dealers.find(d => d.id === parseInt(selectedDealer));
    
    // Group dispatch items for this specific date/id
    const matchingDispatches = dispatchData.filter(d => d.dispatch_id === dispatchId);
    const invoiceItems = matchingDispatches.map(item => ({
      model_name: item.model_name,
      color_name: item.color_name,
      hex_code: item.hex_code,
      qty: item.qty
    }));

    setPrintInvoiceData({
      dealer: selectedDealerObj,
      date: date,
      items: invoiceItems,
      dispatchId: dispatchId
    });
    setIsInvoiceOpen(true);
  };

  // Super Admin Edit Report Submissions Handlers
  const handleEditClick = (report) => {
    setEditingReport(report);
    const initialData = { items: {} };
    if (report.items) {
      report.items.forEach(item => {
        initialData.items[item.variant_color_id] = item.quantity;
      });
    }
    initialData.today_booking = report.today_booking || 0;
    initialData.total_booking = report.total_booking || 0;
    setEditFormData(initialData);
  };

  const handleEditItemChange = (vcId, val) => {
    if (val !== '' && !/^\d+$/.test(val)) return;
    setEditFormData(prev => ({
      ...prev,
      items: { ...prev.items, [vcId]: val }
    }));
  };

  const submitAdminEdit = async () => {
    if (!editingReport) return;
    setSavingEdit(true);
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      const itemsArray = Object.keys(editFormData.items || {})
        .map(vcId => ({
            variant_color_id: parseInt(vcId, 10),
            quantity: parseInt(editFormData.items[vcId] || '0', 10)
        }))
        .filter(item => item.quantity > 0);

      const parsedBooking = {
          today_booking: parseInt(editFormData.today_booking || '0', 10),
          total_booking: parseInt(editFormData.total_booking || '0', 10),
          items: itemsArray
      };

      await axios.post(`${API_BASE_URL}/reports/admin-edit`, {
        dealer_id: editingReport.dealer_id,
        date: editingReport.date,
        ...parsedBooking
      }, { headers });

      await axios.post(`${API_BASE_URL}/reports/admin-submit`, {
        dealer_id: editingReport.dealer_id,
        date: editingReport.date
      }, { headers });

      toast.success('Report updated and recalculated!');
      setEditingReport(null);
      loadReportData();
    } catch (e) {
      console.error(e);
      toast.error('Failed to update report.');
    } finally {
      setSavingEdit(false);
    }
  };

  // EXPORT UTILITIES BY TAB
  const exportLiveStock = () => {
    if (!liveStockData) return;
    const headers = ['Model/Color', 'Type', 'Closing Stock'];
    const rows = [];
    liveStockData.breakdown.forEach(m => {
      rows.push([m.model_name, m.model_type, m.closing]);
      m.colors.forEach(c => {
        rows.push([`  - ${c.color_name}`, '', c.closing]);
      });
    });
    triggerCSVDownload(headers, rows, `Live_Stock_${selectedDealer}_${new Date().toISOString().split('T')[0]}.csv`);
  };

  const exportLedger = () => {
    const headers = ['Date', 'Opening', 'Dispatch', 'Retail', 'Adjustment', 'Closing'];
    const rows = ledgerData.map(r => [r.date, r.opening, `+${r.dispatch}`, `-${r.retail}`, r.adjustment, r.closing]);
    triggerCSVDownload(headers, rows, `Stock_Ledger_${selectedDealer}_${startDate}_to_${endDate}.csv`);
  };

  const exportModelWise = () => {
    const headers = ['Model', 'Opening', 'Dispatch', 'Retail', 'Adjustment', 'Balance'];
    const rows = modelWiseData.map(r => [r.model_name, r.opening, r.dispatch, r.retail, r.adjustment, r.balance]);
    triggerCSVDownload(headers, rows, `Model_Stock_Report_${selectedDealer}_${selectedMonth}.csv`);
  };

  const exportDispatch = () => {
    const headers = ['Date', 'Model', 'Color', 'Qty'];
    const rows = dispatchData.map(r => [r.date, r.model_name, r.color_name, r.qty]);
    triggerCSVDownload(headers, rows, `Dispatch_Report_${selectedDealer}_${selectedMonth}.csv`);
  };

  const exportRetail = () => {
    const headers = ['Date', 'Model', 'Color', 'Qty'];
    const rows = retailData.map(r => [r.date, r.model_name, r.color_name, r.qty]);
    triggerCSVDownload(headers, rows, `Retail_Report_${selectedDealer}_${selectedMonth}.csv`);
  };

  const exportNetwork = () => {
    const headers = ['Dealer Code', 'Dealer Name', 'Network', 'Current Stock', 'Retail', 'Dispatch', 'Target %'];
    const rows = networkSummaryData.map(r => [r.dealer_code, r.name, r.network_name, r.current_stock, r.retail, r.dispatch, `${r.target_percent}%`]);
    triggerCSVDownload(headers, rows, `Network_Summary_${selectedNetwork}_${selectedMonth}.csv`);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Header Panel */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'linear-gradient(135deg, #1a1a2e 0%, #252545 100%)', padding: '24px', borderRadius: '16px', color: 'white', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }} className="no-print">
        <div>
          <h2 style={{ margin: 0, fontSize: '1.8rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <BarChart size={30} color="#ff4757" /> Reports & Analytics
          </h2>
          <p style={{ color: '#a4b0be', margin: '6px 0 0 0', fontSize: '0.95rem' }}>Honda DMS ledger-based report dashboard for network audit and performance management.</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button onClick={handlePrintReport} className="btn" style={{ background: '#ff4757', color: 'white', border: 'none', display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 18px', borderRadius: '8px' }}>
            <Printer size={16} /> Print Dashboard
          </button>
        </div>
      </div>

      {/* Tabs Menu */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '2px solid #e0e0e0', paddingBottom: '2px' }} className="no-print">
        {[
          { id: 'liveStock', label: 'Live Dealer Stock' },
          { id: 'stockLedger', label: 'Stock Movement Ledger' },
          { id: 'modelColorReports', label: 'Model/Color Reports' },
          { id: 'dispatchReports', label: 'Dispatch History' },
          { id: 'retailReports', label: 'Retail & Submissions' },
          { id: 'performanceReports', label: 'Performance Score' },
          { id: 'networkReports', label: 'Network Summary' }
        ].map(t => (
          <button 
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            style={{
              padding: '12px 20px', fontSize: '0.95rem', fontWeight: 700,
              background: 'none', border: 'none', cursor: 'pointer',
              borderBottom: activeTab === t.id ? '4px solid #CC0000' : '4px solid transparent',
              color: activeTab === t.id ? '#CC0000' : '#555',
              transition: 'all 0.2s ease-in-out'
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Filters Container */}
      <div style={{ background: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'flex-end' }} className="no-print">
        
        {activeTab !== 'networkReports' && (
          <div style={{ flex: 1, minWidth: '200px' }}>
            <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#555', marginBottom: '6px', display: 'block' }}>Select Dealer</label>
            <select className="input-field" style={{ width: '100%', height: '42px' }} value={selectedDealer} onChange={e => setSelectedDealer(e.target.value)}>
              {dealers.map(d => (
                <option key={d.id} value={d.id}>{d.dealer_code} - {d.name}</option>
              ))}
            </select>
          </div>
        )}

        {activeTab === 'networkReports' && (
          <div style={{ flex: 1, minWidth: '200px' }}>
            <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#555', marginBottom: '6px', display: 'block' }}>Select Network</label>
            <select className="input-field" style={{ width: '100%', height: '42px' }} value={selectedNetwork} onChange={e => setSelectedNetwork(e.target.value)}>
              {networks.map(n => (
                <option key={n.id} value={n.id}>{n.name}</option>
              ))}
            </select>
          </div>
        )}

        {activeTab === 'stockLedger' ? (
          <>
            <div style={{ width: '160px' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#555', marginBottom: '6px', display: 'block' }}>Start Date</label>
              <input type="date" className="input-field" style={{ width: '100%', height: '42px' }} value={startDate} onChange={e => setStartDate(e.target.value)} />
            </div>
            <div style={{ width: '160px' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#555', marginBottom: '6px', display: 'block' }}>End Date</label>
              <input type="date" className="input-field" style={{ width: '100%', height: '42px' }} value={endDate} onChange={e => setEndDate(e.target.value)} />
            </div>
          </>
        ) : (
          activeTab !== 'liveStock' && (
            <div style={{ width: '200px' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#555', marginBottom: '6px', display: 'block' }}>Target Month</label>
              <input type="month" className="input-field" style={{ width: '100%', height: '42px' }} value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} />
            </div>
          )
        )}

        {activeTab === 'retailReports' && (
          <div style={{ width: '160px' }}>
            <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#555', marginBottom: '6px', display: 'block' }}>Submission Status</label>
            <select className="input-field" style={{ width: '100%', height: '42px' }} value={selectedSubmissionStatus} onChange={e => setSelectedSubmissionStatus(e.target.value)}>
              <option value="">All Statuses</option>
              <option value="Submitted">Submitted</option>
              <option value="Pending">Pending</option>
              <option value="Late">Late</option>
              <option value="Not Sent">Not Sent</option>
              <option value="Locked">Locked</option>
            </select>
          </div>
        )}

        <button onClick={loadReportData} className="btn btn-secondary" style={{ height: '42px', padding: '0 24px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Search size={16} /> Refresh
        </button>
      </div>

      {/* CONTENT AREA PRINT STYLING HACK */}
      <div className="print-only-title" style={{ display: 'none' }}>
        <h2>My Shiva Honda DMS - Reports Output</h2>
        <p>Dealer ID: {selectedDealer} | Date Range: {startDate} to {endDate} | Month: {selectedMonth}</p>
      </div>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .print-only-title { display: block !important; margin-bottom: 20px; border-bottom: 2px solid #000; padding-bottom: 10px; }
          body { background: white; color: black; font-size: 10pt; }
          table { width: 100%; border-collapse: collapse; }
          th, td { border: 1px solid #ccc; padding: 6px; font-size: 9pt; }
        }
      `}</style>

      {/* Main Report Container */}
      <div style={{ background: 'white', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', padding: '24px', minHeight: '300px' }}>
        
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px', fontSize: '1.1rem', color: '#666' }}>Loading report details...</div>
        ) : (
          <>
            {/* 1. Live Stock Tab */}
            {activeTab === 'liveStock' && liveStockData && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #eee', paddingBottom: '16px' }} className="no-print">
                  <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#1a1a2e' }}>Live Current Stock Summary</h3>
                  <button onClick={exportLiveStock} className="btn" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}>
                    <Download size={14} /> Export CSV
                  </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                  <div style={{ background: '#fdf2f2', border: '1px solid #f3d1d1', padding: '16px', borderRadius: '10px', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#cc0000', textTransform: 'uppercase' }}>Current Stock</div>
                    <div style={{ fontSize: '2rem', fontWeight: 800, color: '#cc0000', marginTop: '6px' }}>{liveStockData.totalClosing || 0}</div>
                  </div>
                  <div style={{ background: '#f8f9fa', padding: '16px', borderRadius: '10px', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#555', textTransform: 'uppercase' }}>Opening Stock</div>
                    <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#1a1a2e', marginTop: '6px' }}>{liveStockData.totalOpening || 0}</div>
                  </div>
                  <div style={{ background: '#f8f9fa', padding: '16px', borderRadius: '10px', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#555', textTransform: 'uppercase' }}>Today's Dispatch</div>
                    <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#27ae60', marginTop: '6px' }}>+{liveStockData.totalDispatched || 0}</div>
                  </div>
                  <div style={{ background: '#f8f9fa', padding: '16px', borderRadius: '10px', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#555', textTransform: 'uppercase' }}>Today's Retail</div>
                    <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#f39c12', marginTop: '6px' }}>-{liveStockData.totalRetail || 0}</div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px', marginTop: '10px' }}>
                  {liveStockData.breakdown?.map(model => (
                    <div key={model.model_name} style={{ background: '#fcfcfc', border: '1px solid #eef2f6', borderRadius: '10px', overflow: 'hidden' }}>
                      <div style={{ background: '#cc0000', color: 'white', padding: '10px 16px', fontWeight: 'bold', display: 'flex', justifyContent: 'space-between' }}>
                        <span>{model.model_name}</span>
                        <span>Total: {model.closing}</span>
                      </div>
                      <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {model.colors?.map(col => (
                          <div key={col.color_name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 8px', background: 'white', borderRadius: '6px', border: '1px solid #f1f2f6', fontSize: '0.85rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: col.hex_code, border: '1px solid #ccc' }}></div>
                              <span>{col.color_name}</span>
                            </div>
                            <span style={{ fontWeight: 'bold' }}>{col.closing}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 2. Stock Ledger Tab */}
            {activeTab === 'stockLedger' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #eee', paddingBottom: '16px', marginBottom: '16px' }} className="no-print">
                  <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#1a1a2e' }}>Stock Movement Ledger</h3>
                  <button onClick={exportLedger} className="btn" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}>
                    <Download size={14} /> Export CSV
                  </button>
                </div>
                <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#f8f9fa' }}>
                      <th style={{ padding: '12px', borderBottom: '2px solid #dee2e6', textAlign: 'left' }}>Date</th>
                      <th style={{ padding: '12px', borderBottom: '2px solid #dee2e6', textAlign: 'center' }}>Opening Stock</th>
                      <th style={{ padding: '12px', borderBottom: '2px solid #dee2e6', textAlign: 'center' }}>Dispatch</th>
                      <th style={{ padding: '12px', borderBottom: '2px solid #dee2e6', textAlign: 'center' }}>Retail</th>
                      <th style={{ padding: '12px', borderBottom: '2px solid #dee2e6', textAlign: 'center' }}>Adjustment</th>
                      <th style={{ padding: '12px', borderBottom: '2px solid #dee2e6', textAlign: 'center' }}>Closing Stock</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ledgerData.length === 0 ? (
                      <tr><td colSpan="6" style={{ padding: '20px', textAlign: 'center', color: '#999' }}>No ledger movements found for selection.</td></tr>
                    ) : (
                      ledgerData.map(r => (
                        <tr key={r.date} style={{ borderBottom: '1px solid #eee' }} className="hover-bg-light">
                          <td style={{ padding: '12px', fontWeight: 'bold' }}>{r.date}</td>
                          <td style={{ padding: '12px', textAlign: 'center' }}>{r.opening}</td>
                          <td style={{ padding: '12px', textAlign: 'center', color: r.dispatch > 0 ? '#27ae60' : '#555', fontWeight: 'bold' }}>
                            {r.dispatch > 0 ? `+${r.dispatch}` : '0'}
                          </td>
                          <td style={{ padding: '12px', textAlign: 'center', color: r.retail > 0 ? '#f39c12' : '#555', fontWeight: 'bold' }}>
                            {r.retail > 0 ? `-${r.retail}` : '0'}
                          </td>
                          <td style={{ padding: '12px', textAlign: 'center', color: r.adjustment !== 0 ? '#3498db' : '#555' }}>
                            {r.adjustment}
                          </td>
                          <td style={{ padding: '12px', textAlign: 'center', fontWeight: 'bold', color: '#cc0000' }}>{r.closing}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* 3. Model & Color Reports Tab */}
            {activeTab === 'modelColorReports' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
                {/* Model-wise Monthly Summary */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #eee', paddingBottom: '12px', marginBottom: '16px' }} className="no-print">
                    <h4 style={{ margin: 0, color: '#cc0000', fontSize: '1.1rem' }}>Model-wise Monthly Stock Report</h4>
                    <button onClick={exportModelWise} className="btn" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', padding: '6px 12px' }}>
                      <Download size={14} /> Export CSV
                    </button>
                  </div>
                  <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: '#f8f9fa' }}>
                        <th style={{ padding: '12px', borderBottom: '2px solid #dee2e6', textAlign: 'left' }}>Model</th>
                        <th style={{ padding: '12px', borderBottom: '2px solid #dee2e6', textAlign: 'center' }}>Opening</th>
                        <th style={{ padding: '12px', borderBottom: '2px solid #dee2e6', textAlign: 'center' }}>Dispatch</th>
                        <th style={{ padding: '12px', borderBottom: '2px solid #dee2e6', textAlign: 'center' }}>Retail</th>
                        <th style={{ padding: '12px', borderBottom: '2px solid #dee2e6', textAlign: 'center' }}>Adjustments</th>
                        <th style={{ padding: '12px', borderBottom: '2px solid #dee2e6', textAlign: 'center' }}>Balance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {modelWiseData.length === 0 ? (
                        <tr><td colSpan="6" style={{ padding: '20px', textAlign: 'center', color: '#999' }}>No model data found.</td></tr>
                      ) : (
                        modelWiseData.map(m => (
                          <tr key={m.model_name} style={{ borderBottom: '1px solid #eee' }} className="hover-bg-light">
                            <td style={{ padding: '12px', fontWeight: 'bold' }}>{m.model_name}</td>
                            <td style={{ padding: '12px', textAlign: 'center' }}>{m.opening}</td>
                            <td style={{ padding: '12px', textAlign: 'center', color: '#27ae60', fontWeight: 'bold' }}>+{m.dispatch}</td>
                            <td style={{ padding: '12px', textAlign: 'center', color: '#f39c12', fontWeight: 'bold' }}>-{m.retail}</td>
                            <td style={{ padding: '12px', textAlign: 'center' }}>{m.adjustment}</td>
                            <td style={{ padding: '12px', textAlign: 'center', fontWeight: 'bold', color: '#cc0000' }}>{m.balance}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Color-wise Stock Report */}
                <div>
                  <h4 style={{ margin: '0 0 16px 0', color: '#cc0000', fontSize: '1.1rem', borderBottom: '1px solid #eee', paddingBottom: '12px' }}>Color-wise Stock Breakdown</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '16px' }}>
                    {colorWiseData.length === 0 ? (
                      <div style={{ gridColumn: '1 / -1', padding: '20px', textAlign: 'center', color: '#999' }}>No stock available.</div>
                    ) : (
                      colorWiseData.map(model => (
                        <div key={model.model_name} style={{ background: '#fcfcfc', border: '1px solid #eee', borderRadius: '8px', padding: '16px' }}>
                          <h5 style={{ margin: '0 0 10px 0', fontSize: '1rem', color: '#1a1a2e', borderBottom: '1px solid #f0f0f0', paddingBottom: '6px' }}>{model.model_name}</h5>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {model.colors.map(col => (
                              <div key={col.color_name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: col.hex_code, border: '1px solid #ccc' }}></div>
                                  <span style={{ fontSize: '0.85rem' }}>{col.color_name}</span>
                                </div>
                                <span style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>{col.qty}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* 4. Dispatch History Tab */}
            {activeTab === 'dispatchReports' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #eee', paddingBottom: '16px', marginBottom: '16px' }} className="no-print">
                  <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#1a1a2e' }}>Dispatch Entry History</h3>
                  <button onClick={exportDispatch} className="btn" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}>
                    <Download size={14} /> Export CSV
                  </button>
                </div>
                <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#f8f9fa' }}>
                      <th style={{ padding: '12px', borderBottom: '2px solid #dee2e6', textAlign: 'left' }}>Date</th>
                      <th style={{ padding: '12px', borderBottom: '2px solid #dee2e6', textAlign: 'left' }}>Model Name</th>
                      <th style={{ padding: '12px', borderBottom: '2px solid #dee2e6', textAlign: 'left' }}>Color</th>
                      <th style={{ padding: '12px', borderBottom: '2px solid #dee2e6', textAlign: 'center' }}>Qty</th>
                      <th style={{ padding: '12px', borderBottom: '2px solid #dee2e6', textAlign: 'right' }} className="no-print">Invoice</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dispatchData.length === 0 ? (
                      <tr><td colSpan="5" style={{ padding: '20px', textAlign: 'center', color: '#999' }}>No dispatch history found for selection.</td></tr>
                    ) : (
                      dispatchData.map((r, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid #eee' }} className="hover-bg-light">
                          <td style={{ padding: '12px' }}>{r.date}</td>
                          <td style={{ padding: '12px', fontWeight: 'bold' }}>{r.model_name}</td>
                          <td style={{ padding: '12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: r.hex_code, border: '1px solid #ccc' }}></div>
                              <span>{r.color_name}</span>
                            </div>
                          </td>
                          <td style={{ padding: '12px', textAlign: 'center', fontWeight: 'bold', color: '#27ae60' }}>+{r.qty}</td>
                          <td style={{ padding: '12px', textAlign: 'right' }} className="no-print">
                            <button 
                              onClick={() => handlePrintInvoice(r.dispatch_id, r.date)} 
                              className="btn btn-secondary" 
                              style={{ padding: '6px 12px', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                            >
                              <Printer size={12} /> Invoice
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* 5. Retail Reports Tab */}
            {activeTab === 'retailReports' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
                {/* Retail History */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #eee', paddingBottom: '12px', marginBottom: '16px' }} className="no-print">
                    <h4 style={{ margin: 0, color: '#cc0000', fontSize: '1.1rem' }}>Retail Sales Entries</h4>
                    <button onClick={exportRetail} className="btn" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', padding: '6px 12px' }}>
                      <Download size={14} /> Export CSV
                    </button>
                  </div>
                  <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: '#f8f9fa' }}>
                        <th style={{ padding: '12px', borderBottom: '2px solid #dee2e6', textAlign: 'left' }}>Date</th>
                        <th style={{ padding: '12px', borderBottom: '2px solid #dee2e6', textAlign: 'left' }}>Model Name</th>
                        <th style={{ padding: '12px', borderBottom: '2px solid #dee2e6', textAlign: 'left' }}>Color</th>
                        <th style={{ padding: '12px', borderBottom: '2px solid #dee2e6', textAlign: 'center' }}>Qty</th>
                      </tr>
                    </thead>
                    <tbody>
                      {retailData.length === 0 ? (
                        <tr><td colSpan="4" style={{ padding: '20px', textAlign: 'center', color: '#999' }}>No retail history found for selection.</td></tr>
                      ) : (
                        retailData.map((r, idx) => (
                          <tr key={idx} style={{ borderBottom: '1px solid #eee' }} className="hover-bg-light">
                            <td style={{ padding: '12px' }}>{r.date}</td>
                            <td style={{ padding: '12px', fontWeight: 'bold' }}>{r.model_name}</td>
                            <td style={{ padding: '12px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: r.hex_code, border: '1px solid #ccc' }}></div>
                                <span>{r.color_name}</span>
                              </div>
                            </td>
                            <td style={{ padding: '12px', textAlign: 'center', fontWeight: 'bold', color: '#f39c12' }}>-{r.qty}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Daily Submissions (Original View) */}
                <div className="no-print">
                  <h4 style={{ margin: '0 0 16px 0', color: '#cc0000', fontSize: '1.1rem', borderBottom: '1px solid #eee', paddingBottom: '12px' }}>Original Daily Submissions list</h4>
                  <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: '#f8f9fa' }}>
                        <th style={{ padding: '12px', textAlign: 'left' }}>Date</th>
                        <th style={{ padding: '12px', textAlign: 'left' }}>District</th>
                        <th style={{ padding: '12px', textAlign: 'center' }}>Total Retail</th>
                        <th style={{ padding: '12px', textAlign: 'center' }}>Status</th>
                        <th style={{ padding: '12px', textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {submissionsList.length === 0 ? (
                        <tr><td colSpan="5" style={{ padding: '20px', textAlign: 'center', color: '#999' }}>No submissions found for selection.</td></tr>
                      ) : (
                        submissionsList.map(report => {
                          const totalRetail = report.items ? report.items.reduce((sum, item) => sum + item.quantity, 0) : 0;
                          return (
                            <React.Fragment key={report.id}>
                              <tr className="hover-bg-light" style={{ borderBottom: '1px solid #f0f0f0' }}>
                                <td style={{ padding: '12px', fontWeight: 600 }}>{report.date}</td>
                                <td style={{ padding: '12px' }}>{report.district || 'N/A'}</td>
                                <td style={{ padding: '12px', textAlign: 'center', fontWeight: 'bold' }}>{totalRetail}</td>
                                <td style={{ padding: '12px', textAlign: 'center' }}>
                                  <span style={{
                                    background: report.status === 'Submitted' ? '#e8f5e9' : report.status === 'Locked' ? '#fde8e8' : '#fff3cd',
                                    color: report.status === 'Submitted' ? '#27ae60' : report.status === 'Locked' ? '#cc0000' : '#f39c12',
                                    padding: '4px 10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 700
                                  }}>{report.status}</span>
                                </td>
                                <td style={{ padding: '12px', textAlign: 'right' }}>
                                  <button onClick={() => toggleRow(report.id)} className="btn btn-secondary" style={{ padding: '6px 10px', fontSize: '0.85rem', marginRight: '8px' }}>
                                    {expandedRows[report.id] ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
                                  </button>
                                  {user.role === 'super_admin' && (
                                    <button onClick={() => handleEditClick(report)} className="btn" style={{ padding: '6px 16px', fontSize: '0.85rem' }}>Edit</button>
                                  )}
                                </td>
                              </tr>
                              {expandedRows[report.id] && (
                                <tr style={{ background: '#fafafa' }}>
                                  <td colSpan="5" style={{ padding: '20px' }}>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                      <div>
                                        <h5 style={{ color: '#CC0000', margin: '0 0 10px 0' }}>Retail Sales Breakdown</h5>
                                        {report.items && report.items.length > 0 ? (
                                          <ul style={{ paddingLeft: '20px', margin: 0 }}>
                                            {report.items.map(item => (
                                              <li key={item.variant_color_id} style={{ marginBottom: '5px' }}>
                                                <strong>{item.model_name} {item.variant_name}</strong> - {item.color_name} : <strong style={{ color: '#CC0000' }}>{item.quantity}</strong>
                                              </li>
                                            ))}
                                          </ul>
                                        ) : <p style={{ color: '#666', margin: 0 }}>No sales reported.</p>}
                                      </div>
                                      <div>
                                        <h5 style={{ color: '#CC0000', margin: '0 0 10px 0' }}>Other Details</h5>
                                        <p style={{ margin: '4px 0' }}><strong>Today's Bookings:</strong> {report.today_booking || 0}</p>
                                        <p style={{ margin: '4px 0' }}><strong>Pending Bookings:</strong> {report.total_booking || 0}</p>
                                      </div>
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 6. Performance & Network Tab */}
            {activeTab === 'performanceReports' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
                
                {/* Monthly Dealer Summary Card */}
                {monthlySummaryData && (
                  <div style={{ background: '#fafafa', border: '1px solid #eee', borderRadius: '12px', padding: '24px' }}>
                    <h4 style={{ margin: '0 0 16px 0', color: '#cc0000', fontSize: '1.2rem', borderBottom: '2px solid #cc0000', paddingBottom: '10px' }}>Monthly Dealer Summary</h4>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '12px', marginBottom: '24px' }}>
                      <div style={{ background: 'white', padding: '12px', borderRadius: '8px', border: '1px solid #ddd', textAlign: 'center' }}>
                        <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#555' }}>Opening Stock</div>
                        <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#1a1a2e', marginTop: '4px' }}>{monthlySummaryData.totals.opening}</div>
                      </div>
                      <div style={{ background: 'white', padding: '12px', borderRadius: '8px', border: '1px solid #ddd', textAlign: 'center' }}>
                        <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#555' }}>Dispatch Received</div>
                        <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#27ae60', marginTop: '4px' }}>+{monthlySummaryData.totals.dispatch}</div>
                      </div>
                      <div style={{ background: 'white', padding: '12px', borderRadius: '8px', border: '1px solid #ddd', textAlign: 'center' }}>
                        <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#555' }}>Retail Sales</div>
                        <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#f39c12', marginTop: '4px' }}>-{monthlySummaryData.totals.retail}</div>
                      </div>
                      <div style={{ background: 'white', padding: '12px', borderRadius: '8px', border: '1px solid #ddd', textAlign: 'center' }}>
                        <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#555' }}>Adjustments</div>
                        <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#3498db', marginTop: '4px' }}>{monthlySummaryData.totals.adjustment}</div>
                      </div>
                      <div style={{ background: 'white', padding: '12px', borderRadius: '8px', border: '1px solid #ddd', textAlign: 'center' }}>
                        <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#cc0000' }}>Closing Stock</div>
                        <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#cc0000', marginTop: '4px' }}>{monthlySummaryData.totals.closing}</div>
                      </div>
                    </div>

                    <h5 style={{ margin: '0 0 10px 0' }}>Current Balance</h5>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px' }}>
                      {monthlySummaryData.breakdown?.map(model => (
                        <div key={model.model_name} style={{ background: 'white', border: '1px solid #ddd', borderRadius: '8px', padding: '12px' }}>
                          <div style={{ fontWeight: 'bold', fontSize: '0.9rem', color: '#1a1a2e', borderBottom: '1px solid #eee', paddingBottom: '4px', marginBottom: '8px', display: 'flex', justifyContent: 'space-between' }}>
                            <span>{model.model_name}</span>
                            <span style={{ color: '#cc0000' }}>{model.closing}</span>
                          </div>
                          {model.colors?.filter(c => c.closing > 0).map(col => (
                            <div key={col.color_name} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#555', marginBottom: '4px' }}>
                              <span>{col.color_name}</span>
                              <span style={{ fontWeight: 600 }}>{col.closing}</span>
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Dealer Performance Card */}
                {performanceData && (
                  <div style={{ background: 'linear-gradient(135deg, #ffffff 0%, #fafafa 100%)', border: '1px solid #eef2f6', borderRadius: '12px', padding: '24px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                      <div>
                        <h4 style={{ margin: 0, color: '#cc0000', fontSize: '1.2rem' }}>Monthly Performance Overview</h4>
                        <p style={{ margin: '4px 0 0 0', color: '#666', fontSize: '0.85rem' }}>Star rating evaluated using retail target achievements and compliance rules.</p>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '2.2rem', fontWeight: 900, color: '#CC0000' }}>{performanceData.targetPercent}%</div>
                        <div style={{ fontSize: '0.8rem', color: '#555', fontWeight: 'bold' }}>TARGET ACHIEVEMENT</div>
                        <div style={{ fontSize: '1.4rem', color: '#f39c12', marginTop: '6px', letterSpacing: '3px' }}>
                          {'⭐'.repeat(performanceData.stars || 1) + '☆'.repeat(5 - (performanceData.stars || 1))}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
                      <div style={{ background: 'white', padding: '16px', borderRadius: '8px', border: '1px solid #eee', textAlign: 'center' }}>
                        <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#666' }}>TARGET</div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#1a1a2e', marginTop: '4px' }}>{performanceData.targetQty || 0}</div>
                      </div>
                      <div style={{ background: 'white', padding: '16px', borderRadius: '8px', border: '1px solid #eee', textAlign: 'center' }}>
                        <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#666' }}>RETAIL</div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#27ae60', marginTop: '4px' }}>{performanceData.totalRetail || 0}</div>
                      </div>
                      <div style={{ background: 'white', padding: '16px', borderRadius: '8px', border: '1px solid #eee', textAlign: 'center' }}>
                        <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#666' }}>DAILY AVERAGE</div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#f39c12', marginTop: '4px' }}>
                          {performanceData.totalRetail > 0 ? (performanceData.totalRetail / 30).toFixed(1) : '0.0'}
                        </div>
                      </div>
                      <div style={{ background: 'white', padding: '16px', borderRadius: '8px', border: '1px solid #eee', textAlign: 'center' }}>
                        <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#666' }}>SCORE</div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#cc0000', marginTop: '4px' }}>{performanceData.overallScore || 0}%</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 7. Network Summary Tab */}
            {activeTab === 'networkReports' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #eee', paddingBottom: '16px', marginBottom: '16px' }} className="no-print">
                  <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#1a1a2e' }}>Network dealer Stock & Sales</h3>
                  <button onClick={exportNetwork} className="btn" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}>
                    <Download size={14} /> Export CSV
                  </button>
                </div>
                <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#f8f9fa' }}>
                      <th style={{ padding: '12px', borderBottom: '2px solid #dee2e6', textAlign: 'left' }}>Dealer</th>
                      <th style={{ padding: '12px', borderBottom: '2px solid #dee2e6', textAlign: 'center' }}>Current Stock</th>
                      <th style={{ padding: '12px', borderBottom: '2px solid #dee2e6', textAlign: 'center' }}>Retail</th>
                      <th style={{ padding: '12px', borderBottom: '2px solid #dee2e6', textAlign: 'center' }}>Dispatch</th>
                      <th style={{ padding: '12px', borderBottom: '2px solid #dee2e6', textAlign: 'center' }}>Target Achievement</th>
                    </tr>
                  </thead>
                  <tbody>
                    {networkSummaryData.length === 0 ? (
                      <tr><td colSpan="5" style={{ padding: '20px', textAlign: 'center', color: '#999' }}>No network dealer records found.</td></tr>
                    ) : (
                      networkSummaryData.map(r => (
                        <tr key={r.id} style={{ borderBottom: '1px solid #eee' }} className="hover-bg-light">
                          <td style={{ padding: '12px' }}>
                            <div style={{ fontWeight: 'bold', color: '#1a1a2e' }}>{r.name}</div>
                            <div style={{ fontSize: '0.75rem', color: '#666' }}>{r.dealer_code} | {r.network_name}</div>
                          </td>
                          <td style={{ padding: '12px', textAlign: 'center', fontWeight: 'bold' }}>{r.current_stock}</td>
                          <td style={{ padding: '12px', textAlign: 'center', color: '#f39c12', fontWeight: 'bold' }}>{r.retail}</td>
                          <td style={{ padding: '12px', textAlign: 'center', color: '#27ae60', fontWeight: 'bold' }}>{r.dispatch}</td>
                          <td style={{ padding: '12px', textAlign: 'center' }}>
                            <div style={{ display: 'inline-block', width: '50px', fontWeight: 'bold', color: r.target_percent >= 90 ? '#27ae60' : r.target_percent >= 80 ? '#3498db' : '#cc0000' }}>
                              {r.target_percent}%
                            </div>
                            <div style={{ display: 'inline-block', width: '100px', height: '6px', background: '#eee', borderRadius: '3px', overflow: 'hidden', marginLeft: '6px' }}>
                              <div style={{ width: `${Math.min(100, r.target_percent)}%`, height: '100%', background: r.target_percent >= 90 ? '#27ae60' : r.target_percent >= 80 ? '#3498db' : '#cc0000' }}></div>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>

      {/* Edit Submission Modal */}
      {editingReport && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ background: 'white', borderRadius: '12px', width: '100%', maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
            <div style={{ padding: '20px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, color: '#1a1a2e' }}>Edit Report: {editingReport.dealer_code} ({editingReport.date})</h3>
              <button onClick={() => setEditingReport(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#999' }}><X size={24} /></button>
            </div>
            
            <div style={{ padding: '20px' }}>
              <div style={{ background: '#fff8e1', color: '#856404', padding: '12px', borderRadius: '8px', fontSize: '0.85rem', marginBottom: '20px' }}>
                <strong>⚠️ Warning:</strong> You are directly modifying a dealer's report. This will force the status to 'Submitted' and recalculate their stock balance immediately.
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                <div className="form-group">
                  <label>Today's Bookings</label>
                  <input type="number" value={editFormData.today_booking} onChange={e => handleEditItemChange('today_booking', e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Total Bookings</label>
                  <input type="number" value={editFormData.total_booking} onChange={e => handleEditItemChange('total_booking', e.target.value)} />
                </div>
              </div>

              <h4 style={{ borderBottom: '1px solid #eee', paddingBottom: '10px', marginBottom: '15px' }}>Retail Sales Entries</h4>
              
              <div style={{ maxHeight: '350px', overflowY: 'auto', paddingRight: '10px' }}>
                  {inventoryTree.map(model => (
                    <div key={model.id} style={{ marginBottom: '15px', border: '1px solid #eee', borderRadius: '8px', padding: '15px' }}>
                        <h5 style={{ margin: '0 0 10px 0', fontSize: '1rem', color: '#1a1a2e' }}>{model.name}</h5>
                        {model.variants.map(variant => (
                            <div key={variant.id} style={{ marginBottom: '10px', paddingLeft: '10px' }}>
                                <strong style={{ fontSize: '0.9rem' }}>{variant.name}</strong>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '8px' }}>
                                    {variant.colors.map(vc => (
                                        <div key={vc.variant_color_id} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: vc.hex_code, border: '1px solid #ccc' }}></div>
                                            <span style={{ fontSize: '0.85rem', flex: 1 }}>{vc.color_name}</span>
                                            <input 
                                                type="number" 
                                                min="0"
                                                value={editFormData.items?.[vc.variant_color_id] || ''}
                                                onChange={e => handleEditItemChange(vc.variant_color_id, e.target.value)}
                                                style={{ width: '60px', padding: '4px', textAlign: 'center', border: '1px solid #ddd', borderRadius: '4px' }}
                                                placeholder="0"
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                  ))}
              </div>
            </div>
            
            <div style={{ padding: '20px', borderTop: '1px solid #eee', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button onClick={() => setEditingReport(null)} className="btn-secondary">Cancel</button>
              <button onClick={submitAdminEdit} className="btn-primary" disabled={savingEdit}>
                {savingEdit ? 'Saving...' : 'Force Submit Update'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invoice Modal for dispatches */}
      <InvoicePrintModal 
        isOpen={isInvoiceOpen}
        onClose={() => setIsInvoiceOpen(false)}
        dispatchData={printInvoiceData}
      />
    </div>
  );
}
