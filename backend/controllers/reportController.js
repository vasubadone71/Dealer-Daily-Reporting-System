const reportRepository = require('../repositories/reportRepository');
const logRepository = require('../repositories/logRepository');
const cronService = require('../services/cronService');

class ReportController {
    // ----------------------------------------------------
    async getTodayReport(req, res) {
        const dealerId = req.user.id;
        const date = req.query.date || cronService.getTodayIstDate();

        try {
            const report = await reportRepository.findByDealerAndDate(dealerId, date);
            
            if (report) {
                const todayStr = cronService.getTodayIstDate();
                report.is_locked = (report.status === 'Locked' || report.status === 'Not Sent' || date !== todayStr);
                report.auto_lock_time = "11:59 PM";
                
                // Format last updated from submitted_at
                if (report.submitted_at) {
                    let dStr = report.submitted_at;
                    if (!dStr.endsWith('Z')) {
                        dStr = dStr.replace(' ', 'T') + 'Z';
                    }
                    const d = new Date(dStr);
                    // Handle UTC to IST display approx
                    report.last_updated = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' });
                }
            }

            return res.status(200).json({ success: true, data: report });
        } catch (error) {
            console.error('Get report error:', error);
            return res.status(500).json({ success: false, message: 'Failed to fetch report.' });
        }
    }
    async getTodayStock(req, res) {
        const dealerId = req.user.id;
        try {
            const stockService = require('../services/stockService');
            const overview = await stockService.getTodayStockOverview(dealerId);
            return res.status(200).json({ success: true, data: overview });
        } catch (error) {
            console.error('Get stock error:', error);
            return res.status(500).json({ success: false, message: 'Failed to fetch stock overview.' });
        }
    }

    async saveDraft(req, res) {
        const actor = { type: req.user.type, id: req.user.id };
        const targetDate = req.body.date || cronService.getTodayIstDate();
        const targetDealerId = (req.user.type === 'admin' && req.body.dealer_id) ? req.body.dealer_id : req.user.id;
        
        const { items, today_booking, total_booking } = req.body;

        if (!Array.isArray(items)) {
            return res.status(400).json({ success: false, message: 'items array is required.' });
        }

        // Validate values: positive integers only
        const integerPattern = /^\d+$/;
        
        for (let item of items) {
            const saleVal = item.quantity !== undefined ? item.quantity.toString() : '0';
            if (!integerPattern.test(saleVal)) {
                return res.status(400).json({ 
                    success: false, 
                    message: `Invalid number format for variant_color_id ${item.variant_color_id}. Only non-negative integers are allowed.` 
                });
            }
        }

        if (today_booking !== undefined && !integerPattern.test(today_booking.toString())) {
            return res.status(400).json({ success: false, message: 'Booking values must be non-negative integers.' });
        }
        if (total_booking !== undefined && !integerPattern.test(total_booking.toString())) {
            return res.status(400).json({ success: false, message: 'Booking values must be non-negative integers.' });
        }

        try {
            const updatedReport = await reportRepository.createOrUpdateDraft(targetDealerId, targetDate, { 
                items, 
                today_booking: today_booking || 0, 
                total_booking: total_booking || 0 
            }, actor);
            
            await logRepository.logActivity({
                actorType: actor.type,
                actorId: actor.id,
                username: req.user.username || req.user.dealer_code,
                action: actor.type === 'admin' ? 'Admin Edited Report' : 'Draft Saved',
                details: `Saved report for dealer ${targetDealerId} on date: ${targetDate}`,
                ipAddress: req.ip || req.headers['x-forwarded-for']
            });

            return res.status(200).json({ success: true, message: 'Report saved successfully.', data: updatedReport });
        } catch (error) {
            console.error('Save draft error:', error.message);
            if (error.message.includes('locked')) {
                return res.status(400).json({ success: false, message: error.message });
            }
            return res.status(500).json({ success: false, message: 'Failed to save report.' });
        }
    }

    async submitReport(req, res) {
        const actor = { type: req.user.type, id: req.user.id };
        const targetDate = req.body.date || cronService.getTodayIstDate();
        const targetDealerId = (req.user.type === 'admin' && req.body.dealer_id) ? req.body.dealer_id : req.user.id;

        try {
            await reportRepository.submitFinalReport(targetDealerId, targetDate, actor);
            
            await logRepository.logActivity({
                actorType: actor.type,
                actorId: actor.id,
                username: req.user.username || req.user.dealer_code,
                action: actor.type === 'admin' ? 'Admin Force Submitted' : 'Report Submitted',
                details: `Final submitted report for dealer ${targetDealerId} on date: ${targetDate}`,
                ipAddress: req.ip || req.headers['x-forwarded-for']
            });

            return res.status(200).json({ success: true, message: 'Report submitted and locked successfully.' });
        } catch (error) {
            console.error('Submit report error:', error);
            return res.status(400).json({ success: false, message: error.message });
        }
    }

    async getHistory(req, res) {
        const dealerId = req.user.id;
        const limit = req.query.limit ? parseInt(req.query.limit) : 30;

        try {
            const history = await reportRepository.getSubmissionHistory(dealerId, limit);
            return res.status(200).json({ success: true, data: history });
        } catch (error) {
            console.error('Get history error:', error);
            return res.status(500).json({ success: false, message: 'Failed to fetch submission history.' });
        }
    }

    async getLedger(req, res) {
        const dealerId = req.user.id;
        const limit = req.query.limit ? parseInt(req.query.limit) : 30;

        try {
            const db = require('../database/db');
            
            // Get the last N days from daily_stock_balances
            const ledger = await db.query(
                `SELECT date, SUM(opening_stock) as total_opening, 
                        SUM(dispatched) as total_dispatched, 
                        SUM(retail_sales) as total_retail, 
                        SUM(adjustment) as total_adjustment, 
                        SUM(closing_stock) as total_closing 
                 FROM daily_stock_balances 
                 WHERE dealer_id = ? 
                 GROUP BY date 
                 ORDER BY date DESC LIMIT ?`,
                [dealerId, limit]
            );

            return res.status(200).json({ success: true, data: ledger });
        } catch (error) {
            console.error('Get ledger error:', error);
            return res.status(500).json({ success: false, message: 'Failed to fetch stock ledger.' });
        }
    }

    // ----------------------------------------------------
    // ADMIN ACTIONS
    // ----------------------------------------------------
    async getDashboard(req, res) {
        const today = cronService.getTodayIstDate();
        try {
            const stats = await reportRepository.getDashboardStats(today);
            return res.status(200).json({ success: true, data: stats });
        } catch (error) {
            console.error('Get dashboard error:', error);
            return res.status(500).json({ success: false, message: 'Failed to build dashboard.' });
        }
    }

    async getTodayDealerStatuses(req, res) {
        // Accept an optional ?date= param so NM can filter by any date
        const date = req.query.date || cronService.getTodayIstDate();
        try {
            const list = await reportRepository.getTodayReportsStatus(date);
            return res.status(200).json({ success: true, data: list });
        } catch (error) {
            console.error('Get statuses error:', error);
            return res.status(500).json({ success: false, message: 'Failed to fetch dealer statuses.' });
        }
    }

    // Network Manager: get monthly report list with retail totals
    async getNMReports(req, res) {
        const { month } = req.query; // YYYY-MM
        if (!month) {
            return res.status(400).json({ success: false, message: 'month param (YYYY-MM) is required.' });
        }
        try {
            const db = require('../database/db');
            const rows = await db.query(
                `SELECT r.id, r.date, r.status, r.submitted_at,
                        d.dealer_code, d.name as dealer_name, d.dealer_type,
                        n.name as network_name, d.district,
                        COALESCE(SUM(ri.quantity), 0) as total_retail
                 FROM reports r
                 JOIN dealers d ON r.dealer_id = d.id
                 LEFT JOIN networks n ON d.network_id = n.id
                 LEFT JOIN retail_items ri ON ri.report_id = r.id
                 WHERE r.date LIKE ?
                 GROUP BY r.id
                 ORDER BY r.date DESC, d.dealer_code ASC`,
                [`${month}-%`]
            );
            return res.status(200).json({ success: true, data: rows });
        } catch (error) {
            console.error('Get NM reports error:', error);
            return res.status(500).json({ success: false, message: 'Failed to fetch reports.' });
        }
    }

    async getAnalytics(req, res) {
        try {
            const reportList = await reportRepository.getAnalytics(req.query);
            return res.status(200).json({ success: true, data: reportList });
        } catch (error) {
            console.error('Get analytics error:', error);
            return res.status(500).json({ success: false, message: 'Failed to compile reports.' });
        }
    }

    async getCalendar(req, res) {
        const { month } = req.query;
        if (!month) {
            return res.status(400).json({ success: false, message: 'Month filter (YYYY-MM) is required.' });
        }
        try {
            const stats = await reportRepository.getCalendarStats(month);
            return res.status(200).json({ success: true, data: stats });
        } catch (error) {
            console.error('Get calendar error:', error);
            return res.status(500).json({ success: false, message: 'Failed to build calendar report status.' });
        }
    }
}

module.exports = new ReportController();
