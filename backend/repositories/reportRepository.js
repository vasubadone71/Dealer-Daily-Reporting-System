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
                   COALESCE(r.status, 'Pending') as status, r.submitted_at, r.id as report_id,
                   COALESCE(SUM(ri.quantity), 0) as total_retail,
                   (
                       SELECT json_group_array(json_object(
                           'model_name', m.name,
                           'variant_name', v.name,
                           'color_name', c.name,
                           'quantity', ri2.quantity
                       ))
                       FROM retail_items ri2
                       JOIN variant_colors vc ON ri2.variant_color_id = vc.id
                       JOIN variants v ON vc.variant_id = v.id
                       JOIN models m ON v.model_id = m.id
                       JOIN colors c ON vc.color_id = c.id
                       WHERE ri2.report_id = r.id
                   ) as retail_items
            FROM dealers d
            JOIN networks n ON d.network_id = n.id
            LEFT JOIN reports r ON d.id = r.dealer_id AND r.date = ?
            LEFT JOIN retail_items ri ON ri.report_id = r.id
            WHERE d.status = 'active'
            GROUP BY d.id
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

        // Action Center Metrics - Detailed Arrays
        const pendingDispatchesList = await db.query(`
            SELECT d.id, d.date, dl.name as dealer_name, dl.dealer_code
            FROM dispatches d
            JOIN dealers dl ON d.dealer_id = dl.id
            WHERE d.status = 'Pending'
            ORDER BY d.created_at DESC
        `);

        // Target behind (dealers with <60% MTD achievement)
        const targetBehindList = await db.query(`
            SELECT dl.id, dl.dealer_code, dl.name as dealer_name, 
                   t.target_qty, COALESCE(mtd.mtd_retail, 0) as achieved_qty
            FROM targets t
            JOIN dealers dl ON t.target_id = dl.id
            LEFT JOIN (
                SELECT r.dealer_id, SUM(ri.quantity) as mtd_retail
                FROM reports r
                JOIN retail_items ri ON ri.report_id = r.id
                WHERE r.date LIKE ? AND r.status IN ('Submitted', 'Locked')
                GROUP BY r.dealer_id
            ) mtd ON t.target_id = mtd.dealer_id
            WHERE t.month = ? AND t.target_type = 'dealer'
            AND COALESCE(mtd.mtd_retail, 0) < (0.6 * t.target_qty)
            ORDER BY dl.name ASC
        `, [`${currentMonth}%`, currentMonth.substring(0, 7)]);

        // Dead stock (Current Stock > Total sales in last 60 days)
        const sixtyDaysAgo = new Date();
        sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
        const sixtyDaysAgoStr = sixtyDaysAgo.toISOString().split('T')[0];
        
        const deadStockList = await db.query(`
            SELECT id, dealer_code, dealer_name, current_stock, sales_last_60_days FROM (
                SELECT dl.id, dl.dealer_code, dl.name as dealer_name,
                       SUM(CASE WHEN dsb.date = ? THEN dsb.closing_stock ELSE 0 END) as current_stock,
                       SUM(CASE WHEN dsb.date >= ? THEN dsb.retail_sales ELSE 0 END) as sales_last_60_days
                FROM daily_stock_balances dsb
                JOIN dealers dl ON dsb.dealer_id = dl.id
                WHERE dsb.date >= ? OR dsb.date = ?
                GROUP BY dsb.dealer_id
            ) WHERE current_stock > sales_last_60_days AND current_stock > 0
            ORDER BY current_stock DESC
        `, [date, sixtyDaysAgoStr, sixtyDaysAgoStr, date]);

        // We already have `statusRows` which contains dealer statuses for today
        const missingReportsList = statusRows.filter(r => r.status === 'Pending' || r.status === 'Not Sent' || !r.status).map(r => ({
            id: r.dealer_id,
            dealer_code: r.dealer_code,
            dealer_name: r.dealer_name,
            status: r.status || 'Not Sent'
        }));
        
        const completedTodayList = statusRows.filter(r => r.status === 'Submitted' || r.status === 'Locked').map(r => ({
            id: r.dealer_id,
            dealer_code: r.dealer_code,
            dealer_name: r.dealer_name,
            status: r.status
        }));

        return {
            today_total_sales: todaySales.total_sales || 0,
            mtd_total_sales: mtdSales.total_sales || 0,
            today_total_dispatched: todayDispatches.total_dispatch || 0,
            mtd_total_dispatched: mtdDispatches.total_dispatch || 0,
            submittedCount,
            pendingCount,
            lockedCount,
            notSentCount,
            totalDealers: statusRows.length,
            action_center: {
                missing_reports: missingReportsList.length,
                pending_dispatches: pendingDispatchesList.length,
                target_behind: targetBehindList.length,
                dead_stock: deadStockList.length,
                completed_today: completedTodayList.length
            },
            action_center_details: {
                missing_reports: missingReportsList,
                pending_dispatches: pendingDispatchesList,
                target_behind: targetBehindList,
                dead_stock: deadStockList,
                completed_today: completedTodayList
            }
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
