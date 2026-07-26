const fetch = require('node-fetch');

async function run() {
    try {
        const res = await fetch('http://172.29.52.137:5000/api/auth/login/mobile', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: 'MP390299',
                password: 'password123',
                deviceId: 'test',
                pushToken: null,
                deviceName: 'test'
            })
        });
        const data = await res.json();
        
        if (!data.success) {
            console.log('Login failed', data);
            return;
        }

        const token = data.token;
        console.log('Logged in, got token.');
        
        const res2 = await fetch('http://172.29.52.137:5000/api/dispatches', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: 'Bearer ' + token
            },
            body: JSON.stringify({
                dealerId: 31,
                date: '2026-07-25',
                isOpeningStock: false,
                items: [{ variant_color_id: 624, quantity: 3 }]
            })
        });
        
        const data2 = await res2.json();
        console.log('Dispatch result:', data2);
    } catch(e) {
        console.log('Error', e);
    }
}

run();
