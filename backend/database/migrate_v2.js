const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath);

async function runQuery(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function (err) {
            if (err) reject(err);
            else resolve(this);
        });
    });
}

async function getQuery(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.get(sql, params, (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });
}

async function migrate() {
    console.log('Starting V2 Database Migration (Model+Variant+Color)...');
    
    const schemaV2 = fs.readFileSync(path.join(__dirname, 'schema_v2.sql'), 'utf-8');
    
    db.serialize(async () => {
        try {
            console.log('Applying schema_v2.sql...');
            const statements = schemaV2.split(';').filter(stmt => stmt.trim() !== '');
            for (let stmt of statements) {
                try {
                    await runQuery(stmt);
                } catch (err) {
                    console.log(`Skipping statement due to error (might already exist): ${err.message}`);
                }
            }
            console.log('Schema V2 applied successfully.');
            
            console.log('Seeding Master Models, Variants, and Colors...');
            
            const models = [
                { name: 'Activa 110', type: 'Scooter', variants: ['STD', 'DLX', 'H-Smart'] },
                { name: 'Activa 125', type: 'Scooter', variants: ['Drum', 'Disc', 'H-Smart'] },
                { name: 'Shine 100', type: 'Motorcycle', variants: ['STD'] },
                { name: 'Shine 125', type: 'Motorcycle', variants: ['Drum', 'Disc'] },
                { name: 'SP 125', type: 'Motorcycle', variants: ['Drum', 'Disc', 'Sports Edition'] },
                { name: 'SP 160', type: 'Motorcycle', variants: ['Single Disc', 'Dual Disc'] },
                { name: 'CB Hornet 160R', type: 'Motorcycle', variants: ['STD', 'ABS'] },
                { name: 'Hornet 2.0', type: 'Motorcycle', variants: ['STD', 'Repsol'] }
            ];
            
            const colors = [
                { name: 'Black', hex: '#000000' },
                { name: 'Pearl Siren Blue', hex: '#1C39BB' },
                { name: 'Matte Axis Grey', hex: '#555555' },
                { name: 'Pearl Precious White', hex: '#FFFFFF' },
                { name: 'Rebel Red Metallic', hex: '#B22222' },
                { name: 'Geny Grey Metallic', hex: '#808080' },
                { name: 'Decent Blue Metallic', hex: '#4169E1' },
                { name: 'Matte Marvel Blue Metallic', hex: '#00008B' },
                { name: 'Imperial Red Metallic', hex: '#DC143C' }
            ];
            
            // Insert Colors
            for (let c of colors) {
                await runQuery('INSERT OR IGNORE INTO colors (name, hex_code) VALUES (?, ?)', [c.name, c.hex]);
            }
            
            // Insert Models and Variants
            for (let m of models) {
                await runQuery('INSERT OR IGNORE INTO models (name, type) VALUES (?, ?)', [m.name, m.type]);
                const modelRow = await getQuery('SELECT id FROM models WHERE name = ?', [m.name]);
                
                for (let v of m.variants) {
                    await runQuery('INSERT OR IGNORE INTO variants (model_id, name) VALUES (?, ?)', [modelRow.id, v]);
                    const variantRow = await getQuery('SELECT id FROM variants WHERE model_id = ? AND name = ?', [modelRow.id, v]);
                    
                    // Assign a few random colors to each variant for testing
                    const allColors = await new Promise((res, rej) => db.all('SELECT id FROM colors', (err, rows) => err ? rej(err) : res(rows)));
                    // Just map all colors to everything for now
                    for (let color of allColors) {
                        await runQuery('INSERT OR IGNORE INTO variant_colors (variant_id, color_id) VALUES (?, ?)', [variantRow.id, color.id]);
                    }
                }
            }
            
            console.log('Migration and Seeding Complete!');
            db.close();
            
        } catch (e) {
            console.error('Migration failed:', e);
            db.close();
        }
    });
}

migrate();
