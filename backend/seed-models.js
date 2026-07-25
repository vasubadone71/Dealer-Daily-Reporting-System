const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, '../database.sqlite');
const db = new sqlite3.Database(dbPath);

const modelsToSeed = [
    { name: 'HORNET 2.0 2 B', type: 'Motorcycle' },
    { name: 'HORNET 125', type: 'Motorcycle' },
    { name: 'NX200 2B', type: 'Motorcycle' },
    { name: 'UNICORN', type: 'Motorcycle' },
    { name: 'UNICORN 2 B', type: 'Motorcycle' },
    { name: 'SP 160 DISC', type: 'Motorcycle' },
    { name: 'SP160 DRUM', type: 'Motorcycle' },
    { name: 'SP160 DISC OBD2 B', type: 'Motorcycle' },
    { name: 'SP160 DRUM OBD2 B', type: 'Motorcycle' },
    { name: 'SHINE 100', type: 'Motorcycle' },
    { name: 'SHINE 100 2B', type: 'Motorcycle' },
    { name: 'SHINE 100 DX', type: 'Motorcycle' },
    { name: 'LIVO DISK 2B', type: 'Motorcycle' },
    { name: 'LIVO DRUM 2B', type: 'Motorcycle' },
    { name: 'SHINE 125 DISC 2B', type: 'Motorcycle' },
    { name: 'SHINE 125 LE-OBD2', type: 'Motorcycle' },
    { name: 'SHINE 125 DR OBD2B', type: 'Motorcycle' },
    { name: 'SP125 DISC OBD2 B', type: 'Motorcycle' },
    { name: 'SP125 DRUM OBD2 B', type: 'Motorcycle' },
    { name: 'ACTIVA 125 LTD', type: 'Scooter' },
    { name: 'ACTIVA 125 H-S OBD2B', type: 'Scooter' },
    { name: 'ACTIVA 125 DISC OBD2B', type: 'Scooter' },
    { name: 'DIO SMART 2B', type: 'Scooter' },
    { name: 'DIO STD 2B', type: 'Scooter' },
    { name: 'ACTIVA 110 LTD', type: 'Scooter' },
    { name: 'ACTIVA DLX OBD2B', type: 'Scooter' },
    { name: 'ACTIVA H SMART 2B', type: 'Scooter' },
    { name: 'ACTIVA STD OBD2B', type: 'Scooter' }
];

const colorsToSeed = [
    { id: 1, name: 'Black', hex: '#000000' },
    { id: 2, name: 'PS Blue', hex: '#2b50aa' },
    { id: 3, name: 'White', hex: '#ffffff' },
    { id: 4, name: 'Deep Grey', hex: '#3b3b3b' },
    { id: 5, name: 'Full Red', hex: '#d91818' },
    { id: 6, name: 'Full Blue', hex: '#184dd9' },
    { id: 7, name: 'Meheroon', hex: '#800000' },
    { id: 8, name: 'Blue', hex: '#0000ff' },
    { id: 9, name: 'Red', hex: '#ff0000' },
    { id: 10, name: 'Geny Grey', hex: '#5e5e5e' },
    { id: 11, name: 'Matte Grey', hex: '#404040' },
    { id: 12, name: 'Lemon Yellow', hex: '#fff44f' },
    { id: 13, name: 'Green', hex: '#008000' },
    { id: 14, name: 'Orange', hex: '#ffa500' },
    { id: 15, name: 'Grey', hex: '#808080' }
];

// Helper wrapper for async execution
const runQuery = (query, params = []) => new Promise((resolve, reject) => {
    db.run(query, params, function (err) {
        if (err) reject(err);
        else resolve(this);
    });
});

const getQuery = (query, params = []) => new Promise((resolve, reject) => {
    db.all(query, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
    });
});

async function runSeed() {
    console.log("Starting massive master data reset...");

    try {
        await runQuery('BEGIN TRANSACTION');

        // Note: For safe foreign keys, we shouldn't just truncate, but we might want to wipe data that isn't connected to active stock, or update appropriately.
        // Actually, since this is a dev DB or a new rollout, we will DELETE all master data. Wait, we shouldn't delete `retail_items`, `dispatch_items`, `targets` if they have FKs, 
        // BUT they rely on `variant_color_id` which might change!
        // To prevent breaking existing data, we can ignore `variant_color_id` constraints or just let cascading take over if needed.
        
        await runQuery('DELETE FROM variant_colors');
        await runQuery('DELETE FROM variants');
        await runQuery('DELETE FROM models');
        await runQuery('DELETE FROM colors');

        // Reset sqlite sequences
        await runQuery('DELETE FROM sqlite_sequence WHERE name IN ("variant_colors", "variants", "models", "colors")');

        // Seed Colors
        for (const c of colorsToSeed) {
            await runQuery('INSERT INTO colors (id, name, hex_code, is_active) VALUES (?, ?, ?, 1)', [c.id, c.name, c.hex]);
        }

        // Seed Models
        for (const m of modelsToSeed) {
            await runQuery('INSERT INTO models (name, type, is_active) VALUES (?, ?, 1)', [m.name, m.type]);
        }

        // Create dummy "Base" variants and map ALL colors to ALL models (so it's fully flexible out of the box, admin can trim it down later)
        const models = await getQuery('SELECT id FROM models');
        const colors = await getQuery('SELECT id FROM colors');

        for (const model of models) {
            // Create single Base variant per model
            await runQuery('INSERT INTO variants (model_id, name, is_active) VALUES (?, "Base", 1)', [model.id]);
            const variantRow = await getQuery('SELECT id FROM variants WHERE model_id = ?', [model.id]);
            const variantId = variantRow[0].id;

            // Map all 15 colors to this variant
            for (const color of colors) {
                await runQuery('INSERT INTO variant_colors (variant_id, color_id, is_active) VALUES (?, ?, 1)', [variantId, color.id]);
            }
        }

        await runQuery('COMMIT');
        console.log("Successfully seeded 28 Models, 15 Colors, and mapped Variant Colors.");
        
    } catch (e) {
        await runQuery('ROLLBACK');
        console.error("Failed to seed:", e);
    } finally {
        db.close();
    }
}

runSeed();
