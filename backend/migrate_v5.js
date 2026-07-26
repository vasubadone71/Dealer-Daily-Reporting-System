const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '../database.sqlite');
const db = new sqlite3.Database(dbPath);

console.log('Starting V5 Database Migration (Targets & Models)...');

db.serialize(() => {
    // 1. Add model_id to targets
    db.run(`ALTER TABLE targets ADD COLUMN model_id INTEGER`, (err) => {
        if (err) {
            if (err.message.includes('duplicate column name')) {
                console.log('targets.model_id column already exists.');
            } else {
                console.error('Error adding model_id to targets:', err.message);
            }
        } else {
            console.log('Successfully added model_id to targets table.');
        }
    });

    // 2. Add is_focus to models
    db.run(`ALTER TABLE models ADD COLUMN is_focus INTEGER DEFAULT 0`, (err) => {
        if (err) {
            if (err.message.includes('duplicate column name')) {
                console.log('models.is_focus column already exists.');
            } else {
                console.error('Error adding is_focus to models:', err.message);
            }
        } else {
            console.log('Successfully added is_focus to models table.');
        }
    });
});

db.close((err) => {
    if (err) {
        console.error('Error closing database:', err.message);
    } else {
        console.log('V5 Migration finished. Database closed.');
    }
});
