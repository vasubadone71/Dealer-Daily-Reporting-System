const db = require('./backend/database/db');
async function test() {
    try {
        const rows = await db.query(`
            SELECT m.name as model_name, m.type as model_type, c.name as color_name
            FROM daily_stock_balances dsb
            JOIN variant_colors vc ON dsb.variant_color_id = vc.id
            JOIN variants v ON vc.variant_id = v.id
            JOIN models m ON v.model_id = m.id
            JOIN colors c ON vc.color_id = c.id
            LIMIT 5
        `);
        console.log('Test DB Query:', rows);
    } catch (e) {
        console.error(e);
    }
}
test();
