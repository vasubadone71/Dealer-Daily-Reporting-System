import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import apiClient from './apiClient';

export const generateAndShare = async (reportType, format, dateOrMonth, dealerId = '') => {
  try {
    let data = null;
    let title = `${reportType}_${dateOrMonth}`;

    const dealerQuery = dealerId ? `&dealer_id=${dealerId}` : '';

    if (reportType === 'Daily') {
      const res = await apiClient.get(`/reports/statuses?date=${dateOrMonth}`);
      data = res.data.data;
    } else if (reportType === 'Monthly') {
      const res = await apiClient.get(`/reports?month=${dateOrMonth}`);
      data = res.data.data;
    } else if (reportType === 'Dealer') {
      // Stock Movement Ledger
      const res = await apiClient.get(`/reporting/ledger?start_date=${dateOrMonth}&end_date=${dateOrMonth}${dealerQuery}`);
      data = res.data.data;
    } else if (reportType === 'Stock') {
      // Live Stock
      const res = await apiClient.get(`/reporting/live-stock?1=1${dealerQuery}`);
      data = res.data.data;
    } else if (reportType === 'Retail') {
      const res = await apiClient.get(`/reporting/retail-history?month=${dateOrMonth.substring(0, 7)}${dealerQuery}`);
      data = res.data.data;
    } else if (reportType === 'Performance') {
      const res = await apiClient.get(`/reporting/network-summary?month=${dateOrMonth.substring(0, 7)}`);
      data = res.data.data;
    }

    if (!data) throw new Error("No data fetched");

    if (format === 'Excel') {
      await generateCSV(reportType, data, title);
    } else {
      await generatePDF(reportType, data, title);
    }
  } catch (error) {
    console.error('Export Error:', error);
    throw error;
  }
};

const generateCSV = async (type, data, title) => {
  let csv = '';
  
  if (type === 'Daily') {
    csv = 'Dealer Code,Dealer Name,Network,Status\n';
    data.forEach(d => {
      csv += `"${d.dealer_code || ''}","${d.dealer_name || d.name || ''}","${d.network_name || ''}","${d.status || 'Not Sent'}"\n`;
    });
  } else if (type === 'Monthly') {
    csv = 'Dealer Code,Dealer Name,Network,Total Retail,Submitted At\n';
    data.forEach(d => {
      csv += `"${d.dealer_code || ''}","${d.dealer_name || d.name || ''}","${d.network_name || ''}","${d.total_retail || 0}","${d.submitted_at ? new Date(d.submitted_at).toLocaleString() : 'N/A'}"\n`;
    });
  } else if (type === 'Dealer') {
    csv = 'Date,Opening,Dispatch,Retail,Adjustment,Closing\n';
    data.forEach(d => {
      csv += `"${d.date || ''}","${d.opening || 0}","${d.dispatch || 0}","${d.retail || 0}","${d.adjustment || 0}","${d.closing || 0}"\n`;
    });
  } else if (type === 'Stock') {
    csv = 'Model,Color,Opening,Dispatched,Retail,Closing\n';
    const breakdown = data.breakdown || [];
    breakdown.forEach(m => {
      if (m.colors && m.colors.length > 0) {
        m.colors.forEach(c => {
          csv += `"${m.model_name || ''}","${c.color_name || ''}","${c.opening || 0}","${c.dispatched || 0}","${c.retail || 0}","${c.closing || 0}"\n`;
        });
      } else {
        csv += `"${m.model_name || ''}","","${m.opening || 0}","${m.dispatched || 0}","${m.retail || 0}","${m.closing || 0}"\n`;
      }
    });
  } else if (type === 'Retail') {
    csv = 'Date,Model,Color,Quantity\n';
    data.forEach(d => {
      csv += `"${d.date || ''}","${d.model_name || ''}","${d.color_name || ''}","${d.qty || 0}"\n`;
    });
  } else if (type === 'Performance') {
    csv = 'Dealer Code,Dealer Name,Network,Stock,Retail,Target,Percent\n';
    data.forEach(d => {
      csv += `"${d.dealer_code || ''}","${d.name || ''}","${d.network_name || ''}","${d.current_stock || 0}","${d.retail || 0}","${d.target || 0}","${d.target_percent || 0}%"\n`;
    });
  }

  const fileUri = FileSystem.cacheDirectory + `${title}.csv`;
  await FileSystem.writeAsStringAsync(fileUri, csv);
  await Sharing.shareAsync(fileUri, { mimeType: 'text/csv', dialogTitle: 'Share Excel Report' });
};

const generatePDF = async (type, data, title) => {
  let html = `
    <html>
      <head>
        <style>
          body { font-family: Helvetica, sans-serif; padding: 20px; }
          h1 { color: #CC0000; text-align: center; border-bottom: 2px solid #CC0000; padding-bottom: 10px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 14px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f2f2f2; color: #333; }
        </style>
      </head>
      <body>
        <h1>${type} Report - ${title.split('_')[1]}</h1>
        <table>
          <thead>
  `;

  if (type === 'Daily') {
    html += `<tr><th>Dealer Code</th><th>Name</th><th>Network</th><th>Status</th></tr></thead><tbody>`;
    data.forEach(d => {
      html += `<tr><td>${d.dealer_code || ''}</td><td>${d.dealer_name || d.name || ''}</td><td>${d.network_name || ''}</td><td>${d.status || 'Not Sent'}</td></tr>`;
    });
  } else if (type === 'Monthly') {
    html += `<tr><th>Code</th><th>Name</th><th>Network</th><th>Retail</th><th>Submitted At</th></tr></thead><tbody>`;
    data.forEach(d => {
      html += `<tr><td>${d.dealer_code || ''}</td><td>${d.dealer_name || d.name || ''}</td><td>${d.network_name || ''}</td><td>${d.total_retail || 0}</td><td>${d.submitted_at ? new Date(d.submitted_at).toLocaleString() : 'N/A'}</td></tr>`;
    });
  } else if (type === 'Dealer') {
    html += `<tr><th>Date</th><th>Opening</th><th>Dispatch</th><th>Retail</th><th>Adj</th><th>Closing</th></tr></thead><tbody>`;
    data.forEach(d => {
      html += `<tr><td>${d.date || ''}</td><td>${d.opening || 0}</td><td>${d.dispatch || 0}</td><td>${d.retail || 0}</td><td>${d.adjustment || 0}</td><td>${d.closing || 0}</td></tr>`;
    });
  } else if (type === 'Stock') {
    html += `<tr><th>Model</th><th>Color</th><th>Opening</th><th>Dispatch</th><th>Retail</th><th>Closing</th></tr></thead><tbody>`;
    const breakdown = data.breakdown || [];
    breakdown.forEach(m => {
      if (m.colors && m.colors.length > 0) {
        m.colors.forEach(c => {
          html += `<tr><td>${m.model_name || ''}</td><td>${c.color_name || ''}</td><td>${c.opening || 0}</td><td>${c.dispatched || 0}</td><td>${c.retail || 0}</td><td>${c.closing || 0}</td></tr>`;
        });
      } else {
        html += `<tr><td>${m.model_name || ''}</td><td></td><td>${m.opening || 0}</td><td>${m.dispatched || 0}</td><td>${m.retail || 0}</td><td>${m.closing || 0}</td></tr>`;
      }
    });
  } else if (type === 'Performance') {
    html += `<tr><th>Name</th><th>Network</th><th>Stock</th><th>Retail</th><th>Target</th><th>% Achieved</th></tr></thead><tbody>`;
    data.forEach(d => {
      html += `<tr><td>${d.name || ''}</td><td>${d.network_name || ''}</td><td>${d.current_stock || 0}</td><td>${d.retail || 0}</td><td>${d.target || 0}</td><td>${d.target_percent || 0}%</td></tr>`;
    });
  } else if (type === 'Retail') {
    html += `<tr><th>Date</th><th>Model</th><th>Color</th><th>Qty</th></tr></thead><tbody>`;
    data.forEach(d => {
      html += `<tr><td>${d.date || ''}</td><td>${d.model_name || ''}</td><td>${d.color_name || ''}</td><td>${d.qty || 0}</td></tr>`;
    });
  }

  html += `</tbody></table></body></html>`;

  const { uri } = await Print.printToFileAsync({ html });
  await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf', dialogTitle: 'Share PDF Report' });
};
