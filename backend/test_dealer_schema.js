const db = require('./database/db');
const bcrypt = require('bcryptjs');
const dealerRepository = require('./repositories/dealerRepository');

async function test() {
    try {
        // Test: auto-assign first network
        const firstNetwork = await db.get('SELECT id, name FROM networks ORDER BY id ASC LIMIT 1');
        console.log('First network found:', firstNetwork);

        const passwordHash = bcrypt.hashSync('test123', 10);
        await dealerRepository.create({
            dealerCode: 'TEST998',
            name: 'Test Dealer',
            passwordHash,
            networkId: firstNetwork.id,
            district: 'Bhopal',
            state: 'Madhya Pradesh',
            dealerType: 'AD'
        });
        console.log('✅ Dealer created successfully!');
        await db.query("DELETE FROM dealers WHERE dealer_code = 'TEST998'");
        console.log('✅ Test cleanup done.');
    } catch(e) {
        console.error('❌ Test failed:', e.message);
    }
}
test();
