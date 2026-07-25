const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const db = new sqlite3.Database(path.join(__dirname, '../database.sqlite'));

db.serialize(() => {
    console.log("Testing targets query...");
    db.all(`
        SELECT t.*, 
        CASE WHEN t.target_type = 'dealer' THEN d.name ELSE n.name END as target_name,
        CASE WHEN t.target_type = 'dealer' THEN d.dealer_code ELSE '' END as dealer_code
        FROM targets t
        LEFT JOIN dealers d ON t.target_type = 'dealer' AND t.target_id = d.id
        LEFT JOIN networks n ON t.target_type = 'network' AND t.target_id = n.id
        WHERE 1=1
    `, [], (err, rows) => {
        if (err) console.error("Targets Error:", err.message);
        else console.log("Targets OK");
    });

    console.log("Testing stock adjustments query...");
    db.all(`
        SELECT sa.*, u.username as dealer_code, u.name as dealer_name
        FROM stock_adjustments sa
        JOIN users u ON sa.dealer_id = u.id
        ORDER BY sa.date DESC, sa.created_at DESC
        LIMIT 100
    `, [], (err, rows) => {
        if (err) console.error("Stock Adjustments Error:", err.message);
        else console.log("Stock Adjustments OK");
    });

    console.log("Testing dealers query...");
    db.all(`
        SELECT d.id, d.dealer_code, d.name, d.network_id, n.name as network_name, 
               d.district, d.state, d.dealer_type, d.status, d.last_login_at, d.created_at 
        FROM dealers d 
        JOIN networks n ON d.network_id = n.id
        ORDER BY d.dealer_code ASC
    `, [], (err, rows) => {
        if (err) console.error("Dealers Error:", err.message);
        else console.log("Dealers OK");
    });
});
