const db = require('../database/db');

setTimeout(async () => {
  try {
    const tables = await db.query("SELECT name FROM sqlite_master WHERE type='table'");
    console.log('Tables in database:', tables.map(t => t.name));
    
    const dealers = await db.query("SELECT * FROM dealers");
    console.log(`Dealers count: ${dealers.length}`);
    console.log('Dealers list:', dealers.map(d => `${d.dealer_code}: ${d.name}`));

    const users = await db.query("SELECT * FROM users");
    console.log('Users list:', users.map(u => `${u.username}: ${u.role}`));
  } catch (err) {
    console.error('Error querying database:', err);
  }
  process.exit(0);
}, 1000);
