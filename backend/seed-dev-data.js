const bcrypt = require('bcryptjs');
const db = require('./database/db');

async function seed() {
    console.log('Starting Shiva Honda Database Developer Seeding...');

    try {
        // Wait 1 second to ensure SQLite connection is established
        await new Promise(resolve => setTimeout(resolve, 1000));

        // 1. Seed Networks (in case schema didn't catch them or they are clean)
        const networks = ['Shiva Central', 'Shiva East', 'Shiva West', 'Shiva North', 'Shiva South'];
        for (let net of networks) {
            await db.query('INSERT OR IGNORE INTO networks (name) VALUES (?)', [net]);
        }
        console.log('✔ Networks seeded.');

        // Get network IDs
        const networkRows = await db.query('SELECT * FROM networks');
        const netMap = {};
        networkRows.forEach(n => {
            netMap[n.name] = n.id;
        });

        // 2. Seed Sample Dealers (password: dealer123)
        // bcrypt hash for 'dealer123': $2b$10$UoZ7rZ.B.eN4.3x26U7cCe0Dug1vGzH6BvJ7Yq3Y3q8oQ7sB6C3fW
        const dealerHash = bcrypt.hashSync('dealer123', 10);
        
        const sampleDealers = [
            { code: 'DL001', name: 'Shiva Corporate Showroom', net: 'Shiva Central', dist: 'Bhopal', state: 'Madhya Pradesh', type: 'AD' },
            { code: 'DL002', name: 'Shiva East Dealer', net: 'Shiva East', dist: 'Indore', state: 'Madhya Pradesh', type: 'FO' },
            { code: 'DL003', name: 'Shiva EC Gwalior', net: 'Shiva North', dist: 'Gwalior', state: 'Madhya Pradesh', type: 'EC' },
            { code: 'DL004', name: 'Shiva ASC Jabalpur', net: 'Shiva South', dist: 'Jabalpur', state: 'Madhya Pradesh', type: 'ASC' },
            { code: 'DL005', name: 'Shiva Sub-Dealer Sehore', net: 'Shiva Central', dist: 'Sehore', state: 'Madhya Pradesh', type: 'Sub Dealer' }
        ];

        for (let sd of sampleDealers) {
            const netId = netMap[sd.net] || networkRows[0].id;
            await db.query(
                `INSERT INTO dealers (dealer_code, name, password_hash, network_id, district, state, dealer_type, status)
                 VALUES (?, ?, ?, ?, ?, ?, ?, 'active')
                 ON CONFLICT(dealer_code) DO UPDATE SET
                    name = excluded.name,
                    network_id = excluded.network_id,
                    district = excluded.district,
                    state = excluded.state,
                    dealer_type = excluded.dealer_type`,
                [sd.code, sd.name, dealerHash, netId, sd.dist, sd.state, sd.type]
            );
        }
        console.log('✔ Sample Dealers seeded with password: dealer123');

        // 3. Seed an additional Network Manager (password: manager123)
        const managerHash = bcrypt.hashSync('manager123', 10);
        await db.query(
            `INSERT INTO users (username, password_hash, role, status, telegram_chat_id)
             VALUES (?, ?, 'network_manager', 'active', '123456789')
             ON CONFLICT(username) DO UPDATE SET role = excluded.role`,
            ['manager', managerHash]
        );
        console.log('✔ Sample Network Manager account seeded. Username: manager, Password: manager123');

        // 4. Update default admin password to ensure correct bcrypt hash and map chat ID
        const adminHash = bcrypt.hashSync('admin123', 10);
        await db.query(
            `INSERT INTO users (username, password_hash, role, status, telegram_chat_id)
             VALUES ('admin', ?, 'super_admin', 'active', '1107412891')
             ON CONFLICT(username) DO UPDATE SET password_hash = excluded.password_hash, telegram_chat_id = excluded.telegram_chat_id`,
            [adminHash]
        );
        console.log('✔ Default Admin account hashed and chat ID configured. Username: admin, Password: admin123, Chat ID: 1107412891');

        // 5. Seed default system settings
        await db.query(
            `INSERT INTO settings (id, company_name, telegram_bot_token, notification_reminder_1, notification_reminder_2, notification_reminder_3, notification_reminder_4)
             VALUES (1, 'My Shiva Honda', '8700748612:AAEUbjwE_W-hsSbtNid2vrGSTUY79IJkDqw', '18:30', '19:30', '20:30', '21:30')
             ON CONFLICT(id) DO UPDATE SET telegram_bot_token = excluded.telegram_bot_token`
        );
        console.log('✔ Default Settings table seeded with dynamic Telegram Bot Token.');

        console.log('====================================================');
        console.log('DEVELOPER SEEDING COMPLETE!');
        console.log('====================================================');
        process.exit(0);

    } catch (error) {
        console.error('✖ Error during seeding:', error);
        process.exit(1);
    }
}

seed();
