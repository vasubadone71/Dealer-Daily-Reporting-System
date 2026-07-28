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
