const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, '../../database.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening SQLite database:', err);
    } else {
        console.log('Connected to SQLite database at:', dbPath);
        initializeDatabase();
    }
});

function initializeDatabase() {
    const schemaPath = path.join(__dirname, 'schema.sql');
    if (fs.existsSync(schemaPath)) {
        console.log('Initializing database schema...');
        const schema = fs.readFileSync(schemaPath, 'utf8');
        db.exec(schema, (err) => {
            if (err) {
                console.error('Error running schema.sql:', err);
            } else {
                console.log('Database initialized successfully with schema.sql');
                runMigrations();
            }
        });
    } else {
        console.warn('schema.sql not found in database directory!');
    }
}

function runMigrations() {
    const migrations = [
        'ALTER TABLE settings ADD COLUMN honda_logo TEXT;',
        'ALTER TABLE settings ADD COLUMN pdf_header TEXT;',
        'ALTER TABLE settings ADD COLUMN pdf_footer TEXT;',
        'ALTER TABLE models ADD COLUMN is_focus INTEGER DEFAULT 0;',
        'ALTER TABLE targets ADD COLUMN model_id INTEGER REFERENCES models(id) ON DELETE CASCADE;',
        'ALTER TABLE reports ADD COLUMN scanned_frames TEXT;',
        'ALTER TABLE dealers ADD COLUMN gst_no TEXT;',
        'ALTER TABLE dealers ADD COLUMN role TEXT NOT NULL DEFAULT "dealer";'
    ];
    
    console.log('Running automatic schema migrations...');
    migrations.forEach(mig => {
        db.run(mig, (err) => {
            // Ignore errors (usually means column already exists)
        });
    });

    // Fix dealers table CHECK constraint to include Showroom and Godown
    // SQLite doesn't support ALTER TABLE to change constraints, so we check and rebuild if needed
    fixDealersConstraint();
}

function fixDealersConstraint() {
    db.get("SELECT sql FROM sqlite_master WHERE type='table' AND name='dealers'", [], (err, row) => {
        if (err || !row) return;
        const tableSql = row.sql || '';
        // If old constraint (without Showroom/Godown), rebuild the table
        if (tableSql.includes("dealer_type IN ('AD', 'FO', 'EC', 'ASC', 'Sub Dealer')") ||
            (tableSql.includes("dealer_type") && !tableSql.includes("'Showroom'") && !tableSql.includes("Showroom"))) {
            console.log('[Migration] Fixing dealers table CHECK constraint for dealer_type...');
            const rebuildSql = `
                BEGIN TRANSACTION;
                ALTER TABLE dealers RENAME TO dealers_old;
                CREATE TABLE dealers (
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
                    role TEXT NOT NULL DEFAULT 'dealer',
                    gst_no TEXT,
                    FOREIGN KEY (network_id) REFERENCES networks(id) ON DELETE RESTRICT
                );
                INSERT INTO dealers SELECT id, dealer_code, name, password_hash, network_id, district, state, dealer_type, status, device_id, push_token, last_login_at, created_at, updated_at, COALESCE(role, 'dealer'), COALESCE(gst_no, NULL) FROM dealers_old;
                DROP TABLE dealers_old;
                COMMIT;
            `;
            db.exec(rebuildSql, (err2) => {
                if (err2) {
                    console.error('[Migration] Failed to fix dealers constraint:', err2.message);
                } else {
                    console.log('[Migration] dealers table constraint fixed successfully!');
                }
            });
        } else {
            console.log('[Migration] dealers table constraint is already up to date.');
        }
    });
}


/**
 * Executes a query. For SELECT queries, returns rows array.
 * For INSERT/UPDATE/DELETE queries, returns { lastID, changes }.
 */
const query = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        const cleanedSql = sql.trim().toUpperCase();
        const isSelect = cleanedSql.startsWith('SELECT') || cleanedSql.startsWith('WITH');
        
        if (isSelect) {
            db.all(sql, params, (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        } else {
            db.run(sql, params, function (err) {
                if (err) reject(err);
                else resolve({ lastID: this.lastID, changes: this.changes });
            });
        }
    });
};

/**
 * Executes a query expected to return at most one row.
 */
const get = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        db.get(sql, params, (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });
};

module.exports = {
    db,
    query,
    get
};
