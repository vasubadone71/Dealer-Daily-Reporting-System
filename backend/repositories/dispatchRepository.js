const db = require('../database/db');
const stockService = require('../services/stockService');

class DispatchRepository {
    async getDispatches(filters = {}) {
        let sql = `
            SELECT ds.*, d.dealer_code, d.name as dealer_name, n.name as network_name 
            FROM dispatches ds
            JOIN dealers d ON ds.dealer_id = d.id
            JOIN networks n ON d.network_id = n.id
        `;
        const params = [];
        const whereClauses = [];

        if (filters.date) {
            whereClauses.push('ds.date = ?');
            params.push(filters.date);
        } else if (filters.start_date && filters.end_date) {
            whereClauses.push('ds.date BETWEEN ? AND ?');
            params.push(filters.start_date, filters.end_date);
        }

        if (filters.dealer_id) {
            whereClauses.push('ds.dealer_id = ?');
            params.push(filters.dealer_id);
        }

        if (whereClauses.length > 0) {
            sql += ' WHERE ' + whereClauses.join(' AND ');
        }

        sql += ' ORDER BY ds.date DESC, ds.created_at DESC';
        const dispatches = await db.query(sql, params);
        
        // Fetch items for all these dispatches
        if (dispatches.length > 0) {
            const dispatchIds = dispatches.map(d => d.id).join(',');
            const items = await db.query(`
                SELECT di.*, vc.variant_id, vc.color_id, 
                       v.name as variant_name, m.name as model_name, m.type as model_type,
                       c.name as color_name, c.hex_code
                FROM dispatch_items di
                JOIN variant_colors vc ON di.variant_color_id = vc.id
                JOIN variants v ON vc.variant_id = v.id
                JOIN models m ON v.model_id = m.id
                JOIN colors c ON vc.color_id = c.id
                WHERE di.dispatch_id IN (${dispatchIds})
            `);
            
            const itemMap = {};
            for (let item of items) {
                if (!itemMap[item.dispatch_id]) itemMap[item.dispatch_id] = [];
                itemMap[item.dispatch_id].push(item);
            }
            
            for (let d of dispatches) {
                d.items = itemMap[d.id] || [];
            }
        }
        
        return dispatches;
    }

    async saveDispatch(dealerId, date, items, adminId, isOpeningStock = false) {
        // Upsert dispatch record for that date
        let dispatch = await db.get('SELECT id FROM dispatches WHERE dealer_id = ? AND date = ? AND is_opening_stock = ?', [dealerId, date, isOpeningStock ? 1 : 0]);
        
        const status = isOpeningStock ? 'Initialized' : 'Completed';

        if (!dispatch) {
            const res = await db.query(
                'INSERT INTO dispatches (dealer_id, date, created_by, status, is_opening_stock) VALUES (?, ?, ?, ?, ?)',
                [dealerId, date, adminId, status, isOpeningStock ? 1 : 0]
            );
            dispatch = { id: res.lastID };
        } else {
            await db.query(
                'UPDATE dispatches SET created_by = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                [adminId, status, dispatch.id]
            );
            // Clear existing items to insert new ones
            await db.query('DELETE FROM dispatch_items WHERE dispatch_id = ?', [dispatch.id]);
        }
        
        // Insert items
        for (let item of items) {
            if (item.quantity > 0) {
                await db.query(
                    'INSERT INTO dispatch_items (dispatch_id, variant_color_id, quantity) VALUES (?, ?, ?)',
                    [dispatch.id, item.variant_color_id, item.quantity]
                );
            }
        }
        
        // Recalculate stock immediately so it reflects in Live Network Stock
        await stockService.recalculate(dealerId, date);

        return { id: dispatch.id };
    }

    async updateDispatchStatus(id, status) {
        await db.query('UPDATE dispatches SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [status, id]);
        
        const dispatch = await db.get('SELECT dealer_id, date FROM dispatches WHERE id = ?', [id]);
        if (dispatch) {
            await stockService.recalculate(dispatch.dealer_id, dispatch.date);
        }
        return true;
    }

    async deleteDispatch(id) {
        const dispatch = await db.get('SELECT dealer_id, date FROM dispatches WHERE id = ?', [id]);
        if (!dispatch) return false;

        await db.query('DELETE FROM dispatches WHERE id = ?', [id]);
        
        await stockService.recalculate(dispatch.dealer_id, dispatch.date);
        return true;
    }
    
    async saveStockAdjustment(dealerId, date, variantColorId, adjustmentQty, reason, adminId) {
        await db.query(
            'INSERT INTO stock_adjustments (dealer_id, date, variant_color_id, adjustment_qty, reason, created_by) VALUES (?, ?, ?, ?, ?, ?)',
            [dealerId, date, variantColorId, adjustmentQty, reason, adminId]
        );
        await stockService.recalculate(dealerId, date);
    }
}

module.exports = new DispatchRepository();
