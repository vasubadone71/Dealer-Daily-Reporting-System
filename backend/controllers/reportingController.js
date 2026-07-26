const db = require('../database/db');
const cronService = require('../services/cronService');
const stockService = require('../services/stockService');

class ReportingController {
    // 0. Live Dealer Stock (flat list of models and colors)
    async getLiveStock(req, res) {
        const { dealer_id } = req.query;
        if (!dealer_id) {
            return res.status(400).json({ success: false, message: 'dealer_id is required.' });
        }

        try {
            const dealerId = parseInt(dealer_id);
            const overview = await stockService.getTodayStockOverview(dealerId);

            return res.status(200).json({ 
                success: true, 
                data: overview 
            });
        } catch (error) {
            console.error('Error fetching live stock:', error);
            return res.status(500).json({ success: false, message: 'Failed to fetch live stock.' });
        }
    }

    // 1. Stock Movement Ledger (Opening -> Dispatch -> Retail -> Closing) by day
    async getStockMovementLedger(req, res) {
        const { dealer_id, start_date, end_date } = req.query;
        if (!dealer_id || !start_date || !end_date) {
            return res.status(400).json({ success: false, message: 'dealer_id, start_date, and end_date are required.' });
        }

        try {
            const rows = await db.query(
                `SELECT 
                    date,
                    SUM(opening_stock) as opening,
                    SUM(dispatched) as dispatch,
                    SUM(retail_sales) as retail,
                    SUM(adjustment) as adjustment,
                    SUM(closing_stock) as closing
                 FROM daily_stock_balances
                 WHERE dealer_id = ? AND date BETWEEN ? AND ?
                 GROUP BY date
                 ORDER BY date ASC`,
                [dealer_id, start_date, end_date]
            );

            return res.status(200).json({ success: true, data: rows });
        } catch (error) {
            console.error('Error fetching stock ledger:', error);
            return res.status(500).json({ success: false, message: 'Failed to fetch stock movement ledger.' });
        }
    }

    // 2. Model-wise Stock Report (Model, Opening, Dispatch, Retail, Balance)
    async getModelWiseReport(req, res) {
        const { dealer_id, month } = req.query; // YYYY-MM
        if (!dealer_id || !month) {
            return res.status(400).json({ success: false, message: 'dealer_id and month are required.' });
        }

        try {
            const rows = await db.query(
                `SELECT 
                    dsb.date,
                    m.name as model_name,
                    dsb.opening_stock,
                    dsb.dispatched,
                    dsb.retail_sales,
                    dsb.adjustment,
                    dsb.closing_stock
                 FROM daily_stock_balances dsb
                 JOIN variant_colors vc ON dsb.variant_color_id = vc.id
                 JOIN variants v ON vc.variant_id = v.id
                 JOIN models m ON v.model_id = m.id
                 WHERE dsb.dealer_id = ? AND dsb.date LIKE ?
                 ORDER BY dsb.date ASC`,
                [dealer_id, `${month}-%`]
            );

            // Group by model
            const modelMap = {};
            
            // Get sorted list of dates in this result to determine opening and closing
            const dates = [...new Set(rows.map(r => r.date))].sort();
            const earliestDate = dates[0];
            const latestDate = dates[dates.length - 1];

            for (const r of rows) {
                if (!modelMap[r.model_name]) {
                    modelMap[r.model_name] = {
                        model_name: r.model_name,
                        opening: 0,
                        dispatch: 0,
                        retail: 0,
                        adjustment: 0,
                        balance: 0
                    };
                }
                
                // Add up month totals
                modelMap[r.model_name].dispatch += r.dispatched;
                modelMap[r.model_name].retail += r.retail_sales;
                modelMap[r.model_name].adjustment += r.adjustment;

                // Take opening from the earliest date
                if (r.date === earliestDate) {
                    modelMap[r.model_name].opening += r.opening_stock;
                }
                // Take balance (closing) from the latest date
                if (r.date === latestDate) {
                    modelMap[r.model_name].balance += r.closing_stock;
                }
            }

            return res.status(200).json({ success: true, data: Object.values(modelMap) });
        } catch (error) {
            console.error('Error fetching model-wise report:', error);
            return res.status(500).json({ success: false, message: 'Failed to fetch model-wise stock report.' });
        }
    }

    // 3. Color-wise Stock Report (grouped by model)
    async getColorWiseReport(req, res) {
        const { dealer_id } = req.query;
        if (!dealer_id) {
            return res.status(400).json({ success: false, message: 'dealer_id is required.' });
        }

        try {
            const rows = await db.query(
                `SELECT 
                    m.name as model_name,
                    c.name as color_name,
                    c.hex_code,
                    SUM(dsb.closing_stock) as qty
                 FROM daily_stock_balances dsb
                 JOIN variant_colors vc ON dsb.variant_color_id = vc.id
                 JOIN variants v ON vc.variant_id = v.id
                 JOIN models m ON v.model_id = m.id
                 JOIN colors c ON vc.color_id = c.id
                 WHERE dsb.dealer_id = ? AND dsb.date = (SELECT MAX(date) FROM daily_stock_balances WHERE dealer_id = ?)
                 GROUP BY m.name, c.name, c.hex_code
                 HAVING qty > 0
                 ORDER BY m.name, c.name`,
                [dealer_id, dealer_id]
            );

            // Group by model
            const modelGroups = {};
            for (const r of rows) {
                if (!modelGroups[r.model_name]) {
                    modelGroups[r.model_name] = {
                        model_name: r.model_name,
                        colors: []
                    };
                }
                modelGroups[r.model_name].colors.push({
                    color_name: r.color_name,
                    hex_code: r.hex_code,
                    qty: r.qty
                });
            }

            return res.status(200).json({ success: true, data: Object.values(modelGroups) });
        } catch (error) {
            console.error('Error fetching color-wise report:', error);
            return res.status(500).json({ success: false, message: 'Failed to fetch color-wise stock report.' });
        }
    }

    // 4. Dispatch History
    async getDispatchHistory(req, res) {
        const { dealer_id, month } = req.query;
        if (!dealer_id || !month) {
            return res.status(400).json({ success: false, message: 'dealer_id and month are required.' });
        }

        try {
            const rows = await db.query(
                `SELECT 
                    d.id as dispatch_id,
                    d.date,
                    m.name as model_name,
                    c.name as color_name,
                    c.hex_code,
                    di.quantity as qty
                 FROM dispatches d
                 JOIN dispatch_items di ON d.id = di.dispatch_id
                 JOIN variant_colors vc ON di.variant_color_id = vc.id
                 JOIN variants v ON vc.variant_id = v.id
                 JOIN models m ON v.model_id = m.id
                 JOIN colors c ON vc.color_id = c.id
                 WHERE d.dealer_id = ? AND d.date LIKE ? AND d.status != 'Archived'
                 ORDER BY d.date DESC, m.name ASC`,
                [dealer_id, `${month}-%`]
            );

            return res.status(200).json({ success: true, data: rows });
        } catch (error) {
            console.error('Error fetching dispatch history:', error);
            return res.status(500).json({ success: false, message: 'Failed to fetch dispatch history.' });
        }
    }

    // 5. Retail History
    async getRetailHistory(req, res) {
        const { dealer_id, month } = req.query;
        if (!dealer_id || !month) {
            return res.status(400).json({ success: false, message: 'dealer_id and month are required.' });
        }

        try {
            const rows = await db.query(
                `SELECT 
                    r.date,
                    m.name as model_name,
                    c.name as color_name,
                    c.hex_code,
                    ri.quantity as qty
                 FROM reports r
                 JOIN retail_items ri ON r.id = ri.report_id
                 JOIN variant_colors vc ON ri.variant_color_id = vc.id
                 JOIN variants v ON vc.variant_id = v.id
                 JOIN models m ON v.model_id = m.id
                 JOIN colors c ON vc.color_id = c.id
                 WHERE r.dealer_id = ? AND r.date LIKE ? AND r.status = 'Submitted'
                 ORDER BY r.date DESC, m.name ASC`,
                [dealer_id, `${month}-%`]
            );

            return res.status(200).json({ success: true, data: rows });
        } catch (error) {
            console.error('Error fetching retail history:', error);
            return res.status(500).json({ success: false, message: 'Failed to fetch retail history.' });
        }
    }

    // 6. Monthly Dealer Summary
    async getMonthlySummary(req, res) {
        const { dealer_id, month } = req.query;
        if (!dealer_id || !month) {
            return res.status(400).json({ success: false, message: 'dealer_id and month are required.' });
        }

        try {
            const balances = await db.query(
                `SELECT 
                    date,
                    SUM(opening_stock) as opening,
                    SUM(dispatched) as dispatch,
                    SUM(retail_sales) as retail,
                    SUM(adjustment) as adjustment,
                    SUM(closing_stock) as closing
                 FROM daily_stock_balances
                 WHERE dealer_id = ? AND date LIKE ?
                 GROUP BY date
                 ORDER BY date ASC`,
                [dealer_id, `${month}-%`]
            );

            let monthlyTotals = {
                opening: 0,
                dispatch: 0,
                retail: 0,
                adjustment: 0,
                closing: 0
            };

            if (balances.length > 0) {
                const earliest = balances[0];
                const latest = balances[balances.length - 1];

                monthlyTotals.opening = earliest.opening;
                monthlyTotals.closing = latest.closing;

                for (const b of balances) {
                    monthlyTotals.dispatch += b.dispatch;
                    monthlyTotals.retail += b.retail;
                    monthlyTotals.adjustment += b.adjustment;
                }
            }

            // Get current stock breakdown
            const currentStock = await stockService.getTodayStockOverview(dealer_id);

            return res.status(200).json({
                success: true,
                data: {
                    totals: monthlyTotals,
                    breakdown: currentStock.breakdown
                }
            });
        } catch (error) {
            console.error('Error fetching monthly summary:', error);
            return res.status(500).json({ success: false, message: 'Failed to fetch monthly dealer summary.' });
        }
    }

    // 7. Network Summary
    async getNetworkSummary(req, res) {
        const { network_id, month } = req.query;
        if (!month) {
            return res.status(400).json({ success: false, message: 'month (YYYY-MM) is required.' });
        }

        try {
            // Get dealers (filtered by network if provided)
            let sql = `
                SELECT d.id, d.dealer_code, d.name, d.network_id, n.name as network_name 
                FROM dealers d
                LEFT JOIN networks n ON d.network_id = n.id
                WHERE d.status = 'active'
            `;
            const params = [];
            if (network_id) {
                sql += ' AND d.network_id = ?';
                params.push(network_id);
            }
            sql += ' ORDER BY d.dealer_code';

            const dealers = await db.query(sql, params);
            const reportData = [];

            for (const dealer of dealers) {
                // Get monthly metrics from daily_stock_balances
                const balances = await db.query(
                    `SELECT 
                        SUM(dispatched) as total_dispatch,
                        SUM(retail_sales) as total_retail
                     FROM daily_stock_balances
                     WHERE dealer_id = ? AND date LIKE ?`,
                    [dealer.id, `${month}-%`]
                );
                
                const stats = balances[0] || { total_dispatch: 0, total_retail: 0 };
                
                // Get current stock
                const currentStockObj = await stockService.getTodayStockOverview(dealer.id);
                const currentStockTotal = currentStockObj.totalClosing || 0;

                // Get target for the month
                const targetRow = await db.get(
                    `SELECT SUM(target_qty) as target_qty FROM targets WHERE target_type = 'dealer' AND target_id = ? AND month = ?`,
                    [dealer.id, month]
                );
                const target = targetRow ? (targetRow.target_qty || 0) : 0;
                const achievement = target > 0 ? Math.round((stats.total_retail / target) * 100) : 0;

                reportData.push({
                    id: dealer.id,
                    dealer_code: dealer.dealer_code,
                    name: dealer.name,
                    network_name: dealer.network_name,
                    current_stock: currentStockTotal,
                    retail: stats.total_retail || 0,
                    dispatch: stats.total_dispatch || 0,
                    target: target,
                    target_percent: achievement
                });
            }

            return res.status(200).json({ success: true, data: reportData });
        } catch (error) {
            console.error('Error fetching network summary:', error);
            return res.status(500).json({ success: false, message: 'Failed to fetch network summary.' });
        }
    }
}

module.exports = new ReportingController();
