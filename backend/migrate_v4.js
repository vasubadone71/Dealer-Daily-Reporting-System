const db = require('./database/db');

async function migrateV4() {
    try {
        console.log('Starting migration v4 (Adding RBAC support)...');
        
        await db.query('PRAGMA foreign_keys=off;');
        
        // --------------------------------------------------------------------
        // Step 1: Update dealers table to include 'role'
        // --------------------------------------------------------------------
        await db.query(`
        CREATE TABLE dealers_new (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            dealer_code TEXT UNIQUE NOT NULL,
            name TEXT NOT NULL,
            password_hash TEXT NOT NULL,
            network_id INTEGER NOT NULL,
            district TEXT NOT NULL,
            state TEXT NOT NULL,
            dealer_type TEXT NOT NULL CHECK (dealer_type IN ('AD', 'FO', 'EC', 'ASC', 'Sub Dealer', 'Showroom', 'Godown')),
            status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
            device_id TEXT,
            push_token TEXT,
            last_login_at DATETIME,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            role TEXT NOT NULL DEFAULT 'dealer' CHECK (role IN ('dealer', 'showroom', 'godown')),
            FOREIGN KEY (network_id) REFERENCES networks(id) ON DELETE RESTRICT
        );
        `);
        console.log('Created dealers_new table.');
        
        await db.query(`
            INSERT INTO dealers_new (
                id, dealer_code, name, password_hash, network_id, district, state, dealer_type, status, device_id, push_token, last_login_at, created_at, updated_at
            )
            SELECT id, dealer_code, name, password_hash, network_id, district, state, dealer_type, status, device_id, push_token, last_login_at, created_at, updated_at 
            FROM dealers
        `);
        console.log('Copied data to dealers_new.');
        
        await db.query('DROP TABLE dealers;');
        await db.query('ALTER TABLE dealers_new RENAME TO dealers;');
        console.log('Renamed dealers_new to dealers.');

        // --------------------------------------------------------------------
        // Step 2: Update dispatches table to include 'source_id'
        // --------------------------------------------------------------------
        await db.query(`
        CREATE TABLE dispatches_new (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            source_id INTEGER,
            dealer_id INTEGER NOT NULL,
            date TEXT NOT NULL,
            created_by INTEGER NOT NULL,
            status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Accepted', 'Rejected', 'Completed', 'Initialized', 'Archived')),
            is_opening_stock INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(dealer_id, date, is_opening_stock),
            FOREIGN KEY (source_id) REFERENCES dealers(id) ON DELETE SET NULL,
            FOREIGN KEY (dealer_id) REFERENCES dealers(id) ON DELETE CASCADE
        );
        `);
        console.log('Created dispatches_new table.');
        
        await db.query(`
            INSERT INTO dispatches_new (
                id, dealer_id, date, created_by, status, is_opening_stock, created_at, updated_at
            )
            SELECT id, dealer_id, date, created_by, status, is_opening_stock, created_at, updated_at 
            FROM dispatches
        `);
        console.log('Copied data to dispatches_new.');
        
        await db.query('DROP TABLE dispatches;');
        await db.query('ALTER TABLE dispatches_new RENAME TO dispatches;');
        console.log('Renamed dispatches_new to dispatches.');
        
        await db.query('PRAGMA foreign_keys=on;');
        console.log('Migration v4 completed successfully.');
        process.exit(0);
        
    } catch(e) {
        console.error('Migration error:', e);
        process.exit(1);
    }
}

migrateV4();
