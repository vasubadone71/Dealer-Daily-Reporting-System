import React from 'react';
import { X, Printer } from 'lucide-react';

export default function InvoicePrintModal({ isOpen, onClose, dispatchData }) {
  if (!isOpen || !dispatchData) return null;

  const { dealer, date, items, dispatchId } = dispatchData;
  const totalVehicles = items.reduce((sum, item) => sum + (item.qty || item.quantity || 0), 0);

  // Generate serialized rows (e.g. if qty is 5, we can show 5 individual rows just like in the screenshot to fill frame/engine numbers)
  const tableRows = [];
  let srNo = 1;
  items.forEach(item => {
    const qty = item.qty || item.quantity || 0;
    for (let i = 0; i < qty; i++) {
      tableRows.push({
        sr: srNo++,
        modelName: item.model_name,
        color: item.color_name,
        hex_code: item.hex_code
      });
    }
  });

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="invoice-modal-overlay">
      {/* Print styles inserted directly inside the component */}
      <style>{`
        .invoice-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.6);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          padding: 20px;
          overflow-y: auto;
        }
        .invoice-modal-container {
          background: white;
          border-radius: 12px;
          width: 100%;
          max-width: 850px;
          box-shadow: 0 10px 30px rgba(0,0,0,0.2);
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }
        .invoice-modal-actions {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 20px;
          background: #f8f9fa;
          border-bottom: 1px solid #eee;
        }
        .invoice-print-area {
          background: white;
          padding: 30px;
          font-family: 'Inter', system-ui, -apple-system, sans-serif;
          color: #1a1a2e;
          line-height: 1.4;
          width: 100%;
          box-sizing: border-box;
        }
        .invoice-header-banner {
          background: #cc0000;
          color: white;
          text-align: center;
          padding: 20px 10px;
          border-radius: 8px 8px 0 0;
        }
        .invoice-header-banner h1 {
          margin: 0 0 6px 0;
          font-size: 2.2rem;
          font-weight: 800;
          letter-spacing: 0.5px;
        }
        .invoice-header-banner p {
          margin: 4px 0;
          font-size: 0.9rem;
          opacity: 0.9;
          font-weight: 500;
        }
        .invoice-subheader-banner {
          background: #fbebeb;
          color: #cc0000;
          text-align: center;
          padding: 10px;
          font-weight: 700;
          font-size: 1.05rem;
          border-bottom: 2px solid #cc0000;
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        .invoice-details-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 30px;
          padding: 20px 0;
          border-bottom: 2px solid #cc0000;
          font-size: 0.9rem;
        }
        .invoice-details-column h3 {
          margin: 0 0 10px 0;
          color: #cc0000;
          font-size: 1rem;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          border-bottom: 1px solid #f3d1d1;
          padding-bottom: 4px;
        }
        .invoice-details-row {
          display: flex;
          margin-bottom: 6px;
        }
        .invoice-details-label {
          font-weight: 700;
          width: 120px;
          color: #555;
        }
        .invoice-details-value {
          flex: 1;
          color: #1a1a2e;
        }
        .invoice-table {
          width: 100%;
          border-collapse: collapse;
          margin: 20px 0;
          font-size: 0.85rem;
        }
        .invoice-table th {
          background: #fdf2f2;
          color: #cc0000;
          font-weight: 700;
          text-align: left;
          padding: 10px;
          border: 1px solid #f3d1d1;
          text-transform: uppercase;
          font-size: 0.8rem;
        }
        .invoice-table td {
          padding: 10px;
          border: 1px solid #e0e0e0;
          color: #333;
        }
        .invoice-table tr:nth-child(even) {
          background: #fafafa;
        }
        .invoice-underline-space {
          border-bottom: 1px dashed #aaa;
          display: inline-block;
          width: 100%;
          height: 15px;
        }
        .invoice-bank-sign-grid {
          display: grid;
          grid-template-columns: 1.2fr 1fr;
          gap: 40px;
          margin-top: 30px;
          padding-top: 20px;
          border-top: 1px solid #eee;
          font-size: 0.85rem;
        }
        .invoice-bank-card {
          background: #fdfdfd;
          border: 1px solid #e0e0e0;
          border-radius: 6px;
          padding: 15px;
        }
        .invoice-bank-card h4 {
          margin: 0 0 10px 0;
          color: #cc0000;
          font-size: 0.9rem;
          text-transform: uppercase;
        }
        .invoice-signatory-card {
          text-align: center;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          padding: 10px 0;
        }
        .invoice-signatory-line {
          margin-top: 50px;
          border-top: 1px solid #666;
          padding-top: 6px;
          font-weight: 700;
          font-size: 0.9rem;
          color: #333;
        }
        .invoice-footer-banner {
          background: #cc0000;
          color: white;
          text-align: center;
          padding: 10px;
          font-size: 0.85rem;
          font-weight: 500;
          margin-top: 40px;
          border-radius: 0 0 8px 8px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-left: 20px;
          padding-right: 20px;
        }

        /* Printable styles */
        @media print {
          body * {
            visibility: hidden;
          }
          .invoice-modal-overlay {
            position: absolute;
            left: 0;
            top: 0;
            background: white;
            padding: 0;
            margin: 0;
            overflow: visible;
          }
          .invoice-modal-container {
            box-shadow: none;
            border-radius: 0;
            max-width: 100%;
          }
          .invoice-modal-actions {
            display: none !important;
          }
          .invoice-print-area, .invoice-print-area * {
            visibility: visible;
          }
          .invoice-print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 0;
            margin: 0;
          }
        }
      `}</style>

      <div className="invoice-modal-container">
        {/* Top bar (for display only, hidden during print) */}
        <div className="invoice-modal-actions">
          <span style={{ fontWeight: 'bold', color: '#1a1a2e' }}>Dispatch Invoice Preview</span>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button 
              onClick={handlePrint}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                background: '#cc0000', color: 'white', border: 'none',
                padding: '8px 16px', borderRadius: '6px', cursor: 'pointer',
                fontWeight: 'bold', fontSize: '0.85rem'
              }}
            >
              <Printer size={16} /> Print Invoice
            </button>
            <button 
              onClick={onClose}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                background: '#e0e0e0', color: '#333', border: 'none',
                padding: '8px 16px', borderRadius: '6px', cursor: 'pointer',
                fontWeight: 'bold', fontSize: '0.85rem'
              }}
            >
              <X size={16} /> Close
            </button>
          </div>
        </div>

        {/* Invoice Area */}
        <div className="invoice-print-area">
          <div className="invoice-header-banner">
            <h1>My Shiva Honda</h1>
            <p style={{ fontWeight: 'bold', fontSize: '1rem' }}>BADONE MOTORS PRIVATE LIMITED · GSTIN: 23AAHCB4837G1ZT</p>
            <p>Ward No. 6, Biaora Bus Stand, Guna Road, Biaora, Rajgarh, MP - 465674 · +91-9425038999</p>
          </div>

          <div className="invoice-subheader-banner">
            Combined Dispatch Invoice ({totalVehicles} Vehicles)
          </div>

          <div className="invoice-details-grid">
            <div className="invoice-details-column">
              <h3>Buyer Details</h3>
              <div className="invoice-details-row">
                <span className="invoice-details-label">Name:</span>
                <span className="invoice-details-value">{dealer?.name || 'N/A'}</span>
              </div>
              <div className="invoice-details-row">
                <span className="invoice-details-label">Type:</span>
                <span className="invoice-details-value">{dealer?.dealer_type || 'ASC'}</span>
              </div>
              <div className="invoice-details-row">
                <span className="invoice-details-label">Location:</span>
                <span className="invoice-details-value">{dealer?.district || 'N/A'}</span>
              </div>
              <div className="invoice-details-row">
                <span className="invoice-details-label">GST No:</span>
                <span className="invoice-details-value">{dealer?.gst_no || '23CIOPS5028Q2ZG'}</span>
              </div>
            </div>

            <div className="invoice-details-column">
              <h3>Invoice Details</h3>
              <div className="invoice-details-row">
                <span className="invoice-details-label">Invoice No:</span>
                <span className="invoice-details-value">BMPL/2026-27/{String(dispatchId || '0054').padStart(4, '0')}</span>
              </div>
              <div className="invoice-details-row">
                <span className="invoice-details-label">Date:</span>
                <span className="invoice-details-value">{date ? new Date(date).toLocaleDateString('en-GB') : 'N/A'}</span>
              </div>
              <div className="invoice-details-row">
                <span className="invoice-details-label">Fin. Year:</span>
                <span className="invoice-details-value">2026-27</span>
              </div>
              <div className="invoice-details-row">
                <span className="invoice-details-label">Vehicles:</span>
                <span className="invoice-details-value" style={{ fontWeight: 'bold' }}>{totalVehicles}</span>
              </div>
            </div>
          </div>

          <table className="invoice-table">
            <thead>
              <tr>
                <th style={{ width: '40px' }}>Sr.</th>
                <th>Model Name</th>
                <th>Frame No.</th>
                <th>Engine No.</th>
                <th style={{ width: '120px' }}>Color</th>
                <th style={{ width: '80px' }}>Margin</th>
                <th style={{ width: '100px' }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {tableRows.map((row) => (
                <tr key={row.sr}>
                  <td style={{ textAlign: 'center', fontWeight: 'bold' }}>{row.sr}</td>
                  <td style={{ fontWeight: 'bold' }}>{row.modelName}</td>
                  <td><span className="invoice-underline-space"></span></td>
                  <td><span className="invoice-underline-space"></span></td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: row.hex_code, border: '1px solid #ccc' }}></div>
                      {row.color}
                    </div>
                  </td>
                  <td><span className="invoice-underline-space"></span></td>
                  <td><span className="invoice-underline-space"></span></td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fcfcfc', border: '1px solid #eee', padding: '12px 20px', borderRadius: '6px', fontSize: '0.85rem' }}>
            <span><strong>Amount in Words:</strong> <span style={{ fontStyle: 'italic', color: '#555' }}>To be computed manually upon engine assignments</span></span>
            <div style={{ textAlign: 'right', fontSize: '0.95rem' }}>
              <strong>Total Amount:</strong> <span style={{ color: '#cc0000', fontWeight: '800', fontSize: '1.1rem' }}>Pending Assignment</span>
            </div>
          </div>

          <div className="invoice-bank-sign-grid">
            <div className="invoice-bank-card">
              <h4>Bank Details</h4>
              <div style={{ display: 'flex', marginBottom: '4px' }}>
                <span style={{ fontWeight: 'bold', width: '80px', color: '#666' }}>Bank:</span>
                <span>ICICI Bank, Biaora</span>
              </div>
              <div style={{ display: 'flex', marginBottom: '4px' }}>
                <span style={{ fontWeight: 'bold', width: '80px', color: '#666' }}>A/c No:</span>
                <span>144651000820</span>
              </div>
              <div style={{ display: 'flex' }}>
                <span style={{ fontWeight: 'bold', width: '80px', color: '#666' }}>IFSC:</span>
                <span>ICIC0001446</span>
              </div>
            </div>

            <div className="invoice-signatory-card">
              <span style={{ fontWeight: 'bold', color: '#555' }}>For BADONE MOTORS PRIVATE LIMITED</span>
              <div className="invoice-signatory-line">
                Authorized Signatory
              </div>
            </div>
          </div>

          <div className="invoice-footer-banner">
            <span>Thank you for your business</span>
            <span style={{ fontWeight: '800' }}>My Shiva Honda</span>
            <span>+91-9425038999</span>
          </div>
        </div>
      </div>
    </div>
  );
}
