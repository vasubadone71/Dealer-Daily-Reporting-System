const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join('d:', 'SOFTWARE', 'Dealer Daily Reporting System (Network Manager App)', 'backend', '..', 'database.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database', err);
    } else {
        console.log('Database opened successfully');
    }
});

const runQuery = (query, params = []) => {
    return new Promise((resolve, reject) => {
        db.all(query, params, (err, rows) => {
            if (err) {
                console.error('Query Error:', err.message);
                resolve({ error: err.message });
            } else {
                console.log('Success, rows:', rows.length);
                resolve(rows);
            }
        });
    });
};

const test = async () => {
    console.log("Testing Pending Dispatches List...");
    await runQuery(`
        SELECT d.id, d.date, dl.name as dealer_name, dl.dealer_code
        FROM dispatches d
        JOIN dealers dl ON d.dealer_id = dl.id
        WHERE d.status = 'Pending'
        ORDER BY d.created_at DESC
    `);

    console.log("Testing Target Behind List...");
    const currentMonth = '2026-07';
    await runQuery(`
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

    console.log("Testing Dead Stock List...");
    const date = '2026-07-27';
    const sixtyDaysAgoStr = '2026-05-28';
    await runQuery(`
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
    
    db.close();
};

test();
