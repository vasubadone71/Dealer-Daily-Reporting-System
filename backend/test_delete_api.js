const jwt = require('jsonwebtoken');

async function testDelete() {
    // Generate valid admin token
    const token = jwt.sign(
        { id: 1, username: 'admin', role: 'super_admin', type: 'admin' },
        'shiva_honda_super_secret_jwt_key_2026',
        { expiresIn: '15m' }
    );

    try {
        console.log("Calling DELETE /api/dispatches/1...");
        const res = await fetch('http://localhost:5000/api/dispatches/1', {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        console.log("Status:", res.status);
        console.log("Response:", data);
    } catch (e) {
        console.error("Network Error:", e.message);
    }
}

testDelete();
