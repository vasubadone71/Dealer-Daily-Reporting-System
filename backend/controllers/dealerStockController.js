const db = require('../database/db');
const stockService = require('../services/stockService');
const cronService = require('../services/cronService');

const SC_MODELS = [
    { key: 'activa_110_std',    name: 'Activa 110 STD',    type: 'scooter' },
    { key: 'activa_110_dlx',    name: 'Activa 110 DLX',    type: 'scooter' },
    { key: 'activa_h_smart',    name: 'Activa H Smart',     type: 'scooter' },
    { key: 'activa_125',        name: 'Activa 125',         type: 'scooter' },
    { key: 'activa_125_h_smart',name: 'Activa 125 H Smart', type: 'scooter' },
];
const MC_MODELS = [
    { key: 'cb_hornet125',  name: 'CB Hornet 125',   type: 'motorcycle' },
    { key: 'shine100dx',    name: 'Shine 100 DX',    type: 'motorcycle' },
    { key: 'sp160',         name: 'SP 160',          type: 'motorcycle' },
    { key: 'sp125_drum',    name: 'SP125 Drum',      type: 'motorcycle' },
    { key: 'sp125_disc',    name: 'SP125 Disc',      type: 'motorcycle' },
    { key: 'shine125_drum', name: 'Shine 125 Drum',  type: 'motorcycle' },
    { key: 'shine125_disc', name: 'Shine 125 Disc',  type: 'motorcycle' },
    { key: 'shine100',      name: 'Shine 100',       type: 'motorcycle' },
    { key: 'shine100_2b',   name: 'Shine 100 2B',    type: 'motorcycle' },
    { key: 'hornet2_0',     name: 'Hornet 2.0',      type: 'motorcycle' },
];
const ALL_MODELS = [...SC_MODELS, ...MC_MODELS];

function getStockStatus(qty) {
    if (qty === 0) return 'out_of_stock';
    if (qty <= 2) return 'low_stock';
    return 'healthy';
}

function buildModelBreakdown(balances) {
    const modelMap = {};
    for (const b of balances) {
        modelMap[b.model_key] = b.closing_stock || 0;
    }

    const scooters = SC_MODELS.map(m => ({
        key: m.key, name: m.name,
        qty: modelMap[m.key] || 0,
        status: getStockStatus(modelMap[m.key] || 0)
    }));
    const motorcycles = MC_MODELS.map(m => ({
        key: m.key, name: m.name,
        qty: modelMap[m.key] || 0,
        status: getStockStatus(modelMap[m.key] || 0)
    }));

    const scooterTotal = scooters.reduce((s, m) => s + m.qty, 0);
    const motorcycleTotal = motorcycles.reduce((s, m) => s + m.qty, 0);
    const grandTotal = scooterTotal + motorcycleTotal;

    return { scooters, motorcycles, scooterTotal, motorcycleTotal, grandTotal };
}

function getModelKey(name) {
    const normalized = name.toLowerCase().replace(/[\s\.-]/g, '');
    const map = {
        'activa110std': 'activa_110_std',
        'activa110dlx': 'activa_110_dlx',
        'activahsmart': 'activa_h_smart',
        'activa125': 'activa_125',
        'activa125hsmart': 'activa_125_h_smart',
        'cbhornet125': 'cb_hornet125',
        'shine100dx': 'shine100dx',
        'sp160': 'sp160',
        'sp125drum': 'sp125_drum',
        'sp125disc': 'sp125_disc',
        'shine125drum': 'shine125_drum',
        'shine125disc': 'shine125_disc',
        'shine100': 'shine100',
        'shine1002b': 'shine100_2b',
        'hornet20': 'hornet2_0'
    };
    return map[normalized] || normalized;
}

const dealerStockController = {

    /**
     * GET /api/dealer-stock/overview
     * Returns live stock summary for ALL dealers (Admin/NM only)
     */
    async getOverview(req, res) {
        try {
            const today = cronService.getTodayIstDate();

            // Get all active dealers
            const dealers = await db.query(
                `SELECT d.id, d.dealer_code, d.name, d.district, d.dealer_type, 
                        n.name as network_name, n.id as network_id
                 FROM dealers d
                 LEFT JOIN networks n ON d.network_id = n.id
                 WHERE d.status = 'active'
                 ORDER BY d.dealer_code`,
                []
            );

            // For each dealer, get today's stock
            const dealerStocks = [];
            let totalScooterStock = 0, totalMCStock = 0;
            let lowStockDealers = 0, outOfStockDealers = 0;
            let totalDispatch = 0, totalRetail = 0;

            for (const dealer of dealers) {
                const stockOverview = await stockService.getTodayStockOverview(dealer.id);
                
                for (const m of stockOverview.breakdown) {
                    if (m.model_type === 'Scooter') totalScooterStock += m.closing;
                    else if (m.model_type === 'Motorcycle') totalMCStock += m.closing;
                }

                totalDispatch += stockOverview.totalDispatched;
                totalRetail += stockOverview.totalRetail;

                // Determine overall dealer stock status
                let dealerStatus = 'healthy';
                if (stockOverview.totalClosing === 0) {
                    dealerStatus = 'out_of_stock';
                    outOfStockDealers++;
                } else if (stockOverview.totalClosing <= 2) {
                    dealerStatus = 'low_stock';
                    lowStockDealers++;
                }

                dealerStocks.push({
                    id: dealer.id,
                    dealer_code: dealer.dealer_code,
                    name: dealer.name,
                    district: dealer.district,
                    dealer_type: dealer.dealer_type,
                    network_name: dealer.network_name,
                    network_id: dealer.network_id,
                    stock: stockOverview,
                    status: dealerStatus,
                    last_updated: stockOverview.date
                });
            }

            return res.status(200).json({
                success: true,
                data: {
                    date: today,
                    summary: {
                        totalDealers: dealers.length,
                        totalScooterStock,
                        totalMCStock,
                        grandTotal: totalScooterStock + totalMCStock,
                        totalDispatch,
                        totalRetail,
                        lowStockDealers,
                        outOfStockDealers
                    },
                    dealers: dealerStocks
                }
            });
        } catch (error) {
            console.error('[DealerStock] getOverview error:', error);
            return res.status(500).json({ success: false, message: 'Failed to fetch dealer stock overview.' });
        }
    },

    /**
     * GET /api/dealer-stock/:dealerId
     * Returns single dealer's live stock (model-wise) + daily summary
     */
    async getDealerStock(req, res) {
        try {
            const dealerId = req.params.dealerId === 'me' ? req.user.id : parseInt(req.params.dealerId);

            // Non-admin can only view their own stock
            if (req.user.type === 'dealer' && dealerId !== req.user.id) {
                return res.status(403).json({ success: false, message: 'Access denied.' });
            }

            const today = cronService.getTodayIstDate();

            // Find the most recent date with data (fallback if today isn't calculated yet)
            const latestRow = await db.get(
                'SELECT MAX(date) as date FROM daily_stock_balances WHERE dealer_id = ?',
                [dealerId]
            );
            const queryDate = latestRow?.date || today;

            // Fast direct color-wise query — no recalculate needed
            const balances = await db.query(`
                SELECT 
                    dsb.variant_color_id,
                    dsb.closing_stock,
                    dsb.opening_stock,
                    dsb.dispatched,
                    dsb.retail_sales,
                    m.name  as model_name,
                    m.type  as model_type,
                    c.name  as color_name,
                    c.hex_code
                FROM daily_stock_balances dsb
                JOIN variant_colors vc ON dsb.variant_color_id = vc.id
                JOIN variants v        ON vc.variant_id = v.id
                JOIN models m          ON v.model_id = m.id
                JOIN colors c          ON vc.color_id = c.id
                WHERE dsb.dealer_id = ? AND dsb.date = ?
                ORDER BY m.type, m.name, c.name
            `, [dealerId, queryDate]);

            // Build grouped breakdown by model
            const modelMap = {};
            let totalOpening = 0, totalDispatched = 0, totalRetail = 0, totalClosing = 0;

            for (const b of balances) {
                const key = b.model_name;
                if (!modelMap[key]) {
                    modelMap[key] = {
                        model_name: b.model_name,
                        model_type: b.model_type,
                        closing: 0,
                        colors: []
                    };
                }
                const cs = b.closing_stock || 0;
                modelMap[key].closing += cs;
                if (cs !== 0) {
                    modelMap[key].colors.push({
                        variant_color_id: b.variant_color_id,
                        color_name: b.color_name,
                        hex_code: b.hex_code || '#888888',
                        closing: cs
                    });
                }
                totalOpening   += b.opening_stock || 0;
                totalDispatched += b.dispatched    || 0;
                totalRetail    += b.retail_sales   || 0;
                totalClosing   += cs;
            }

            const breakdown = Object.values(modelMap);

            return res.status(200).json({
                success: true,
                data: {
                    date: queryDate,
                    daily_summary: {
                        opening:    totalOpening,
                        dispatched: totalDispatched,
                        retail:     totalRetail,
                        closing:    totalClosing
                    },
                    breakdown   // [{model_name, model_type, closing, colors:[{variant_color_id,color_name,hex_code,closing}]}]
                }
            });
        } catch (error) {
            console.error('[DealerStock] getDealerStock error:', error);
            return res.status(500).json({ success: false, message: 'Failed to fetch stock.' });
        }
    },

    /**
     * GET /api/dealer-stock/:dealerId/ledger?limit=30&date=YYYY-MM-DD
     * Returns day-by-day ledger (both totals and model-wise)
     */
    async getDealerLedger(req, res) {
        try {
            const dealerId = req.params.dealerId === 'me' ? req.user.id : parseInt(req.params.dealerId);

            if (req.user.type === 'dealer' && dealerId !== req.user.id) {
                return res.status(403).json({ success: false, message: 'Access denied.' });
            }

            const limit = req.query.limit ? parseInt(req.query.limit) : 30;
            const filterDate = req.query.date || null;

            let sql = `
                SELECT 
                    dsb.date,
                    m.name as model_name,
                    SUM(dsb.opening_stock) as opening_stock,
                    SUM(dsb.dispatched) as dispatched,
                    SUM(dsb.retail_sales) as retail_sales,
                    SUM(dsb.adjustment) as adjustment,
                    SUM(dsb.closing_stock) as closing_stock,
                    MAX(dsb.updated_at) as updated_at
                FROM daily_stock_balances dsb
                JOIN variant_colors vc ON dsb.variant_color_id = vc.id
                JOIN variants v ON vc.variant_id = v.id
                JOIN models m ON v.model_id = m.id
                WHERE dsb.dealer_id = ?
            `;
            const params = [dealerId];
            if (filterDate) { sql += ' AND dsb.date = ?'; params.push(filterDate); }
            sql += ' GROUP BY dsb.date, m.name ORDER BY dsb.date DESC, m.name';

            const rows = await db.query(sql, params);

            // Group by date
            const dateMap = {};
            for (const row of rows) {
                if (!dateMap[row.date]) {
                    dateMap[row.date] = { date: row.date, models: [] };
                }
                const modelKey = getModelKey(row.model_name);
                const model = ALL_MODELS.find(m => m.key === modelKey);
                dateMap[row.date].models.push({
                    key: modelKey,
                    name: model ? model.name : row.model_name,
                    type: model ? model.type : 'unknown',
                    opening: row.opening_stock || 0,
                    dispatched: row.dispatched || 0,
                    retail: row.retail_sales || 0,
                    adjustment: row.adjustment || 0,
                    closing: row.closing_stock || 0,
                    updated_at: row.updated_at
                });
            }

            const ledger = Object.values(dateMap).map(day => {
                const breakdown = buildModelBreakdown(
                    day.models.map(m => ({ model_key: m.key, closing_stock: m.closing }))
                );
                return {
                    date: day.date,
                    totalOpening: day.models.reduce((s, m) => s + m.opening, 0),
                    totalDispatched: day.models.reduce((s, m) => s + m.dispatched, 0),
                    totalRetail: day.models.reduce((s, m) => s + m.retail, 0),
                    totalAdjustment: day.models.reduce((s, m) => s + m.adjustment, 0),
                    totalClosing: breakdown.grandTotal,
                    scooterTotal: breakdown.scooterTotal,
                    motorcycleTotal: breakdown.motorcycleTotal,
                    models: day.models,
                    breakdown
                };
            });

            return res.status(200).json({ success: true, data: ledger.slice(0, limit) });
        } catch (error) {
            console.error('[DealerStock] getDealerLedger error:', error);
            return res.status(500).json({ success: false, message: 'Failed to fetch ledger.' });
        }
    },

    /**
     * GET /api/dealer-stock/:dealerId/transactions?limit=50
     * Returns recent stock transactions (dispatches + retail + adjustments)
     */
    async getTransactions(req, res) {
        try {
            const dealerId = req.params.dealerId === 'me' ? req.user.id : parseInt(req.params.dealerId);

            if (req.user.type === 'dealer' && dealerId !== req.user.id) {
                return res.status(403).json({ success: false, message: 'Access denied.' });
            }

            const limit = req.query.limit ? parseInt(req.query.limit) : 50;

            // Get dispatches
            const dispatches = await db.query(
                `SELECT 'dispatch' as type, date, created_at, status, 
                    ${ALL_MODELS.map(m => m.key).join(', ')}
                 FROM dispatches WHERE dealer_id = ? AND status IN ('Accepted','Completed')
                 ORDER BY date DESC, created_at DESC LIMIT ?`,
                [dealerId, limit]
            );

            // Get retail submissions
            const retails = await db.query(
                `SELECT 'retail' as type, r.date, r.submitted_at as created_at,
                    ${ALL_MODELS.map(m => `sd.${m.key}`).join(', ')}
                 FROM reports r
                 JOIN sales_data sd ON sd.report_id = r.id
                 WHERE r.dealer_id = ? AND r.status = 'Submitted'
                 ORDER BY r.date DESC LIMIT ?`,
                [dealerId, limit]
            );

            // Get adjustments
            const adjustments = await db.query(
                `SELECT 'adjustment' as type, date, created_at, model_key, adjustment_qty, reason
                 FROM stock_adjustments WHERE dealer_id = ?
                 ORDER BY date DESC, created_at DESC LIMIT ?`,
                [dealerId, limit]
            );

            // Flatten all into transactions
            const transactions = [];

            for (const d of dispatches) {
                for (const m of ALL_MODELS) {
                    const qty = d[m.key] || 0;
                    if (qty > 0) {
                        transactions.push({
                            type: 'Dispatch', date: d.date, created_at: d.created_at,
                            model_key: m.key, model_name: m.name, model_type: m.type,
                            qty: `+${qty}`, status: d.status
                        });
                    }
                }
            }

            for (const r of retails) {
                for (const m of ALL_MODELS) {
                    const qty = r[m.key] || 0;
                    if (qty > 0) {
                        transactions.push({
                            type: 'Retail', date: r.date, created_at: r.created_at,
                            model_key: m.key, model_name: m.name, model_type: m.type,
                            qty: `-${qty}`, status: 'Submitted'
                        });
                    }
                }
            }

            for (const a of adjustments) {
                transactions.push({
                    type: 'Adjustment', date: a.date, created_at: a.created_at,
                    model_key: a.model_key,
                    model_name: (ALL_MODELS.find(m => m.key === a.model_key) || { name: a.model_key }).name,
                    model_type: (ALL_MODELS.find(m => m.key === a.model_key) || { type: 'unknown' }).type,
                    qty: a.adjustment_qty > 0 ? `+${a.adjustment_qty}` : `${a.adjustment_qty}`,
                    reason: a.reason
                });
            }

            // Sort by date+time descending
            transactions.sort((a, b) => {
                const da = new Date(a.created_at || a.date);
                const db2 = new Date(b.created_at || b.date);
                return db2 - da;
            });

            return res.status(200).json({ success: true, data: transactions.slice(0, limit) });
        } catch (error) {
            console.error('[DealerStock] getTransactions error:', error);
            return res.status(500).json({ success: false, message: 'Failed to fetch transactions.' });
        }
    }
};

module.exports = dealerStockController;
