const fetch = require('node-fetch');
const jwt = require('jsonwebtoken');

async function testFetch() {
    const token = jwt.sign(
        { id: 1, username: 'admin', role: 'super_admin', type: 'admin' },
        'shiva_honda_super_secret_jwt_key_2026',
        { expiresIn: '15m' }
    );
    try {
        console.log("Fetching dealers...");
        const res = await fetch('http://localhost:5000/api/dealers', {
            headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        console.log("Status:", res.status, "Data:", data.success ? "Success" : "Failed");
    } catch (e) {
        console.error("Fetch failed:", e.message);
    }
}
testFetch();
