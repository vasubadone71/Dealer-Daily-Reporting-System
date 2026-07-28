const db = require('./database/db');

async function test() {
    try {
        await db.query(
            "INSERT INTO dealers (dealer_code, name, password_hash, network_id, district, state, dealer_type, role, status, gst_no) VALUES ('D001', 'Test', 'hash', 1, 'B', 'MP', 'AD', 'showroom', 'active', null)"
        );
        console.log('OK');
    } catch(e) {
        console.error(e);
    }
}
test();
