const db = require('../database/db');

class PerformanceService {
    /**
     * Calculates the performance score for a dealer for a given month
     * @param {number} dealerId 
     * @param {string} month YYYY-MM
     */
    async getDealerPerformance(dealerId, month) {
        try {
            // 1. Report Submission %
            // How many days in the month? (Or how many days passed in the month)
            const today = new Date();
            const [year, monthStr] = month.split('-');
            const isCurrentMonth = today.getFullYear() == year && (today.getMonth() + 1) == parseInt(monthStr);
            const daysInMonth = isCurrentMonth ? today.getDate() : new Date(year, monthStr, 0).getDate();
            
            const reports = await db.query(
                `SELECT status FROM reports WHERE dealer_id = ? AND date LIKE ?`,
                [dealerId, `${month}-%`]
            );
            
            const submittedCount = reports.filter(r => r.status === 'Submitted').length;
            const submissionPercent = daysInMonth > 0 ? (submittedCount / daysInMonth) * 100 : 100;

            // 2. Dispatch Acceptance %
            const dispatches = await db.query(
                `SELECT status FROM dispatches WHERE dealer_id = ? AND date LIKE ?`,
                [dealerId, `${month}-%`]
            );
            const totalDispatches = dispatches.length;
            const acceptedDispatches = dispatches.filter(d => d.status === 'Accepted' || d.status === 'Completed').length;
            const dispatchPercent = totalDispatches > 0 ? (acceptedDispatches / totalDispatches) * 100 : 100;

            // 3. Target Achievement %
            // Find overall target
            const targetRow = await db.get(
                `SELECT SUM(target_qty) as target_qty FROM targets WHERE target_type = 'dealer' AND target_id = ? AND month = ?`,
                [dealerId, month]
            );
            const targetQty = targetRow ? targetRow.target_qty : 0;
            
            // Find total retail sales
            const salesData = await db.query(
                `SELECT SUM(today_booking) as total_bookings 
                 FROM reports r
                 WHERE r.dealer_id = ? AND r.date LIKE ? AND r.status = 'Submitted'`,
                [dealerId, `${month}-%`]
            );
            
            // We need retail achievement... let's just query daily_stock_balances
            const retailData = await db.get(
                `SELECT SUM(retail_sales) as total_retail
                 FROM daily_stock_balances
                 WHERE dealer_id = ? AND date LIKE ?`,
                [dealerId, `${month}-%`]
            );
            const totalRetail = retailData ? (retailData.total_retail || 0) : 0;
            
            const targetPercent = targetQty > 0 ? (totalRetail / targetQty) * 100 : 100;

            // 4. Data Accuracy (derived from adjustments)
            const adjustments = await db.query(
                `SELECT COUNT(*) as count FROM stock_adjustments WHERE dealer_id = ? AND date LIKE ?`,
                [dealerId, `${month}-%`]
            );
            const adjustmentCount = adjustments[0] ? adjustments[0].count : 0;
            // E.g., start at 100, lose 5% for every adjustment
            const accuracyPercent = Math.max(0, 100 - (adjustmentCount * 5));

            // Overall Score
            const overallScore = Math.round(
                (submissionPercent * 0.3) +
                (dispatchPercent * 0.2) +
                (targetPercent * 0.4) +
                (accuracyPercent * 0.1)
            );

            // Determine Stars
            let stars = 1;
            let rating = 'Poor';
            if (overallScore >= 90) { stars = 5; rating = 'Excellent'; }
            else if (overallScore >= 80) { stars = 4; rating = 'Very Good'; }
            else if (overallScore >= 70) { stars = 3; rating = 'Good'; }
            else if (overallScore >= 50) { stars = 2; rating = 'Needs Improvement'; }

            // 5. Model-wise Target Breakdown
            const modelTargets = await db.query(
                `SELECT t.model_id, t.target_qty, m.name, m.is_focus 
                 FROM targets t
                 JOIN models m ON t.model_id = m.id
                 WHERE t.target_type = 'dealer' AND t.target_id = ? AND t.month = ?`,
                [dealerId, month]
            );

            // Fetch model-wise retail for the month
            const modelRetails = await db.query(
                `SELECT v.model_id, SUM(dsb.retail_sales) as total_retail
                 FROM daily_stock_balances dsb
                 JOIN variant_colors vc ON dsb.variant_color_id = vc.id
                 JOIN variants v ON vc.variant_id = v.id
                 WHERE dsb.dealer_id = ? AND dsb.date LIKE ?
                 GROUP BY v.model_id`,
                [dealerId, `${month}-%`]
            );

            // Map retail to targets
            const retailMap = {};
            modelRetails.forEach(r => { retailMap[r.model_id] = r.total_retail; });

            const modelWisePerformance = modelTargets.map(t => {
                const retail = retailMap[t.model_id] || 0;
                return {
                    modelId: t.model_id,
                    modelName: t.name,
                    isFocus: t.is_focus === 1,
                    targetQty: t.target_qty,
                    totalRetail: retail,
                    remaining: Math.max(0, t.target_qty - retail),
                    achievementPercent: t.target_qty > 0 ? Math.round((retail / t.target_qty) * 100) : 100
                };
            });

            return {
                month,
                submissionPercent: Math.round(submissionPercent),
                dispatchPercent: Math.round(dispatchPercent),
                targetPercent: Math.round(targetPercent),
                accuracyPercent: Math.round(accuracyPercent),
                overallScore,
                stars,
                rating,
                totalRetail,
                targetQty,
                modelWisePerformance
            };

        } catch (error) {
            console.error('Performance Service Error:', error);
            throw error;
        }
    }
}

module.exports = new PerformanceService();
