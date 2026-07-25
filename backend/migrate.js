const db = require('./database/db');

async function migrate() {
    try {
        console.log('Starting migration...');
        
        await db.query('PRAGMA foreign_keys=off;');
        
        await db.query(`
        CREATE TABLE dispatches_new (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            dealer_id INTEGER NOT NULL,
            date TEXT NOT NULL,
            created_by INTEGER NOT NULL,
            status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Accepted', 'Rejected', 'Completed', 'Initialized', 'Archived')),
            is_opening_stock INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(dealer_id, date, is_opening_stock),
            FOREIGN KEY (dealer_id) REFERENCES dealers(id) ON DELETE CASCADE
        );
        `);
        console.log('Created new table.');
        
        await db.query('INSERT INTO dispatches_new SELECT * FROM dispatches');
        console.log('Copied data.');
        
        await db.query('DROP TABLE dispatches');
        console.log('Dropped old table.');
        
        await db.query('ALTER TABLE dispatches_new RENAME TO dispatches');
        console.log('Renamed table.');
        
        await db.query('PRAGMA foreign_keys=on;');
        console.log('Migration completed successfully.');
        
    } catch(e) {
        console.error(e);
    }
}

migrate();
