const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

const dbPath = path.join(__dirname, '../../database.sqlite');
const db = new sqlite3.Database(dbPath);

const runQuery = (query, params = []) => {
    return new Promise((resolve, reject) => {
        db.run(query, params, function (err) {
            if (err) reject(err);
            else resolve(this);
        });
    });
};

const getQuery = (query, params = []) => {
    return new Promise((resolve, reject) => {
        db.get(query, params, (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });
};

async function seed() {
    console.log('Starting database seed process...');

    try {
        // 1. Seed Models
        const models = [
            { name: 'Activa 6G', type: 'Scooter' },
            { name: 'Dio', type: 'Scooter' },
            { name: 'Shine', type: 'Motorcycle' },
            { name: 'SP 125', type: 'Motorcycle' }
        ];

        for (const m of models) {
            const exists = await getQuery('SELECT id FROM models WHERE name = ?', [m.name]);
            if (!exists) {
                await runQuery('INSERT INTO models (name, type) VALUES (?, ?)', [m.name, m.type]);
                console.log(`Inserted model: ${m.name}`);
            }
        }

        // 2. Seed Colors
        const colors = [
            { name: 'Pearl Spartan Red', hex_code: '#FF0000' },
            { name: 'Matte Axis Grey', hex_code: '#808080' },
            { name: 'Black', hex_code: '#000000' }
        ];

        for (const c of colors) {
            const exists = await getQuery('SELECT id FROM colors WHERE name = ?', [c.name]);
            if (!exists) {
                await runQuery('INSERT INTO colors (name, hex_code) VALUES (?, ?)', [c.name, c.hex_code]);
                console.log(`Inserted color: ${c.name}`);
            }
        }

        // 3. Seed Super Admin
        const adminExists = await getQuery("SELECT id FROM admins WHERE username = 'admin'");
        if (!adminExists) {
            const hashedPassword = await bcrypt.hash('admin123', 10);
            await runQuery(
                "INSERT INTO admins (name, username, password, role) VALUES (?, ?, ?, ?)",
                ['Super Admin', 'admin', hashedPassword, 'super_admin']
            );
            console.log('Inserted default Super Admin (admin / admin123)');
        } else {
            console.log('Super Admin already exists.');
        }

        console.log('Database seeding completed successfully!');
    } catch (err) {
        console.error('Error during seeding:', err);
    } finally {
        db.close();
    }
}

seed();
