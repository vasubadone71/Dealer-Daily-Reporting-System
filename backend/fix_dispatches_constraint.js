const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.join(__dirname, '../database.sqlite');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
    db.run("BEGIN TRANSACTION;");
    
    // 1. Create a temporary table with the correct schema
    db.run(`
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
            FOREIGN KEY (source_id) REFERENCES dealers(id) ON DELETE SET NULL,
            FOREIGN KEY (dealer_id) REFERENCES dealers(id) ON DELETE CASCADE
        );
    `);
    
    // Create the unique index explicitly
    db.run(`CREATE UNIQUE INDEX idx_dispatches_unique ON dispatches_new(dealer_id, date, is_opening_stock, IFNULL(source_id, 0));`);

    // 2. Copy data from the old table
    db.run(`
        INSERT INTO dispatches_new (id, source_id, dealer_id, date, created_by, status, is_opening_stock, created_at, updated_at)
        SELECT id, source_id, dealer_id, date, created_by, status, is_opening_stock, created_at, updated_at FROM dispatches;
    `);

    // 3. Drop the old table
    db.run("DROP TABLE dispatches;");

    // 4. Rename the new table
    db.run("ALTER TABLE dispatches_new RENAME TO dispatches;");
    
    db.run("COMMIT;", (err) => {
        if (err) {
            console.error("Migration failed:", err);
        } else {
            console.log("Migration successful! dispatches table updated.");
        }
    });
});
