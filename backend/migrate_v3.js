const db = require('./database/db');

async function migrateV3() {
    try {
        console.log('Starting migration v3 (Adding Locked status to reports)...');
        
        await db.query('PRAGMA foreign_keys=off;');
        
        // Step 1: Create new reports table with updated constraint
        await db.query(`
        CREATE TABLE reports_new (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            dealer_id INTEGER NOT NULL,
            date TEXT NOT NULL,
            submitted_at DATETIME,
            status TEXT NOT NULL CHECK (status IN ('Submitted', 'Pending', 'Late', 'Not Sent', 'Locked')),
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            today_booking INTEGER DEFAULT 0,
            total_booking INTEGER DEFAULT 0,
            UNIQUE(dealer_id, date),
            FOREIGN KEY (dealer_id) REFERENCES dealers(id) ON DELETE CASCADE
        );
        `);
        console.log('Created reports_new table.');
        
        // Step 2: Copy data
        await db.query(`
            INSERT INTO reports_new (id, dealer_id, date, submitted_at, status, created_at, today_booking, total_booking)
            SELECT id, dealer_id, date, submitted_at, status, created_at, today_booking, total_booking FROM reports
        `);
        console.log('Copied data to reports_new.');
        
        // Step 3: Drop old table
        await db.query('DROP TABLE reports;');
        console.log('Dropped old reports table.');
        
        // Step 4: Rename new table
        await db.query('ALTER TABLE reports_new RENAME TO reports;');
        console.log('Renamed reports_new to reports.');
        
        await db.query('PRAGMA foreign_keys=on;');
        console.log('Migration v3 completed successfully.');
        process.exit(0);
        
    } catch(e) {
        console.error('Migration error:', e);
        process.exit(1);
    }
}

migrateV3();
