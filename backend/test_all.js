const fetch = require('node-fetch');
const jwt = require('jsonwebtoken');

async function testAll() {
    const token = jwt.sign(
        { id: 1, username: 'admin', role: 'super_admin', type: 'admin' },
        'shiva_honda_super_secret_jwt_key_2026',
        { expiresIn: '15m' }
    );
    
    const endpoints = [
        '/dealers',
        '/networks',
        '/targets',
        '/dispatches',
        '/reports/dashboard',
        '/reports/statuses',
        '/reports/calendar?month=2026-07',
        '/stock-adjustments',
        '/notifications',
        '/settings',
        '/dealer-stock/overview',
        '/dealer-stock/1',
        '/dealer-stock/1/ledger?limit=7',
        '/dealer-stock/1/transactions',
    ];

    for (let ep of endpoints) {
        try {
            const res = await fetch(`http://localhost:5000/api${ep}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                if (Array.isArray(data.data)) {
                    console.log(`Endpoint ${ep} - Status: ${res.status} - Data count: ${data.data.length}`);
                } else if (data.data) {
                    console.log(`Endpoint ${ep} - Status: ${res.status} - Data present (object)`);
                } else {
                    console.log(`Endpoint ${ep} - Status: ${res.status} - Success true but no data field`);
                }
            } else {
                console.log(`Endpoint ${ep} - Status: ${res.status} - Success false:`, data);
            }
        } catch (e) {
            console.error(`Endpoint ${ep} - Error:`, e.message);
        }
    }
}
testAll();
