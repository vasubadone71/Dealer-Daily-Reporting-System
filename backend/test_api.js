const db = require('./database/db');
const bcrypt = require('bcryptjs');

async function test() {
    try {
        let resolvedNetworkId = null;
        const firstNetwork = await db.get('SELECT id FROM networks ORDER BY id ASC LIMIT 1');
        resolvedNetworkId = firstNetwork.id;
        
        const req = {
            body: {
                dealerCode: 'SHOWROOM', 
                name: 'MY SHIVA HONDA, BIAORA', 
                password: 'password123', 
                dealerType: 'Showroom', 
                role: 'showroom', 
                district: 'BIAORA', 
                state: 'Madhya Pradesh', 
                gstNo: ''
            }
        };
        
        const passwordHash = bcrypt.hashSync(req.body.password, 10);
        
        try {
            await db.query(
                "INSERT INTO dealers (dealer_code, name, password_hash, network_id, district, state, dealer_type, role, status, gst_no) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active', ?)",
                [req.body.dealerCode, req.body.name, passwordHash, resolvedNetworkId, req.body.district, req.body.state, req.body.dealerType, req.body.role, req.body.gstNo || null]
            );
            console.log('Success');
        } catch(e) {
            console.log('DB Error:', e.message);
        }
    } catch(e) {
        console.error(e);
    }
}
test();
