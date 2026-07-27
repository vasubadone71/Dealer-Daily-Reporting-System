const fs = require('fs');
let schema = fs.readFileSync('database/schema.sql', 'utf8');
schema = schema.replace(/CREATE TABLE (\"?[a-zA-Z_]+\"?)/g, 'CREATE TABLE IF NOT EXISTS $1');
schema = schema.replace(/CREATE UNIQUE INDEX/g, 'CREATE UNIQUE INDEX IF NOT EXISTS');
schema = schema.replace(/CREATE INDEX/g, 'CREATE INDEX IF NOT EXISTS');
fs.writeFileSync('database/schema.sql', schema);
console.log('Schema fixed!');
