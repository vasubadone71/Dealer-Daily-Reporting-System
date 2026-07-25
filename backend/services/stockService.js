const db = require('../database/db');

class StockService {
    /**
     * Recalculates the stock ledger for a specific dealer from a given date onwards up to today.
     * @param {number} dealerId 
     * @param {string} fromDate (YYYY-MM-DD)
     */
    async recalculate(dealerId, fromDate) {
        console.log(`[StockService] Recalculating stock for Dealer ${dealerId} starting from ${fromDate}`);
        
        try {
            const today = new Date().toISOString().split('T')[0];
            
            // Get all active variant_colors
            const activeVariantColors = await db.query('SELECT id FROM variant_colors WHERE is_active = 1');
            const vcIds = activeVariantColors.map(vc => vc.id);
            
            let currentDateStr = fromDate;
            const datesToProcess = [];
            while (currentDateStr <= today) {
                datesToProcess.push(currentDateStr);
                const nextDay = new Date(currentDateStr);
                nextDay.setDate(nextDay.getDate() + 1);
                currentDateStr = nextDay.toISOString().split('T')[0];
            }

            for (const date of datesToProcess) {
                const prevDateObj = new Date(date);
                prevDateObj.setDate(prevDateObj.getDate() - 1);
                const prevDateStr = prevDateObj.toISOString().split('T')[0];

                // Previous closing stocks
                const prevBalances = await db.query(
                    'SELECT variant_color_id, closing_stock FROM daily_stock_balances WHERE dealer_id = ? AND date = ?',
                    [dealerId, prevDateStr]
                );
                const openingStocks = {};
                for (let pb of prevBalances) {
                    openingStocks[pb.variant_color_id] = pb.closing_stock;
                }

                // Retail sales (from retail_items linked to submitted reports)
                const report = await db.get(
                    'SELECT id FROM reports WHERE dealer_id = ? AND date = ? AND status = "Submitted"',
                    [dealerId, date]
                );
                
                const retailMap = {};
                if (report) {
                    const retailItems = await db.query('SELECT variant_color_id, quantity FROM retail_items WHERE report_id = ?', [report.id]);
                    for (let item of retailItems) retailMap[item.variant_color_id] = item.quantity;
                }

                // Dispatches (Accepted, Completed, or Initialized)
                const dispatchesData = await db.query(
                    'SELECT id, is_opening_stock FROM dispatches WHERE dealer_id = ? AND date = ? AND status IN ("Accepted", "Completed", "Initialized")',
                    [dealerId, date]
                );
                
                const dispatchMap = {};
                for (const d of dispatchesData) {
                    const dispatchItems = await db.query('SELECT variant_color_id, quantity FROM dispatch_items WHERE dispatch_id = ?', [d.id]);
                    for (let item of dispatchItems) {
                        if (d.is_opening_stock) {
                            openingStocks[item.variant_color_id] = (openingStocks[item.variant_color_id] || 0) + item.quantity;
                        } else {
                            dispatchMap[item.variant_color_id] = (dispatchMap[item.variant_color_id] || 0) + item.quantity;
                        }
                    }
                }

                // Adjustments
                const adjustments = await db.query(
                    'SELECT variant_color_id, SUM(adjustment_qty) as total_adj FROM stock_adjustments WHERE dealer_id = ? AND date = ? GROUP BY variant_color_id',
                    [dealerId, date]
                );
                const adjMap = {};
                for (let a of adjustments) adjMap[a.variant_color_id] = a.total_adj;

                // We need to calculate for all vcIds we have opening stock for, OR have any transaction for today.
                // Just calculating for ALL active vcIds is safest to ensure zero-rows are populated if they had stock previously.
                
                const vcIdsToProcess = new Set([
                    ...vcIds, 
                    ...Object.keys(openingStocks).map(Number),
                    ...Object.keys(retailMap).map(Number),
                    ...Object.keys(dispatchMap).map(Number),
                    ...Object.keys(adjMap).map(Number)
                ]);

                for (const vcId of vcIdsToProcess) {
                    const opening = openingStocks[vcId] || 0;
                    const dispatched = dispatchMap[vcId] || 0;
                    const retail = retailMap[vcId] || 0;
                    const adjustment = adjMap[vcId] || 0;
                    
                    const closing = opening + dispatched + adjustment - retail;

                    // Only store row if there is some stock or movement, to save space. 
                    // Wait, if it goes to zero, we DO need to store the 0 so tomorrow starts at 0 properly if yesterday was >0.
                    // Actually storing all rows for a dealer might explode. Let's only save if opening > 0 OR there's a transaction.
                    // If it drops to 0, it stores the 0. Tomorrow opening will be 0. We'll skip if everything is 0.
                    
                    if (opening === 0 && dispatched === 0 && retail === 0 && adjustment === 0 && closing === 0) {
                        continue;
                    }

                    const existing = await db.get(
                        'SELECT id FROM daily_stock_balances WHERE dealer_id = ? AND date = ? AND variant_color_id = ?',
                        [dealerId, date, vcId]
                    );

                    if (existing) {
                        await db.query(
                            'UPDATE daily_stock_balances SET opening_stock=?, dispatched=?, retail_sales=?, adjustment=?, closing_stock=?, updated_at=CURRENT_TIMESTAMP WHERE id=?',
                            [opening, dispatched, retail, adjustment, closing, existing.id]
                        );
                    } else {
                        await db.query(
                            'INSERT INTO daily_stock_balances (dealer_id, date, variant_color_id, opening_stock, dispatched, retail_sales, adjustment, closing_stock) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                            [dealerId, date, vcId, opening, dispatched, retail, adjustment, closing]
                        );
                    }
                }
            }
            
            console.log(`[StockService] Successfully recalculated stock for Dealer ${dealerId}`);
            return true;
        } catch (error) {
            console.error('[StockService] Recalculation Error:', error);
            throw error;
        }
    }

    async getTodayStockOverview(dealerId) {
        const today = new Date().toISOString().split('T')[0];
        
        await this.recalculate(dealerId, today);
        
        const balances = await db.query(`
            SELECT dsb.*, vc.variant_id, vc.color_id, 
                   v.name as variant_name, m.name as model_name, m.type as model_type,
                   c.name as color_name, c.hex_code
            FROM daily_stock_balances dsb
            JOIN variant_colors vc ON dsb.variant_color_id = vc.id
            JOIN variants v ON vc.variant_id = v.id
            JOIN models m ON v.model_id = m.id
            JOIN colors c ON vc.color_id = c.id
            WHERE dsb.dealer_id = ? AND dsb.date = ?
        `, [dealerId, today]);
        
        let totalOpening = 0, totalDispatched = 0, totalRetail = 0, totalClosing = 0;
        let modelBreakdown = {};

        for (let b of balances) {
            totalOpening += b.opening_stock;
            totalDispatched += b.dispatched;
            totalRetail += b.retail_sales;
            totalClosing += b.closing_stock;
            
            const modelKey = b.model_name; // e.g. "Activa 110"
            if (!modelBreakdown[modelKey]) {
                modelBreakdown[modelKey] = {
                    model_name: modelKey,
                    model_type: b.model_type,
                    opening: 0, dispatched: 0, retail: 0, adjustment: 0, closing: 0,
                    colors: []
                };
            }
            
            modelBreakdown[modelKey].opening += b.opening_stock;
            modelBreakdown[modelKey].dispatched += b.dispatched;
            modelBreakdown[modelKey].retail += b.retail_sales;
            modelBreakdown[modelKey].adjustment += b.adjustment;
            modelBreakdown[modelKey].closing += b.closing_stock;
            
            modelBreakdown[modelKey].colors.push({
                variant_color_id: b.variant_color_id,
                color_name: b.color_name,
                hex_code: b.hex_code,
                opening: b.opening_stock,
                dispatched: b.dispatched,
                retail: b.retail_sales,
                adjustment: b.adjustment,
                closing: b.closing_stock
            });
        }

        // Include today's booking from reports
        let totalBooking = 0;
        const report = await db.get(
            'SELECT today_booking FROM reports WHERE dealer_id = ? AND date = ?',
            [dealerId, today]
        );
        if (report) {
            totalBooking = report.today_booking || 0;
        }

        // Convert dicts to arrays for easier frontend rendering
        const breakdownArray = Object.values(modelBreakdown);

        return {
            date: today,
            totalOpening,
            totalDispatched,
            totalRetail,
            totalBooking,
            totalClosing,
            breakdown: breakdownArray
        };
    }
}

module.exports = new StockService();
