const db = require('../database/db');
const stockService = require('../services/stockService');
const cronService = require('../services/cronService');

class ReportRepository {
    async findByDealerAndDate(dealerId, date) {
        const report = await db.get('SELECT * FROM reports WHERE dealer_id = ? AND date = ?', [dealerId, date]);
        if (!report) return null;

        const items = await db.query(`
            SELECT ri.variant_color_id, ri.quantity,
                   vc.variant_id, vc.color_id, 
                   v.name as variant_name, m.name as model_name, m.type as model_type,
                   c.name as color_name, c.hex_code
            FROM retail_items ri
            JOIN variant_colors vc ON ri.variant_color_id = vc.id
            JOIN variants v ON vc.variant_id = v.id
            JOIN models m ON v.model_id = m.id
            JOIN colors c ON vc.color_id = c.id
            WHERE ri.report_id = ?
        `, [report.id]);
        
        const stockData = await stockService.getTodayStockOverview(dealerId);

        return {
            ...report,
            retail_items: items,
            stock_data: stockData.breakdown
        };
    }

    async saveVersion(reportId, actor) {
        const report = await db.get('SELECT * FROM reports WHERE id = ?', [reportId]);
        const items = await db.query('SELECT * FROM retail_items WHERE report_id = ?', [reportId]);
        const snapshot = JSON.stringify({ report, items });
        
        const countRes = await db.get('SELECT COUNT(*) as c FROM report_versions WHERE report_id = ?', [reportId]);
        const versionNum = (countRes.c || 0) + 1;
        
        await db.query(
            'INSERT INTO report_versions (report_id, version_num, data_snapshot, edited_by_type, edited_by_id) VALUES (?, ?, ?, ?, ?)',
            [reportId, versionNum, snapshot, actor.type, actor.id]
        );
    }

    async createOrUpdateDraft(dealerId, date, { items = [], today_booking = 0, total_booking = 0 }, actor = { type: 'dealer', id: dealerId }) {
        const todayStr = cronService.getTodayIstDate();
        const isSuperAdmin = actor.type === 'admin';

        if (!isSuperAdmin && date !== todayStr) {
            throw new Error('You can only edit reports for today. Please contact your administrator.');
        }

        let report = await db.get('SELECT id, status FROM reports WHERE dealer_id = ? AND date = ?', [dealerId, date]);
        let reportId;

        if (report) {
            if (report.status === 'Locked' && !isSuperAdmin) {
                throw new Error('This report has been locked. Please contact your administrator.');
            }
            reportId = report.id;
            
            if (report.status === 'Submitted') {
                await this.saveVersion(reportId, actor);
            }
            
            await db.query('UPDATE reports SET submitted_at = CURRENT_TIMESTAMP, today_booking = ?, total_booking = ? WHERE id = ?', [today_booking, total_booking, reportId]);
            await db.query('DELETE FROM retail_items WHERE report_id = ?', [reportId]);
        } else {
            const res = await db.query(
                'INSERT INTO reports (dealer_id, date, status, today_booking, total_booking, submitted_at) VALUES (?, ?, "Pending", ?, ?, CURRENT_TIMESTAMP)',
                [dealerId, date, today_booking, total_booking]
            );
            reportId = res.lastID;
        }

        for (let item of items) {
            if (item.quantity > 0) {
                await db.query(
                    'INSERT INTO retail_items (report_id, variant_color_id, quantity) VALUES (?, ?, ?)',
                    [reportId, item.variant_color_id, item.quantity]
                );
            }
        }

        if (report && report.status === 'Submitted') {
            await stockService.recalculate(dealerId, date);
        }

        return this.findByDealerAndDate(dealerId, date);
    }

    async submitFinalReport(dealerId, date, actor = { type: 'dealer', id: dealerId }) {
        const report = await db.get('SELECT id, status FROM reports WHERE dealer_id = ? AND date = ?', [dealerId, date]);
        if (!report) {
            throw new Error('No report draft found for today. Please save a draft first.');
        }
        
        await db.query('UPDATE reports SET status = "Submitted", submitted_at = CURRENT_TIMESTAMP WHERE id = ?', [report.id]);
        await stockService.recalculate(dealerId, date);
        
        return { success: true };
    }

    async lockPreviousDayReports(date) {
        const dealers = await db.query('SELECT id FROM dealers WHERE status = "active"');
        for (let dealer of dealers) {
            const report = await db.get('SELECT id, status FROM reports WHERE dealer_id = ? AND date = ?', [dealer.id, date]);
            if (!report) {
                await db.query(
                    'INSERT INTO reports (dealer_id, date, status, submitted_at) VALUES (?, ?, "Not Sent", CURRENT_TIMESTAMP)',
                    [dealer.id, date]
                );
            } else if (report.status === 'Submitted' || report.status === 'Pending') {
                await db.query('UPDATE reports SET status = "Locked" WHERE id = ?', [report.id]);
            }
            await stockService.recalculate(dealer.id, date);
        }
    }

    async getSubmissionHistory(dealerId, limit = 30) {
        const reports = await db.query(
            'SELECT * FROM reports WHERE dealer_id = ? ORDER BY date DESC LIMIT ?',
            [dealerId, limit]
        );
        const result = [];
        for (let r of reports) {
            const items = await db.query('SELECT * FROM retail_items WHERE report_id = ?', [r.id]);
            result.push({ ...r, retail_items: items });
        }
        return result;
    }

    async getTodayReportsStatus(date) {
        const sql = `
            SELECT d.id as dealer_id, d.dealer_code, d.name as dealer_name, d.dealer_type, 
                   n.name as network_name, d.district, d.state,
                   COALESCE(r.status, 'Pending') as status, r.submitted_at, r.id as report_id
            FROM dealers d
            JOIN networks n ON d.network_id = n.id
            LEFT JOIN reports r ON d.id = r.dealer_id AND r.date = ?
            WHERE d.status = 'active'
            ORDER BY d.dealer_code ASC
        `;
        return db.query(sql, [date]);
    }

    async getDashboardStats(date) {
        const currentMonth = date.substring(0, 7); 
        const statusRows = await this.getTodayReportsStatus(date);
        
        let submittedCount = 0, pendingCount = 0, lockedCount = 0, notSentCount = 0;
        statusRows.forEach(row => {
            if (row.status === 'Submitted') submittedCount++;
            else if (row.status === 'Pending') pendingCount++;
            else if (row.status === 'Locked') lockedCount++;
            else if (row.status === 'Not Sent') notSentCount++;
            else pendingCount++;
        });

        const todaySales = await db.get(`
            SELECT SUM(ri.quantity) as total_sales
            FROM retail_items ri
            JOIN reports r ON ri.report_id = r.id
            WHERE r.date = ? AND r.status IN ('Submitted', 'Locked')
        `, [date]);
        
        const mtdSales = await db.get(`
            SELECT SUM(ri.quantity) as total_sales
            FROM retail_items ri
            JOIN reports r ON ri.report_id = r.id
            WHERE r.date LIKE ? AND r.status IN ('Submitted', 'Locked')
        `, [`${currentMonth}%`]);

        const todayDispatches = await db.get(`
            SELECT SUM(di.quantity) as total_dispatch
            FROM dispatch_items di
            JOIN dispatches d ON di.dispatch_id = d.id
            WHERE d.date = ? AND d.status IN ('Accepted', 'Completed')
        `, [date]);
        
        const mtdDispatches = await db.get(`
            SELECT SUM(di.quantity) as total_dispatch
            FROM dispatch_items di
            JOIN dispatches d ON di.dispatch_id = d.id
            WHERE d.date LIKE ? AND d.status IN ('Accepted', 'Completed')
        `, [`${currentMonth}%`]);

        return {
            today_total_sales: todaySales.total_sales || 0,
            mtd_total_sales: mtdSales.total_sales || 0,
            today_total_dispatched: todayDispatches.total_dispatch || 0,
            mtd_total_dispatched: mtdDispatches.total_dispatch || 0,
            submittedCount,
            pendingCount,
            lockedCount,
            notSentCount,
            totalDealers: statusRows.length
        };
    }

    async getAnalytics(filters) {
        const { start_date, end_date, dealer_id, network_id, status } = filters;
        let query = `
            SELECT r.*, d.dealer_code, d.name as dealer_name, d.dealer_type, 
                   n.name as network_name, d.district, d.state
            FROM reports r
            JOIN dealers d ON r.dealer_id = d.id
            JOIN networks n ON d.network_id = n.id
            WHERE 1=1
        `;
        const params = [];
        if (start_date) { query += ' AND r.date >= ?'; params.push(start_date); }
        if (end_date) { query += ' AND r.date <= ?'; params.push(end_date); }
        if (dealer_id) { query += ' AND r.dealer_id = ?'; params.push(dealer_id); }
        if (network_id) { query += ' AND d.network_id = ?'; params.push(network_id); }
        if (status) { query += ' AND r.status = ?'; params.push(status); }
        query += ' ORDER BY r.date DESC, d.dealer_code ASC';
        
        const reports = await db.query(query, params);
        const result = [];
        for (let r of reports) {
            const items = await db.query(`
                SELECT ri.variant_color_id, ri.quantity,
                       vc.variant_id, vc.color_id, 
                       v.name as variant_name, m.name as model_name, m.type as model_type,
                       c.name as color_name, c.hex_code
                FROM retail_items ri
                JOIN variant_colors vc ON ri.variant_color_id = vc.id
                JOIN variants v ON vc.variant_id = v.id
                JOIN models m ON v.model_id = m.id
                JOIN colors c ON vc.color_id = c.id
                WHERE ri.report_id = ?
            `, [r.id]);
            result.push({ ...r, items: items });
        }
        return result;
    }

    async getCalendarStats(month) {
        return db.query(`
            SELECT id, dealer_id, date, status 
            FROM reports 
            WHERE date LIKE ?
        `, [`${month}-%`]);
    }
}

module.exports = new ReportRepository();
