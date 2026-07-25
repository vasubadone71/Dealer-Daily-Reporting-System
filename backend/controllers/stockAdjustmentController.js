const db = require('../database/db');
// restarting for port 5000
const stockService = require('../services/stockService');
const cronService = require('../services/cronService');

const stockAdjustmentController = {
    async createAdjustment(req, res) {
        const { dealerId, date, modelKey, adjustmentQty, type, reason } = req.body;
        
        if (!dealerId || !date || !modelKey || !adjustmentQty) {
            return res.status(400).json({ success: false, message: 'Missing required fields.' });
        }

        try {
            // 1. Record adjustment
            await db.query(
                `INSERT INTO stock_adjustments (dealer_id, date, model_key, adjustment_qty, reason, created_by)
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [dealerId, date, modelKey, adjustmentQty, reason || '', req.user.id]
            );

            // 2. Trigger stock recalculation from this date onward
            await stockService.recalculate(dealerId, date);

            return res.status(200).json({ success: true, message: 'Stock adjustment saved and ledger updated.' });
        } catch (error) {
            console.error('Stock adjustment error:', error);
            return res.status(500).json({ success: false, message: 'Failed to save adjustment.' });
        }
    },

    async getAdjustments(req, res) {
        try {
            const rows = await db.query(
                `SELECT sa.*, d.dealer_code, d.name as dealer_name
                 FROM stock_adjustments sa
                 JOIN dealers d ON sa.dealer_id = d.id
                 ORDER BY sa.date DESC, sa.created_at DESC
                 LIMIT 100`,
                []
            );
            return res.status(200).json({ success: true, data: rows });
        } catch (error) {
            console.error('Get adjustments error:', error);
            return res.status(500).json({ success: false, message: 'Failed to fetch adjustments.' });
        }
    },

    async deleteAdjustment(req, res) {
        const { id } = req.params;
        try {
            // Find the adjustment to get date and dealerId
            const adjustment = await db.get(`SELECT * FROM stock_adjustments WHERE id = ?`, [id]);

            if (!adjustment) {
                return res.status(404).json({ success: false, message: 'Adjustment not found.' });
            }

            // Delete it
            await db.query(`DELETE FROM stock_adjustments WHERE id = ?`, [id]);

            // Recalculate stock
            await stockService.recalculate(adjustment.dealer_id, adjustment.date);

            return res.status(200).json({ success: true, message: 'Adjustment deleted and stock recalculated.' });
        } catch (error) {
            console.error('Delete adjustment error:', error);
            return res.status(500).json({ success: false, message: 'Failed to delete adjustment.' });
        }
    }
};

module.exports = stockAdjustmentController;
