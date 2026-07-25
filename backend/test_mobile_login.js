const fetch = require('node-fetch');

async function testMobileLogin() {
    console.log('=== Testing Mobile Login Endpoint ===');

    const BASE = 'http://localhost:5000/api/auth/login/mobile';
    const post = async (body) => {
        const r = await fetch(BASE, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        return r.json();
    };

    // Test 1: Dealer
    try {
        const d1 = await post({ username: 'DL001', password: 'dealer123' });
        console.log('Dealer login:', d1.success ? ('SUCCESS role=' + d1.role + ' name=' + d1.user.name) : ('FAIL - ' + d1.message));
    } catch (e) { console.error('Dealer test error:', e.message); }

    // Test 2: Network Manager
    try {
        const d2 = await post({ username: 'NETWORK', password: 'network123' });
        console.log('NM login:', d2.success ? ('SUCCESS role=' + d2.role + ' name=' + d2.user.name) : ('FAIL - ' + d2.message));
    } catch (e) { console.error('NM test error:', e.message); }

    // Test 3: Wrong credentials
    try {
        const d3 = await post({ username: 'NOBODY', password: 'wrongpass' });
        console.log('Invalid creds:', d3.success ? 'UNEXPECTED SUCCESS' : ('Correctly rejected - ' + d3.message));
    } catch (e) { console.error('Invalid creds test error:', e.message); }
}

testMobileLogin();
